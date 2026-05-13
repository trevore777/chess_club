import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { all, one, run } from "./lib/db.js";
import { Chess } from "chess.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* -----------------------------
   Helpers
----------------------------- */

function fenToSquares(fen = START_FEN) {
  const pieceMap = {
    p: "♟",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    P: "♙",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔"
  };

  const rows = String(fen || START_FEN).split(" ")[0].split("/");
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const squares = [];

  rows.forEach((row, rowIndex) => {
    let fileIndex = 0;

    for (const char of row) {
      if (/[1-8]/.test(char)) {
        for (let i = 0; i < Number(char); i++) {
          const rank = 8 - rowIndex;
          const file = files[fileIndex];

          squares.push({
            id: `${file}${rank}`,
            piece: "",
            color: (rowIndex + fileIndex) % 2 === 0 ? "light" : "dark"
          });

          fileIndex++;
        }
      } else {
        const rank = 8 - rowIndex;
        const file = files[fileIndex];

        squares.push({
          id: `${file}${rank}`,
          piece: pieceMap[char] || "",
          color: (rowIndex + fileIndex) % 2 === 0 ? "light" : "dark"
        });

        fileIndex++;
      }
    }
  });

  return squares;
}

async function getLeaderboard() {
  return all(`
    SELECT
      id,
      name,
      username,
      COALESCE(points, 0) AS points,
      COALESCE(wins, 0) AS wins,
      COALESCE(draws, 0) AS draws,
      COALESCE(losses, 0) AS losses,
      COALESCE(rating, 1200) AS rating
    FROM users
    WHERE role = 'student'
    ORDER BY points DESC, wins DESC, rating DESC, name ASC
  `);
}

async function getRecentMatches() {
  return all(`
    SELECT
      m.*,
      c.name AS competition_name,
      w.name AS white_name,
      b.name AS black_name
    FROM matches m
    LEFT JOIN competitions c ON c.id = m.competition_id
    LEFT JOIN users w ON w.id = m.white_player_id
    LEFT JOIN users b ON b.id = m.black_player_id
    ORDER BY m.id DESC
    LIMIT 20
  `);
}

async function getFeaturedMatch() {
  return one(`
    SELECT
      m.*,
      c.name AS competition_name,
      w.name AS white_name,
      b.name AS black_name
    FROM matches m
    LEFT JOIN competitions c ON c.id = m.competition_id
    LEFT JOIN users w ON w.id = m.white_player_id
    LEFT JOIN users b ON b.id = m.black_player_id
    WHERE m.featured = 1
    ORDER BY m.id DESC
    LIMIT 1
  `);
}

async function getBoardForMatch(matchId) {
  let board = await one(
    `SELECT * FROM game_boards WHERE match_id = ? LIMIT 1`,
    [matchId]
  );

  if (!board) {
    await run(
      `INSERT INTO game_boards (match_id, fen) VALUES (?, ?)`,
      [matchId, START_FEN]
    );

    board = await one(
      `SELECT * FROM game_boards WHERE match_id = ? LIMIT 1`,
      [matchId]
    );
  }

  return board || { match_id: matchId, fen: START_FEN };
}

async function getMovesForMatch(matchId) {
  return all(
    `
    SELECT *
    FROM match_moves
    WHERE match_id = ?
    ORDER BY move_number ASC
    `,
    [matchId]
  );
}

/* -----------------------------
   Auth
----------------------------- */

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (username === "coach" && password === "password123") {
    return res.redirect("/coach");
  }

  if (username === "sam" && password === "password123") {
    return res.redirect("/student");
  }

  return res.status(401).render("login", {
    error: "Invalid username or password."
  });
});

app.get("/logout", (req, res) => {
  res.redirect("/login");
});

/* -----------------------------
   Student
----------------------------- */

app.get("/student", async (req, res) => {
  const currentUser =
    (await one(`SELECT * FROM users WHERE username = ? LIMIT 1`, ["sam"])) || {
      id: 1,
      name: "Sam Student",
      username: "sam",
      role: "student"
    };

  const matches = await all(
    `
    SELECT
      m.*,
      c.name AS competition_name,
      w.name AS white_name,
      b.name AS black_name
    FROM matches m
    LEFT JOIN competitions c ON c.id = m.competition_id
    LEFT JOIN users w ON w.id = m.white_player_id
    LEFT JOIN users b ON b.id = m.black_player_id
    WHERE m.white_player_id = ? OR m.black_player_id = ?
    ORDER BY m.id DESC
    `,
    [currentUser.id, currentUser.id]
  );

  res.render("student-dashboard", {
    currentUser,
    user: currentUser,
    matches
  });
});

