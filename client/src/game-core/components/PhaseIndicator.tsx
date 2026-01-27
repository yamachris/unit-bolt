import React from "react";
import { Phase } from "../types/game";

interface PhaseIndicatorProps {
  currentPhase: Phase;
}

export function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  const phases: Phase[] = ["DISCARD", "DRAW", "PLAY"];

  return (
    <div className="flex gap-2 items-center bg-white/90 rounded-lg p-2">
      {phases.map((phase) => (
        <div
          key={phase}
          className={`px-4 py-2 rounded-lg ${
            currentPhase === phase
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {phase.charAt(0).toUpperCase() + phase.slice(1)}
        </div>
      ))}
    </div>
  );
}
