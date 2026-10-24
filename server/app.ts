import express from 'express';
import type { DatabaseSync } from 'node:sqlite';

export interface AppOptions {
  db: DatabaseSync;
  jwtSecret: string;
  authRateLimit?: number;
}

export function createApp(_options: AppOptions) {
  return express();
}
