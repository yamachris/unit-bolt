// Importation des dépendances nécessaires
import { create } from "zustand"; // Zustand est utilisé pour la gestion d'état
import {
  Card,
  Player,
  Game,
  GameState,
  Suit,
  ColumnState,
  Profile,
  AttackTarget,
} from "../types/game";
import { Card as CardType, QueenCard, blockRequestData } from "../types/game";
import { AudioManager } from "../sound-design/audioManager";
import i18next from "i18next"; // Importez i18next directement
import i18n from "../i18n/config";
import { gameSocket } from "../../services/socket";
import { gameOverResponse, AttackResult } from "../types/game";

export interface GameStore extends GameState {
  // Opponent player info
  opponentPlayer?: Player;

  // Opponent player columns for attack targeting
  opponentPlayerColumns: {
    HEARTS: ColumnState;
    DIAMONDS: ColumnState;
    CLUBS: ColumnState;
    SPADES: ColumnState;
    SPECIAL: ColumnState;
  };

  sacrificeSpecialCard: (specialCard: Card, selectCards: Card[]) => void;
  activateCardAttackButton: (card: Card) => void;
  abortGame: (gameId: string, playerId: string) => void;
  canUseStrategicShuffle: () => boolean;
  closeJokerExchangePopup: () => void;
  displayJokerExchangePopup: (availableCards: Card[]) => void;
  exchangeCards: (card1: CardType, card2: CardType) => void;
  handleActivatorExchange: (columnCard: Card, playerCard: Card) => void;
  handleAttack: (attackCard: Card, selectedTarget: AttackTarget) => void;
  handleAttackConfirm: (
    currentAttackCard: Card,
    selectedTarget: AttackTarget,
  ) => void;
  handleCardPlace: (suit: Suit) => void;
  handleDiscard: (card: CardType) => void;
  handleDrawCard: () => void;
  handleJokerAction: (jokerCard: CardType, action: "heal" | "attack") => void;
  handleJokerExchange: (selectedCard: Card) => void;
  handlePassTurn: () => void;
  handleQueenChallenge: (selectedCards: Card[]) => void;
  handleRevolution: () => void;
  handleSkipAction: () => void;
  handleStrategicShuffle: () => void;
  handleSurrender: () => void;
  initializeGame: (gameState: Game) => void;
  moveToReserve: (card: Card) => void;
  recycleDiscardPile: () => void;
  selectCard: (card: CardType) => void;
  setSelectedJokerExchangeCards: (cards: Card[]) => void;
  setSelectedSacrificeCards: (cards: Card[]) => void;
  startGame: () => void;
  setSacrificeMode: (show: boolean) => void;
  setShowRevolutionPopup: (showRevolutionPopup: boolean) => void;
  setShowAttackPopup: (show: boolean, attackCard?: Card) => void;
  updateProfile: (profile: Profile) => void;
  setShowAttackResultPopup: (show: boolean, data?: AttackResult) => void;

  // Turn timer properties
  turnTimeRemaining: number;
  turnTimeInit: number;
  players: string[];
  currentPlayerIndex: number;
  currentPlayerId: string;
  isPlayerTurn: boolean;

  // Attack popup state
  showAttackPopup: boolean;
  currentAttackCard: Card | null;

  // Attack notification state
  showAttackNotification: boolean;
  attackNotificationData: {
    attackCard: Card | null;
    target: AttackTarget | null;
  };

  // Attack result state
  showAttackResultPopup: boolean;
  attackResultData: {
    attackCard: Card | undefined;
    target: AttackTarget | undefined;
    isBlocked: boolean;
  };

  // Joker block request state
  showBlockPopup: boolean;
  blockRequestData: blockRequestData;

  // Queen challenge state
  showQueenChallengePopup: boolean;
  queenChallengeData: {
    queen: Card | null;
    challengingPlayerId: string;
  };
  setShowAttackNotification: (
    show: boolean,
    attackCard?: Card,
    target?: AttackTarget,
  ) => void;

