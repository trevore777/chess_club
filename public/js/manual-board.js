const board = document.querySelector("[data-board]");
const saveForm = document.querySelector("[data-board-form]");
const fenInput = document.querySelector("[name='fen']");

let selectedSquare = null;

board.addEventListener("click", (event) => {
  const square = event.target.closest(".board-square");
  if (!square) return;

  if (!selectedSquare) {
    if (!square.textContent.trim()) return;

    selectedSquare = square;
    square.classList.add("selected");
    return;
  }

  if (selectedSquare === square) {
    selectedSquare.classList.remove("selected");
    selectedSquare = null;
    return;
  }

  square.textContent = selectedSquare.textContent;
  selectedSquare.textContent = "";
  selectedSquare.classList.remove("selected");
  selectedSquare = null;

  updateFenAndSave();
});

function updateFenAndSave() {
  const squares = [...document.querySelectorAll(".board-square")];

  const pieceMap = {
    "♔": "K",
    "♕": "Q",
    "♖": "R",
    "♗": "B",
    "♘": "N",
    "♙": "P",
    "♚": "k",
    "♛": "q",
    "♜": "r",
    "♝": "b",
    "♞": "n",
    "♟": "p"
  };

  let fenRows = [];

  for (let row = 0; row < 8; row++) {
    let fenRow = "";
    let empty = 0;

    for (let col = 0; col < 8; col++) {
      const piece = squares[row * 8 + col].textContent.trim();

      if (!piece) {
        empty++;
      } else {
        if (empty > 0) {
          fenRow += empty;
          empty = 0;
        }

        fenRow += pieceMap[piece] || "";
      }
    }

    if (empty > 0) fenRow += empty;
    fenRows.push(fenRow);
  }

  fenInput.value = `${fenRows.join("/")} w - - 0 1`;

  if (saveForm) {
    saveForm.submit();
  }
}