/* -----------------------------
   Coach Dashboard
----------------------------- */

app.get("/coach", async (req, res) => {
  const currentUser = {
    id: 999,
    name: "Coach",
    username: "coach",
    role: "coach"
  };

  const students = await one(
    `SELECT COUNT(*) AS count FROM users WHERE role = 'student'`
  );

  const comps = await one(`SELECT COUNT(*) AS count FROM competitions`);

  const active = await one(
    `SELECT COUNT(*) AS count FROM competitions WHERE status = 'active'`
  );

  const leaderboard = await getLeaderboard();
  const recentMatches = await getRecentMatches();
  const featured = await getFeaturedMatch();

  res.render("coach-dashboard", {
    currentUser,
    user: currentUser,
    students: students || { count: 0 },
    comps: comps || { count: 0 },
    active: active || { count: 0 },
    leaderboard,
    recentMatches,
    featured,
    competitions: [],
    message: req.query.message || null
  });
});

/* -----------------------------
   Players / Leaderboard
----------------------------- */

app.get("/players", async (req, res) => {
  const players = await getLeaderboard();

  res.render("players", {
    players,
    students: players
  });
});

app.post("/players/import", async (req, res) => {
  const csv = req.body.csv || "";

  const lines = csv
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const [name, username, rating] = line.split(",").map(v => v.trim());

    if (!name || !username) continue;

    await run(
      `
      INSERT INTO users
        (name, username, password_hash, role, rating, wins, losses, draws, points)
      VALUES
        (?, ?, ?, 'student', ?, 0, 0, 0, 0)
      `,
      [
        name,
        username.toLowerCase(),
        "password123",
        Number(rating) || 1200
      ]
    ).catch(() => {});
  }

  res.redirect("/players");
});


app.post("/players", async (req, res) => {
  const { name, username } = req.body;

  if (name && username) {
    await run(
      `
      INSERT INTO users
        (name, username, password_hash, role, rating, wins, losses, draws, points)
      VALUES
        (?, ?, ?, 'student', 1200, 0, 0, 0, 0)
      `,
      [name, username, "password123"]
    );
  }

  res.redirect("/players");
});

app.get("/leaderboard", async (req, res) => {
  const leaderboard = await getLeaderboard();

  const currentUser = {
    role: "student"
  };

  res.render("leaderboard", {
    currentUser,
    leaderboard,
    players: leaderboard
  });
});

/* -----------------------------
   Competitions
----------------------------- */

app.post("/competitions", async (req, res) => {
  const name = req.body.name || "Chess Club Competition";

  await run(
    `INSERT INTO competitions (name, status) VALUES (?, 'active')`,
    [name]
  );

  const comp = await one(
    `SELECT * FROM competitions ORDER BY id DESC LIMIT 1`
  );

  const players = await getLeaderboard();

  let boardNumber = 1;

  for (let i = 0; i < players.length; i += 2) {
    const white = players[i];
    const black = players[i + 1] || null;

    await run(
      `
      INSERT INTO matches
        (competition_id, round_number, board_number, white_player_id, black_player_id, result, featured)
      VALUES
        (?, 1, ?, ?, ?, 'pending', 0)
      `,
      [comp.id, boardNumber, white?.id || null, black?.id || null]
    );

    boardNumber++;
  }

  res.redirect("/coach");
});

/* -----------------------------
   Match Result / Feature
----------------------------- */

