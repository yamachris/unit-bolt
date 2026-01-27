import { Card, Phase, CardColor } from "../types/game";

export function getCardColor(card: Card): CardColor {
  if (card.type === "JOKER") {
    return card.color;
  }
  return ["HEARTS", "DIAMONDS"].includes(card.suit) ? "red" : "black";
}

export function getPhaseMessage(
  t: (key: string) => string,
  phase: Phase,
  hasDiscarded: boolean,
  hasDrawn: boolean,
  hasPlayedAction: boolean,
  playedCardsLastTurn: number,
  turn: number,
): string {
  switch (phase) {
    case "DISCARD":
      if (turn === 1) {
        return t("game.ui.startMessage");
      }
      return hasDiscarded ? "" : t("game.messages.discardPhase");

    case "DRAW":
      return hasDrawn ? "" : t("game.messages.drawPhase");

    case "PLAY":
      if (hasPlayedAction) {
        return t("game.messages.canEndTurn");
      }
      return t("game.messages.actionPhase");

    default:
      return "";
  }
}
