import dotenv from "dotenv";
import { createClient } from "@libsql/client";

dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function run() {
  console.log("Updating chess rules database...");

  await db.execute(`
    ALTER TABLE matches ADD COLUMN rules_mode TEXT DEFAULT 'legal'
  `).catch(() => {});

  console.log("Rules update complete.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
