const board = document.querySelector("[data-board]");

let selectedSquare = null;

if (board) {
  board.addEventListener("click", async (event) => {
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

    const from = selectedSquare.dataset.square;
    const to = square.dataset.square;

    selectedSquare.classList.remove("selected");
    selectedSquare = null;

    const matchId = window.location.pathname.split("/")[2];

    const response = await fetch(`/api/matches/${matchId}/move`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to
      })
    });

    const data = await response.json();

    if (!data.success) {
      alert(data.error || "Illegal move");
      return;
    }

    location.reload();
  });
}