app.post("/matches/:id/result", async (req, res) => {
  const matchId = req.params.id;
  const { result } = req.body;

  const match = await one(`SELECT * FROM matches WHERE id = ?`, [matchId]);

  if (!match) {
    return res.redirect("/coach");
  }

  await run(`UPDATE matches SET result = ? WHERE id = ?`, [result, matchId]);

  if (result === "white_win" && match.white_player_id) {
    await run(
      `
      UPDATE users
      SET wins = COALESCE(wins, 0) + 1,
          points = COALESCE(points, 0) + 1,
          rating = COALESCE(rating, 1200) + 15
      WHERE id = ?
      `,
      [match.white_player_id]
    );

    if (match.black_player_id) {
      await run(
        `
        UPDATE users
        SET losses = COALESCE(losses, 0) + 1,
            rating = COALESCE(rating, 1200) - 10
        WHERE id = ?
        `,
        [match.black_player_id]
      );
    }
  }

  if (result === "black_win" && match.black_player_id) {
    await run(
      `
      UPDATE users
      SET wins = COALESCE(wins, 0) + 1,
          points = COALESCE(points, 0) + 1,
          rating = COALESCE(rating, 1200) + 15
      WHERE id = ?
      `,
      [match.black_player_id]
    );

    if (match.white_player_id) {
      await run(
        `
        UPDATE users
        SET losses = COALESCE(losses, 0) + 1,
            rating = COALESCE(rating, 1200) - 10
        WHERE id = ?
        `,
        [match.white_player_id]
      );
    }
  }

  if (result === "draw") {
    if (match.white_player_id) {
      await run(
        `
        UPDATE users
        SET draws = COALESCE(draws, 0) + 1,
            points = COALESCE(points, 0) + 0.5
        WHERE id = ?
        `,
        [match.white_player_id]
      );
    }

    if (match.black_player_id) {
      await run(
        `
        UPDATE users
        SET draws = COALESCE(draws, 0) + 1,
            points = COALESCE(points, 0) + 0.5
        WHERE id = ?
        `,
        [match.black_player_id]
      );
    }
  }

  res.redirect("/coach");
});

app.post("/matches/:id/feature", async (req, res) => {
  await run(`UPDATE matches SET featured = 0`);
  await run(`UPDATE matches SET featured = 1 WHERE id = ?`, [req.params.id]);

  res.redirect("/coach");
});

/* -----------------------------
   Board Control
----------------------------- */

app.get("/matches/:id/board", async (req, res) => {
  const match = await one(
    `
    SELECT
      m.*,
      c.name AS competition_name,
      w.name AS white_name,
      b.name AS black_name
    FROM matches m
    LEFT JOIN competitions c ON c.id = m.competition_id
    LEFT JOIN users w ON w.id = m.white_player_id
    LEFT JOIN users b ON b.id = m.black_player_id
    WHERE m.id = ?
    LIMIT 1
    `,
    [req.params.id]
  );

  if (!match) {
    return res.status(404).render("404");
  }

  const board = await getBoardForMatch(match.id);
  const moves = await getMovesForMatch(match.id);
  const squares = fenToSquares(board.fen);

  res.render("board-control", {
    match,
    board,
    moves,
    squares
  });
});

app.post("/matches/:id/board", async (req, res) => {
  const matchId = req.params.id;
  const { fen, from_square, to_square, piece } = req.body;

  const existing = await one(
    `SELECT * FROM game_boards WHERE match_id = ? LIMIT 1`,
    [matchId]
  );

  if (existing) {
    await run(
      `
      UPDATE game_boards
      SET fen = ?, updated_at = CURRENT_TIMESTAMP
      WHERE match_id = ?
      `,
      [fen || START_FEN, matchId]
    );
  } else {
    await run(
      `INSERT INTO game_boards (match_id, fen) VALUES (?, ?)`,
      [matchId, fen || START_FEN]
    );
  }

  if (from_square && to_square && piece) {
    const lastMove = await one(
      `
      SELECT MAX(move_number) AS maxMove
      FROM match_moves
      WHERE match_id = ?
      `,
      [matchId]
    );

    const nextMove = Number(lastMove?.maxMove || 0) + 1;

    await run(
      `
      INSERT INTO match_moves
        (match_id, move_number, from_square, to_square, piece, fen_after)
      VALUES
        (?, ?, ?, ?, ?, ?)
      `,
      [matchId, nextMove, from_square, to_square, piece, fen || START_FEN]
    );
  }

  res.redirect(`/matches/${matchId}/board`);
});

app.post("/matches/:id/board/reset", async (req, res) => {
  const matchId = req.params.id;

  await run(`DELETE FROM match_moves WHERE match_id = ?`, [matchId]);

  const existing = await one(
    `SELECT * FROM game_boards WHERE match_id = ? LIMIT 1`,
    [matchId]
  );

  if (existing) {
    await run(
      `
      UPDATE game_boards
      SET fen = ?, updated_at = CURRENT_TIMESTAMP
      WHERE match_id = ?
      `,
      [START_FEN, matchId]
    );
  } else {
    await run(
      `INSERT INTO game_boards (match_id, fen) VALUES (?, ?)`,
      [matchId, START_FEN]
    );
  }

  res.redirect(`/matches/${matchId}/board`);
});

/* -----------------------------
   Show Screens
----------------------------- */

