export interface Card {
  id: string;
  value: number;
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  isJoker?: boolean;
  isSelected?: boolean;
}
