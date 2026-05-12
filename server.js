import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { all, one, run } from './lib/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const COOKIE_NAME = 'chess_user_id';
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET || 'dev-secret'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(async (req, res, next) => {
  res.locals.currentUser = null;
  const userId = req.signedCookies?.[COOKIE_NAME];
  if (userId) {
    res.locals.currentUser = await one('SELECT id, name, username, role, rating, wins, losses, draws, points FROM users WHERE id = ?', [userId]);
  }
  next();
});

function requireLogin(req, res, next) {
  if (!res.locals.currentUser) return res.redirect('/login');
  next();
}

function requireCoach(req, res, next) {
  if (!res.locals.currentUser) return res.redirect('/login');
  if (res.locals.currentUser.role !== 'coach') return res.status(403).send('Coach access only.');
  next();
}

async function recalculateRankings() {
  const students = await all("SELECT id FROM users WHERE role = 'student'");
  for (const s of students) {
    await run('UPDATE users SET wins = 0, losses = 0, draws = 0, points = 0, rating = 1200 WHERE id = ?', [s.id]);
  }

  const completed = await all(`
    SELECT white_player_id, black_player_id, result
    FROM matches
    WHERE result IN ('white_win','black_win','draw')
  `);

  for (const m of completed) {
    if (m.result === 'white_win') {
      if (m.white_player_id) await run('UPDATE users SET wins = wins + 1, points = points + 1, rating = rating + 15 WHERE id = ?', [m.white_player_id]);
      if (m.black_player_id) await run('UPDATE users SET losses = losses + 1, rating = rating - 10 WHERE id = ?', [m.black_player_id]);
    }
    if (m.result === 'black_win') {
      if (m.black_player_id) await run('UPDATE users SET wins = wins + 1, points = points + 1, rating = rating + 15 WHERE id = ?', [m.black_player_id]);
      if (m.white_player_id) await run('UPDATE users SET losses = losses + 1, rating = rating - 10 WHERE id = ?', [m.white_player_id]);
    }
    if (m.result === 'draw') {
      if (m.white_player_id) await run('UPDATE users SET draws = draws + 1, points = points + 0.5, rating = rating + 2 WHERE id = ?', [m.white_player_id]);
      if (m.black_player_id) await run('UPDATE users SET draws = draws + 1, points = points + 0.5, rating = rating + 2 WHERE id = ?', [m.black_player_id]);
    }
  }
}

async function getLeaderboard() {
  return all(`
    SELECT id, name, username, wins, losses, draws, points, rating
    FROM users
    WHERE role = 'student'
    ORDER BY points DESC, wins DESC, rating DESC, name ASC
  `);
}

async function getMatchWithNames(matchId) {
  return one(`
    SELECT m.*, c.name AS competition_name,
      w.name AS white_name, b.name AS black_name
    FROM matches m
    JOIN competitions c ON c.id = m.competition_id
    LEFT JOIN users w ON w.id = m.white_player_id
    LEFT JOIN users b ON b.id = m.black_player_id
    WHERE m.id = ?
  `, [matchId]);
}

async function ensureBoard(matchId) {
  const existing = await one('SELECT * FROM game_boards WHERE match_id = ?', [matchId]);
  if (existing) return existing;
  await run('INSERT INTO game_boards (match_id, fen) VALUES (?, ?)', [matchId, START_FEN]);
  return one('SELECT * FROM game_boards WHERE match_id = ?', [matchId]);
}

app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await one('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return res.status(401).render('login', { error: 'Invalid username or password.' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).render('login', { error: 'Invalid username or password.' });

  res.cookie(COOKIE_NAME, user.id, { signed: true, httpOnly: true, sameSite: 'lax' });
  if (user.role === 'coach') return res.redirect('/coach');
  return res.redirect('/student');
});

app.get('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.redirect('/login');
});

app.get('/student', requireLogin, async (req, res) => {
  const currentUser = res.locals.currentUser;
  const matches = await all(`
    SELECT m.*, c.name AS competition_name,
      w.name AS white_name, b.name AS black_name
    FROM matches m
    JOIN competitions c ON c.id = m.competition_id
    LEFT JOIN users w ON w.id = m.white_player_id
    LEFT JOIN users b ON b.id = m.black_player_id
    WHERE m.white_player_id = ? OR m.black_player_id = ?
    ORDER BY c.id DESC, m.round_number, m.board_number
  `, [currentUser.id, currentUser.id]);
  const leaderboard = await getLeaderboard();
  res.render('student-dashboard', { currentUser, matches, leaderboard });
});

app.get('/coach', requireCoach, async (req, res) => {
  const currentUser = res.locals.currentUser;
  const students = await one("SELECT COUNT(*) AS count FROM users WHERE role = 'student'");
  const comps = await one('SELECT COUNT(*) AS count FROM competitions');
  const active = await one("SELECT COUNT(*) AS count FROM competitions WHERE status = 'active'");
  const competitions = await all('SELECT * FROM competitions ORDER BY id DESC');
  const recentMatches = await all(`
    SELECT m.*, c.name AS competition_name,
      w.name AS white_name, b.name AS black_name
    FROM matches m
    JOIN competitions c ON c.id = m.competition_id
    LEFT JOIN users w ON w.id = m.white_player_id
    LEFT JOIN users b ON b.id = m.black_player_id
    ORDER BY m.id DESC LIMIT 20
  `);
  const featured = await one(`
    SELECT m.*, c.name AS competition_name,
      w.name AS white_name, b.name AS black_name
    FROM matches m
    JOIN competitions c ON c.id = m.competition_id
    LEFT JOIN users w ON w.id = m.white_player_id
    LEFT JOIN users b ON b.id = m.black_player_id
    WHERE m.featured = 1 LIMIT 1
  `);
  const leaderboard = await getLeaderboard();
  res.render('coach-dashboard', { currentUser, students, comps, active, competitions, recentMatches, featured, leaderboard });
});

