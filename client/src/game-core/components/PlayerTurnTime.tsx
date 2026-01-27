import React, { useEffect, useState } from "react";
import { useGameStore } from "../store/GameStore";
import { useTranslation } from "react-i18next";
import { Loader } from "lucide-react";

export function PlayerTurnTime() {
  const { t } = useTranslation();
  const { turnTimeRemaining, turnTimeInit, phase, isPlayerTurn } =
    useGameStore();
  const [isWarning, setIsWarning] = useState(false);
  if (isWarning) console.log(isWarning);
  const [isWaiting, setIsWaiting] = useState(true);

  // Check if we're in waiting mode (after setup phase but before first turn)
  useEffect(() => {
    // If we're past setup phase but turn is 0 or undefined, we're waiting for players
    if (phase !== "SETUP" && turnTimeRemaining === -1) {
      setIsWaiting(true);
    } else {
      setIsWaiting(false);
    }
  }, [phase, turnTimeRemaining]);

  // Only show the timer if we're past the setup phase
  const showTimer = phase !== "SETUP";

  // Calculate percentage of time remaining (ensure it doesn't go below 0 or above 100)
  const timePercentage = Math.min(
    Math.max((turnTimeRemaining / turnTimeInit) * 100, 0),
    100,
  );

  // Debug logging for timer values
  useEffect(() => {
    if (showTimer) {
      // // console.log(`Turn Timer Debug - Remaining: ${turnTimeRemaining}s, Init: ${turnTimeInit}s, IsPlayerTurn: ${isPlayerTurn}`);
    }
  }, [turnTimeRemaining, turnTimeInit, isPlayerTurn, showTimer]);

  // No need to register for turn timer updates here as it's handled in the GameStore

  // Set warning state when time is running low (less than 30%)
  // Also add critical warning when time is extremely low (less than 15%)
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    if (timePercentage < 15 && isPlayerTurn) {
      setIsWarning(true);
      setIsCritical(true);
    } else if (timePercentage < 30 && isPlayerTurn) {
      setIsWarning(true);
      setIsCritical(false);
    } else {
      setIsWarning(false);
      setIsCritical(false);
    }
  }, [timePercentage, isPlayerTurn]);

  if (!showTimer) return null;

  // Animation for critical warning
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [showPulse, setShowPulse] = useState(true);
  if (!showPulse) console.log(showPulse);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [spinnerRotation, setSpinnerRotation] = useState(0);
  if (spinnerRotation != 0) console.log(spinnerRotation);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isCritical) {
      const interval = setInterval(() => {
        setShowPulse((prev) => !prev);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setShowPulse(true);
    }
  }, [isCritical]);

  // Spinner animation for waiting mode
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isWaiting) {
      const spinnerInterval = setInterval(() => {
        setSpinnerRotation((prev) => (prev + 30) % 360);
      }, 100);
      return () => clearInterval(spinnerInterval);
    }
  }, [isWaiting]);

  // If we're in waiting mode, show the spinner with waiting message
  if (isWaiting) {
    return (
      <div className="waiting-container">
        <div className="spinner-icon">
          <Loader size={24} className="spinner" />
        </div>
        <div className="waiting-message">
          {t("game.waitingForPlayers") || "Waiting for all players to start..."}
        </div>
        <style>{`
          .waiting-container {
            display: flex;
            flex-direction: column;
            background-color: bg-white/90;
            dark:background-color: bg-gray-800/95;
            backdrop-filter: blur(8px);
            border-radius: 12px;
            padding: 12px 16px;
            color: #1f2937; /* text-gray-800 */
            dark:color: #f3f4f6; /* dark:text-gray-100 */
            min-width: 200px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 10px;
          }

          .spinner-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            animation: spin 2s linear infinite;
          }

          .spinner {
            color: white;
            filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.7));
          }

          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }

          .waiting-message {
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            color: #1f2937; /* text-gray-800 */
            dark:color: #f3f4f6; /* dark:text-gray-100 */
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg font-medium">
      <span>{turnTimeRemaining === -1 ? "..." : turnTimeRemaining}</span>
    </div>
  );
}
