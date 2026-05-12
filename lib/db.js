import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

export const db = createClient({ url, authToken });

export async function all(sql, args = []) {
  const result = await db.execute({ sql, args });
  return result.rows;
}

export async function one(sql, args = []) {
  const rows = await all(sql, args);
  return rows[0] || null;
}

export async function run(sql, args = []) {
  return db.execute({ sql, args });
}
