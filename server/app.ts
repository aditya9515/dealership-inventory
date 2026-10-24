import express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import helmet from 'helmet';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { authenticate, authRouter } from './auth.js';
import { AppError, errorHandler } from './errors.js';
import { inventoryRouter, vehicleRouter } from './vehicles/routes.js';

export interface AppOptions {
  db: DatabaseSync;
  jwtSecret: string;
  authRateLimit?: number;
  clientIpSource?: 'socket' | 'railway';
}

export function createApp({
  db,
  jwtSecret,
  authRateLimit = 30,
  clientIpSource = 'socket',
}: AppOptions) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use((_req, res, next) => {
    res.setHeader('X-Request-Id', randomUUID());
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok' });
  });
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: authRateLimit,
      keyGenerator: (req) => {
        // Enable only behind Railway's HTTP edge, which supplies the client IP.
        const edgeIp = req.get('X-Real-IP');
        const clientIp = clientIpSource === 'railway' && edgeIp && isIP(edgeIp) ? edgeIp : req.ip;
        return ipKeyGenerator(clientIp ?? req.socket.remoteAddress ?? 'unknown');
      },
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: (req) => req.method !== 'POST',
      message: {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many attempts. Please try again in 15 minutes.',
        },
      },
    }),
    authRouter(db, jwtSecret),
  );
  app.use('/api/vehicles', authenticate(db, jwtSecret), vehicleRouter(db));
  app.use('/api/inventory', authenticate(db, jwtSecret), inventoryRouter(db));
  app.use('/api', () => {
    throw new AppError(404, 'NOT_FOUND', 'This API route does not exist.');
  });
  app.use(errorHandler);
  return app;
}
