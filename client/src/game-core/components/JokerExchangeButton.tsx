import React, { useEffect, useState } from "react";
import { Card, Suit } from "../types/game";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "../utils/cn";
import { useGameStore } from "../store/GameStore";

export function JokerExchangeButton() {
  const { t } = useTranslation();
  const {
    currentPlayer,
    phase,
    hasPlayedAction,
    columns,
    displayJokerExchangePopup,
    turn,
  } = useGameStore();

  const [displayExchangeJoker, setDisplayExchangeJoker] = useState(false);

  const [availableCards, setAvailablecards] = useState<Card[]>([]);

  useEffect(() => {
    const whereJokerArePresent: {
      suit: Suit;
      index: number;
    }[] = [];

    Object.values(columns).flatMap((column) =>
      column.cards.map((card, index) => {
        if (card.value == "JOKER") {
          whereJokerArePresent.push({
            suit: column.cards[0].suit,
            index: index,
          });
        }
      }),
    );

    const availableCardsHand: Card[] = [];
    const availableCardsReserve: Card[] = [];

    if (whereJokerArePresent && whereJokerArePresent.length > 0) {
      whereJokerArePresent.map((position) => {
        availableCardsHand.push(
          ...currentPlayer.hand.filter(
            (card) =>
              card.suit === position.suit &&
              card.value == (position.index + 1).toString(),
          ),
        );

        availableCardsReserve.push(
          ...currentPlayer.reserve.filter(
            (card) =>
              card.suit === position.suit &&
              card.value == (position.index + 1).toString(),
          ),
        );
      });
    }

    if (availableCardsHand.length + availableCardsReserve.length > 0) {
      const temp = availableCardsHand;
      temp.push(...availableCardsReserve);
      setAvailablecards(
        temp.map((card: Card) => ({ ...card, isSelected: false })),
      );

      setDisplayExchangeJoker(true);
    } else if (displayExchangeJoker) {
      setDisplayExchangeJoker(false);
    }
  }, [turn, currentPlayer, columns, displayExchangeJoker]);

  const canExchange = phase === "PLAY" && !hasPlayedAction;

  const handleExchangeClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    displayJokerExchangePopup(availableCards);
  };

  return (
    displayExchangeJoker && (
      <button
        onClick={handleExchangeClick}
        disabled={!canExchange}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors",
          canExchange
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
          "hover:bg-blue-200 dark:hover:bg-blue-800",
        )}
        title={t("game.actions.exchange")}
      >
        <ArrowLeftRight className="w-4 h-4" />
        {/* <span>{t("game.actions.exchange")}</span> */}
        <span>Joker</span>
      </button>
    )
  );
}
