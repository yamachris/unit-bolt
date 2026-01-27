import { useCallback } from "react";
import { Card, Player } from "../types/game";

export function useCardManagement() {
  const MAX_HAND_SIZE = 5;
  const MAX_RESERVE_SIZE = 2;
  const MAX_TOTAL_CARDS = 7;

  const checkCardLimit = useCallback((player: Player): boolean => {
    return player.hand.length + player.reserve.length > MAX_TOTAL_CARDS;
  }, []);

  const canAddToReserve = useCallback((player: Player): boolean => {
    return player.reserve.length < MAX_RESERVE_SIZE;
  }, []);

  const canAddToHand = useCallback((player: Player): boolean => {
    return player.hand.length < MAX_HAND_SIZE;
  }, []);

  const mustDiscard = useCallback((player: Player): boolean => {
    return player.hand.length + player.reserve.length > MAX_TOTAL_CARDS;
  }, []);

  const discardCard = useCallback((player: Player, card: Card): Player => {
    const isInHand = player.hand.some((c) => c.id === card.id);
    const isInReserve = player.reserve.some((c) => c.id === card.id);

    if (!isInHand && !isInReserve) return player;

    return {
      ...player,
      hand: isInHand
        ? player.hand.filter((c) => c.id !== card.id)
        : player.hand,
      reserve: isInReserve
        ? player.reserve.filter((c) => c.id !== card.id)
        : player.reserve,
      discardPile: [...player.discardPile, card],
    };
  }, []);

  const drawCard = useCallback(
    (
      player: Player,
      deck: Card[],
      toReserve: boolean = false,
    ): { player: Player; deck: Card[] } => {
      if (deck.length === 0) return { player, deck };

      const [newCard, ...remainingDeck] = deck;
      const totalCards = player.hand.length + player.reserve.length;

      if (totalCards >= MAX_TOTAL_CARDS) {
        return { player, deck };
      }

      if (toReserve && player.reserve.length >= MAX_RESERVE_SIZE) {
        return { player, deck };
      }

      if (!toReserve && player.hand.length >= MAX_HAND_SIZE) {
        return { player, deck };
      }

      return {
        player: {
          ...player,
          hand: toReserve ? player.hand : [...player.hand, newCard],
          reserve: toReserve ? [...player.reserve, newCard] : player.reserve,
        },
        deck: remainingDeck,
      };
    },
    [],
  );

  return {
    checkCardLimit,
    canAddToReserve,
    canAddToHand,
    mustDiscard,
    discardCard,
    drawCard,
    MAX_HAND_SIZE,
    MAX_RESERVE_SIZE,
    MAX_TOTAL_CARDS,
  };
}
