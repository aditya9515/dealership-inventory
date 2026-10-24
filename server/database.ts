import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDatabase(path: string): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const version = db.prepare('PRAGMA user_version').get()!.user_version as number;
  if (version < 1) {
    db.exec(`
      BEGIN IMMEDIATE;
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'admin')),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ) STRICT;
      PRAGMA user_version = 1;
      COMMIT;
    `);
  }
  if (version < 2) {
    db.exec(`
      BEGIN IMMEDIATE;
      CREATE TABLE vehicles (
        id TEXT PRIMARY KEY,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        category TEXT NOT NULL,
        price_paise INTEGER NOT NULL CHECK(price_paise > 0 AND price_paise <= 10000000000),
        quantity INTEGER NOT NULL CHECK(quantity >= 0 AND quantity <= 1000000),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ) STRICT;
      CREATE INDEX idx_vehicles_price ON vehicles(price_paise);
      CREATE INDEX idx_vehicles_category ON vehicles(category COLLATE NOCASE);
      CREATE TABLE inventory_movements (
        id TEXT PRIMARY KEY,
        vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
        vehicle_name TEXT NOT NULL,
        actor_id TEXT NOT NULL REFERENCES users(id),
        kind TEXT NOT NULL CHECK(kind IN ('initial', 'purchase', 'restock')),
        delta INTEGER NOT NULL,
        quantity_after INTEGER NOT NULL CHECK(quantity_after >= 0),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ) STRICT;
      CREATE INDEX idx_movements_time ON inventory_movements(created_at DESC);
      PRAGMA user_version = 2;
      COMMIT;
    `);
  }
  return db;
}

export function transaction<T>(db: DatabaseSync, work: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
