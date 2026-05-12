# Chess Club Live Play

Separate 2-player chess app for students.

## Features
- Student login
- Lobby
- Create a game against another student
- Legal chess moves using chess.js
- Turn-based play
- Move history
- Game status and automatic leaderboard update
- Simple polling every 3 seconds

## Setup
```bash
npm install
cp .env.example .env
npm run db:init
npm run db:seed
npm run dev
```

Open:
```text
http://localhost:3000/login
```

Demo logins:
```text
sam / password123
alex / password123
mia / password123
noah / password123
```
