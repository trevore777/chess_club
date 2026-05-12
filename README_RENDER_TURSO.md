# Chess Club App — Render + Turso Setup

This version is ready for:

- Local development on your Mac
- GitHub source control
- Render hosting
- Turso/libSQL relational database

## 1. Install locally

From inside the project folder:

```bash
chmod +x install.sh setup-local-mac.sh
./setup-local-mac.sh
```

If Node.js is missing, install it first:

```bash
brew install node
```

Then run:

```bash
npm install
cp .env.example .env
```

## 2. Create a Turso database

Install the Turso CLI if needed:

```bash
brew install tursodatabase/tap/turso
```

Login:

```bash
turso auth login
```

Create the database:

```bash
turso db create chess-club
```

Get the database URL:

```bash
turso db show chess-club --url
```

Create an auth token:

```bash
turso db tokens create chess-club
```

Put both values into `.env`:

```env
TURSO_DATABASE_URL=libsql://your-database-name-your-org.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token_here
SESSION_SECRET=make_this_long_and_random
```

## 3. Create tables and test accounts

```bash
npm run db:migrate
npm run db:seed
npm run db:check
```

Seeded accounts:

```text
Student: student1 / password123
Coach: coach / password123
```

## 4. Run locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## 5. Push to GitHub

```bash
git init
git add .
git commit -m "Initial Chess Club Render Turso app"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## 6. Deploy to Render

In Render:

1. New → Web Service
2. Connect your GitHub repository
3. Use these settings:

```text
Environment: Node
Build Command: npm install
Start Command: npm start
```

Add environment variables in Render:

```text
NODE_ENV=production
TURSO_DATABASE_URL=your Turso database URL
TURSO_AUTH_TOKEN=your Turso auth token
SESSION_SECRET=a long random string
```

The included `render.yaml` can also be used as a Render Blueprint.

## 7. Important note

Do not commit your `.env` file to GitHub. The `.gitignore` file already blocks it.
