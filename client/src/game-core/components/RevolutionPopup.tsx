import React, { useEffect } from "react";
import { Crown } from "lucide-react";
import { useGameStore } from "../store/GameStore";
import { cn } from "../utils/cn";
import { AudioManager } from "../sound-design/audioManager";

export function RevolutionPopup() {
  const { showRevolutionPopup, setShowRevolutionPopup } = useGameStore();

  // Joue le son et ferme automatiquement la popup après 3 secondes
  useEffect(() => {
    if (showRevolutionPopup) {
      // Jouer le son de révolution
      const audioManager = AudioManager.getInstance();
      audioManager.playRevolutionSound();

      const timer = setTimeout(() => {
        setShowRevolutionPopup(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showRevolutionPopup, setShowRevolutionPopup]);

  if (!showRevolutionPopup) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div
        className={cn(
          "bg-gradient-to-r from-yellow-500 to-yellow-600",
          "px-8 py-6 rounded-xl shadow-2xl",
          "transform transition-all duration-500",
          "animate-popup",
          "flex items-center gap-4",
        )}
      >
        <Crown className="w-8 h-8 text-white animate-bounce" />
        <span className="text-2xl font-bold text-white">RÉVOLUTION !</span>
      </div>
    </div>
  );
}
