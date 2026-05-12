# Chess Club App Upgrade: Move History, Replay, and Board Coordinates

This package upgrades the Chess Club app with:

- Fixed chessboard squares
- Rank/file labels around the board: 8–1 and a–h
- Coach click-to-move board control
- Automatic save after a piece is moved
- Move history stored in the database
- Showboard move list down the side
- Replay controls: Start, Previous, Next, Latest
- Leaderboard retained on the show screen

## Install / update

Copy these files into your existing `chess_club` project, replacing matching files.

Then run:

```bash
npm install
npm run db:update-moves-board
npm run dev
```

## How it works

1. Coach opens a match board from the coach dashboard.
2. Coach clicks a piece, then clicks the destination square.
3. The app records:
   - piece moved
   - from square
   - to square
   - board FEN after the move
   - move number
4. The showboard displays the board and the move history.
5. Use replay controls on the showboard to review the game.

## Important

This board is a manual display board. It does not enforce legal chess rules yet. That is intentional for classroom use, because the coach can simply mirror the real board.
