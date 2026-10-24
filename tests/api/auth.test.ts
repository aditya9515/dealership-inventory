import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import jwt from 'jsonwebtoken';
import { createApp } from '../../server/app.js';
import { openDatabase } from '../../server/database.js';

const secret = 'test-secret-that-is-at-least-32-characters';
const credentials = { name: 'Asha Rao', email: 'asha@example.com', password: 'StrongPass123!' };

describe('authentication against a real SQLite file', () => {
  let dir: string;
  let db: ReturnType<typeof openDatabase>;
  let app: ReturnType<typeof createApp>;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dealership-auth-'));
    db = openDatabase(join(dir, 'test.db'));
    app = createApp({ db, jwtSecret: secret, authRateLimit: 100 });
  });
  afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });

  it('registers a customer, hashes the password, and issues a usable JWT', async () => {
    const result = await request(app).post('/api/auth/register').send(credentials).expect(201);
    expect(result.body.user).toMatchObject({ name: 'Asha Rao', role: 'customer', email: credentials.email });
    expect(result.body.user).not.toHaveProperty('password_hash');
    expect(jwt.verify(result.body.token, secret)).toMatchObject({ sub: result.body.user.id });
    const stored = db.prepare('SELECT password_hash FROM users').get()!;
    expect(stored.password_hash).not.toBe(credentials.password);
    await request(app).get('/api/auth/me').auth(result.body.token, { type: 'bearer' }).expect(200);
  });

  it('normalizes emails and rejects duplicate registration', async () => {
    await request(app).post('/api/auth/register').send(credentials).expect(201);
    await request(app).post('/api/auth/register').send({ ...credentials, email: ' ASHA@example.com ' }).expect(409);
  });

  it.each([
    { email: 'invalid' }, { name: '' }, { password: 'short' }, { role: 'admin' },
  ])('rejects invalid or privilege-escalating registration: %j', async (change) => {
    await request(app).post('/api/auth/register').send({ ...credentials, ...change }).expect(400);
  });

  it('logs in with a correct password, but rejects a wrong password or missing account', async () => {
    await request(app).post('/api/auth/register').send(credentials);
    await request(app).post('/api/auth/login').send({ email: credentials.email, password: credentials.password }).expect(200);
    const wrong = await request(app).post('/api/auth/login').send({ email: credentials.email, password: 'Incorrect123!' }).expect(401);
    const missing = await request(app).post('/api/auth/login').send({ email: 'missing@example.com', password: credentials.password }).expect(401);
    expect(wrong.body.error.message).toBe(missing.body.error.message);
  });

  it('rejects missing, forged, and expired tokens', async () => {
    await request(app).get('/api/vehicles').expect(401);
    await request(app).get('/api/vehicles').auth('invalid', { type: 'bearer' }).expect(401);
    const token = jwt.sign({}, secret, { subject: 'missing', expiresIn: -1 });
    await request(app).get('/api/vehicles').auth(token, { type: 'bearer' }).expect(401);
  });

  it('rejects an otherwise valid token for a deleted account', async () => {
    const token = jwt.sign({}, secret, { subject: 'missing', expiresIn: '1h' });
    await request(app).get('/api/auth/me').auth(token, { type: 'bearer' }).expect(401);
  });

  it('limits repeated authentication attempts', async () => {
    const limited = createApp({ db, jwtSecret: secret, authRateLimit: 2 });
    for (let i = 0; i < 2; i++) await request(limited).post('/api/auth/login').send({ email: 'x@example.com', password: 'wrong' }).expect(401);
    await request(limited).post('/api/auth/login').send({}).expect(429);
  });

  it('returns JSON for malformed input and unknown API routes', async () => {
    await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{').expect(400);
    const result = await request(app).get('/api/unknown').expect(404);
    expect(result.body.error.code).toBe('NOT_FOUND');
    expect(result.headers['x-request-id']).toBeTruthy();
  });

  it('retains a registered account after the database is reopened', async () => {
    await request(app).post('/api/auth/register').send(credentials).expect(201);
    db.close();
    db = openDatabase(join(dir, 'test.db'));
    app = createApp({ db, jwtSecret: secret });
    await request(app).post('/api/auth/login').send({ email: credentials.email, password: credentials.password }).expect(200);
  });
});