app.get("/show", async (req, res) => {
  const match = await getFeaturedMatch();
  const leaderboard = await getLeaderboard();

  if (!match) {
    return res.render("show-screen", {
      match: null,
      board: { fen: START_FEN },
      moves: [],
      squares: fenToSquares(START_FEN),
      leaderboard
    });
  }

  const board = await getBoardForMatch(match.id);
  const moves = await getMovesForMatch(match.id);
  const squares = fenToSquares(board.fen);

  res.render("show-screen", {
    match,
    board,
    moves,
    squares,
    leaderboard
  });
});

app.get("/show/board/:id", async (req, res) => {
  const match = await one(
    `
    SELECT
      m.*,
      c.name AS competition_name,
      w.name AS white_name,
      b.name AS black_name
    FROM matches m
    LEFT JOIN competitions c ON c.id = m.competition_id
    LEFT JOIN users w ON w.id = m.white_player_id
    LEFT JOIN users b ON b.id = m.black_player_id
    WHERE m.id = ?
    LIMIT 1
    `,
    [req.params.id]
  );

  if (!match) {
    return res.status(404).render("404");
  }

  const board = await getBoardForMatch(match.id);
  const moves = await getMovesForMatch(match.id);
  const leaderboard = await getLeaderboard();
  const squares = fenToSquares(board.fen);

  res.render("show-screen", {
    match,
    board,
    moves,
    squares,
    leaderboard
  });
});


app.post("/api/matches/:id/move", async (req, res) => {
  try {
    const matchId = req.params.id;
    const { from, to } = req.body;

    const board = await getBoardForMatch(matchId);

    const game = new Chess(board.fen || START_FEN);

    const move = game.move({
      from,
      to,
      promotion: "q"
    });

    if (!move) {
      return res.json({
        success: false,
        error: "Illegal move"
      });
    }

    const newFen = game.fen();

    await run(
      `
      UPDATE game_boards
      SET fen = ?, updated_at = CURRENT_TIMESTAMP
      WHERE match_id = ?
      `,
      [newFen, matchId]
    );

    const lastMove = await one(
      `
      SELECT MAX(move_number) AS maxMove
      FROM match_moves
      WHERE match_id = ?
      `,
      [matchId]
    );

    const nextMove = Number(lastMove?.maxMove || 0) + 1;

    await run(
      `
      INSERT INTO match_moves
      (
        match_id,
        move_number,
        from_square,
        to_square,
        piece,
        fen_after
      )
      VALUES
      (?, ?, ?, ?, ?, ?)
      `,
      [
        matchId,
        nextMove,
        from,
        to,
        move.piece,
        newFen
      ]
    );

    let result = "pending";

    if (game.isCheckmate()) {
      result = game.turn() === "w"
        ? "black_win"
        : "white_win";
    }

    if (game.isDraw()) {
      result = "draw";
    }

    await run(
      `UPDATE matches SET result = ? WHERE id = ?`,
      [result, matchId]
    );

    return res.json({
      success: true,
      fen: newFen,
      check: game.inCheck(),
      checkmate: game.isCheckmate(),
      draw: game.isDraw(),
      turn: game.turn()
    });
  } catch (err) {
    console.error(err);

    return res.json({
      success: false,
      error: "Move failed"
    });
  }
});



async function getCompetitionSummaries() {
  return all(`
    SELECT
      c.id,
      c.name,
      c.status,
      COALESCE(MAX(m.round_number), 0) AS latest_round,
      SUM(CASE WHEN m.result = 'pending' THEN 1 ELSE 0 END) AS pending_matches
    FROM competitions c
    LEFT JOIN matches m ON m.competition_id = c.id
    GROUP BY c.id, c.name, c.status
    ORDER BY c.id DESC
  `);
}

async function getCompetitionPlayers(competitionId) {
  return all(`
    SELECT DISTINCT
      u.id,
      u.name,
      u.username,
      COALESCE(u.rating, 1200) AS rating
    FROM users u
    JOIN matches m
      ON m.white_player_id = u.id
      OR m.black_player_id = u.id
    WHERE m.competition_id = ?
      AND u.role = 'student'
    ORDER BY u.name ASC
  `, [competitionId]);
}

