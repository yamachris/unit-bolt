import { Card, ColumnState, Player } from "../types/game";

export type CardEffect = {
  type: "heal" | "shield" | "damage" | "special";
  value: number;
  description: string;
};

export function getCardEffect(
  card: Card,
  column?: ColumnState,
): CardEffect | null {
  if (card.value === "JOKER") {
    return {
      type: "special",
      value: 3,
      description: "JOKER - Soigner 3 PV ou Attaquer",
    };
  }

  if (card.value === "Q" && column?.activatorType) {
    const baseValue = column.activatorType === "JOKER" ? 4 : 2;
    return {
      type: "heal",
      value: baseValue,
      description: `Dame + ${column.activatorType}: +${baseValue} PV`,
    };
  }

  return null;
}

export function handleCardEffect(
  card: Card,
  column: ColumnState,
  player: Player,
): Player {
  const effect = getCardEffect(card, column);
  if (!effect) return player;

  if (effect.type === "heal") {
    const newHealth = player.health + effect.value;
    return {
      ...player,
      health: newHealth,
      maxHealth: newHealth,
    };
  }

  return player;
}

export function shouldAutoDiscard(card: Card, column: ColumnState): boolean {
  // JOKER toujours défaussé après utilisation
  if (card.value === "JOKER") return true;

  // Cartes spéciales (J, Q, K) toujours défaussées
  if (["J", "Q", "K"].includes(card.value)) return true;

  // 7 défaussé si utilisé avec Dame
  if (card.value === "7" && column.cards.some((c) => c?.value === "Q"))
    return true;

  return false;
}
