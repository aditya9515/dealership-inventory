import express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { authenticate, authRouter } from './auth.js';
import { AppError, errorHandler } from './errors.js';

export interface AppOptions {
  db: DatabaseSync;
  jwtSecret: string;
  authRateLimit?: number;
}

export function createApp({ db, jwtSecret, authRateLimit = 30 }: AppOptions) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use((_req, res, next) => { res.setHeader('X-Request-Id', randomUUID()); next(); });
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok' });
  });
  app.use('/api/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: authRateLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (req) => req.method !== 'POST',
    message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again in 15 minutes.' } },
  }), authRouter(db, jwtSecret));
  app.use('/api/vehicles', authenticate(db, jwtSecret));
  app.use('/api', () => { throw new AppError(404, 'NOT_FOUND', 'This API route does not exist.'); });
  app.use(errorHandler);
  return app;
}
