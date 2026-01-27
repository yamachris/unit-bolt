import React from "react";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { cn } from "../utils/cn";
import { useGameStore } from "../store/GameStore";
import { Suit } from "../types/game";

interface BlockButtonProps {
  suit: Suit;
}

export function BlockButton({ suit }: BlockButtonProps) {
  const { t } = useTranslation();
  const { blockedColumns, hasPlayedAction } = useGameStore();
  const isBlocked = blockedColumns.includes(suit);

  return (
    <button
      disabled={isBlocked || hasPlayedAction}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition-all duration-200",
        !isBlocked && !hasPlayedAction
          ? [
              "bg-gradient-to-br from-amber-500/90 to-amber-600/90 dark:from-amber-600/90 dark:to-amber-700/90",
              "hover:from-amber-500 hover:to-amber-600 dark:hover:from-amber-600 dark:hover:to-amber-700",
              "text-white dark:text-gray-100",
              "border border-amber-400/20 dark:border-amber-500/20",
            ]
          : [
              "bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800",
              "text-gray-500 dark:text-gray-400",
              "border border-gray-300/20 dark:border-gray-600/20",
              "cursor-not-allowed",
            ],
        "shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-1 dark:focus:ring-offset-gray-800",
      )}
      title={t("game.actions.block.tooltip")}
    >
      <Shield
        className={cn(
          "w-3.5 h-3.5",
          !isBlocked && !hasPlayedAction
            ? "text-white dark:text-gray-100"
            : "text-gray-400 dark:text-gray-500",
        )}
      />
      <span>Bloquer</span>
    </button>
  );
}
