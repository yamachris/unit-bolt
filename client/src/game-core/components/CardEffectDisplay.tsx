import React from "react";
import { Heart, Shield, Sword } from "lucide-react";
import { CardEffect } from "../utils/cardEffects";
import { cn } from "../utils/cn";

interface CardEffectDisplayProps {
  effect: CardEffect;
  isActive?: boolean;
}

export function CardEffectDisplay({
  effect,
  isActive,
}: CardEffectDisplayProps) {
  const getEffectIcon = () => {
    switch (effect.type) {
      case "heal":
        return <Heart className="w-4 h-4 text-green-500" />;
      case "shield":
        return <Shield className="w-4 h-4 text-blue-500" />;
      case "damage":
        return <Sword className="w-4 h-4 text-red-500" />;
      case "special":
        return <Sword className="w-4 h-4 text-purlple-500" />;
      default:
        return null;
    }
  };

  const getEffectColor = () => {
    switch (effect.type) {
      case "heal":
        return "text-green-500 bg-green-100 dark:bg-green-900/50";
      case "shield":
        return "text-blue-500 bg-blue-100 dark:bg-blue-900/50";
      case "damage":
        return "text-red-500 bg-red-100 dark:bg-red-900/50";
      case "special":
        return "text-purple-500 bg-purple-100 dark:bg-purple-900/50";
    }
  };

  return (
    <div
      className={cn(
        "absolute bottom-1 left-1 right-1 px-2 py-1 rounded-sm text-xs font-medium",
        "flex items-center gap-1 transition-opacity duration-200",
        getEffectColor(),
        isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
      )}
    >
      {getEffectIcon()}
      <span>+{effect.value}</span>
    </div>
  );
}
