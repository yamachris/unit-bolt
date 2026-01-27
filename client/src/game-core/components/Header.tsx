import React from "react";
import { Heart, Clock, Loader2 } from "lucide-react";
import { useGameStore } from "../store/GameStore";

import { useGameTimer } from "../hooks/useGameTimer";
import { ProfileEditor } from "./ProfileEditor";
import { cn } from "../utils/cn";
import { ECG } from "./ECG";
import { PlayerTurn } from "./PlayerTurn";

export function Header() {
  const { currentPlayer } = useGameStore();

  const { formattedTotalTime, isWaiting } = useGameTimer();
  const healthPercentage =
    (currentPlayer.health / currentPlayer.maxHealth) * 100;
  const healthColor = healthPercentage > 50 ? "text-red-500" : "text-red-300";

  return (
    <div className="space-y-4">
      <ProfileEditor />

      <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl p-4 shadow-lg backdrop-blur-sm transition-colors duration-300">
        <div className="flex justify-between items-center">
          {/* Temps total de jeu */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-700/90 px-4 py-2 rounded-lg shadow-sm">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {isWaiting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                    En attente du second joueur...
                  </span>
                </div>
              ) : (
                <span className="font-mono text-xl tabular-nums text-gray-900 dark:text-gray-100">
                  {formattedTotalTime}
                </span>
              )}
            </div>
          </div>

          {/* Player turn*/}
          <PlayerTurn />

          {/* Health Display */}
          <div className="flex items-center gap-4">
            {/* ECG and Heart */}
            <div className="flex items-center gap-2">
              <ECG color={healthPercentage > 50 ? "#ef4444" : "#fca5a5"} />
              <Heart className={cn("w-4 h-4 animate-heartbeat", healthColor)} />
            </div>

            {/* Health Bar */}
            <div className="flex flex-col">
              <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">
                {currentPlayer.health}/{currentPlayer.maxHealth}
              </span>
              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    healthPercentage > 50 ? "bg-red-500" : "bg-red-300",
                  )}
                  style={{ width: `${healthPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Warning for Low Health */}
        {currentPlayer.health <= 3 && (
          <div className="mt-3 px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 text-sm rounded-lg">
            ⚠️ Attention: Points de vie critiques!
          </div>
        )}
      </div>
    </div>
  );
}
