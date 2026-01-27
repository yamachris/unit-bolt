import React, { useState } from "react";
import { QueenCard } from "../types/game";
import { cn } from "../utils/cn";
import { AudioManager } from "../sound-design/audioManager";

interface QueenChallengeProps {
  onGuess: (selectedQueen: QueenCard) => void;
  challengingPlayerId: string;
}

export function QueenChallenge({ onGuess }: QueenChallengeProps) {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  // Les 4 dames face visible
  const queens: QueenCard[] = [
    { suit: "HEARTS", color: "red" },
    { suit: "DIAMONDS", color: "red" },
    { suit: "CLUBS", color: "black" },
    { suit: "SPADES", color: "black" },
  ];

  // Handle card selection
  const handleCardClick = (index: number) => {
    if (selectedCard !== null) return; // Prevent multiple clicks
    setSelectedCard(index);
    AudioManager.getInstance().playCardSound();

    // Simulate a delay for animation
    setTimeout(() => {
      onGuess(queens[index]);
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-6 animate-in zoom-in-50 duration-300">
        <h3 className="text-xl font-bold text-white">Défi de la Bonne Dame</h3>
        <div className="flex gap-4">
          {queens.map((queen, index) => (
            <button
              key={queen.suit}
              onClick={() => handleCardClick(index)}
              disabled={selectedCard !== null}
              className={cn(
                "w-32 h-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border-2",
                "transition-all duration-300 transform",
                queen.color === "red" ? "border-red-300" : "border-gray-300",
                selectedCard === null && "hover:scale-105 hover:-translate-y-2",
                selectedCard === index && "ring-4 ring-yellow-400 scale-105",
                selectedCard !== null &&
                  selectedCard !== index &&
                  "opacity-50 scale-95",
                "animate-in fade-in-50 slide-in-from-bottom-4",
                "data-[state=selected]:animate-out fade-out-0 slide-out-to-top-4",
              )}
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: "both",
              }}
            >
              <div className="relative w-full h-full p-4">
                <span
                  className={cn(
                    "text-2xl font-bold absolute top-2 left-2",
                    queen.color === "red" ? "text-red-500" : "text-gray-700",
                  )}
                >
                  Q
                </span>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl">
                    {queen.suit === "HEARTS"
                      ? "♥️"
                      : queen.suit === "DIAMONDS"
                        ? "♦️"
                        : queen.suit === "CLUBS"
                          ? "♣️"
                          : "♠️"}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
