import React from "react";
import { Heart, Sword } from "lucide-react";
import { Card } from "../types/game";
import { cn } from "../utils/cn";

interface QueenActionsProps {
  queen: Card;
  activator: Card | undefined;
  onHeal: (() => void) | undefined;
  onChallenge: (() => void) | undefined;
}

export function QueenActions({
  queen,
  activator,
  onHeal,
  onChallenge,
}: QueenActionsProps) {
  if (!queen) console.log(queen);
  if (!activator) return null;

  const healAmount = activator.type === "JOKER" ? 4 : 2;

  return (
    <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 flex gap-1">
      <button
        onClick={onHeal}
        className={cn(
          "flex items-center gap-1 px-2 py-1",
          "bg-gray-900/90 rounded-lg",
          "hover:bg-gray-800/90 transition-all duration-200",
        )}
        title={`Gagner ${healAmount} PV`}
      >
        <Heart className="w-3.5 h-3.5 text-pink-500" />
        <span className="text-xs font-medium text-white">+{healAmount}</span>
      </button>

      {activator.type === "JOKER" && (
        <button
          onClick={onChallenge}
          className={cn(
            "flex items-center gap-1 px-2 py-1",
            "bg-gray-900/90 rounded-lg",
            "hover:bg-gray-800/90 transition-all duration-200",
          )}
          title="Défi de la Bonne Dame (5/1 PV)"
        >
          <Sword className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-xs font-medium text-white">Défi (5/1)</span>
        </button>
      )}
    </div>
  );
}
