import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

if (existsSync('.env')) console.log('Your .env already exists. No changes were made.');
else {
  const template = readFileSync('.env.example', 'utf8');
  writeFileSync(
    '.env',
    template.replace(
      'replace-with-a-random-secret-at-least-32-characters',
      randomBytes(48).toString('hex'),
    ),
  );
  console.log('Created .env with a random signing secret. Run pnpm seed, then pnpm dev.');
}
