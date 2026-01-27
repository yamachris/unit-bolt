"use client";

import React from "react";
import { Flag, RefreshCw } from "lucide-react";
import { useGameStore } from "../store/GameStore";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";

export function GameOver({ message }: { message: string }) {
  const { t } = useTranslation();
  const { currentPlayer } = useGameStore();
  const router = useRouter();

  const newGame = () => {
    router.push("/");
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/50">
            <Flag className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("game.gameOver.title")}
          </h2>

          <div className="space-y-2">
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {t(message)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("game.gameOver.finalScore", { score: currentPlayer.health })}
            </p>
          </div>

          <button
            onClick={newGame}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            {t("game.gameOver.newGame")}
          </button>
        </div>
      </div>
    </div>
  );
}
