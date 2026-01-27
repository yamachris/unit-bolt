import React from "react";
import { Card, Suit } from "../types/game";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "../utils/cn";
import { useGameStore } from "../store/GameStore";

interface CardExchangeButtonProps {
  activatorCard: Card;
  currentSuit: Suit;
}

export function CardExchangeButton({
  activatorCard,
  currentSuit,
}: CardExchangeButtonProps) {
  const { t } = useTranslation();
  const {
    currentPlayer,
    phase,
    hasPlayedAction,
    selectedCards,
    handleActivatorExchange,
    columns,
    handleJokerExchange,
  } = useGameStore();

  // Vérifier si le joueur a un 7 ou un Joker dans sa main/réserve
  const hasValidCard = [...currentPlayer.hand, ...currentPlayer.reserve].some(
    (card) =>
      (card.type === "JOKER" || card.value === "7") &&
      (activatorCard.type === "JOKER" || activatorCard.value === "7"),
  );

  //Est ce qu'un joker est utilisé dans la colonne ?
  const isJokerUsedCard = columns[currentSuit].cards.find(
    (card) => card.type === "JOKER",
  );

  //a la place de quelle carte
  let jokerIndex = -1;
  if (isJokerUsedCard)
    jokerIndex = columns[currentSuit].cards.indexOf(isJokerUsedCard);

  // Si aucune carte valide n'est disponible, on ne rend pas le bouton
  if (!hasValidCard && !isJokerUsedCard) return null;

  // Vérifier si une carte valide est sélectionnée
  const isActivatorSelected = selectedCards.find(
    (card) => card.type === "JOKER" || card.value === "7",
  );

  const isValidJokerRemplacementCardSelected = selectedCards.find(
    (card) => card.value === (jokerIndex + 1).toString(),
  );

  const canExchange =
    phase === "PLAY" &&
    !hasPlayedAction &&
    (isActivatorSelected || isValidJokerRemplacementCardSelected);

  const handleExchangeClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // console.log(isValidJokerRemplacementCardSelected);

    if (isActivatorSelected) {
      // console.log("isActivatorSelected....");

      handleActivatorExchange(activatorCard, isActivatorSelected);
    } else if (isValidJokerRemplacementCardSelected) {
      // console.log(activatorCard);

      handleJokerExchange(isValidJokerRemplacementCardSelected);
    }
  };

  return (
    <button
      onClick={handleExchangeClick}
      disabled={!canExchange}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all",
        canExchange
          ? "bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/50 dark:hover:bg-amber-800/70 dark:text-amber-300"
          : "bg-gray-100 text-gray-400 dark:bg-gray-800/50 dark:text-gray-600 cursor-not-allowed",
        "border border-gray-300 dark:border-gray-700",
      )}
      title={t("game.actions.exchange")}
    >
      <ArrowLeftRight className="w-4 h-4" />
      <span>Échanger</span>
    </button>
  );
}
