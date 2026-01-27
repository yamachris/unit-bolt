import type { Card, Phase, Suit, GameState } from "../../types/game";

export interface GameStore extends GameState {
  // Card Actions
  selectCard: (card: Card) => void;
  handleDiscard: (card: Card) => void;
  handleDrawCard: () => void;
  exchangeCards: (card1: Card, card2: Card) => void;
  handleJokerAction: (joker: Card, action: "heal" | "attack") => void;

  // Column Actions
  handleCardPlace: (suit: Suit) => void;

  // Game Flow Actions
  setPhase: (phase: Phase) => void;
  handleStrategicShuffle: () => void;
  canUseStrategicShuffle: () => boolean;
  confirmStrategicShuffle: () => void;

  // Utility Actions
  getState: () => GameStore;
  initializeGame: () => void;
}
