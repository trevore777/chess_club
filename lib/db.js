import dotenv from "dotenv";
import { createClient } from "@libsql/client";

dotenv.config();

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

export async function all(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.rows;
}

export async function one(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.rows[0] || null;
}

export async function run(sql, params = []) {
  return db.execute({ sql, args: params });
}
