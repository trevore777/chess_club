import bcrypt from 'bcryptjs';
import { one, run } from '../lib/db.js';

async function createUser(name, username, password, role) {
  const existing = await one('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return;
  const hash = await bcrypt.hash(password, 10);
  await run('INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)', [name, username, hash, role]);
}

await createUser('Coach', 'coach', 'password123', 'coach');
await createUser('Sam Student', 'sam', 'password123', 'student');
await createUser('Alex Green', 'alex', 'password123', 'student');
await createUser('Mia Brown', 'mia', 'password123', 'student');
await createUser('Noah White', 'noah', 'password123', 'student');

console.log('Seed complete. Login: coach/password123 or sam/password123');
