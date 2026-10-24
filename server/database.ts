import { DatabaseSync } from 'node:sqlite';

export function openDatabase(path: string): DatabaseSync {
  return new DatabaseSync(path);
}
