import React from "react";
import { Heart, Sword } from "lucide-react";
import { Card } from "../types/game";
import { cn } from "../utils/cn";
import { useGameStore } from "../store/GameStore";
import { AudioManager } from "../sound-design/audioManager";

interface JokerActionsProps {
  card: Card;
  onAction: (action: "heal" | "attack") => void;
  isPlayerTurn: boolean;
}

export function JokerActions({
  card,
  onAction,
  isPlayerTurn,
}: JokerActionsProps) {
  const { setShowAttackPopup } = useGameStore();

  if (!isPlayerTurn) return null;

  const handleAttackClick = () => {
    // Play card sound for attack action
    AudioManager.getInstance().playCardSound();

    // Open the AttackPopup and pass the joker card
    setShowAttackPopup(true, card);
  };

  return (
    <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 flex gap-1 p-1 bg-gray-900/90 rounded-lg shadow-xl backdrop-blur-sm border border-gray-700">
      <button
        onClick={() => onAction("heal")}
        className={cn(
          "p-1.5 rounded-lg transition-all duration-200",
          "bg-green-100 dark:bg-green-900/50 hover:bg-green-200 dark:hover:bg-green-800/70",
          "text-green-600 dark:text-green-400",
          "ring-1 ring-green-400/50 hover:ring-green-500",
          "transform hover:scale-105",
        )}
        title="Soigner 3 PV"
      >
        <Heart className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={handleAttackClick}
        className={cn(
          "p-1.5 rounded-lg transition-all duration-200",
          "bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/70",
          "text-red-600 dark:text-red-400",
          "ring-1 ring-red-400/50 hover:ring-red-500",
          "transform hover:scale-105",
        )}
        title="Attaquer une carte"
      >
        <Sword className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
