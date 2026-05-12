# Chess Club App

A Node.js + Express + EJS chess club competition app using Turso/libSQL.

## Features

- Student and coach login
- Coach dashboard
- Student dashboard
- Player list
- Round-robin competition generator
- Match scoring: white win, black win, draw, scheduled
- Leaderboard
- Featured/current game selection
- Public show screen for projector/TV display
- Render deployment config
- Turso database schema and seed scripts

## Demo seed accounts

After `npm run db:seed`:

Coach:
- username: `coach`
- password: `password123`

Students:
- username: `sam`
- password: `password123`
- username: `ava`
- password: `password123`
- username: `leo`
- password: `password123`
- username: `mia`
- password: `password123`

## Local setup

```bash
npm install
cp .env.example .env
```

Add your Turso credentials to `.env`.

```bash
npm run db:init
npm run db:seed
npm run dev
```

Open:

```text
http://localhost:3000
```

## Turso setup

```bash
brew install tursodatabase/tap/turso
turso auth login
turso db create chess-club-db
turso db show chess-club-db --url
turso db tokens create chess-club-db
```

Paste the URL and token into `.env` and Render environment variables.

## Render deployment

1. Push this project to GitHub.
2. Create a new Render Web Service from the GitHub repo.
3. Build command: `npm install && npm run db:init`
4. Start command: `npm start`
5. Add environment variables:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `SESSION_SECRET`

## Main pages

- `/` login
- `/student/dashboard`
- `/coach/dashboard`
- `/coach/players`
- `/coach/competitions`
- `/coach/competitions/:id`
- `/show`
- `/logout`
