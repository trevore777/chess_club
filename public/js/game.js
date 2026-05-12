const board = document.querySelector("[data-board]");
const gameId = document.body.dataset.gameId;
const currentUserId = Number(document.body.dataset.userId || 0);
let selectedSquare = null;

board?.addEventListener("click", async (event) => {
  const square = event.target.closest(".board-square");
  if (!square) return;

  if (!selectedSquare) {
    if (!square.textContent.trim()) return;
    selectedSquare = square;
    selectedSquare.classList.add("selected");
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

  const response = await fetch(`/api/games/${gameId}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, playerId: currentUserId })
  });

  const data = await response.json();
  if (!data.success) {
    alert(data.error || "Move failed");
    return;
  }
  location.reload();
});

setInterval(async () => {
  const response = await fetch(`/api/games/${gameId}/state`);
  const data = await response.json();
  if (!data.success) return;
  if (data.fen !== document.body.dataset.fen || data.status !== document.body.dataset.status) {
    location.reload();
  }
}, 3000);
