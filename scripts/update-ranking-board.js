import { run } from '../lib/db.js';

async function safe(sql) {
  try { await run(sql); console.log('OK:', sql.split('\n')[0].slice(0,80)); }
  catch (err) { console.log('Skipped:', err.message); }
}

await safe(`ALTER TABLE users ADD COLUMN rating INTEGER DEFAULT 1200`);
await safe(`ALTER TABLE users ADD COLUMN wins INTEGER DEFAULT 0`);
await safe(`ALTER TABLE users ADD COLUMN losses INTEGER DEFAULT 0`);
await safe(`ALTER TABLE users ADD COLUMN draws INTEGER DEFAULT 0`);
await safe(`ALTER TABLE users ADD COLUMN points REAL DEFAULT 0`);

await run(`CREATE TABLE IF NOT EXISTS game_boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL UNIQUE,
  fen TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id)
)`);

console.log('Ranking + board update complete.');
