import React, { useState, useEffect } from "react";
import { Card } from "./Card";
import { Card as CardType } from "../types/game";
import { useGameStore } from "../store/GameStore";
import { cn } from "../utils/cn";
import { useTranslation } from "react-i18next";
import { gameSocket } from "../../services/socket";

import { MusicToggle } from "./MusicToggle";

export function SetupPhase() {
  const { t } = useTranslation();

  const {
    currentPlayer,
    moveToReserve,
    startGame,
    gameId,
    currentPlayerId,
    setupTimeInit,
    abortGame,
  } = useGameStore();
  const [timerValue, setTimerValue] = useState(setupTimeInit);
  const [lastServerTime, setLastServerTime] = useState(setupTimeInit);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  // Effect for handling server timer updates
  useEffect(() => {
    // Listen for timer updates from the server
    const handleTimerUpdate = (data: {
      setupTimeRemaining: number;
      gameId: string;
      timerType: string;
    }) => {
      if (data.gameId === gameId && data.timerType === "setup") {
        // Update the last server time value and reset the last update time
        setLastServerTime(data.setupTimeRemaining);
        setTimerValue(data.setupTimeRemaining);
        setLastUpdateTime(Date.now());

        // If timer reaches 0, show alert to the user
        if (data.setupTimeRemaining === 0) {
          // console.log("Setup time expired!");
          // Optionally abort the game if timer expires
          if (gameId && currentPlayerId) {
            abortGame(gameId, currentPlayerId);
          }
        }
      }
    };

    // Register the timer update handler
    gameSocket.onSetupTimer(handleTimerUpdate);

    // Cleanup listener when component unmounts
    return () => {
      // No explicit cleanup needed as the socket stays connected
    };
  }, [gameId, currentPlayerId, abortGame]);

  // Effect for client-side timer countdown
  useEffect(() => {
    // Don't start the interval if the timer is at 0
    if (timerValue <= 0) return;

    // Create an interval that updates every second
    const interval = setInterval(() => {
      // Calculate how many seconds have passed since the last server update
      const elapsedSeconds = Math.floor((Date.now() - lastUpdateTime) / 1000);

      // Calculate the new timer value based on the last server time minus elapsed time
      const newTimerValue = Math.max(0, lastServerTime - elapsedSeconds);

      // Update the timer value
      setTimerValue(newTimerValue);

      // If timer reaches 0, clear the interval
      if (newTimerValue <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    // Clean up the interval when the component unmounts or when dependencies change
    return () => clearInterval(interval);
  }, [lastServerTime, lastUpdateTime, timerValue]);

  const isReserveComplete = currentPlayer.reserve.length === 2;
  const canStartGame = isReserveComplete;

  const handleMoveToReserve = (card: CardType) => {
    if (!isReserveComplete) {
      moveToReserve(card);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-green-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center transition-colors duration-300">
      <div className="h-[40px] w-[40px] flex items-center justify-center fixed bottom-4 right-4">
        <MusicToggle />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-4xl w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold mb-2 text-center text-gray-900 dark:text-gray-100">
          {t("game.setup.title")}
        </h2>

        <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
          {t("game.setup.welcome")}
        </p>

        <div className="space-y-8">
          {/* Zone de réserve */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-100">
                {t("game.setup.reserve")}
              </h3>
              <div className=" flex items-center justify-center">
                <div
                  className={cn(
                    "px-6 py-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105",
                    "border-2 backdrop-blur-sm " /* Added margin-right here */,
                    timerValue > 20
                      ? "bg-gradient-to-r from-green-500 to-blue-500 border-green-300"
                      : timerValue > 10
                        ? "bg-gradient-to-r from-yellow-500 to-orange-500 border-yellow-300"
                        : "bg-gradient-to-r from-red-500 to-pink-500 border-red-300 animate-pulse",
                  )}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-bold text-xl text-white drop-shadow-md">
                      {timerValue}s
                    </span>
                  </div>
                </div>
              </div>
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium",
                  isReserveComplete
                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                    : "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
                )}
              >
                {currentPlayer.reserve.length}/2 {t("game.setup.handCount")}
              </span>
            </div>

            <div className="flex gap-8 justify-center min-h-[200px] p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl">
              {currentPlayer.reserve.map((card) => (
                <Card key={card.id} card={card} size="lg" isDisabled />
              ))}
              {Array.from({ length: 2 - currentPlayer.reserve.length }).map(
                (_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="w-24 h-36 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl flex items-center justify-center bg-white/50 dark:bg-gray-800/50"
                  >
                    <span className="text-blue-400 dark:text-blue-500 text-center px-4">
                      {t("game.cards.slot")}{" "}
                      {currentPlayer.reserve.length + i + 1}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Main du joueur */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t("game.setup.yourHand")}
              </h3>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                {currentPlayer.hand.length} {t("game.setup.handCount")}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 justify-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl">
              {currentPlayer.hand.map((card) => (
                <Card
                  key={card.id}
                  card={card}
                  onClick={() => handleMoveToReserve(card)}
                  isDisabled={isReserveComplete}
                  size="lg"
                  className={cn(
                    "transform hover:-translate-y-4 transition-all duration-300",
                    !isReserveComplete &&
                      "cursor-pointer hover:ring-2 hover:ring-blue-400",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bouton de démarrage */}
        <div className="mt-8 text-center">
          <button
            onClick={startGame}
            disabled={!canStartGame}
            className={cn(
              "px-6 py-3 rounded-lg font-medium shadow-sm transition-all duration-300",
              canStartGame
                ? "bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600 hover:scale-105"
                : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed",
            )}
          >
            {canStartGame
              ? t("game.setup.startGame")
              : t("game.setup.selectCards")}
          </button>
        </div>
      </div>
    </div>
  );
}
