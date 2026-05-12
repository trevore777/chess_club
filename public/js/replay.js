const moveItems = [...document.querySelectorAll("[data-fen-after]")];
const board = document.querySelector("[data-board]");

let currentIndex = moveItems.length - 1;

const pieceMap = {
  p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
  P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
};

function renderFen(fen) {
  if (!board || !fen) return;

  const squares = [...board.querySelectorAll(".board-square")];
  squares.forEach(sq => sq.textContent = "");

  const rows = fen.split(" ")[0].split("/");
  let index = 0;

  rows.forEach(row => {
    for (const char of row) {
      if (/[1-8]/.test(char)) {
        index += Number(char);
      } else {
        if (squares[index]) {
          squares[index].textContent = pieceMap[char] || "";
        }
        index++;
      }
    }
  });
}

function showMove(index) {
  if (!moveItems.length) return;

  currentIndex = Math.max(0, Math.min(index, moveItems.length - 1));

  const fen = moveItems[currentIndex].dataset.fenAfter;
  renderFen(fen);

  moveItems.forEach(item => item.classList.remove("selected"));
  moveItems[currentIndex].classList.add("selected");
}

document.querySelector("[data-start]")?.addEventListener("click", () => {
  showMove(0);
});

document.querySelector("[data-prev]")?.addEventListener("click", () => {
  showMove(currentIndex - 1);
});

document.querySelector("[data-next]")?.addEventListener("click", () => {
  showMove(currentIndex + 1);
});

document.querySelector("[data-latest]")?.addEventListener("click", () => {
  showMove(moveItems.length - 1);
});