app.get('/players', requireCoach, async (req, res) => {
  const players = await all("SELECT id, name, username, role, rating, wins, losses, draws, points FROM users ORDER BY role, name");
  res.render('players', { players, error: null });
});

app.post('/players', requireCoach, async (req, res) => {
  const { name, username, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password || 'password123', 10);
    await run('INSERT INTO users (name, username, password_hash, role, rating, wins, losses, draws, points) VALUES (?, ?, ?, ?, 1200, 0, 0, 0, 0)', [name, username, hash, role || 'student']);
    res.redirect('/players');
  } catch (err) {
    const players = await all("SELECT id, name, username, role, rating, wins, losses, draws, points FROM users ORDER BY role, name");
    res.status(400).render('players', { players, error: 'Could not add player. Username may already exist.' });
  }
});

app.get('/leaderboard', requireLogin, async (req, res) => {
  const leaderboard = await getLeaderboard();
  res.render('leaderboard', { leaderboard, currentUser: res.locals.currentUser });
});

app.post('/competitions/create', requireCoach, async (req, res) => {
  const name = req.body.name || `Chess Competition ${new Date().toLocaleDateString()}`;
  const insert = await run('INSERT INTO competitions (name, status) VALUES (?, ?)', [name, 'active']);
  const competitionId = Number(insert.lastInsertRowid);
  const students = await all("SELECT id FROM users WHERE role = 'student' ORDER BY points DESC, wins DESC, rating DESC, name ASC");

  for (let i = 0; i < students.length; i += 2) {
    const white = students[i]?.id || null;
    const black = students[i + 1]?.id || null;
    const match = await run('INSERT INTO matches (competition_id, round_number, board_number, white_player_id, black_player_id) VALUES (?, ?, ?, ?, ?)', [competitionId, 1, Math.floor(i / 2) + 1, white, black]);
    await run('INSERT INTO game_boards (match_id, fen) VALUES (?, ?)', [Number(match.lastInsertRowid), START_FEN]);
  }
  res.redirect('/coach');
});

app.post('/matches/:id/result', requireCoach, async (req, res) => {
  const { result } = req.body;
  await run('UPDATE matches SET result = ? WHERE id = ?', [result || 'pending', req.params.id]);
  await recalculateRankings();
  res.redirect('/coach');
});

app.post('/matches/:id/feature', requireCoach, async (req, res) => {
  await run('UPDATE matches SET featured = 0');
  await run('UPDATE matches SET featured = 1 WHERE id = ?', [req.params.id]);
  await ensureBoard(req.params.id);
  res.redirect('/coach');
});

app.get('/matches/:id/board', requireCoach, async (req, res) => {
  const match = await getMatchWithNames(req.params.id);
  if (!match) return res.status(404).render('404');
  const board = await ensureBoard(req.params.id);
  res.render('board-control', { match, board, currentUser: res.locals.currentUser });
});

app.post('/matches/:id/board', requireCoach, async (req, res) => {
  const fen = req.body.fen || START_FEN;
  await ensureBoard(req.params.id);
  await run('UPDATE game_boards SET fen = ?, updated_at = CURRENT_TIMESTAMP WHERE match_id = ?', [fen, req.params.id]);
  res.redirect(`/matches/${req.params.id}/board`);
});

app.post('/matches/:id/board/reset', requireCoach, async (req, res) => {
  await ensureBoard(req.params.id);
  await run('UPDATE game_boards SET fen = ?, updated_at = CURRENT_TIMESTAMP WHERE match_id = ?', [START_FEN, req.params.id]);
  res.redirect(`/matches/${req.params.id}/board`);
});

app.get('/show', async (req, res) => {
  const featured = await one(`
    SELECT m.*, c.name AS competition_name,
      w.name AS white_name, b.name AS black_name
    FROM matches m
    JOIN competitions c ON c.id = m.competition_id
    LEFT JOIN users w ON w.id = m.white_player_id
    LEFT JOIN users b ON b.id = m.black_player_id
    WHERE m.featured = 1 LIMIT 1
  `);
  const leaderboard = await getLeaderboard();
  let board = null;
  if (featured) board = await ensureBoard(featured.id);
  res.render('show-screen', { featured, board, leaderboard });
});

app.get('/show/board/:id', async (req, res) => {
  const featured = await getMatchWithNames(req.params.id);
  if (!featured) return res.status(404).render('404');
  const board = await ensureBoard(req.params.id);
  const leaderboard = await getLeaderboard();
  res.render('show-screen', { featured, board, leaderboard });
});

app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => console.log(`Chess Club app running on port ${PORT}`));
