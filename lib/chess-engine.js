import { Chess } from "chess.js";

export function validateMove(fen, from, to, promotion = "q") {
  const game = new Chess(fen);

  const move = game.move({
    from,
    to,
    promotion
  });

  if (!move) {
    return {
      valid: false,
      error: "Illegal move"
    };
  }

  return {
    valid: true,
    fen: game.fen(),
    pgn: game.pgn(),
    check: game.inCheck(),
    checkmate: game.isCheckmate(),
    draw: game.isDraw(),
    turn: game.turn()
  };
}
