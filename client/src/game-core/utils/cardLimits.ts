import { Player } from "../types/game";

export const MAX_HAND_SIZE = 5;
export const MAX_RESERVE_SIZE = 2;
export const MAX_TOTAL_CARDS = 7;

export function needsToDiscard(player: Player): boolean {
  const totalCards = player.hand.length + player.reserve.length;
  return totalCards > MAX_TOTAL_CARDS;
}

export function canDrawCards(player: Player): number {
  const totalCards = player.hand.length + player.reserve.length;
  if (totalCards >= MAX_TOTAL_CARDS) return 0;

  const handSpace = MAX_HAND_SIZE - player.hand.length;
  return Math.min(handSpace, MAX_TOTAL_CARDS - totalCards);
}

export function canAddToReserve(player: Player): boolean {
  return (
    player.reserve.length < MAX_RESERVE_SIZE &&
    player.hand.length + player.reserve.length < MAX_TOTAL_CARDS
  );
}

export function getRequiredDraws(player: Player): number {
  const totalCards = player.hand.length + player.reserve.length;
  if (totalCards >= MAX_TOTAL_CARDS) return 0;

  const handSpace = MAX_HAND_SIZE - player.hand.length;
  return Math.min(handSpace, MAX_TOTAL_CARDS - totalCards);
}
