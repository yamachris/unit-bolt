export type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';
export type SuitCard = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES' | 'SPECIAL';
export type Phase = 'SETUP' | 'DRAW' | 'PLAY' | 'DISCARD' | 'END';
export type CardType = 'STANDARD' | 'JOKER';
export type CardColor = 'red' | 'black';
export type Value = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JOKER';

export interface Card {
  id: string;
  suit: SuitCard;
  value: string;
  isJoker?: boolean;
  isActivator?: boolean;
  isSpecial?: boolean;
  type: CardType;
  isRedJoker?: boolean;
  activatedBy?: string;
  hasDefended?: boolean; // Flag to indicate if a card 7 has been used for defense
}

export type QueenCard = {
  suit: Suit;
  color: CardColor;
};

export interface Profile {
  name: string;
  epithet: string;
  avatar: string;
}

export interface Player {
  gameId?: string;
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  hand: Card[];
  reserve: Card[];
  discardPile: Card[];
  profile: {
    epithet: string;
    avatar?: string;
  };
  hasUsedStrategicShuffle: boolean;
}

interface AttackStatus {
  attackButtons: attackCardButton[];
  lastAttackCard: { cardValue: string; turn: number };
  preDestroyButtons?: attackCardButton[];
}

export interface ColumnState {
  cards: Card[];
  isDestroyed?: boolean;
  destroyedCards?: { card: Card; index: number }[];
  isLocked?: boolean;
  attackStatus: AttackStatus;
  hasLuckyCard: boolean;
  activatorType?: string | null;
  sequence?: any[];
  reserveSuit: Card | null;

  faceCards: {
    J?: Card; // Valet
    K?: Card; // Roi
  };
}

export type messageType = 'system' | 'phase' | 'action' | 'opponent';

export interface GameMessage {
  type: messageType;
  text: string;
  timestamp: number;
}

export interface GameState {
  gameId: string;
  currentPlayer: Player;
  deck: Card[];
  phase: Phase;
  turn: number;
  selectedCards: Card[];
  selectedSacrificeCards: Card[];
  columns: Record<Suit, ColumnState>;
  opponentPlayerColumns?: Record<Suit, ColumnState>;
  hasDiscarded: boolean;
  hasDrawn: boolean;
  hasPlayedAction: boolean;
  isGameOver: boolean;
  gameOverReason: string;
  attackMode: boolean;
  message: string;
  winner: string | null;
  startAt?: number; // Timestamp when the game started
  canEndTurn: boolean;
  blockedColumns: string[];
  showRevolutionPopup: boolean;
  showBlockPopup: boolean;
  showQueenChallengePopup: boolean;
  hasUsedFirstStrategicShuffle: boolean;
  validAttackTargets: Record<string, TargetAttackType[]>; // Map of card IDs to their valid attack targets
  setupTimeRemaining?: number; // Remaining time in seconds for setup phase
  messages: GameMessage[]; // Game log messages from the server
}

export interface AttackResult {
  attackCard: Card;
  target: TargetAttackType;
  isBlocked: boolean;
}

export interface Game {
  gameId?: string;
  players: string[]; //players id
  playersGameStates: GameState[]; // Map of player ID to GameState
  currentPlayerIndex: number; //player turn
  gameMode: 'solo' | 'multiplayer';
  maxPlayers: number;
  playerSockets: Record<string, string>; // Map of player ID to socket ID
  gameStatus: 'waiting' | 'in-progress' | 'completed';
  turnTimeRemaining: number;
  pendingAttack?: {
    attackingPlayerId: string;
    defendingPlayerId: string;
    attackCard: Card;
    attackTarget: TargetAttackType;
    waitingForResponse: boolean;
    blockingCards?: Card[];
  };

  attackResult?: AttackResult;

  queenChallengeData?: {
    queen: Card;
    challengingPlayerId: string;
  };
}

export type GameType = Game;

export type attackCardButton = {
  id: string;
  category: string; // Catégorie du bouton
  active: boolean; // État du bouton (actif ou inactif)
  wasUsed: boolean; //Est ce que le bouton a déjà été utilisé pour attaquer
  usedTurn?: number;
  insertedTurn?: number;
};

// Target attack type
export type TargetAttackType = {
  suit?: Suit;
  cardValue?: string;
  column?: ColumnState;
  attackType?: string;
  valid: boolean;
  reason?: string;
};
