import { useCallback } from "react";
import { Card, Player } from "../types/game";

export function useCardLimits() {
  const MAX_HAND_CARDS = 5;
  const MAX_RESERVE_CARDS = 2;
  const MAX_TOTAL_CARDS = MAX_HAND_CARDS + MAX_RESERVE_CARDS;

  const checkCardLimit = useCallback(
    (player: Player): boolean => {
      return player.hand.length + player.reserve.length > MAX_TOTAL_CARDS;
    },
    [MAX_TOTAL_CARDS],
  );

  const mustDiscard = useCallback(
    (player: Player): boolean => {
      return checkCardLimit(player);
    },
    [checkCardLimit],
  );

  const canDrawCard = useCallback(
    (player: Player, toReserve: boolean = false): boolean => {
      const totalCards = player.hand.length + player.reserve.length;

      if (totalCards >= MAX_TOTAL_CARDS) return false;
      if (toReserve && player.reserve.length >= MAX_RESERVE_CARDS) return false;
      if (!toReserve && player.hand.length >= MAX_HAND_CARDS) return false;

      return true;
    },
    [MAX_TOTAL_CARDS, MAX_RESERVE_CARDS, MAX_HAND_CARDS],
  );

  const handleDiscard = useCallback((player: Player, card: Card): Player => {
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

  const handleDraw = useCallback(
    (
      player: Player,
      deck: Card[],
      toReserve: boolean = false,
    ): { player: Player; deck: Card[] } => {
      if (!canDrawCard(player, toReserve) || deck.length === 0) {
        return { player, deck };
      }

      const [newCard, ...remainingDeck] = deck;

      return {
        player: {
          ...player,
          hand: toReserve ? player.hand : [...player.hand, newCard],
          reserve: toReserve ? [...player.reserve, newCard] : player.reserve,
        },
        deck: remainingDeck,
      };
    },
    [canDrawCard],
  );

  const adjustHandSize = useCallback((player: Player): Player => {
    if (player.hand.length <= MAX_HAND_CARDS) return player;

    const excessCards = player.hand.slice(MAX_HAND_CARDS);
    const newHand = player.hand.slice(0, MAX_HAND_CARDS);

    return {
      ...player,
      hand: newHand,
      discardPile: [...player.discardPile, ...excessCards],
    };
  }, []);

  return {
    checkCardLimit,
    mustDiscard,
    canDrawCard,
    handleDiscard,
    handleDraw,
    adjustHandSize,
    MAX_HAND_CARDS,
    MAX_RESERVE_CARDS,
    MAX_TOTAL_CARDS,
  };
}
