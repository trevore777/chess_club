import dotenv from "dotenv";
import { createClient } from "@libsql/client";

dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const students = [
  ["Sam Student", "sam"],
  ["Alex Green", "alex"],
  ["Mia Brown", "mia"],
  ["Noah White", "noah"]
];

async function main() {
  console.log("Seeding demo students...");

  for (const [name, username] of students) {
    await db.execute({
      sql: `
        INSERT OR IGNORE INTO users
          (name, username, password_hash, role, rating, wins, losses, draws, points)
        VALUES
          (?, ?, ?, 'student', 1200, 0, 0, 0, 0)
      `,
      args: [name, username, "password123"]
    });
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
