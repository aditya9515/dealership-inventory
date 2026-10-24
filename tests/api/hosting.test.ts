import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../server/app.js';
import { openDatabase } from '../../server/database.js';
import { loadConfig } from '../../server/config.js';

const secret = 'hosting-test-secret-with-at-least-32-characters';
const credentials = { email: 'missing@example.com', password: 'Incorrect123!' };

describe('hosting configuration', () => {
  let directory: string;
  let db: ReturnType<typeof openDatabase>;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'motorstock-hosting-'));
    db = openDatabase(join(directory, 'test.db'));
  });
  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('uses Railway client IPs for separate authentication limits when explicitly configured', async () => {
    const app = createApp({ db, jwtSecret: secret, authRateLimit: 1, clientIpSource: 'railway' });
    await request(app)
      .post('/api/auth/login')
      .set('X-Real-IP', '203.0.113.10')
      .send(credentials)
      .expect(401);
    await request(app)
      .post('/api/auth/login')
      .set('X-Real-IP', '203.0.113.11')
      .send(credentials)
      .expect(401);
    await request(app)
      .post('/api/auth/login')
      .set('X-Real-IP', '203.0.113.10')
      .send(credentials)
      .expect(429);
  });

  it('ignores client IP headers when running directly', async () => {
    const app = createApp({ db, jwtSecret: secret, authRateLimit: 1 });
    await request(app)
      .post('/api/auth/login')
      .set('X-Real-IP', '203.0.113.10')
      .send(credentials)
      .expect(401);
    await request(app)
      .post('/api/auth/login')
      .set('X-Real-IP', '203.0.113.11')
      .send(credentials)
      .expect(429);
  });

  it('falls back to the socket address when the trusted header is malformed', async () => {
    const app = createApp({ db, jwtSecret: secret, authRateLimit: 1, clientIpSource: 'railway' });
    await request(app)
      .post('/api/auth/login')
      .set('X-Real-IP', 'not-an-ip')
      .send(credentials)
      .expect(401);
    await request(app)
      .post('/api/auth/login')
      .set('X-Real-IP', 'another-invalid-ip')
      .send(credentials)
      .expect(429);
  });

  it('validates the selected client IP source and defaults to the socket address', () => {
    expect(loadConfig({ JWT_SECRET: secret }).CLIENT_IP_SOURCE).toBe('socket');
    expect(loadConfig({ JWT_SECRET: secret, CLIENT_IP_SOURCE: 'railway' }).CLIENT_IP_SOURCE).toBe(
      'railway',
    );
    expect(() =>
      loadConfig({ JWT_SECRET: secret, CLIENT_IP_SOURCE: 'arbitrary-header' }),
    ).toThrow();
  });
});
