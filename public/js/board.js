const PIECES = {
  p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
  P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
};

function fenToArray(fen) {
  const rows = (fen || '').split('/');
  const board = [];
  for (const row of rows) {
    const cells = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) cells.push('');
      } else {
        cells.push(ch);
      }
    }
    while (cells.length < 8) cells.push('');
    board.push(cells.slice(0, 8));
  }
  while (board.length < 8) board.push(['','','','','','','','']);
  return board.slice(0, 8);
}

function arrayToFen(board) {
  return board.map(row => {
    let out = '';
    let empty = 0;
    for (const cell of row) {
      if (!cell) empty++;
      else {
        if (empty) out += empty;
        empty = 0;
        out += cell;
      }
    }
    if (empty) out += empty;
    return out;
  }).join('/');
}

function renderBoard(el) {
  const isControl = !!document.getElementById('fen');
  let board = fenToArray(el.dataset.fen);
  let selected = null;

  function draw() {
    el.innerHTML = '';
    board.forEach((row, r) => {
      row.forEach((piece, c) => {
        const sq = document.createElement('button');
        sq.type = 'button';
        sq.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
        if (selected && selected.r === r && selected.c === c) sq.classList.add('selected');
        sq.dataset.r = r;
        sq.dataset.c = c;
        sq.textContent = PIECES[piece] || '';
        if (!isControl) sq.disabled = true;
        sq.addEventListener('click', () => clickSquare(r, c));
        el.appendChild(sq);
      });
    });
    const fenInput = document.getElementById('fen');
    if (fenInput) fenInput.value = arrayToFen(board);
  }

  function clickSquare(r, c) {
    if (!isControl) return;
    if (!selected) {
      if (!board[r][c]) return;
      selected = { r, c };
      draw();
      return;
    }
    if (selected.r === r && selected.c === c) {
      selected = null;
      draw();
      return;
    }
    board[r][c] = board[selected.r][selected.c];
    board[selected.r][selected.c] = '';
    selected = null;
    draw();
  }

  draw();
}

document.querySelectorAll('.chessboard').forEach(renderBoard);