  setShowBlockPopup: (
    show: boolean,
    data?: {
      attackCard: Card;
      attackTarget: AttackTarget;
      attackingPlayerId: string;
    },
  ) => void;
  handleBlockResponse: (willBlock: boolean, blockingCard?: Card) => void;

  // Queen challenge handlers
  setShowQueenChallengePopup: (
    show: boolean,
    data?: {
      queen: Card;
      challengingPlayerId: string;
    },
  ) => void;
  handleQueenChallengeResponse: (selectedQueen: QueenCard) => void;
}

const player: Player = {
  id: "",
  name: "",
  health: 0,
  maxHealth: 0,
  hand: [],
  reserve: [],
  discardPile: [],
  deck: [],
  hasUsedStrategicShuffle: false,
  profile: {
    epithet: "",
    avatar: "",
  },
};

const columnState: ColumnState = {
  cards: [],
  isLocked: false,
  hasLuckyCard: false,
  activatorType: null,
  sequence: [],
  reserveSuit: null,
  faceCards: {},
  attackStatus: {
    attackButtons: [],
    lastAttackCard: { cardValue: "", turn: 0 },
  },
};

// Création du store avec Zustand
export const useGameStore = create<GameStore>((set, get) => ({
  // État initial du jeu
  gameId: "",
  startAt: 0,
  currentPlayer: player,
  deck: [],
  phase: "SETUP",
  messages: [], // Initialize empty messages array
  turn: 0,
  selectedCards: [],
  selectedSacrificeCards: [],
  // Opponent player columns for attack targeting
  opponentPlayerColumns: {
    HEARTS: columnState,
    DIAMONDS: columnState,
    CLUBS: columnState,
    SPADES: columnState,
    SPECIAL: columnState,
  },
  columns: {
    HEARTS: columnState,
    DIAMONDS: columnState,
    CLUBS: columnState,
    SPADES: columnState,
    SPECIAL: columnState,
  },
  hasDiscarded: false,
  hasDrawn: false,
  hasPlayedAction: false,
  isGameOver: false,
  gameOverReason: "",
  playedCardsLastTurn: 0,
  attackMode: false,
  message: "",
  hasUsedFirstStrategicShuffle: false,
  awaitingStrategicShuffleConfirmation: false,
  canEndTurn: false,
  isMessageClickable: false,
  exchangeMode: false,
  selectedForExchange: null,
  showRevolutionPopup: false,
  canBlock: false,
  blockedColumns: [],
  showSacrificePopup: false,
  showJokerExchangePopup: false,
  showAttackPopup: false,
  currentAttackCard: null,

  // Attack notification state
  showAttackNotification: false,
  attackNotificationData: {
    attackCard: null,
    target: null,
  },

  showAttackResultPopup: false,
  attackResultData: {
    attackCard: undefined,
    target: undefined,
    isBlocked: false,
  },
  // Joker block request state
  showBlockPopup: false,
  showQueenChallengePopup: false,
  queenChallengeData: {
    queen: null,
    challengingPlayerId: "",
  },
  blockRequestData: {
    attackCard: null,
    attackTarget: null,
    attackingPlayerId: "",
  },
  sacrificeInfo: null,
  availableCards: [],
  setupTimeInit: 40,
  setupTimeRemaining: 0,
  turnTimeRemaining: 30,
  turnTimeInit: 10,
  players: [],
  currentPlayerIndex: 0,
  currentPlayerId: "",
  isPlayerTurn: false,
  language: i18n.language || "fr",

  startGame: () => {
    const state = get();
    gameSocket.startGame(state.gameId, state.currentPlayer.id);
  },

  abortGame: (gameId: string, playerId: string) => {
    gameSocket.abortGame(gameId, playerId);
    // Set game over state
    set({
      isGameOver: true,
      gameOverReason: "game.setup.timeExpired",
      message: i18next.t("game.setup.timeExpired"),
    });
  },

  initializeGame: async (game: Game) => {
    try {
      //init
      // console.log("init ", game);

      // Get the game state from the server
      const gameState = game.playersGameStates[0];

      // Extract opponent info if available
      const opponentState =
        game.playersGameStates.length > 1 ? game.playersGameStates[1] : null;
      const opponentPlayer = opponentState?.currentPlayer || undefined;

      // If showBlockPopup is true in the game state and there's a pending attack,
      // we need to set up the joker block request data
      // if (gameState.showBlockPopup && game.pendingAttack) {
      set({
        ...gameState,
        opponentPlayer: opponentPlayer,
        opponentPlayerColumns: gameState.opponentPlayerColumns,
        isPlayerTurn:
          game.players[game.currentPlayerIndex] === gameState.currentPlayer.id,
        turnTimeRemaining: game.turnTimeRemaining,
        blockRequestData: game.pendingAttack,
        startAt: gameState.startAt, // Set the startAt timestamp from the server
      });
      // }

      // Listen for updates
      gameSocket.onGameState((state) => {
        console.log("🟢 Received game state:", state);

        if (state != null) {
          // Get the game state from the server
          const gameState = state.playersGameStates[0];

          // Extract opponent info if available
          const opponentState =
            state.playersGameStates.length > 1
              ? state.playersGameStates[1]
              : null;
          const opponentPlayer = opponentState?.currentPlayer || undefined;

          set({
            ...gameState,
            opponentPlayer: opponentPlayer,
            opponentPlayerColumns: gameState.opponentPlayerColumns,
            isPlayerTurn:
              state.players[state.currentPlayerIndex] ===
              gameState.currentPlayer.id,
            turnTimeRemaining: state.turnTimeRemaining,
            blockRequestData: state.pendingAttack,
          });
        }
      });

      // Listen for attack events
      gameSocket.onAttack(
        (data: {
          gameId: string;
          playerId: string;
          attackCard: Card;
          attackTarget: AttackTarget;
        }) => {
          console.log("🗡️ Received attack event:", data);

          // Only show notification if it's not the current player's attack
          if (data.playerId !== game.playersGameStates[0].currentPlayer.id) {
            // Show attack notification for the opponent
            get().setShowAttackNotification(
              true,
              data.attackCard,
              data.attackTarget,
            );
          }
        },
      );

      gameSocket.onAttackResult((result: AttackResult) => {
        console.log("🟢 Received attackResult:", result);
        set({
          showAttackResultPopup: true,
          attackResultData: {
            attackCard: result.attackCard,
            target: result.target,
            isBlocked: result.isBlocked,
          },
        });
      });

      // Listen for updates
      gameSocket.onGameOver((data: gameOverResponse) => {
        console.log("🟢 Received game over:", data);

        if (data.gameId == game.gameId) {
          set((state) => {
            return {
              ...state,
              isGameOver: true,
              gameOverReason: data.message,
            };
          });
        }
      });

      // Listen for turn timer updates
      gameSocket.onTurnTimer((data) => {
        console.log("🟢 Received turn timer update:", data);
        if (data.gameId === game.gameId) {
          set((state) => ({
            ...state,
            turnTimeRemaining: data.remainingSeconds,
          }));
        }
      });

      // Listen for joker block requests
      gameSocket.onBlockRequest((data) => {
        console.log("🟢 Received  block request:", data);
        if (data.gameId === game.gameId) {
          set((state) => ({
            ...state,
            showBlockPopup: true,
            blockRequestData: data,
          }));
        }
      });

      return () => {
        gameSocket.disconnect();
      };
    } catch (error) {
      console.error("Failed to initialize game:", error);
    }
  },

  handleJokerAction: (jokerCard: Card, action: "heal" | "attack") => {
    const state = get();
    // Only allow joker action if it's the player's turn
    if (state.isPlayerTurn) {
      gameSocket.handleJokerAction(
        state.gameId,
        state.currentPlayer.id,
        jokerCard,
        action,
      );

      if (action === "heal") {
        // Jouer le son de soin
        AudioManager.getInstance().playHealSound();
      }
    } else {
      // console.log("Cannot use joker action - not your turn");
    }
  },

  handleDrawCard: () => {
    const state = get();

    // Only allow draw card if it's the player's turn
    if (state.isPlayerTurn) {
      // Jouer le son de pioche
      AudioManager.getInstance().playDrawSound();

      // console.log("handle draw card ", state.gameId);
      gameSocket.handleDrawCard(state.gameId, state.currentPlayer.id);
    } else {
      // console.log("Cannot draw card - not your turn");
    }
  },

  handlePassTurn: () => {
    const state = get();
    // Only allow pass turn if it's the player's turn
    if (state.isPlayerTurn) {
      gameSocket.handlePassTurn(state.gameId, state.currentPlayer.id);
    } else {
      // console.log("Cannot pass turn - not your turn");
    }
  },

  handleSkipAction: () => {
    const state = get();
    // Only allow skip action if it's the player's turn
    if (state.isPlayerTurn) {
      gameSocket.handleSkipAction(state.gameId, state.currentPlayer.id);
    } else {
      // console.log("Cannot skip action - not your turn");
    }
  },

  handleSurrender: () => {
    const state = get();
    // Only allow surrender if it's the player's turn
    if (state.isPlayerTurn) {
      gameSocket.handleSurrender(state.gameId, state.currentPlayer.id);
    } else {
      // console.log("Cannot surrender - not your turn");
    }
  },

  // Gère le déplacement d'une carte vers la réserve
  moveToReserve: async (card: Card) => {
    const state = get();

    // Only allow action during setup phase or if it's the player's turn
    if (state.phase === "SETUP" || state.isPlayerTurn) {
      gameSocket.moveToReserve(state.gameId, state.currentPlayer.id, card);
    } else {
      // console.log("Cannot move to reserve - not your turn");
    }
  },

  handleDiscard: (card: Card) => {
    const state = get();
    // Only allow discard if it's the player's turn
    if (state.isPlayerTurn) {
      gameSocket.handleDiscard(state.gameId, state.currentPlayer.id, card);
    } else {
      // console.log("Cannot discard - not your turn");
    }
  },

  // Récupère les cartes de la défausse pour remplir le deck
  recycleDiscardPile: () => {
    const state = get();
    // Only allow recycle discard pile if it's the player's turn
    if (state.isPlayerTurn) {
      gameSocket.handleRecycleDiscardPile(state.gameId, state.currentPlayer.id);

      // Jouer le son de mélange
      AudioManager.getInstance().playShuffleSound();
    } else {
      // console.log("Cannot recycle discard pile - not your turn");
    }
  },

  exchangeCards: (card1: Card, card2: Card) => {
    const state = get();
    // Only allow exchange cards if it's the player's turn
    if (state.isPlayerTurn) {
      gameSocket.handleExchangeCards(
        state.gameId,
        state.currentPlayer.id,
        card1,
        card2,
      );
    } else {
      // console.log("Cannot exchange cards - not your turn");
    }
  },

  updateProfile: (profile: Profile) => {
    // Met à jour le profil du joueur
    const state = get();
    gameSocket.handleUpdateProfile(
      state.gameId,
      state.currentPlayer.id,
      profile,
    );
  },

  canUseStrategicShuffle: () => {
    const state = get();
    return (
      state.phase === "DISCARD" && // Uniquement en phase de défausse (début du tour)
      !state.hasDiscarded && // Pas encore défaussé
      !state.hasDrawn && // Pas encore pioché
      !state.hasPlayedAction && // Pas encore joué d'action
      !state.currentPlayer.hasUsedStrategicShuffle // N'a pas encore utilisé le mélange ce tour-ci
    );
  },

  handleStrategicShuffle: () => {
    const state = get();
    // Only allow strategic shuffle if it's the player's turn
    if (state.isPlayerTurn) {
      // Jouer le son de mélange
      AudioManager.getInstance().playShuffleSound();

      // console.log(state.gameId);
      gameSocket.handleStrategicShuffle(state.gameId, state.currentPlayer.id);
    } else {
      // console.log("Cannot use strategic shuffle - not your turn");
    }
  },

  handleCardPlace: (suit: Suit) => {
    const state = get();
    // Only allow card placement if it's the player's turn
    if (state.isPlayerTurn) {
      gameSocket.handlePlaceCard(
        state.gameId,
        state.currentPlayer.id,
        suit,
        state.selectedCards,
      );
    } else {
      // console.log("Cannot place card - not your turn");
    }
  },

  handleQueenChallenge: (selectedCards: Card[]) => {
    // console.log("handleQueenChallenge ", selectedCard);

    const state = get();
    // Only allow queen challenge if it's the player's turn
    if (state.isPlayerTurn) {
      gameSocket.handleQueenChallenge(
        state.gameId,
        state.currentPlayer.id,
        selectedCards,
      );

      // Jouer le son de soin
      AudioManager.getInstance().playHealSound();
    } else {
      // console.log("Cannot use queen challenge - not your turn");
    }
  },

  handleActivatorExchange: (columnCard: Card, playerCard: Card) => {
    const state = get();
    // Only allow activator exchange if it's the player's turn
    if (state.isPlayerTurn) {
      gameSocket.handleActivatorExchange(
        state.gameId,
        state.currentPlayer.id,
        columnCard,
        playerCard,
      );
    } else {
      // console.log("Cannot exchange activator - not your turn");
    }
  },

  handleJokerExchange: (selectedCard: Card) => {
    const state = get();
    // Only allow joker exchange if it's the player's turn
    if (state.isPlayerTurn) {
      gameSocket.handleJokerExchange(
        state.gameId,
        state.currentPlayer.id,
        selectedCard,
      );
    } else {
      // console.log("Cannot exchange joker - not your turn");
    }
  },

  sacrificeSpecialCard: (specialCard: Card, selectedCards: Card[]) => {
    const state = get();
    // console.log("specialCard ", specialCard);
    // console.log("selectedCards ", selectedCards);

    // Only allow sacrifice if it's the player's turn
    if (state.isPlayerTurn) {
      gameSocket.handleSacrificeSpecialCard(
        state.gameId,
        state.currentPlayer.id,
        specialCard,
        selectedCards,
      );

      //  // Jouer les sons appropriés
      //  if (healthBonus > 0) {
      //   // Pour la Dame, jouer le son de sacrifice suivi du son de soin
      //   AudioManager.getInstance().playSacrificeWithHealSound();
      // } else {
      //   // Pour les autres cartes, jouer uniquement le son de sacrifice
      //   AudioManager.getInstance().playSacrificeSound();
      // }
    } else {
      // console.log("Cannot sacrifice special card - not your turn");
    }
  },

  handleAttack: (attackCard: Card, attackTarget: AttackTarget) => {
    const state = get();
    // Only allow attack if it's the player's turn
    if (state.isPlayerTurn) {
      gameSocket.handleAttack(
        state.gameId,
        state.currentPlayer.id,
        attackCard,
        attackTarget,
      );
    } else {
      // console.log("Cannot attack - not your turn");
    }
  },

  activateCardAttackButton: (card: Card) => {
    // console.log("activateCardAttackButton");

    set((state) => {
      const updatedColumns = { ...state.columns };

      updatedColumns[card.suit].attackStatus.attackButtons = updatedColumns[
        card.suit
      ].attackStatus.attackButtons.map((element) => {
        // if(card.value =="J")
        if (element.id == card.value) {
          if (card.value == "J")
            return { ...element, active: true, wasUsed: false };
          else return { ...element, active: true };
        } else return element;
      });

      // console.log(updatedColumns);

      return {
        ...state,
        columns: updatedColumns,
      };
    });
  },

  // handleBlock: (suit: Suit) => {
  //   const state = get();
  //   // Only allow block if it's the player's turn
  //   if (state.isPlayerTurn) {
  //     gameSocket.handleBlock(state.gameId, state.currentPlayer.id, suit);
  //   } else {
  //     // console.log("Cannot block - not your turn");
  //   }
  // },

  // handleBlockWithJoker: (jokerCard: Card) => {
  //   const state = get();

  //   // Play sound effect
  //   AudioManager.getInstance().playCardSound();

  //   // Send the block action to the server
  //   gameSocket.handleBlockAttackWithJoker(state.gameId, state.currentPlayer.id, jokerCard);
  // },

  handleRevolution: () => {
    const state = get();
    // Only allow revolution if it's the player's turn
    if (state.isPlayerTurn) {
      const audioManager = AudioManager.getInstance();
      audioManager.playRevolutionSound();
      set((state) => {
        // ... existing revolution logic ...
        return {
          ...state,
          blockedColumns: [],

          // ... rest of the state updates
        };
      });
    } else {
      // console.log("Cannot start revolution - not your turn");
    }
  },

  setShowRevolutionPopup: (showRevolutionPopup: boolean) => {
    const state = get();
    gameSocket.setShowRevolutionPopup(
      state.gameId,
      state.currentPlayer.id,
      showRevolutionPopup,
    );
  },

  setShowAttackPopup: (show: boolean, attackCard?: Card) => {
    set({
      showAttackPopup: show,
      currentAttackCard: show && attackCard ? attackCard : null,
    });
  },

  setShowAttackNotification: (
    show: boolean,
    attackCard?: Card,
    target?: AttackTarget,
  ) => {
    set({
      showAttackNotification: show,
      attackNotificationData: {
        attackCard: attackCard || null,
        target: target || null,
      },
    });
  },

  setShowAttackResultPopup: (show: boolean, data?: AttackResult) => {
    set({
      showAttackResultPopup: show,
      attackResultData: data,
    });
  },

  setShowBlockPopup: (
    show: boolean,
    data?: {
      attackCard: Card;
      attackTarget: AttackTarget;
      attackingPlayerId: string;
    },
  ) => {
    set({
      showBlockPopup: show,
      blockRequestData: data
        ? {
            attackCard: data.attackCard,
            attackTarget: data.attackTarget,
            attackingPlayerId: data.attackingPlayerId,
          }
        : {
            attackCard: null,
            attackTarget: null,
            attackingPlayerId: "",
          },
    });
  },

  handleBlockResponse: (willBlock: boolean, blockingCard?: Card) => {
    const state = get();

    if (state.isPlayerTurn) {
      gameSocket.handleBlockResponse(
        state.gameId,
        state.currentPlayer.id,
        willBlock,
        blockingCard,
      );
    }

    set({ showBlockPopup: false });
  },

  setShowQueenChallengePopup: (
    show: boolean,
    data?: {
      queen: Card;
      challengingPlayerId: string;
    },
  ) => {
    set({
      showQueenChallengePopup: show,
      queenChallengeData: data
        ? {
            queen: data.queen,
            challengingPlayerId: data.challengingPlayerId,
          }
        : {
            queen: null,
            challengingPlayerId: "",
          },
    });
  },

  handleQueenChallengeResponse: (selectedQueen: QueenCard) => {
    // console.log(".......handleQueenChallengeResponse", selectedQueen);
    const state = get();

    gameSocket.handleQueenChallengeResponse(
      state.gameId,
      state.currentPlayer.id,
      selectedQueen,
    );

    set({ showQueenChallengePopup: false });
  },

  handleAttackConfirm: (
    currentAttackCard: Card,
    selectedTarget: AttackTarget,
  ) => {
    const state = get();

    // Close the attack popup
    set({ showAttackPopup: false });

    // Handle different attack types
    state.handleAttack(currentAttackCard, selectedTarget);
  },

  /*
   * FrontEnd functions
   */
  closeJokerExchangePopup: () => {
    set((state) => {
      return { ...state, showJokerExchangePopup: false };
    });
  },

  displayJokerExchangePopup: (availableCards: Card[]) => {
    set((state) => {
      return { ...state, showJokerExchangePopup: true, availableCards };
    });
  },

  selectCard: (card: Card) => {
    set((state) => {
      // Si une action a déjà été jouée, on ne peut plus sélectionner de cartes
      if (state.hasPlayedAction) return state;

      const isCardSelected = state.selectedCards.some((c) => c.id === card.id);

      // Si la carte est déjà sélectionnée, on la désélectionne
      if (isCardSelected) {
        return {
          ...state,
          selectedCards: state.selectedCards.filter((c) => c.id !== card.id),
          message: "",
        };
      }

      // Si on a déjà 2 cartes sélectionnées, on ne peut pas en sélectionner plus
      if (state.selectedCards.length >= 2) {
        return state;
      }

      // Sélection de la carte
      const newSelectedCards = [...state.selectedCards, card];
      let message = "";

      // Messages selon la combinaison
      if (newSelectedCards.length === 1) {
        if (card.value === "A") {
          message = "Sélectionnez un Joker ou un 7 pour activer la colonne";
        } else if (card.type === "JOKER" || card.value === "7") {
          message = "Sélectionnez un As pour activer une colonne";
        }
      } else if (newSelectedCards.length === 2) {
        const [card1, card2] = newSelectedCards;
        const hasAs = card1.value === "A" || card2.value === "A";
        const hasActivator =
          card1.type === "JOKER" ||
          card1.value === "7" ||
          card2.type === "JOKER" ||
          card2.value === "7";

        if (hasAs && hasActivator) {
          message = "Cliquez sur une colonne pour l'activer";
        }
      }

      return {
        ...state,
        selectedCards: newSelectedCards,
        message,
      };
    });
  },

  setSelectedSacrificeCards: (cards: Card[]) =>
    set({ selectedSacrificeCards: cards }),

  setSelectedJokerExchangeCards: (cards: Card[]) =>
    set({ selectedCards: cards }),

  setSacrificeMode: (mode: boolean) => {
    const state = get();
    const selectedCard = state.selectedCards[0];

    if (!mode || !selectedCard) {
      set({
        showSacrificePopup: false,
        availableCards: [],
        selectedSacrificeCards: [],
      });
      return;
    }

    // Récupérer toutes les cartes jouées sur le terrain
    const availableCards = Object.values(state.columns)
      .filter((column) => {
        // Vérifier si la colonne existe et a des cartes
        if (!column || !column.cards || column.cards.length === 0) return false;

        return true;
      })
      .flatMap((column) => {
        const cards = column.cards.filter((card, index) => {
          // Ne jamais permettre le sacrifice du 10
          if (card.value === "10") return false;

          // Ne pas permettre le sacrifice si la colonne a 10 cartes (il faut d'abord sacrifier la plus haute)
          if (column.cards.length >= 10) {
            // On ne permet que le sacrifice de la carte la plus haute
            return index === column.cards.length - 1;
          }

          // Vérifier si un Joker est présent au-dessus de cette carte
          const hasJokerAbove = column.cards.some(
            (c, i) => i > index && c.type === "JOKER",
          );

          // Ne pas permettre le sacrifice si un Joker est présent au-dessus
          if (hasJokerAbove) return false;

          // Pour le Valet, uniquement 8 ou 9
          if (selectedCard.value === "J") {
            return ["8", "9"].includes(card.value);
          }

          // Pour les autres cartes, exclure A, 7, 10
          return !["A", "7", "10"].includes(card.value);
        });

        // Trier les cartes par valeur décroissante
        return cards.sort((a, b) => {
          const valueOrder = ["2", "3", "4", "5", "6", "8", "9", "J", "Q", "K"];
          return valueOrder.indexOf(b.value) - valueOrder.indexOf(a.value);
        });
      });

    set({
      showSacrificePopup: mode,
      availableCards,
      selectedSacrificeCards: [],
    });
  },
  // setLanguage: (lang: string) => {
  //   const state = get();
  //   state.language = lang;

  // },
}));
