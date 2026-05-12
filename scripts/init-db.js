import { run } from '../lib/db.js';

await run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student','coach')),
  rating INTEGER DEFAULT 1200,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  points REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);

await run(`CREATE TABLE IF NOT EXISTS competitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);

await run(`CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL,
  round_number INTEGER NOT NULL,
  board_number INTEGER NOT NULL,
  white_player_id INTEGER,
  black_player_id INTEGER,
  result TEXT DEFAULT 'pending',
  featured INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (competition_id) REFERENCES competitions(id),
  FOREIGN KEY (white_player_id) REFERENCES users(id),
  FOREIGN KEY (black_player_id) REFERENCES users(id)
)`);

console.log('Database initialised.');


await run(`CREATE TABLE IF NOT EXISTS game_boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL UNIQUE,
  fen TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id)
)`);
