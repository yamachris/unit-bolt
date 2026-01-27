export type Phase = "SETUP" | "DISCARD" | "DRAW" | "PLAY" | "END";
export type Suit = "HEARTS" | "DIAMONDS" | "CLUBS" | "SPADES" | "SPECIAL";
export type StandardValue =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";
export type Value = StandardValue | "JOKER";
export type ActivatorType = "7" | "JOKER" | null;
export type CardColor = "red" | "black";
export type ValetCardState = "active" | "passive";

export const SUITS: Suit[] = ["HEARTS", "DIAMONDS", "CLUBS", "SPADES"];

export type attackCardButton = {
  id: string;
  category: string; // Catégorie du bouton
  active: boolean; // État du bouton (actif ou inactif)
  wasUsed: boolean; //Est ce que le bouton a déjà été utilisé pour attaquer
  insertedTurn?: number; //a quel Turn la carte a été inserée
};

export const initialAttackButtons: attackCardButton[] = [
  { id: "A", category: "1", active: true, wasUsed: false },
  { id: "2", category: "1", active: true, wasUsed: false },
  { id: "3", category: "1", active: true, wasUsed: false },
  { id: "4", category: "2", active: true, wasUsed: false },
  { id: "5", category: "2", active: true, wasUsed: false },
  { id: "6", category: "2", active: true, wasUsed: false },
  { id: "7", category: "3", active: false, wasUsed: false }, //la carte 7 toujours à false
  { id: "8", category: "4", active: true, wasUsed: false },
  { id: "9", category: "5", active: true, wasUsed: false },
  { id: "J", category: "6", active: true, wasUsed: false },
  { id: "K", category: "7", active: true, wasUsed: false },
];

export type Card = {
  id: string;
  suit: Suit;
  value: Value;
  type: "STANDARD" | "JOKER";
  color: CardColor;
  hasDefended?: boolean; // Flag to indicate if a card 7 has been used for defense
  isRedJoker?: boolean;
  state?: ValetCardState; // État du Valet (uniquement pour les cartes J)
  activatedBy?: "SACRIFICE" | "JOKER";
};

export type QueenCard = { suit: Suit; color: string };

export interface SacrificeInfo {
  sacrificedCards: Card[];
  specialCard: Card;
  healthBonus: number;
}

export interface SacrificeState {
  showSacrificePopup: boolean;
  availableCards: Card[];
}

export interface SacrificeActions {
  setSacrificeMode: (mode: boolean) => void;
  sacrificeSpecialCard: (selectedCards: Card[]) => void;
}

export interface Game {
  gameId: string;
  players: string[]; //players id
  playersGameStates: GameState[]; // Map of player ID to GameState
  currentPlayerIndex: number;
  gameMode: "solo" | "multiplayer";
  playerSockets: Record<string, string>; // Map of player ID to socket ID
  gameStatus: "waiting" | "in-progress" | "completed";
  turnTimeRemaining: number;
  pendingAttack?: {
    attackCard: Card;
    attackTarget: AttackTarget;
    attackingPlayerId: string;
    blockingCards?: Card[];
    waitingForResponse?: boolean;
  };
}

// export interface GameState extends SacrificeState {
//   gameId: string;
//   playerId: string;
//   currentPlayer: Player;
//   phase: Phase;
//   isPlayerTurn: boolean;
//   selectedCards: Card[];
//   hasDiscarded: boolean;
//   hasPlayedAction: boolean;
//   message: string;
//   columns: Record<Suit, ColumnState>;
//   hasUsedFirstStrategicShuffle: boolean;
//   awaitingStrategicShuffleConfirmation: boolean;
//   deck: Card[];
//   turn: number;
//   playedCardsLastTurn: number;
//   attackMode: boolean;
//   isGameOver: boolean;
//   canEndTurn: boolean;
//   language: string;
//   sacrificeInfo: SacrificeInfo | null;
// }

// Interface définissant la structure de l'état du jeu
export interface GameState {
  gameId: string;
  startAt: number; // Timestamp when the game started (for synchronized timer)
  currentPlayer: Player; // Joueur actuel
  deck: Card[]; // Paquet de cartes
  phase: Phase; // Phase actuelle du jeu
  turn: number; // Numéro du tour
  selectedCards: Card[]; // Cartes sélectionnées
  selectedSacrificeCards: Card[];
  columns: Record<Suit, ColumnState>; // État des colonnes par couleur
  opponentPlayerColumns?: Record<Suit, ColumnState>;
  hasDiscarded: boolean; // Indique si le joueur a défaussé
  hasDrawn: boolean; // Indique si le joueur a pioché
  hasPlayedAction: boolean; // Indique si le joueur a joué une action
  isGameOver: boolean; // Indique si la partie est terminée
  gameOverReason: string;
  playedCardsLastTurn: number; // Nombre de cartes jouées au dernier tour
  attackMode: boolean;
  message: string;
  hasUsedFirstStrategicShuffle: boolean;
  awaitingStrategicShuffleConfirmation: boolean;
  language: string;
  canEndTurn: boolean;
  isMessageClickable: boolean;
  exchangeMode: boolean;
  selectedForExchange: Card | null;
  nextPhase?: Phase; // Nouveau champ pour stocker la phase suivante
  showRevolutionPopup: boolean;
  canBlock: boolean;
  blockedColumns: string[]; // nom des colonnes qui ont été bloquées
  showSacrificePopup: boolean;
  showJokerExchangePopup: boolean;
  showBlockPopup: boolean;
  showQueenChallengePopup: boolean;
  sacrificeInfo: null;
  availableCards: Card[];
  setupTimeRemaining?: number; // Remaining time in seconds for setup phase
  isPlayerTurn?: boolean;
  setupTimeInit: number;
  validAttackTargets?: Record<string, AttackTarget[]>; // Map of card IDs to their valid attack targets
  messages: GameMessage[]; // Game log messages from the server
  attackResult?: {
    attackCard: Card;
    target: AttackTarget;
    isBlocked: boolean;
  };
}

export interface Profile {
  name: string;
  epithet: string;
  avatar: string;
}

export interface Player {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  hand: Card[];
  reserve: Card[];
  discardPile: Card[];
  deck: Card[];
  hasUsedStrategicShuffle: boolean;
  profile: {
    epithet: string;
    avatar?: string;
  };
}

export interface ColumnState {
  cards: Card[];
  isLocked: boolean;
  hasLuckyCard: boolean;
  activatorType: "JOKER" | "7" | null;
  sequence: Card[];
  reserveSuit: Card | null;
  faceCards: {
    J?: Card; // Valet
    K?: Card; // Roi
  };
  attackStatus: {
    attackButtons: attackCardButton[];
    lastAttackCard: { cardValue: string; turn: number };
  };
}

export interface AttackResult {
  attackCard: Card;
  target: AttackTarget;
  isBlocked: boolean;
}

export interface gameOverResponse {
  gameId: string;
  message: string;
}

export interface GameMessage {
  type: "system" | "phase" | "action" | "opponent";
  text: string;
  timestamp: number;
}

// attack Target  type
export type AttackTarget = {
  suit: Suit;
  cardValue?: string;
  column?: ColumnState;
  attackType?: string;
  valid: boolean;
  reason?: string;
};

export type blockRequestData = {
  attackCard: Card | null;
  attackTarget: AttackTarget | null;
  attackingPlayerId: string;
  blockingCards?: Card[];
};
