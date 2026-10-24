import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../server/config.js';

describe('server configuration', () => {
  it('uses local defaults and requires a signing secret', () => {
    const config = loadConfig({ JWT_SECRET: 'a-random-test-secret-at-least-32-characters' });
    expect(config.PORT).toBe(3001);
    expect(config.DATABASE_PATH).toBe('./data/dealership.db');
    expect(() => loadConfig({})).toThrow();
    expect(() => loadConfig({ JWT_SECRET: 'short' })).toThrow();
  });
  it('rejects invalid port numbers', () => {
    expect(() =>
      loadConfig({ PORT: '70000', JWT_SECRET: 'a-random-test-secret-at-least-32-characters' }),
    ).toThrow();
  });
});
