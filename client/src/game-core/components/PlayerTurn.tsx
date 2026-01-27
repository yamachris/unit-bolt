import React, { useEffect, useState } from "react";
import { useGameStore } from "../store/GameStore";
import { useTranslation } from "react-i18next";
import { Loader, UserCheck, UserX } from "lucide-react";

export function PlayerTurn() {
  const { t } = useTranslation();
  const { turnTimeRemaining, phase, isPlayerTurn } = useGameStore();
  // console.log(turnTimeInit);
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

  if (!showTimer) return null;

  // Animation for critical warning
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [spinnerRotation, setSpinnerRotation] = useState(0);
  if (spinnerRotation != 0) console.log(spinnerRotation);
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
    <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl p-4 shadow-lg backdrop-blur-sm transition-colors duration-300">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-700/90 px-4 py-2 rounded-lg shadow-sm">
            {isPlayerTurn ? (
              <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <UserX className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            )}
            <span className="font-mono text-xl tabular-nums text-gray-900 dark:text-gray-100">
              {isPlayerTurn ? (
                <span className="turn-label">{t("game.yourTurn")}</span>
              ) : (
                <span className="turn-label opponent">
                  {t("game.opponentTurn")}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
