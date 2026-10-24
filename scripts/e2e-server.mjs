import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const directory = mkdtempSync(join(tmpdir(), 'motorstock-browser-'));
const env = {
  ...process.env,
  PORT: '3002',
  DATABASE_PATH: join(directory, 'test.db'),
  API_PROXY_TARGET: 'http://127.0.0.1:3002',
  JWT_SECRET: 'browser-test-secret-with-at-least-32-characters',
  SEED_ADMIN_EMAIL: 'admin@demo.local',
  SEED_ADMIN_PASSWORD: 'AdminDemo123!',
  SEED_CUSTOMER_EMAIL: 'customer@demo.local',
  SEED_CUSTOMER_PASSWORD: 'CustomerDemo123!',
};
const seed = spawnSync(process.execPath, ['--import', 'tsx', 'server/seed.ts'], {
  env,
  stdio: 'inherit',
});
if (seed.status !== 0) {
  rmSync(directory, { recursive: true, force: true });
  process.exit(1);
}
const children = [
  spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], { env, stdio: 'inherit' }),
  spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5174'],
    { env, stdio: 'inherit' },
  ),
];
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill();
  setTimeout(() => {
    rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    process.exit(code);
  }, 1000);
}
for (const child of children)
  child.on('exit', (code) => {
    if (!closing) close(code || 1);
  });
process.on('SIGINT', () => close());
process.on('SIGTERM', () => close());