async function getCompetitionScores(competitionId) {
  const players = await getCompetitionPlayers(competitionId);

  const scores = players.map((p) => ({
    ...p,
    competition_points: 0,
    opponents: new Set(),
    had_bye: false
  }));

  const byId = new Map(scores.map((p) => [Number(p.id), p]));

  const matches = await all(
    `SELECT * FROM matches WHERE competition_id = ? ORDER BY round_number ASC, board_number ASC`,
    [competitionId]
  );

  for (const m of matches) {
    const whiteId = m.white_player_id ? Number(m.white_player_id) : null;
    const blackId = m.black_player_id ? Number(m.black_player_id) : null;

    if (whiteId && blackId) {
      byId.get(whiteId)?.opponents.add(blackId);
      byId.get(blackId)?.opponents.add(whiteId);
    }

    if (whiteId && !blackId) {
      const p = byId.get(whiteId);
      if (p) {
        p.had_bye = true;
        if (m.result === "white_win") p.competition_points += 1;
      }
    }

    if (m.result === "white_win" && whiteId && blackId) byId.get(whiteId).competition_points += 1;
    if (m.result === "black_win" && whiteId && blackId) byId.get(blackId).competition_points += 1;
    if (m.result === "draw" && whiteId && blackId) {
      byId.get(whiteId).competition_points += 0.5;
      byId.get(blackId).competition_points += 0.5;
    }
  }

  return scores.sort((a, b) => {
    if (b.competition_points !== a.competition_points) return b.competition_points - a.competition_points;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.name.localeCompare(b.name);
  });
}

function buildSwissPairings(players) {
  const remaining = [...players];
  const pairings = [];

  if (remaining.length % 2 === 1) {
    let byeIndex = -1;

    for (let i = remaining.length - 1; i >= 0; i--) {
      if (!remaining[i].had_bye) {
        byeIndex = i;
        break;
      }
    }

    if (byeIndex === -1) byeIndex = remaining.length - 1;

    const byePlayer = remaining.splice(byeIndex, 1)[0];
    pairings.push({ white: byePlayer, black: null, bye: true });
  }

  while (remaining.length > 0) {
    const white = remaining.shift();

    let opponentIndex = remaining.findIndex((p) => !white.opponents.has(Number(p.id)));
    if (opponentIndex === -1) opponentIndex = 0;

    const black = remaining.splice(opponentIndex, 1)[0];
    pairings.push({ white, black, bye: false });
  }

  return pairings;
}


const competitions = await getCompetitionSummaries();


app.post("/competitions/:id/next-round", async (req, res) => {
  const competitionId = req.params.id;

  const competition = await one(
    `SELECT * FROM competitions WHERE id = ? LIMIT 1`,
    [competitionId]
  );

  if (!competition) {
    return res.redirect("/coach?message=Competition not found");
  }

  const latest = await one(
    `SELECT COALESCE(MAX(round_number), 0) AS latest_round FROM matches WHERE competition_id = ?`,
    [competitionId]
  );

  const latestRound = Number(latest?.latest_round || 0);

  if (latestRound === 0) {
    return res.redirect("/coach?message=Create Round 1 first");
  }

  const pending = await one(
    `SELECT COUNT(*) AS count FROM matches WHERE competition_id = ? AND round_number = ? AND result = 'pending'`,
    [competitionId, latestRound]
  );

  if (Number(pending?.count || 0) > 0) {
    return res.redirect(`/coach?message=Finish all Round ${latestRound} results before generating the next round`);
  }

  const alreadyNext = await one(
    `SELECT COUNT(*) AS count FROM matches WHERE competition_id = ? AND round_number = ?`,
    [competitionId, latestRound + 1]
  );

  if (Number(alreadyNext?.count || 0) > 0) {
    return res.redirect(`/coach?message=Round ${latestRound + 1} already exists`);
  }

  const players = await getCompetitionScores(competitionId);

  if (players.length < 2) {
    return res.redirect("/coach?message=Not enough players to generate next round");
  }

  const pairings = buildSwissPairings(players);

  let boardNumber = 1;

  for (const pairing of pairings) {
    await run(
      `INSERT INTO matches
        (competition_id, round_number, board_number, white_player_id, black_player_id, result, featured)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        competitionId,
        latestRound + 1,
        boardNumber,
        pairing.white?.id || null,
        pairing.black?.id || null,
        pairing.bye ? "white_win" : "pending"
      ]
    );

    boardNumber++;
  }

  res.redirect(`/coach?message=Round ${latestRound + 1} generated`);
});


/* -----------------------------
   404
----------------------------- */

app.use((req, res) => {
  res.status(404).render("404");
});

app.listen(PORT, () => {
  console.log(`Chess Club app running on port ${PORT}`);
});