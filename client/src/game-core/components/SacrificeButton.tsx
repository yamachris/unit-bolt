import React from "react";
import { useGameStore } from "../store/GameStore";
import "./SacrificeButton.css";

export function SacrificeButton() {
  const { selectedCards, phase, hasPlayedAction, setSacrificeMode } =
    useGameStore();

  const specialCard = selectedCards[0];
  const isSpecialCard =
    specialCard?.value === "K" ||
    specialCard?.value === "Q" ||
    specialCard?.value === "J";
  const canSacrifice = phase === "PLAY" && !hasPlayedAction && isSpecialCard;

  const handleClick = () => {
    if (!canSacrifice) return;
    setSacrificeMode(true);
  };

  if (!isSpecialCard) return null;

  return (
    <button
      onClick={handleClick}
      disabled={!canSacrifice}
      className="sacrifice-button"
      title="Sacrifier des unités pour jouer une carte spéciale"
    >
      Sacrifier
    </button>
  );
}
