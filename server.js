import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Chess } from "chess.js";
import { all, one, run } from "./lib/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function fenToSquares(fen = START_FEN) {
  const pieceMap = { p:"♟", r:"♜", n:"♞", b:"♝", q:"♛", k:"♚", P:"♙", R:"♖", N:"♘", B:"♗", Q:"♕", K:"♔" };
  const rows = String(fen || START_FEN).split(" ")[0].split("/");
  const files = ["a","b","c","d","e","f","g","h"];
  const squares = [];
  rows.forEach((row, rowIndex) => {
    let fileIndex = 0;
    for (const char of row) {
      if (/[1-8]/.test(char)) {
        for (let i = 0; i < Number(char); i++) {
          const rank = 8 - rowIndex;
          const file = files[fileIndex];
          squares.push({ id: `${file}${rank}`, piece: "", color: (rowIndex + fileIndex) % 2 === 0 ? "light" : "dark" });
          fileIndex++;
        }
      } else {
        const rank = 8 - rowIndex;
        const file = files[fileIndex];
        squares.push({ id: `${file}${rank}`, piece: pieceMap[char] || "", color: (rowIndex + fileIndex) % 2 === 0 ? "light" : "dark" });
        fileIndex++;
      }
    }
  });
  return squares;
}

async function getLeaderboard() {
  return all(`SELECT id, name, username, rating, wins, draws, losses, points FROM users WHERE role = 'student' ORDER BY points DESC, wins DESC, rating DESC, name ASC`);
}

async function getGame(id) {
  return one(`
    SELECT g.*, w.name AS white_name, b.name AS black_name
    FROM live_games g
    JOIN users w ON w.id = g.white_player_id
    JOIN users b ON b.id = g.black_player_id
    WHERE g.id = ?
  `, [id]);
}

async function updateRatings(game, result) {
  if (result === "white_win") {
    await run(`UPDATE users SET wins = wins + 1, points = points + 1, rating = rating + 15 WHERE id = ?`, [game.white_player_id]);
    await run(`UPDATE users SET losses = losses + 1, rating = rating - 10 WHERE id = ?`, [game.black_player_id]);
  }
  if (result === "black_win") {
    await run(`UPDATE users SET wins = wins + 1, points = points + 1, rating = rating + 15 WHERE id = ?`, [game.black_player_id]);
    await run(`UPDATE users SET losses = losses + 1, rating = rating - 10 WHERE id = ?`, [game.white_player_id]);
  }
  if (result === "draw") {
    await run(`UPDATE users SET draws = draws + 1, points = points + 0.5 WHERE id = ?`, [game.white_player_id]);
    await run(`UPDATE users SET draws = draws + 1, points = points + 0.5 WHERE id = ?`, [game.black_player_id]);
  }
}

app.get("/", (req, res) => res.redirect("/login"));

app.get("/login", (req, res) => res.render("login", { error: null }));

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await one(`SELECT * FROM users WHERE username = ? AND password_hash = ? LIMIT 1`, [username, password]);
  if (!user) return res.status(401).render("login", { error: "Invalid username or password." });
  res.redirect(`/lobby?user=${user.id}`);
});

app.get("/logout", (req, res) => res.redirect("/login"));

app.get("/lobby", async (req, res) => {
  const userId = Number(req.query.user);
  const currentUser = await one(`SELECT * FROM users WHERE id = ?`, [userId]);
  if (!currentUser) return res.redirect("/login");

  const players = await getLeaderboard();
  const myGames = await all(`
    SELECT g.*, w.name AS white_name, b.name AS black_name
    FROM live_games g
    JOIN users w ON w.id = g.white_player_id
    JOIN users b ON b.id = g.black_player_id
    WHERE (g.white_player_id = ? OR g.black_player_id = ?) AND g.status = 'active'
    ORDER BY g.updated_at DESC
  `, [currentUser.id, currentUser.id]);

  res.render("lobby", { currentUser, players, myGames });
});

app.post("/games", async (req, res) => {
  const whitePlayerId = Number(req.body.white_player_id);
  const blackPlayerId = Number(req.body.black_player_id);
  if (!whitePlayerId || !blackPlayerId || whitePlayerId === blackPlayerId) return res.redirect(`/lobby?user=${whitePlayerId || ""}`);

  await run(`
    INSERT INTO live_games (white_player_id, black_player_id, fen, pgn, status, result, turn)
    VALUES (?, ?, ?, '', 'active', 'pending', 'w')
  `, [whitePlayerId, blackPlayerId, START_FEN]);

  const game = await one(`SELECT * FROM live_games ORDER BY id DESC LIMIT 1`);
  res.redirect(`/games/${game.id}?user=${whitePlayerId}`);
});

app.get("/games/:id", async (req, res) => {
  const userId = Number(req.query.user);
  const currentUser = await one(`SELECT * FROM users WHERE id = ?`, [userId]);
  const game = await getGame(req.params.id);
  if (!currentUser || !game) return res.redirect("/login");

  const moves = await all(`SELECT * FROM live_moves WHERE game_id = ? ORDER BY move_number ASC`, [game.id]);
  res.render("game", { currentUser, game, moves, squares: fenToSquares(game.fen) });
});

app.get("/api/games/:id/state", async (req, res) => {
  const game = await getGame(req.params.id);
  if (!game) return res.json({ success: false });
  res.json({ success: true, fen: game.fen, status: game.status, result: game.result, turn: game.turn });
});

app.post("/api/games/:id/move", async (req, res) => {
  try {
    const gameId = req.params.id;
    const { from, to, playerId } = req.body;
    const gameRecord = await getGame(gameId);

    if (!gameRecord) return res.json({ success: false, error: "Game not found." });
    if (gameRecord.status !== "active") return res.json({ success: false, error: "This game is already finished." });

    const expectedPlayerId = gameRecord.turn === "w" ? Number(gameRecord.white_player_id) : Number(gameRecord.black_player_id);
    if (Number(playerId) !== expectedPlayerId) return res.json({ success: false, error: "It is not your turn." });

    const chess = new Chess(gameRecord.fen || START_FEN);
    const move = chess.move({ from, to, promotion: "q" });
    if (!move) return res.json({ success: false, error: "Illegal move." });

    let status = "active";
    let result = "pending";
    if (chess.isCheckmate()) {
      status = "finished";
      result = chess.turn() === "w" ? "black_win" : "white_win";
    } else if (chess.isDraw()) {
      status = "finished";
      result = "draw";
    }

    const moveCount = await one(`SELECT COUNT(*) AS count FROM live_moves WHERE game_id = ?`, [gameId]);
    const moveNumber = Number(moveCount?.count || 0) + 1;

    await run(`
      INSERT INTO live_moves (game_id, move_number, player_id, from_square, to_square, san, fen_after)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [gameId, moveNumber, Number(playerId), from, to, move.san, chess.fen()]);

    await run(`
      UPDATE live_games SET fen = ?, pgn = ?, status = ?, result = ?, turn = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [chess.fen(), chess.pgn(), status, result, chess.turn(), gameId]);

    if (status === "finished") await updateRatings(gameRecord, result);

    res.json({ success: true, fen: chess.fen(), status, result, turn: chess.turn() });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: "Move failed." });
  }
});

app.get("/student", (req, res) => {
  res.redirect("/login");
});

app.use((req, res) => res.status(404).send("<h1>404</h1><p>Page not found.</p>"));

app.listen(PORT, () => console.log(`Chess Club Live Play running on port ${PORT}`));
