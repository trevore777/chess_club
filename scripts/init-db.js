import dotenv from "dotenv";
import { createClient } from "@libsql/client";

dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log("Initialising live play database...");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      rating INTEGER DEFAULT 1200,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      draws INTEGER DEFAULT 0,
      points REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS live_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      white_player_id INTEGER NOT NULL,
      black_player_id INTEGER NOT NULL,
      fen TEXT NOT NULL,
      pgn TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      result TEXT DEFAULT 'pending',
      turn TEXT DEFAULT 'w',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (white_player_id) REFERENCES users(id),
      FOREIGN KEY (black_player_id) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS live_moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      move_number INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      from_square TEXT NOT NULL,
      to_square TEXT NOT NULL,
      san TEXT,
      fen_after TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES live_games(id),
      FOREIGN KEY (player_id) REFERENCES users(id)
    )
  `);

  console.log("Database ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
