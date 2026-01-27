import React from "react";
import { useGameStore } from "../store/GameStore";
import { Layers, RefreshCw } from "lucide-react";
import { cn } from "../utils/cn";
import { useTranslation } from "react-i18next";

export function DeckArea() {
  const {
    deck,
    currentPlayer,
    handleDrawCard,
    recycleDiscardPile,
    phase,
    isPlayerTurn,
  } = useGameStore();

  const { t } = useTranslation();

  const totalCards = currentPlayer.hand.length + currentPlayer.reserve.length;
  const canDrawToHand = phase === "DRAW" && currentPlayer.hand.length < 5;
  const canDrawToReserve =
    phase === "DRAW" && currentPlayer.reserve.length < 2 && totalCards < 7;
  const isDeckEmpty = deck.length === 0;
  const hasDiscardPile = currentPlayer.discardPile.length > 0;

  const handleDeckClick = () => {
    if (isDeckEmpty && hasDiscardPile) {
      recycleDiscardPile();
    } else {
      handleDrawCard();
    }
  };

  return (
    <div className="flex md:flex-col gap-4 md:gap-6">
      <div className="relative">
        <button
          onClick={handleDeckClick}
          disabled={isDeckEmpty && !hasDiscardPile}
          className={cn(
            "w-32 h-48 md:w-40 md:h-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border-2 group relative",
            canDrawToHand || canDrawToReserve || (isDeckEmpty && hasDiscardPile)
              ? "border-blue-300 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer"
              : "border-gray-300 dark:border-gray-700 cursor-not-allowed",
            "transition-all duration-300 transform hover:-translate-y-2",
          )}
        >
          {isDeckEmpty && hasDiscardPile ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/50 rounded-xl">
              <RefreshCw className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-2">
                Recyclage automatique
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Layers
                className={cn(
                  "w-10 h-10 transition-transform duration-300",
                  isPlayerTurn && (canDrawToHand || canDrawToReserve)
                    ? "text-blue-600 dark:text-blue-400 group-hover:scale-110"
                    : "text-gray-400 dark:text-gray-500",
                )}
              />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("game.cards.deck")}: {deck.length}
              </span>
            </div>
          )}
        </button>

        {/* Options de pioche */}
        {phase === "DRAW" && totalCards < 7 && !isDeckEmpty && (
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {isPlayerTurn && canDrawToHand && (
              <button
                onClick={() => handleDrawCard()}
                className="px-3 py-1 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 transition-colors"
              >
                Main
              </button>
            )}
            {isPlayerTurn && canDrawToReserve && (
              <button
                onClick={() => handleDrawCard()}
                className="px-3 py-1 bg-green-600 text-white rounded-full shadow-md hover:bg-green-700 transition-colors"
              >
                Réserve
              </button>
            )}
          </div>
        )}
      </div>

      {/* Défausse */}
      <div className="w-32 h-48 md:w-40 md:h-56 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-3">
        <Layers className="w-10 h-10 text-gray-400 dark:text-gray-500" />
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {t("game.cards.discard")}: {currentPlayer.discardPile.length}
        </span>
      </div>
    </div>
  );
}
