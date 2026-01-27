import { attackCardButton } from 'src/types/game';

// Attack categories according to the rules:
// Category 1: Ace (1), 2, 3 - Only one attack allowed from this group
// Category 2: 4, 5, 6 - Only one attack allowed from this group
// Category 3: 7 - Not an attack card
// Category 4: 8 - Special category, can attack even if a King is in play
// Category 5: 9 - Special category, can attack even if a King is in play
// Category 6: Jack (J) - Special face card with its own attack logic
// Category 7: King (K) - Defensive card, not an attack card
// Category 8: 10 - Revolution card, triggers when a complete column is formed

export const initialAttackButtons: attackCardButton[] = [
  { id: 'A', category: '1', active: true, wasUsed: false },
  { id: '2', category: '1', active: true, wasUsed: false },
  { id: '3', category: '1', active: true, wasUsed: false },
  { id: '4', category: '2', active: true, wasUsed: false },
  { id: '5', category: '2', active: true, wasUsed: false },
  { id: '6', category: '2', active: true, wasUsed: false },
  { id: '7', category: '3', active: false, wasUsed: false }, // 7 is not an attack card
  { id: '8', category: '4', active: true, wasUsed: false }, // Special category, can attack Kings
  { id: '9', category: '5', active: true, wasUsed: false }, // Special category, can attack Kings
  { id: '10', category: '8', active: true, wasUsed: false }, // Revolution card
  { id: 'J', category: '6', active: true, wasUsed: false },
  { id: 'K', category: '7', active: false, wasUsed: false }, // King is not an attack card
];

export const JOKER_CARD = 'JOKER';
export const KING_CARD = 'K';
export const QUEEN_CARD = 'Q';
export const JACK_CARD = 'J';
export const AS_CARD = 'A';
export const SEVEN_CARD = '7';
export const SEVEN = 'seven';

export const SETUP_PHASE = 'SETUP';
export const DRAW_PHASE = 'DRAW';
export const PLAY_PHASE = 'PLAY';
export const DISCARD_PHASE = 'DISCARD';

export const HEAL_ACTION = 'heal';
export const ATTACK_ACTION = 'attack';

export const SACRIFICE = 'SACRIFICE';
