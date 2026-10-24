import { Router, type RequestHandler } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError } from './errors.js';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer';
}
interface StoredUser extends User {
  password_hash: string;
}
declare global {
  namespace Express {
    interface Locals {
      user: User;
    }
  }
}

const email = z.string().trim().toLowerCase().email().max(254);
const loginSchema = z.object({ email, password: z.string().min(1).max(72) }).strict();
const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1).max(80),
  password: z
    .string()
    .min(8)
    .max(72)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Use at most 72 UTF-8 bytes.'),
});

function publicUser(user: StoredUser): User {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function authenticate(db: DatabaseSync, secret: string): RequestHandler {
  return (req, res, next) => {
    const token = req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Please sign in to continue.');
    let subject: string;
    try {
      const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
      if (typeof payload === 'string' || !payload.sub) throw new Error('Missing subject');
      subject = payload.sub;
    } catch {
      throw new AppError(401, 'UNAUTHORIZED', 'Your session has expired. Please sign in again.');
    }
    // Read the role from the database so a role change takes effect immediately.
    const user = db
      .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
      .get(subject) as unknown as User | undefined;
    if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Please sign in to continue.');
    res.locals.user = user;
    next();
  };
}

export const requireAdmin: RequestHandler = (_req, res, next) => {
  if (res.locals.user.role !== 'admin')
    throw new AppError(403, 'FORBIDDEN', 'Only an administrator can perform this action.');
  next();
};

export function authRouter(db: DatabaseSync, secret: string) {
  const router = Router();
  const session = (user: User) => ({
    user,
    token: jwt.sign({}, secret, { subject: user.id, expiresIn: '2h', algorithm: 'HS256' }),
  });

  router.post('/register', async (req, res) => {
    const input = registerSchema.parse(req.body);
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(input.email))
      throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
    const hash = await bcrypt.hash(input.password, 12);
    const user: User = { id: randomUUID(), name: input.name, email: input.email, role: 'customer' };
    // Hashing yields to other requests; recheck uniqueness with SQLite's constraint.
    try {
      db.prepare(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      ).run(user.id, user.name, user.email, hash, user.role);
    } catch (error) {
      if (db.prepare('SELECT id FROM users WHERE email = ?').get(input.email))
        throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
      throw error;
    }
    res.status(201).json(session(user));
  });

  router.post('/login', async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(input.email) as unknown as
      | StoredUser
      | undefined;
    // A dummy hash keeps missing-account and wrong-password work comparable.
    const valid = await bcrypt.compare(
      input.password,
      user?.password_hash ?? '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW',
    );
    if (!user || !valid)
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    res.json(session(publicUser(user)));
  });

  router.get('/me', authenticate(db, secret), (_req, res) => res.json({ user: res.locals.user }));
  return router;
}
