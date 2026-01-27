import React, { useState, useEffect } from "react";
import { useGameStore } from "../store/GameStore";
import { Flag, ArrowRight, AlertCircle, SkipForward } from "lucide-react";
import { cn } from "../utils/cn";
import { getPhaseMessage } from "../utils/gameLogic";
import { useTranslation } from "react-i18next";
import { MusicToggle } from "./MusicToggle";
import { PlayerTurnTime } from "./PlayerTurnTime";

export function GameControls() {
  const {
    phase,
    turn,
    hasDiscarded,
    hasDrawn,
    hasPlayedAction,
    handlePassTurn,
    handleSurrender,
    handleSkipAction,
    currentPlayer,
    isPlayerTurn,
    // turnTimeRemaining,
  } = useGameStore();

  // console.log(turnTimeRemaining);

  const { t, i18n } = useTranslation();
  const [isActionDone, setIsActionDone] = useState(false);

  // Forcer le rendu quand la langue change
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const handleLanguageChange = () => {
      // console.log("Language changed in GameControls:", i18n.language);
      forceUpdate({});
    };

    i18n.on("languageChanged", handleLanguageChange);
    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [i18n]);

  const handleSurrenderClick = () => {
    if (window.confirm(t("game.actions.confirmSurrender"))) {
      handleSurrender();
    }
  };

  const handleSkipActionClick = () => {
    handleSkipAction();
    setIsActionDone(true); // Débloque le bouton "Fin du Tour" après avoir passé l'action
  };

  const handleEndTurn = () => {
    if (isActionDone) {
      handlePassTurn();
      setIsActionDone(false);
    }
  };

  // Met à jour isActionDone quand une action est jouée
  useEffect(() => {
    if (hasPlayedAction) {
      setIsActionDone(true);
    }
  }, [hasPlayedAction]);

  const totalCards = currentPlayer.hand.length + currentPlayer.reserve.length;
  // Only allow actions when it's the player's turn
  const canPassTurn =
    isPlayerTurn &&
    phase === "PLAY" &&
    hasDiscarded &&
    hasDrawn &&
    isActionDone;
  const canSkipAction =
    isPlayerTurn && phase === "PLAY" && !hasPlayedAction && !isActionDone;

  const phaseMessage = getPhaseMessage(
    t,
    phase,
    hasDiscarded,
    hasDrawn,
    hasPlayedAction,
    totalCards,
    turn,
  );

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg font-medium">
              <span>
                {t("game.turn", { number: turn })} -{" "}
                {t(`game.${phase.toLowerCase()}`)}
              </span>
            </div>
            <PlayerTurnTime />
          </div>

          {phaseMessage && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <AlertCircle className="w-4 h-4" />
              <span>{phaseMessage}</span>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={handleSurrenderClick}
              disabled={!isPlayerTurn}
              className={cn(
                "px-4 py-2 rounded-lg transition-colors duration-300 flex items-center gap-2",
                isPlayerTurn
                  ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed",
              )}
            >
              <Flag className="w-4 h-4" />
              <span>{t("game.actions.surrender")}</span>
            </button>

            {phase === "PLAY" && (
              <>
                {canSkipAction && (
                  <button
                    onClick={handleSkipActionClick}
                    className={cn(
                      "px-4 py-2 rounded-lg transition-colors duration-300 flex items-center gap-2",
                      "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
                      "hover:bg-yellow-200 dark:hover:bg-yellow-800",
                    )}
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>{t("game.actions.skipAction")}</span>
                  </button>
                )}
              </>
            )}

            <div className="flex items-center gap-6">
              <button
                onClick={handleEndTurn}
                disabled={!canPassTurn}
                className={cn(
                  "px-6 py-2.5 rounded-lg font-medium flex items-center gap-2",
                  canPassTurn
                    ? "bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed",
                  "transition-colors duration-300",
                )}
              >
                <span>{t("game.actions.endTurn")}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="h-[40px] w-[40px] flex items-center justify-center">
                <MusicToggle />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
