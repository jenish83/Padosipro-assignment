import fs from 'node:fs';
import path from 'node:path';
// Node's built-in SQLite (Node >= 22.13): no native compilation, nothing to install.
import { DatabaseSync } from 'node:sqlite';
import seedTasks from './seed/tasks.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);

-- One row per issued code. Only an HMAC of the code is stored, never the code itself.
CREATE TABLE IF NOT EXISTS otps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  used_at    INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_otps_user ON otps(user_id, created_at);

CREATE TABLE IF NOT EXISTS profiles (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  mobile        TEXT NOT NULL,
  address       TEXT NOT NULL,
  business_name TEXT,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_tasks (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, task_id)
);
`;

function openDb(dbPath) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  // Small helper so callers can write db.transaction(fn)() (same shape as popular SQLite libraries).
  db.transaction = (fn) => () => {
    db.exec('BEGIN');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };

  db.exec(SCHEMA);
  seed(db);
  return db;
}

// Idempotent: safe to run on every start. Tasks no longer in the seed are removed.
function seed(db) {
  const names = seedTasks.map((t) => t[0]);
  const insert = db.prepare('INSERT OR IGNORE INTO tasks (name, category, description) VALUES (?, ?, ?)');
  const update = db.prepare('UPDATE tasks SET category = ?, description = ? WHERE name = ?');
  const removeStale = db.prepare(`DELETE FROM tasks WHERE name NOT IN (${names.map(() => '?').join(',')})`);
  db.transaction(() => {
    removeStale.run(...names);
    for (const [name, category, description] of seedTasks) {
      insert.run(name, category, description);
      update.run(category, description, name);
    }
  })();
}

export { openDb };
