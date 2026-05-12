# Chess Club Ranking + Manual Board Update

This update adds:

- Student ranking fields: points, wins, losses, draws, rating
- Leaderboard page: `/leaderboard`
- Coach leaderboard preview
- Manual board control page for each match: `/matches/:id/board`
- Show screen with large chessboard and leaderboard
- Board positions stored in `game_boards` as a simple FEN board string

## Install update

Copy these files over your existing project, then run:

```bash
npm install
npm run db:update-ranking-board
npm run dev
```

If this is a brand new database, run:

```bash
npm run db:init
npm run db:seed
npm run db:update-ranking-board
npm run dev
```

## Login

```text
coach / password123
sam / password123
```

## How to use

1. Login as coach.
2. Add players if needed.
3. Create a competition.
4. Click **Show** beside a match.
5. Click **Board** to manually move pieces.
6. Open **Show Screen** on a projector or TV.
7. Enter results from the coach page; rankings update automatically.
