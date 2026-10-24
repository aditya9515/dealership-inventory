import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from './app.js';
import { openDatabase } from './database.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const db = openDatabase(config.DATABASE_PATH);
const app = createApp({ db, jwtSecret: config.JWT_SECRET });
const clientDir = resolve('dist/client');
if (existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve(clientDir, 'index.html')));
}
const server = app.listen(config.PORT, () =>
  console.log(`Motorstock is running at http://localhost:${config.PORT}`),
);
function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
