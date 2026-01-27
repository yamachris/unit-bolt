import React from "react";
import { Flag, AlertTriangle } from "lucide-react";

interface GameFooterProps {
  currentTurn: number;
  onSurrender: () => void;
  playerHealth: number;
}

export function GameFooter({
  currentTurn,
  onSurrender,
  playerHealth,
}: GameFooterProps) {
  const handleSurrender = () => {
    if (window.confirm("Êtes-vous sûr de vouloir abandonner la partie ?")) {
      onSurrender();
    }
  };

  return (
    <div className="bg-gradient-to-b from-white/95 to-white/90 rounded-b-xl p-4 backdrop-blur-sm">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 px-4 py-2 rounded-lg">
            <span className="text-blue-800 font-medium">
              Tour : {currentTurn}
            </span>
          </div>

          {playerHealth <= 3 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Attention, santé critique !</span>
            </div>
          )}
        </div>

        <button
          onClick={handleSurrender}
          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          <Flag className="w-4 h-4" />
          <span className="font-medium">Abandonner</span>
        </button>
      </div>
    </div>
  );
}
