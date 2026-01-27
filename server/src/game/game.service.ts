import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game as GameEntity } from '../entities/game.entity';
import { TimerService } from './timer.service';
import { TimerType, GameTimer } from '../entities/game-timer.entity';
import { MatchmakingQueue } from '../entities/matchmaking-queue.entity';
import { AuthService } from '../auth/auth.service';
import { GameAITurnManager } from './ai/game-ai-turn-manager';
import {
  Card,
  Game,
  GameState,
  GameType,
  Profile,
  Suit,
  ColumnState,
  SuitCard,
  TargetAttackType,
  QueenCard,
  messageType,
} from '../types/game';
import { drawCards, shuffleDeck } from '../utils/deck';
import { createDeck } from '../utils/deck';

import {
  initialAttackButtons,
  JOKER_CARD,
  QUEEN_CARD,
  AS_CARD,
  SEVEN_CARD,
  SEVEN,
  KING_CARD,
  JACK_CARD,
  PLAY_PHASE,
  DRAW_PHASE,
  DISCARD_PHASE,
  ATTACK_ACTION,
  HEAL_ACTION,
  SACRIFICE,
  SETUP_PHASE,
} from '../constants/definition';
import { TIME_SETUP_LIMIT, TIME_TURN_LIMIT } from '../constants/timers';

@Injectable()
export class GameService {
  private aiTurnManager: GameAITurnManager;

  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(MatchmakingQueue)
    private queueRepository: Repository<MatchmakingQueue>,
    private authService: AuthService,
    private timerService: TimerService,
  ) {
    this.aiTurnManager = new GameAITurnManager(this);
  }

  async triggerAITurnIfNeeded(gameId: string): Promise<void> {
    const gameData = await this.getGameState(gameId);
    if (!gameData) return;

    const currentPlayerId = gameData.players[gameData.currentPlayerIndex];

    if (this.aiTurnManager.isAIPlayer(currentPlayerId)) {
      const currentPlayerState = gameData.playersGameStates[gameData.currentPlayerIndex];

      if (currentPlayerState.phase === 'SETUP') {
        await this.aiTurnManager.handleAISetup(gameId, currentPlayerId);
      } else {
        await this.aiTurnManager.handleAITurn(gameId, currentPlayerId);
      }
    }
  }

  async createGame(mode: string, playersInfo: any[]): Promise<string> {
    const nbPlayers = mode === 'solo' ? 2 : playersInfo.length;
    const gameEntity = new GameEntity();
    gameEntity.state = this.initializeGame(mode, nbPlayers);
    gameEntity.game_mode = mode;

    gameEntity.state = this.addPlayer(gameEntity.state, playersInfo[0].playerId, playersInfo[0].socketId);

    if (mode === 'solo') {
      const aiPlayerId = `AI_${Date.now()}`;
      const aiSocketId = `AI_SOCKET_${Date.now()}`;
      gameEntity.state = this.addPlayer(gameEntity.state, aiPlayerId, aiSocketId);
    }

    if (playersInfo.length > 1 && mode == 'multiplayer')
      gameEntity.state = this.addPlayer(gameEntity.state, playersInfo[1].playerId, playersInfo[1].socketId);

    const savedGame = await this.gameRepository.save(gameEntity);

    // Create a setup timer for the game
    // The timer duration is stored in the game state
    await this.timerService.createTimer(savedGame.id, TimerType.SETUP, TIME_SETUP_LIMIT);

    return savedGame.id;
  }

  private addPlayer(game: GameType, playerId: string, socketId: string) {
    // Check if the game is full or not in waiting status
    if (game.players.length >= game.maxPlayers || game.gameStatus !== 'waiting') {
      return null;
    }

    // Create a new player
    game.players.push(playerId);

    // Add socket mapping
    game.playerSockets[playerId] = socketId;

    //update player name and id
    const currentPlayerIndex = game.players.length - 1; // Adjust index to 0-based
    game.playersGameStates[currentPlayerIndex].currentPlayer.id = playerId;
    game.playersGameStates[currentPlayerIndex].currentPlayer.name = playerId;

    // add the gameId to each player state
    game.playersGameStates[currentPlayerIndex].gameId = game.gameId;

    // If the game is now full, change status to in-progress
    if (game.players.length >= game.maxPlayers) {
      game.gameStatus = 'in-progress';

      //TBC meilleur main ...
      // Set the first player as the current player
      game.currentPlayerIndex = 0;
    }

    return game;
  }

  async getGameState(gameId: string): Promise<GameType | null> {
    const gameEntity = await this.gameRepository.findOne({
      where: { id: gameId },
    });

    return gameEntity?.state || null;
  }

  async getGameTimer(gameId: string, timerType: TimerType) {
    // This method returns the timer for a specific game
    return await this.timerService.getTimer(gameId, timerType);
  }

  async getPlayerState(gameId: string, playerId: string): Promise<GameType | null> {
    console.log('getPlayerState', gameId, ' player ', playerId);

    const gameData = await this.getGameState(gameId);

    // Remove any sensitive information about other players
    // that this player shouldn't see
    const playerView = this.isolatePlayerState(gameData, gameId, playerId);

    return playerView;
  }

  isolatePlayerState(gameData: Game, gameId: string, playerId: string) {
    // Return a player-specific view of the game state
    // Find the player's index in the game
    const playerIndex = gameData.players.indexOf(playerId);
    if (playerIndex === -1) return null;

    // Get the player-specific game state
    const playerGameState = gameData.playersGameStates[playerIndex];
    if (!playerGameState) return null;

    // Get the opponent's game state to extract columns
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponentGameState = gameData.players.length > 1 ? gameData.playersGameStates[opponentIndex] : null;

    // Add opponent's columns to the player's game state if available
    if (opponentGameState && opponentGameState.columns) {
      playerGameState.opponentPlayerColumns = {
        HEARTS: opponentGameState.columns.HEARTS,
        DIAMONDS: opponentGameState.columns.DIAMONDS,
        CLUBS: opponentGameState.columns.CLUBS,
        SPADES: opponentGameState.columns.SPADES,
      };
      playerGameState.validAttackTargets = this.getValidAttackTargets(playerGameState, opponentGameState);
    } else {
      // If no opponent data available, use empty columns
      playerGameState.opponentPlayerColumns = {
        HEARTS: this.createEmptyColumnState(),
        DIAMONDS: this.createEmptyColumnState(),
        CLUBS: this.createEmptyColumnState(),
        SPADES: this.createEmptyColumnState(),
      };
    }

    // Create playersGameStates array with current player and sanitized opponent
    const playersGameStates = [playerGameState];

    // Add sanitized opponent info if available
    if (opponentGameState) {
      const sanitizedOpponentState = {
        ...opponentGameState,
        currentPlayer: {
          ...opponentGameState.currentPlayer,
          // Hide sensitive data from opponent
          hand: [],
          reserve: [],
        },
      };
      playersGameStates.push(sanitizedOpponentState);
    }

    // Create a copy of the game data with player and opponent states
    const playerView: GameType = {
      ...gameData,
      playersGameStates: playersGameStates,
    };

    //add game id
    playerView.gameId = gameId;

    return playerView;
  }

  private initializeGame(mode: string = 'solo', maxPlayers: number = 1): GameType {
    const playersGameStates =
      mode === 'multiplayer' ? [this.initializeGameState(), this.initializeGameState()] : [this.initializeGameState()];

    const game: GameType = {
      playersGameStates: playersGameStates,
      players: [], //empty during init the game
      currentPlayerIndex: 0,
      gameMode: mode as 'solo' | 'multiplayer',
      maxPlayers: maxPlayers,
      playerSockets: {},
      gameStatus: 'waiting',
      turnTimeRemaining: TIME_TURN_LIMIT,
    };

    return game;
  }

  // Helper method to create an empty column state
  private createEmptyColumnState(): ColumnState {
    return {
      cards: [],
      isLocked: false,
      hasLuckyCard: false,
      activatorType: null,
      sequence: [],
      reserveSuit: null,
      faceCards: {},
      attackStatus: {
        attackButtons: [],
        lastAttackCard: { cardValue: '', turn: 0 },
      },
    };
  }

  // Helper method to add a message to the game state
  addGameMessage(gameState: GameState, type: messageType, text: string) {
    gameState.messages.push({
      type,
      text,
      timestamp: Date.now(),
    });
  }

  private initializeGameState(): GameState {
    const deck = createDeck();
    const shuffledDeck = shuffleDeck(deck);
    const [remainingDeck, initialHand] = drawCards(shuffledDeck, 7);

    return {
      gameId: '',
      currentPlayer: {
        id: '',
        name: '',
        health: 10,
        maxHealth: 10,
        hand: initialHand,
        reserve: [],
        discardPile: [],
        profile: {
          epithet: 'Maître des Cartes',
        },
        hasUsedStrategicShuffle: false,
      },
      deck: remainingDeck,
      phase: SETUP_PHASE,
      turn: 1,
      selectedCards: [],
      selectedSacrificeCards: [],
      columns: this.initializeColumns(),
      hasDiscarded: false,
      hasDrawn: false,
      hasPlayedAction: false,
      isGameOver: false,
      gameOverReason: '',
      attackMode: false,
      message: '',
      winner: null,
      canEndTurn: false,
      blockedColumns: [],
      showRevolutionPopup: false,
      showBlockPopup: false,
      showQueenChallengePopup: false,
      hasUsedFirstStrategicShuffle: false,
      validAttackTargets: {},
      messages: [], // Initialize empty messages array
    };
  }

  private initializeColumns(): Record<Suit, ColumnState> {
    return {
      HEARTS: {
        cards: [],
        isDestroyed: false,
        attackStatus: {
          attackButtons: initialAttackButtons,
          lastAttackCard: { cardValue: '', turn: 0 },
        },
        hasLuckyCard: false,
        reserveSuit: null,
        faceCards: {},
      },
      DIAMONDS: {
        cards: [],
        isDestroyed: false,
        attackStatus: {
          attackButtons: initialAttackButtons,
          lastAttackCard: { cardValue: '', turn: 0 },
        },
        hasLuckyCard: false,
        reserveSuit: null,
        faceCards: {},
      },
      CLUBS: {
        cards: [],
        isDestroyed: false,
        attackStatus: {
          attackButtons: initialAttackButtons,
          lastAttackCard: { cardValue: '', turn: 0 },
        },
        hasLuckyCard: false,
        reserveSuit: null,
        faceCards: {},
      },
      SPADES: {
        cards: [],
        isDestroyed: false,
        attackStatus: {
          attackButtons: initialAttackButtons,
          lastAttackCard: { cardValue: '', turn: 0 },
        },
        hasLuckyCard: false,
        reserveSuit: null,
        faceCards: {},
      },
    };
  }

  async findOrCreateMultiplayerGame(
    playerId: string,
    socketId: string,
  ): Promise<{
    gameId: string;
    token: string;
    status: 'waiting' | 'matched';
    waitingPlayerId?: string;
    waitingPlayerToken?: string;
  }> {
    console.log('findOrCreateMultiplayerGame ', playerId, ' ', socketId);

    try {
      // Check if there's a player waiting in the queue
      const waitingPlayer = await this.queueRepository.findOne({
        where: { isMatched: false },
        order: { createdAt: 'ASC' },
      });

      console.log('waitingPlayer ', waitingPlayer);
      if (waitingPlayer) {
        // Create a new game.  with both players
        const gameId = await this.createGame('multiplayer', [
          {
            playerId: waitingPlayer.playerId,
            socketId: waitingPlayer.socketId,
          },
          { playerId, socketId },
        ]);

        // Mark the waiting player as matched
        waitingPlayer.isMatched = true;
        waitingPlayer.matchedGameId = gameId;
        await this.queueRepository.save(waitingPlayer);

        // const game = await this.gameRepository.findOne({
        //   where: { id: gameId },
        // });

        // if (!game) throw new Error('Failed to create game');

        // Generate token for the current player
        const token = this.authService.generateToken({
          username: playerId,
          gameId: gameId,
        });

        console.log('Players matched! Game created with ID:', gameId);

        // Generate token for the waiting player as well
        const waitingPlayerToken = this.authService.generateToken({
          username: waitingPlayer.playerId,
          gameId: gameId,
        });

        // Return game info with 'matched' status and waiting player info
        return {
          gameId,
          token,
          status: 'matched',
          waitingPlayerId: waitingPlayer.socketId,
          waitingPlayerToken,
        };
      } else {
        // No waiting players, add this player to the queue
        console.log('Creating new queue entry for player:', playerId);

        // Create and save the queue entry
        const queueEntry = new MatchmakingQueue();
        queueEntry.playerId = playerId;
        queueEntry.socketId = socketId;
        queueEntry.isMatched = false;

        const savedEntry = await this.queueRepository.save(queueEntry);
        console.log('Queue entry saved with ID:', savedEntry.id);

        // Create a temporary game ID for this waiting player
        const tempGameId = `waiting-${savedEntry.id}`;

        // Generate token
        const token = this.authService.generateToken({
          username: playerId,
          gameId: tempGameId,
        });

        // Return with 'waiting' status
        return { gameId: tempGameId, token, status: 'waiting' };
      }
    } catch (error) {
      console.error('Error in findOrCreateMultiplayerGame:', error);
      throw error;
    }
  }

  async checkMatchStatus(tempGameId: string): Promise<{ matched: boolean; gameId?: string }> {
    // Check if this is a temporary game ID
    if (!tempGameId.startsWith('waiting-')) {
      // This is already a real game ID, so the player is matched
      return { matched: true, gameId: tempGameId };
    }

    // Extract the queue entry ID from the temp game ID
    const queueEntryId = tempGameId.replace('waiting-', '');

    // Find the queue entry
    const queueEntry = await this.queueRepository.findOne({
      where: { id: queueEntryId },
    });

    if (!queueEntry) {
      // Queue entry not found, something went wrong
      return { matched: false };
    }

    if (queueEntry.isMatched) {
      // Find the game that this player was matched to
      return { matched: true, gameId: queueEntry.matchedGameId };
    }

    // Player is still waiting
    return { matched: false };
  }

  async removeFromMatchmakingQueue(tempGameId: string): Promise<void> {
    try {
      const queueEntryId = tempGameId.replace('waiting-', '');

      // Find any queue entries with this socket ID
      const queueEntries = await this.queueRepository.find({
        where: { id: queueEntryId, isMatched: false },
      });

      console.log('queueEntries ', queueEntries);

      // Remove them from the queue
      if (queueEntries.length > 0) {
        await this.queueRepository.remove(queueEntries);
        console.log(`Removed ${queueEntries.length} entries from matchmaking queue for player ${queueEntryId}`);
      }
    } catch (error) {
      console.error('Error removing from matchmaking queue:', error);
    }
  }

  async moveToReserve(gameId: string, playerId: string, card: Card): Promise<Game | null> {
    console.log('move to reserve ', gameId, ' card ', card.value);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    console.log('...playerIndex ', playerIndex);

    const gameState = gameData.playersGameStates[playerIndex];

    console.log('playerindex ', playerIndex, ' playerId', playerId);

    const isReserveComplete = gameState.currentPlayer.reserve.length === 2;

    if (!isReserveComplete) {
      const updatedReserve = [...gameState.currentPlayer.reserve, card];
      const updatedHand = gameState.currentPlayer.hand.filter((c) => c.id !== card.id);

      gameState.currentPlayer.reserve = updatedReserve;
      gameState.currentPlayer.hand = updatedHand;
    }

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    console.log(gameData.playersGameStates[0].currentPlayer.reserve);

    return game.state;
  }

  async handleStartGame(gameId: string, playerId: string): Promise<Game | null> {
    console.log('start game ', `${gameId} ${playerId}`);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    let gameState = gameData.playersGameStates[playerIndex];

    const isReserveComplete = gameState.currentPlayer.reserve.length === 2;

    if (isReserveComplete) {
      gameState = {
        ...gameState,
        phase: DISCARD_PHASE,
        hasDiscarded: false,
        hasDrawn: false,
        hasPlayedAction: false,
      };

      // Check if this is the last player completing setup
      // Count how many players have completed setup (have phase beyond SETUP)
      let playersReady = 0;
      for (let i = 0; i < gameData.playersGameStates.length; i++) {
        if (i !== playerIndex && gameData.playersGameStates[i].phase !== SETUP_PHASE) {
          playersReady++;
        }
      }

      // If all other players are ready, this must be the last player
      // For a 2-player game, playersReady would be 1 when the last player is ready
      const isLastPlayer = playersReady === gameData.players.length - 1;

      // Set the startAt timestamp only when the last player completes setup
      if (isLastPlayer) {
        const currentTime = Date.now();

        // Update all players' game states with the same startAt time
        for (let i = 0; i < gameData.playersGameStates.length; i++) {
          gameData.playersGameStates[i].startAt = currentTime;

          // Add a game start message to each player's message log
          this.addGameMessage(gameData.playersGameStates[i], 'system', 'Game has started! Global timer synchronized.');
        }

        // Also set it for the current player
        gameState.startAt = currentTime;
      }
    }

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);

    return game.state;
  }

  async handleCardPlace(gameId: string, playerId: string, suit: Suit, selectedCards: Card[]): Promise<Game | null> {
    console.log('handleCardPlace ', gameId);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];
    let newButtonsState = gameState.columns[suit].attackStatus.attackButtons;

    const opponentGameState = gameData.playersGameStates[playerIndex === 0 ? 1 : 0];

    const column = gameState.columns[suit];
    if (!column) return null;

    const reserveSuitCard = column.reserveSuit;
    const position = column.cards.length;

    // Handle placing a 7 from reserve suit to column
    if (reserveSuitCard?.value === SEVEN_CARD && reserveSuitCard.suit === suit && position === 6) {
      gameState.selectedCards = [];
      gameState.hasPlayedAction = true;
      gameState.columns[suit].cards = [
        ...column.cards.slice(0, position),
        reserveSuitCard,
        ...column.cards.slice(position + 1),
      ];
      gameState.columns[suit].reserveSuit = null;

      // Update the player's game state in the game object
      gameData.playersGameStates[playerIndex] = gameState;

      //Add game messages
      this.addGameMessage(gameState, 'action', `You placed 7 from reserve suit to column in ${suit} column`);

      if (gameData.players.length > 1) {
        this.addGameMessage(
          opponentGameState,
          'opponent',
          `Your opponent placed 7 from reserve suit to column in ${suit} column`,
        );
      }

      // Save the updated game
      game.state = gameData;
      await this.gameRepository.save(game);
      return game.state;
    }

    // Handle placing a 7 from hand/reserve to reserve suit
    const selectedCard = selectedCards.find((card) => card.value === SEVEN_CARD || card.type === JOKER_CARD);
    if (selectedCard && position === 6) {
      // Remove selected card from hand or reserve
      const newHand = gameState.currentPlayer.hand.filter((c) => c.id !== selectedCard.id);
      const newReserve = gameState.currentPlayer.reserve.filter((c) => c.id !== selectedCard.id);

      // Move reserve suit card to hand or reserve based on where the 7/Joker came from
      const isFromHand = gameState.currentPlayer.hand.some((c) => c.id === selectedCard.id);
      if (reserveSuitCard) {
        if (isFromHand) {
          newHand.push(reserveSuitCard);
        } else {
          newReserve.push(reserveSuitCard);
        }
      }

      gameState.columns[suit].cards = [
        ...column.cards.slice(0, position),
        selectedCard,
        ...column.cards.slice(position + 1),
      ];
      gameState.columns[suit].reserveSuit = null;

      gameState.currentPlayer.hand = newHand;
      gameState.currentPlayer.reserve = newReserve;
      gameState.hasPlayedAction = true;
      gameState.selectedCards = [];

      // Update the player's game state in the game object
      gameData.playersGameStates[playerIndex] = gameState;

      this.addGameMessage(gameState, 'action', `You placed 7 in reserve suit in ${suit} column`);

      if (gameData.players.length > 1) {
        this.addGameMessage(opponentGameState, 'opponent', `Your opponent placed 7 in reserve suit in ${suit} column`);
      }

      // Save the updated game
      game.state = gameData;
      await this.gameRepository.save(game);
      return game.state;
    }

    // Si c'est un Joker et que la colonne est pleine (10 cartes), on bloque simplement le placement
    if (selectedCards[0]?.type === JOKER_CARD && column.cards.length >= 10) {
      gameState.selectedCards = [];
      gameState.message = 'Cette colonne est pleine'; //TBC

      // Update the player's game state in the game object
      gameData.playersGameStates[playerIndex] = gameState;

      game.state = gameData;
      await this.gameRepository.save(game);
      return game.state;
    }

    // Cas d'activation avec Tête + Activateur
    if (selectedCards.length === 2) {
      const hasFaceCard = selectedCards.some((card) => card.value === JACK_CARD || card.value === KING_CARD);
      const hasActivator = selectedCards.some((card) => card.type === JOKER_CARD || card.value === SEVEN_CARD);

      if (hasFaceCard && hasActivator) {
        const faceCard = selectedCards.find((card) => card.value === JACK_CARD || card.value === KING_CARD);
        const activatorCard = selectedCards.find((card) => card.type === JOKER_CARD || card.value === SEVEN_CARD);
        const activator = selectedCards.some((c) => c.type === JOKER_CARD) ? JOKER_CARD : SEVEN;
        const isJack = selectedCards.some((card) => card.value === JACK_CARD);

        // Pour les têtes, on vérifie uniquement la couleur, pas l'activation
        if (faceCard?.suit === suit) {
          const newHand = gameState.currentPlayer.hand.filter(
            (card) => !selectedCards.some((selected) => selected.id === card.id),
          );
          const newReserve = gameState.currentPlayer.reserve.filter(
            (card) => !selectedCards.some((selected) => selected.id === card.id),
          );

          if (isJack) {
            const jackIndex = gameState.columns[suit].attackStatus.attackButtons.findIndex((e) => e.id == JACK_CARD);

            gameState.columns[suit].attackStatus.attackButtons[jackIndex] = {
              ...gameState.columns[suit].attackStatus.attackButtons[jackIndex],
              active: activator === JOKER_CARD ? true : false, //Le valet doit être en position d'attaque des qu'il rentre sur le terrain avec un  ou un Joker ou sacrifice, pas avec 7
              wasUsed: false,
              insertedTurn: gameState.turn,
            };
          }

          gameState.columns[suit].faceCards[faceCard.value] = {
            ...faceCard,
            activatedBy: activator,
          };

          gameState.currentPlayer.hand = newHand;
          gameState.currentPlayer.reserve = newReserve;
          gameState.currentPlayer.discardPile = [...gameState.currentPlayer.discardPile, activatorCard];
          gameState.hasPlayedAction = true;
          gameState.selectedCards = [];

          // Update the player's game state in the game object
          gameData.playersGameStates[playerIndex] = gameState;

          this.addGameMessage(gameState, 'action', `You placed ${faceCard.value} in ${suit} column`);

          if (gameData.players.length > 1) {
            this.addGameMessage(
              opponentGameState,
              'opponent',
              `Your opponent placed ${faceCard.value} in ${suit} column`,
            );
          }

          // Save the updated game
          game.state = gameData;

          await this.gameRepository.save(game);
          return game.state;
        }
      }

      // Sinon on vérifie si c'est un As + activateur
      if (selectedCards.some((card) => card.value === AS_CARD) && hasActivator && position === 0) {
        // console.log("Sinon on vérifie si c'est un As + activateur");

        const ace = selectedCards.find((card) => card.value === AS_CARD);
        const activator = selectedCards.find((card) => card.type === JOKER_CARD || card.value === SEVEN_CARD);

        if (ace?.suit === suit && (column.cards.length === 0 || !column.hasLuckyCard)) {
          // Réinitialiser le blocage pour cette colonne car c'est un nouveau cycle
          const newBlockedColumns = gameState.blockedColumns.filter((i) => {
            const columnSuit = Object.keys(gameState.columns)[i];
            return columnSuit !== suit;
          });

          // Remove cards from hand/reserve
          const newHand = gameState.currentPlayer.hand.filter(
            (card) => !selectedCards.some((selected) => selected.id === card.id),
          );
          const newReserve = gameState.currentPlayer.reserve.filter(
            (card) => !selectedCards.some((selected) => selected.id === card.id),
          );

          gameState.blockedColumns = newBlockedColumns;
          gameState.columns[suit].hasLuckyCard = true;
          gameState.columns[suit].cards = [ace];
          gameState.columns[suit].reserveSuit = activator;

          gameState.currentPlayer.hand = newHand;
          gameState.currentPlayer.reserve = newReserve;
          gameState.hasPlayedAction = true;
          gameState.selectedCards = [];

          this.addGameMessage(gameState, 'action', `You placed ${AS_CARD} in ${suit} column`);

          if (gameData.players.length > 1) {
            this.addGameMessage(opponentGameState, 'opponent', `Your opponent placed ${AS_CARD} in ${suit} column`);
          }

          // Update the player's game state in the game object
          gameData.playersGameStates[playerIndex] = gameState;

          // Save the updated game
          game.state = gameData;
          await this.gameRepository.save(game);
          return game.state;
        }
      }
    }

    // Placement normal d'une carte
    if (selectedCards.length === 1) {
      const card = selectedCards[0];

      // Vérifier si c'est un 7 ou un Joker pour la reserveSuit
      // const isActivator = card.type === JOKER_CARD || card.value === SEVEN_CARD;
      const isActivator = card.value === SEVEN_CARD;

      if (isActivator) {
        // Vérifier si la reserveSuit est déjà occupée
        if (column.reserveSuit !== null) {
          return game.state;
        }

        // Placement dans reserveSuit uniquement pour 7 et Joker
        const newHand = gameState.currentPlayer.hand.filter((c) => c.id !== card.id);
        const newReserve = gameState.currentPlayer.reserve.filter((c) => c.id !== card.id);

        gameState.columns[suit].reserveSuit = card;

        gameState.currentPlayer.hand = newHand;
        gameState.currentPlayer.reserve = newReserve;
        gameState.hasPlayedAction = true;
        gameState.selectedCards = [];

        this.addGameMessage(gameState, 'action', `You placed ${card.value} in ${suit} column`);

        if (gameData.players.length > 1) {
          this.addGameMessage(opponentGameState, 'opponent', `Your opponent placed ${card.value} in ${suit} column`);
        }

        // Update the player's game state in the game object
        gameData.playersGameStates[playerIndex] = gameState;

        // Save the updated game
        game.state = gameData;

        await this.gameRepository.save(game);
        return game.state;
      }

      // Pour les cartes numériques (As à 10)
      if (card.type != JOKER_CARD) {
        if (card.suit !== suit || !column.hasLuckyCard) {
          return game.state;
        }

        // Vérifier si c'est une carte numérique (As à 10)
        const numericValues = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
        if (!numericValues.includes(card.value)) {
          return game.state;
        }

        const isDestroyed = gameState.columns[suit].isDestroyed;
        const destroyerCards = gameState.columns[suit].destroyedCards;

        console.log('.....destroyerCards ', destroyerCards);

        // Vérifier l'ordre chronologique
        const currentValue = card.value;
        const expectedValue = numericValues[column.cards.length];
        if (currentValue !== expectedValue && !isDestroyed) {
          return game.state;
        }

        const destroyedCard = destroyerCards && destroyerCards.find((element) => element.card.value === card.value);

        if (isDestroyed && !destroyedCard) {
          return game.state;
        }

        // Si on remplace un Joker, réactiver les attaques pour cette catégorie
        const cardToReplace = column.cards[column.cards.length];
        if (cardToReplace && cardToReplace.type === JOKER_CARD) {
          const currentCategory = initialAttackButtons[column.cards.length].category;
          newButtonsState = gameState.columns[suit].attackStatus.attackButtons.map((button) => {
            if (button.category === currentCategory && !button.wasUsed) {
              return { ...button, active: true }; // Réactiver les boutons si pas encore attaqué
            }
            return button;
          });
        }

        // Placement normal dans la séquence
        const newHand = gameState.currentPlayer.hand.filter((c) => c.id !== card.id);
        const newReserve = gameState.currentPlayer.reserve.filter((c) => c.id !== card.id);

        if (!isDestroyed) gameState.columns[suit].cards = [...gameState.columns[suit].cards, card];
        else {
          gameState.columns[suit].cards.splice(destroyedCard.index, 0, card);
          if (destroyerCards && destroyerCards.length === 1) {
            gameState.columns[suit].isDestroyed = false;
            gameState.columns[suit].destroyedCards = null;
            // Restore attack buttons if they were saved
            if (gameState.columns[suit].attackStatus && gameState.columns[suit].attackStatus.preDestroyButtons) {
              newButtonsState = gameState.columns[suit].attackStatus.preDestroyButtons;
              delete gameState.columns[suit].attackStatus.preDestroyButtons;
            }
          }
        }

        gameState.columns[suit].attackStatus = {
          attackButtons: newButtonsState,
          lastAttackCard: { cardValue: '', turn: 0 },
        };

        gameState.currentPlayer.hand = newHand;
        gameState.currentPlayer.reserve = newReserve;
        gameState.hasPlayedAction = true;
        gameState.selectedCards = [];

        // check for revolution
        const _gameState = this.checkRevolution(gameData, gameState, opponentGameState, suit);

        this.addGameMessage(gameState, 'action', `You placed ${card.value} in ${suit} column`);

        if (gameData.players.length > 1) {
          this.addGameMessage(opponentGameState, 'opponent', `Your opponent placed ${card.value} in ${suit} column`);
        }

        // Update the player's game state in the game object
        gameData.playersGameStates[playerIndex] = _gameState;

        // Save the updated game
        game.state = gameData;
        await this.gameRepository.save(game);
        return game.state;
      }

      // si joker
      if (card.value == JOKER_CARD) {
        //le joker ne peut remplacer A, 7 et 10
        if (position == 0 || position == 6 || position == 9) {
          gameState.selectedCards = [];

          // Update the player's game state in the game object
          gameData.playersGameStates[playerIndex] = gameState;

          // Save the updated game
          game.state = gameData;
          await this.gameRepository.save(game);
          return game.state;
        }

        //check si la colonne est detruite
        //Le joker ne peut aider à monter une colonne deja détruite
        const isDestroyed = gameState.columns[suit].isDestroyed;
        if (isDestroyed) {
          return game.state;
        }

        //desactiver l'attaque pour la categorie correspondante
        const currentCategory = initialAttackButtons[column.cards.length].category;
        newButtonsState = gameState.columns[suit].attackStatus.attackButtons.map((button) => {
          if (button.category === currentCategory) {
            return { ...button, active: false }; // Désactiver les boutons de la catégorie
          }
          return button;
        });
      }

      // Placement normal dans la séquence
      const newHand = gameState.currentPlayer.hand.filter((c) => c.id !== card.id);
      const newReserve = gameState.currentPlayer.reserve.filter((c) => c.id !== card.id);

      gameState.columns[suit].cards = [...gameState.columns[suit].cards, card];
      gameState.columns[suit].attackStatus = {
        attackButtons: newButtonsState,
        lastAttackCard: { cardValue: '', turn: 0 },
      };

      gameState.currentPlayer.hand = newHand;
      gameState.currentPlayer.reserve = newReserve;
      gameState.hasPlayedAction = true;
      gameState.selectedCards = [];

      // check for revolution
      const _gameState = this.checkRevolution(gameData, gameState, opponentGameState, suit);

      this.addGameMessage(gameState, 'action', `You placed ${card.value} in ${suit} column`);

      if (gameData.players.length > 1) {
        this.addGameMessage(opponentGameState, 'opponent', `Your opponent placed ${card.value} in ${suit} column`);
      }

      // Update the player's game state in the game object
      gameData.playersGameStates[playerIndex] = _gameState;

      // Save the updated game
      game.state = gameData;
      await this.gameRepository.save(game);
      return game.state;
    }

    // Cas d'activation avec Dame + Activateur
    if (selectedCards.length === 2) {
      const hasQueen = selectedCards.some((card) => card.value === QUEEN_CARD);
      const hasActivator = selectedCards.some((card) => card.type === JOKER_CARD || card.value === SEVEN_CARD);

      if (hasQueen && hasActivator) {
        const queen = selectedCards.find((card) => card.value === QUEEN_CARD);
        const activator = selectedCards.find((card) => card.type === JOKER_CARD || card.value === SEVEN_CARD);

        // Remove cards from hand/reserve
        const newHand = gameState.currentPlayer.hand.filter(
          (card) => !selectedCards.some((selected) => selected.id === card.id),
        );
        const newReserve = gameState.currentPlayer.reserve.filter(
          (card) => !selectedCards.some((selected) => selected.id === card.id),
        );

        gameState.currentPlayer.hand = newHand;
        gameState.currentPlayer.reserve = newReserve;

        // Calculate health gain
        const healAmount = activator?.type === JOKER_CARD ? 4 : 2;
        gameState.currentPlayer.health += healAmount;
        this.normalizeMaxHealth(gameState);

        gameState.currentPlayer.discardPile = [...gameState.currentPlayer.discardPile, queen, activator];

        gameState.selectedCards = [];
        gameState.hasPlayedAction = true;
        gameState.canEndTurn = true;

        this.addGameMessage(gameState, 'action', `You placed ${QUEEN_CARD} in ${suit} column`);

        if (gameData.players.length > 1) {
          this.addGameMessage(opponentGameState, 'opponent', `Your opponent placed ${QUEEN_CARD} in ${suit} column`);
        }

        // Update the player's game state in the game object
        gameData.playersGameStates[playerIndex] = gameState;

        // Save the updated game
        game.state = gameData;
        await this.gameRepository.save(game);

        await this.triggerAITurnIfNeeded(gameId);

        return game.state;
      }
    }

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);

    return game.state;
  }

  async handleJokerExchange(gameId: string, playerId: string, selectedCard: Card): Promise<Game | null> {
    console.log('handleJokerExchange ', gameId);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];

    const opponentGameState = gameData.playersGameStates[playerIndex === 0 ? 1 : 0];

    if (gameState.phase !== PLAY_PHASE || gameState.hasPlayedAction) return null;

    const updatedPlayer = { ...gameState.currentPlayer };
    const isInHand = updatedPlayer.hand.some((c) => c.id === selectedCard.id);

    const jokerCard = gameState.columns[selectedCard.suit].cards[parseInt(selectedCard.value) - 1];

    if (isInHand) updatedPlayer.hand = updatedPlayer.hand.map((c) => (c.id === selectedCard.id ? jokerCard : c));
    else updatedPlayer.reserve = updatedPlayer.reserve.map((c) => (c.id === selectedCard.id ? jokerCard : c));

    const updatedColumns = { ...gameState.columns };

    updatedColumns[selectedCard.suit].cards = updatedColumns[selectedCard.suit].cards.map(
      (card: Card, index: number) => ((index + 1).toString() == selectedCard.value ? selectedCard : card),
    );

    const attackBtns = updatedColumns[selectedCard.suit].attackStatus.attackButtons;

    const newAttackButtons = attackBtns.map((btn) => {
      return !btn.active && !btn.wasUsed ? { ...btn, active: true } : { ...btn };
    });

    updatedColumns[selectedCard.suit].attackStatus.attackButtons = newAttackButtons;

    gameState.currentPlayer = updatedPlayer;
    gameState.columns = updatedColumns;
    gameState.hasPlayedAction = true;
    gameState.phase = PLAY_PHASE;
    gameState.canEndTurn = true;

    function isSuit(value: SuitCard): value is Suit {
      return value !== 'SPECIAL';
    }

    const _suit = isSuit(selectedCard.suit) ? selectedCard.suit : 'HEARTS';

    // check for revolution
    const _gameState = this.checkRevolution(gameData, gameState, opponentGameState, _suit);

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = _gameState;

    // Save the updated game
    game.state = gameData;

    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);
    return game.state;
  }

  async handleJokerAction(gameId: string, playerId: string, jokerCard: Card, action: string): Promise<Game | null> {
    console.log('handleJokerAction ', action, ' ', gameId);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];

    if (jokerCard.type !== JOKER_CARD || gameState.hasPlayedAction || gameState.phase !== PLAY_PHASE) {
      return null;
    }

    const updatedPlayer = { ...gameState.currentPlayer };

    if (action === HEAL_ACTION) {
      // Augmente les PV max et actuels de 3
      const newHealth = updatedPlayer.health + 3;
      updatedPlayer.maxHealth = newHealth;
      updatedPlayer.health = newHealth;

      // Déplace le Joker vers la défausse
      updatedPlayer.hand = updatedPlayer.hand.filter((c) => c.id !== jokerCard.id);
      updatedPlayer.reserve = updatedPlayer.reserve.filter((c) => c.id !== jokerCard.id);
      updatedPlayer.discardPile = [...updatedPlayer.discardPile, jokerCard];
    } else if (action === ATTACK_ACTION) {
      // Simule une attaque en mode solo
      updatedPlayer.hand = updatedPlayer.hand.filter((c) => c.id !== jokerCard.id);
      updatedPlayer.reserve = updatedPlayer.reserve.filter((c) => c.id !== jokerCard.id);
      updatedPlayer.discardPile = [...updatedPlayer.discardPile, jokerCard];
    }

    gameState.currentPlayer = updatedPlayer;
    gameState.hasPlayedAction = true;
    gameState.selectedCards = [];
    gameState.canEndTurn = true;
    gameState.phase = PLAY_PHASE;

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // Save the updated game
    game.state = gameData;

    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);
    return game.state;
  }

  /**
   * Handle queen challenge initiated by a player
   * @param gameId - The game ID
   * @param playerId - The challenging player ID
   * @param selectedCards - The selected cards including the queen
   * @returns Updated game state
   */
  async handleQueenChallenge(gameId: string, playerId: string, selectedCards: Card[]): Promise<GameType | null> {
    console.log('handleQueenChallenge', gameId, playerId);

    // Get the game data
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
    });
    if (!game) return null;

    const gameData = game.state as GameType;

    const currentPlayerIndex = gameData.players.indexOf(playerId);
    const opponentPlayerIndex = (currentPlayerIndex + 1) % gameData.players.length;

    const opponentPlayerId = gameData.players[opponentPlayerIndex];

    // Get the queen and joker card from the selected cards
    const queenCard = selectedCards.find((card) => card.value === QUEEN_CARD);
    const jokerCard = selectedCards.find((card) => card.type === JOKER_CARD);

    if (!queenCard || !jokerCard) return null;

    this._endTurn(gameData, playerId);

    const playerGameState = gameData.playersGameStates[currentPlayerIndex];

    // Remove queen and joker from the hand/reserve
    this.removeCardfromHandOrReserve(playerGameState, queenCard);
    this.removeCardfromHandOrReserve(playerGameState, jokerCard);

    // Update the opponent's game state to show the queen challenge popup
    const opponentGameState = gameData.playersGameStates.find((state) => state.currentPlayer.id === opponentPlayerId);

    if (opponentGameState) {
      opponentGameState.showQueenChallengePopup = true;
      gameData.queenChallengeData = {
        queen: queenCard,
        challengingPlayerId: playerId,
      };
    }

    // Save the updated game state
    game.state = gameData;
    await this.gameRepository.save(game);

    return gameData;
  }

  async handleQueenChallengeResponse(
    gameId: string,
    playerId: string,
    selectedQueen: QueenCard,
  ): Promise<GameType | null> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
    });
    if (!game) return null;

    console.log('handleQueenChallengeResponse', selectedQueen);

    const gameData = game.state as GameType;

    const respondingPlayerIndex = gameData.players.indexOf(playerId);
    const challengerPlayerIndex = respondingPlayerIndex === 0 ? 1 : 0;

    // Find both players' game states
    const respondingPlayerState = gameData.playersGameStates.find((state) => state.currentPlayer.id === playerId);

    // Find the challenger's game state (the player who initiated the challenge)
    const challengerPlayerState = gameData.playersGameStates.find((state) => state.currentPlayer.id !== playerId);

    if (respondingPlayerState && challengerPlayerState) {
      // Hide the queen challenge popup for the responding player
      respondingPlayerState.showQueenChallengePopup = false;

      // If the guess is incorrect, give the challenger a health bonus
      if (selectedQueen.suit !== gameData.queenChallengeData.queen.suit) {
        // Add 5 health points to the challenger (capped at max health)
        challengerPlayerState.currentPlayer.health += 5;
        this.normalizeMaxHealth(challengerPlayerState);

        // Update the message to indicate the correct guess
        challengerPlayerState.message = 'Your opponent guessed the queen suit incorrectly! You gained 5 health points.';
        respondingPlayerState.message = 'You guessed the queen suit incorrectly.';
      } else {
        // Add only 1 health point to the challenger
        challengerPlayerState.currentPlayer.health += 1;
        this.normalizeMaxHealth(challengerPlayerState);

        // Update the message to indicate the incorrect guess
        challengerPlayerState.message = 'Your opponent guessed the queen suit correctly.';
        respondingPlayerState.message = 'You guessed the queen suit correctly! Your opponent gained 2 health points.';
      }

      // Clear the queen challenge data
      gameData.queenChallengeData = null;

      gameData.playersGameStates[challengerPlayerIndex] = challengerPlayerState;
      gameData.playersGameStates[respondingPlayerIndex] = respondingPlayerState;

      // Save the updated game state
      game.state = gameData;
      await this.gameRepository.save(game);
    }

    return gameData;
  }

  async handleActivatorExchange(
    gameId: string,
    playerId: string,
    columnCard: Card,
    playerCard: Card,
  ): Promise<Game | null> {
    console.log('handleActivatorExchange ', gameId);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];

    if (gameState.phase !== PLAY_PHASE || gameState.hasPlayedAction) return null;

    const isActivator = (card: Card) => card.type === JOKER_CARD || card.value === SEVEN_CARD;
    if (!isActivator(columnCard) || !isActivator(playerCard)) {
      return null;
    }

    const updatedPlayer = { ...gameState.currentPlayer };
    const isInHand = updatedPlayer.hand.some((c) => c.id === playerCard.id);

    if (isInHand) {
      updatedPlayer.hand = updatedPlayer.hand.map((c) => (c.id === playerCard.id ? columnCard : c));
    } else {
      updatedPlayer.reserve = updatedPlayer.reserve.map((c) => (c.id === playerCard.id ? columnCard : c));
    }

    const updatedColumns = { ...gameState.columns };
    const targetColumn = Object.values(updatedColumns).find((col) => col.reserveSuit?.id === columnCard.id);

    if (targetColumn) {
      targetColumn.reserveSuit = playerCard;
    }

    gameState.currentPlayer = updatedPlayer;
    gameState.columns = updatedColumns;
    gameState.hasPlayedAction = true;
    gameState.message = "Échange d'activateurs effectué";
    gameState.canEndTurn = true;
    gameState.phase = PLAY_PHASE;

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);
    return game.state;
  }

  private async consumeJackAttack(
    game: GameEntity,
    gameData: GameType,
    playerState: GameState,
    attackCard: Card,
    playerIndex: number,
  ): Promise<Game | null> {
    const playerColumn = playerState.columns[attackCard.suit];
    const buttonsState = playerColumn.attackStatus.attackButtons;
    const clickedButtonState = buttonsState.find((button) => button.id === attackCard.value);

    if (!clickedButtonState || !clickedButtonState.active) {
      return null;
    }

    // Disable the Jack attack button
    const newButtonsState = buttonsState.map((button) => {
      if (button.id === JACK_CARD) {
        return {
          ...button,
          active: false,
          wasUsed: true,
          usedTurn: playerState.turn - 1, //as turn is already incremented previous the execution of this function (_endTurn)
        };
      }
      return button;
    });

    // Update the column's attack status
    playerState.columns[attackCard.suit].attackStatus = {
      lastAttackCard: { cardValue: attackCard.value, turn: playerState.turn },
      attackButtons: newButtonsState,
    };

    // Update the player's game state
    gameData.playersGameStates[playerIndex] = playerState;

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    return game.state;
  }

  private async dealJackAttack(
    game: GameEntity,
    gameData: GameType,
    playerState: GameState,
    opponentState: GameState,
    attackCard: Card,
    attackTarget: TargetAttackType,
    playerIndex: number,
    opponentIndex: number,
  ) {
    const playerColumn = playerState.columns[attackCard.suit];

    // Jack destroys cards in the opponent's column of the same suit
    const opposingColumn = opponentState.columns[attackCard.suit];
    if (opposingColumn && opposingColumn.cards.length > 0) {
      if (attackTarget.cardValue === '8' || attackTarget.cardValue === '9') {
        const cardToDiscard = opposingColumn.cards[opposingColumn.cards.length - 1];
        opponentState.currentPlayer.discardPile = [...opponentState.currentPlayer.discardPile, cardToDiscard];

        // Remove last card of the column
        opposingColumn.cards.pop();

        // Add a message about the attack

        this.addGameMessage(
          playerState,
          'action',
          `Jack of ${attackCard.suit} destroyed 1 card in the opponent's column!`,
        );
        this.addGameMessage(opponentState, 'opponent', `Jack of ${attackCard.suit} destroyed 1 card in the column!`);
      } //attaque <6, detruire toutes les cartes au dessus du joker (si existe)
      else if (['A', '2', '3', '4', '5', '6'].includes(attackTarget.cardValue)) {
        const cardsToDiscard = [];

        for (let i = opposingColumn.cards.length - 1; i >= 0; i--) {
          const card = opposingColumn.cards[i];

          if (card.value === JOKER_CARD) {
            break;
          }
          if (card.value !== JOKER_CARD) {
            opposingColumn.cards.splice(i, 1);
            cardsToDiscard.push(opposingColumn.cards[i]);
          }
        }

        // Move cards from the column to the discard pile
        opponentState.currentPlayer.discardPile = [...opponentState.currentPlayer.discardPile, ...cardsToDiscard];

        opposingColumn.hasLuckyCard = false;

        //Le valet est envoyé en defausse
        const { J, ...restFaceCards } = playerColumn.faceCards;
        playerColumn.faceCards = restFaceCards;

        playerState.currentPlayer.discardPile = [...playerState.currentPlayer.discardPile, J];

        // Add a message about the attack
        this.addGameMessage(
          playerState,
          'action',
          `Jack of ${attackCard.suit} destroyed ${cardsToDiscard.length} cards in the opponent's column!`,
        );
        this.addGameMessage(
          opponentState,
          'opponent',
          `Opponent Jack of ${attackCard.suit} destroyed ${cardsToDiscard.length} cards in the column!`,
        );
      }
    } else {
      this.addGameMessage(
        playerState,
        'action',
        `Jack of ${attackCard.suit} attacked, but there were no cards to destroy.`,
      );
    }

    // Update the opposing player's state
    gameData.playersGameStates[opponentIndex] = opponentState;

    // Update the player's game state
    gameData.playersGameStates[playerIndex] = playerState;

    // Reset pendingAttack to null since we're proceeding with the attack
    gameData.pendingAttack = null;

    // Save the updated game
    // game.state = gameData;
    // await this.gameRepository.save(game);
    // return game.state;
  }

  // Helper method to get numeric value from card
  private getNumericValueFromCard(card: Card): number {
    switch (card.value) {
      case 'A':
        return 1;
      case '2':
        return 2;
      case '3':
        return 3;
      case '4':
        return 4;
      case '5':
        return 5;
      case '6':
        return 6;
      case '7':
        return 7;
      case '8':
        return 8;
      case '9':
        return 9;
      case '10':
        return 10;
      default:
        return 0;
    }
  }

  async handleStrategicShuffle(gameId: string, playerId: string): Promise<Game | null> {
    console.log('handleStrategicShuffle ', gameId);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];

    if (!this.canUseStrategicShuffle(gameState)) return null;

    const allDiscardedCards = [...gameState.currentPlayer.hand, ...gameState.currentPlayer.discardPile];
    const allCards = [...gameState.deck, ...allDiscardedCards];
    const newDeck = shuffleDeck(allCards);
    const [remainingDeck, newHand] = drawCards(newDeck, 5);

    gameState.deck = remainingDeck;
    gameState.currentPlayer.hand = newHand;
    gameState.currentPlayer.discardPile = [];
    gameState.currentPlayer.hasUsedStrategicShuffle = true;

    gameState.phase = PLAY_PHASE;
    gameState.hasDiscarded = true;
    gameState.hasDrawn = true;
    gameState.hasPlayedAction = false;

    if (gameState.hasUsedFirstStrategicShuffle) {
      gameState.hasPlayedAction = true;
      gameState.canEndTurn = true;
      gameState.message = 'game.messages.strategicShuffleNext';
    } else {
      gameState.hasUsedFirstStrategicShuffle = true;
      gameState.message = 'game.messages.strategicShuffleFirst';
    }

    // Add game message about strategic shuffle
    this.addGameMessage(
      gameState,
      'action',
      `You performed a strategic shuffle and drew a new hand of ${newHand.length} cards.`,
    );

    // If this is a multiplayer game, notify the opponent
    if (gameData.players.length > 1) {
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponentState = gameData.playersGameStates[opponentIndex];

      this.addGameMessage(opponentState, 'opponent', `Your opponent performed a strategic shuffle.`);
    }

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);
    return game.state;
  }

  async handleExchangeCards(gameId: string, playerId, card1: Card, card2: Card): Promise<Game | null> {
    console.log('handleExchangeCards ', gameId);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];

    const hand = [...gameState.currentPlayer.hand];
    const reserve = [...gameState.currentPlayer.reserve];

    // Trouver les indices des cartes
    const handIndex = hand.findIndex((c) => c.id === card1.id);
    const reserveIndex = reserve.findIndex((c) => c.id === card2.id);

    // Si l'une des cartes n'est pas trouvée, annuler l'échange
    if (handIndex === -1 || reserveIndex === -1) {
      return null;
    }

    // Échanger les cartes
    const tempCard = hand[handIndex];
    hand[handIndex] = reserve[reserveIndex];
    reserve[reserveIndex] = tempCard;

    gameState.currentPlayer.hand = hand;
    gameState.currentPlayer.reserve = reserve;

    // Add game message about exchanging cards
    this.addGameMessage(
      gameState,
      'action',
      `You exchanged a ${card1.value} of ${card1.suit || 'joker'} from your hand with a ${card2.value} of ${card2.suit || 'joker'} from your reserve.`,
    );

    // If this is a multiplayer game, notify the opponent
    if (gameData.players.length > 1) {
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponentState = gameData.playersGameStates[opponentIndex];

      this.addGameMessage(opponentState, 'opponent', `Your opponent exchanged a card between hand and reserve.`);
    }

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);
    return game.state;
  }

  async handleSacrificeSpecialCard(
    gameId: string,
    playerId: string,
    specialCard: Card,
    selectedCards: Card[],
  ): Promise<Game | null> {
    console.log('handleSacrificeSpecialCard ', gameId);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];

    if (!specialCard || selectedCards.length === 0) return null;

    // Vérifier le nombre de cartes requis
    const requiredCards = specialCard.value === KING_CARD ? 3 : specialCard.value === QUEEN_CARD ? 2 : 1;

    if (selectedCards.length !== requiredCards) return null;

    // Retirer les cartes sacrifiées des colonnes
    const updatedColumns = { ...gameState.columns };
    selectedCards.forEach((card) => {
      const column = updatedColumns[card.suit];
      if (column) {
        // Garder l'état hasLuckyCard, reserveSuit et activatorType tout en retirant la carte
        const newCards = column.cards.filter((c) => c.id !== card.id);
        column.cards = newCards;
        // Préserver l'état d'activation de la colonne
        column.hasLuckyCard = column.hasLuckyCard;
        column.reserveSuit = column.reserveSuit;
        column.activatorType = column.activatorType;
      }
    });

    // Pour le Roi et le Valet, ajouter la carte spéciale aux faceCards
    if (specialCard.value === KING_CARD || specialCard.value === JACK_CARD) {
      const column = updatedColumns[specialCard.suit];
      column.faceCards = {
        ...column.faceCards,
        [specialCard.value]: { ...specialCard, activatedBy: SACRIFICE },
      };

      if (specialCard.value === JACK_CARD) {
        const jackIndex = column.attackStatus.attackButtons.findIndex((e) => e.id == JACK_CARD);

        column.attackStatus.attackButtons[jackIndex] = {
          ...column.attackStatus.attackButtons[jackIndex],
          active: true, //Le valet doit être en position d'attaque des qu'il rentre sur le terrain avec un  ou un Joker ou sacrifice, pas avec 7
          wasUsed: false,
          insertedTurn: gameState.turn,
        };
      }
    }

    // Calculer le bonus de santé
    const healthBonus = specialCard.value === QUEEN_CARD ? 2 : 0;

    // Retirer la carte spéciale de la main ou de la réserve
    const newHand = gameState.currentPlayer.hand.filter((c) => c.id !== specialCard.id);
    const newReserve = gameState.currentPlayer.reserve.filter((c) => c.id !== specialCard.id);

    // Mettre toutes les cartes sacrifiées dans la défausse
    const cardsToDiscard = [...selectedCards];
    if (specialCard.value === QUEEN_CARD) {
      cardsToDiscard.push(specialCard);
    }

    // Construire le message final
    const actionMessage =
      specialCard.value === KING_CARD
        ? 'Roi placé après sacrifice de 3 unités'
        : specialCard.value === QUEEN_CARD
          ? 'Dame sacrifiée, +2 points de vie'
          : 'Valet placé après sacrifice';
    const message = `${actionMessage}. Cliquez sur 'Fin du tour' pour continuer.`;

    gameState.columns = updatedColumns;
    gameState.currentPlayer.hand = newHand;
    gameState.currentPlayer.reserve = newReserve;
    gameState.currentPlayer.health = gameState.currentPlayer.health + healthBonus;
    gameState.currentPlayer.maxHealth =
      specialCard.value === QUEEN_CARD
        ? gameState.currentPlayer.maxHealth + healthBonus
        : gameState.currentPlayer.maxHealth;
    gameState.currentPlayer.discardPile = [...gameState.currentPlayer.discardPile, ...cardsToDiscard];
    gameState.selectedCards = [];

    gameState.hasPlayedAction = true;
    gameState.message = message;
    gameState.canEndTurn = true;

    // Add game message about sacrificing special card
    const messageText =
      specialCard.value === KING_CARD
        ? `You sacrificed ${selectedCards.length} cards to place a King in the ${specialCard.suit} column.`
        : specialCard.value === QUEEN_CARD
          ? `You sacrificed the Queen and gained ${healthBonus} health points.`
          : `You sacrificed a card to place a Jack in the ${specialCard.suit} column.`;

    this.addGameMessage(gameState, 'action', messageText);

    // If this is a multiplayer game, notify the opponent
    if (gameData.players.length > 1) {
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponentState = gameData.playersGameStates[opponentIndex];

      const opponentMessageText =
        specialCard.value === KING_CARD
          ? `Your opponent sacrificed cards to place a King in the ${specialCard.suit} column.`
          : specialCard.value === QUEEN_CARD
            ? `Your opponent sacrificed the Queen and gained ${healthBonus} health points.`
            : `Your opponent sacrificed a card to place a Jack in the ${specialCard.suit} column.`;

      this.addGameMessage(opponentState, 'opponent', opponentMessageText);
    }

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);
    return game.state;
  }

  // async handleBlock(
  //   gameId: string,
  //   playerId: string,
  //   suit: Suit,
  // ): Promise<Game | null> {
  //   console.log('handleBlock ', gameId);

  //   const game = await this.gameRepository.findOne({ where: { id: gameId } });
  //   if (!game) return null;

  //   // Get the game state for the specific player
  //   const gameData = game.state as GameType;

  //   // Find the player index
  //   const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
  //   if (playerIndex === -1) return null;

  //   const gameState = gameData.playersGameStates[playerIndex];

  //   const { phase, hasPlayedAction, blockedColumns } = gameState;

  //   // Vérifier si l'action est valide
  //   if (
  //     phase !== PLAY_PHASE ||
  //     hasPlayedAction ||
  //     blockedColumns.includes(suit)
  //   ) {
  //     return null;
  //   }

  //   // Vérifier si la colonne a une séquence complète
  //   const column = gameState.columns[suit];

  //   if (!column) {
  //     return null;
  //   }

  //   // Vérifier la séquence de cartes
  //   const sequence = ['A', '2', '3', '4', '5', '6', '7'];
  //   const columnCards = column.cards.slice(0, 7);
  //   const columnValues = columnCards.map((card) => {
  //     return card.value;
  //   });

  //   // Vérifier si la séquence est complète et dans l'ordre
  //   const isSequenceComplete = sequence.every((value, index) => {
  //     const cardValue = columnValues[index];
  //     return cardValue === value || cardValue === JOKER_CARD;
  //   });

  //   if (!isSequenceComplete) {
  //     return null;
  //   }

  //   gameState.hasPlayedAction = true;
  //   gameState.canEndTurn = true;
  //   gameState.blockedColumns = [...gameState.blockedColumns, suit];
  //   gameState.message = 'game.messages.blockSuccess';

  //   // Update the player's game state in the game object
  //   gameData.playersGameStates[playerIndex] = gameState;

  //   // Save the updated game
  //   game.state = gameData;
  //   await this.gameRepository.save(game);
  //   return game.state;
  // }

  canBlockAttackWithJoker(gameState: GameState) {
    // Find the joker in hand or reserve
    const jokerInHand = gameState.currentPlayer.hand.findIndex((card) => card.value === 'JOKER');
    const jokerInReserve = gameState.currentPlayer.reserve.findIndex((card) => card.value === 'JOKER');

    if (jokerInHand !== -1 || jokerInReserve !== -1) return true;
    else return false;
  }

  // Check if the player can block an attack with a card 7 in the column
  canBlockAttackWithSeven(gameState: GameState, attackTarget: TargetAttackType) {
    // Only applicable for unit attacks
    if (attackTarget.attackType !== 'unit' || !attackTarget.suit) return false;

    // Check if there's a card 7 in the target column that hasn't been used for defense
    const column = gameState.columns[attackTarget.suit];
    if (!column) return false;

    const sevenInColumn = column.cards.find((card) => card.value === '7' && !card.hasDefended);
    return sevenInColumn ? true : false;
  }

  // Get all cards that can be used to block an attack
  getBlockingCards(gameState: GameState, attackCard: Card, attackTarget: TargetAttackType) {
    const blockingCards = [];

    // Only applicable for unit attacks
    if (attackTarget.attackType !== 'unit' || !attackTarget.suit) return [];

    // Get the card 7 from the target column if it exists
    Object.keys(gameState.columns).forEach((suit) => {
      const column = gameState.columns[suit];
      // Only return cards that haven't been used for defense yet
      const sevenCard = column.cards.find((card) => card.value === SEVEN_CARD && !card.hasDefended);

      if (sevenCard) blockingCards.push(sevenCard);
    });

    const jokersInHand = gameState.currentPlayer.hand.filter((card) => card.value === JOKER_CARD);
    const jokersInReserve = gameState.currentPlayer.reserve.filter((card) => card.value === JOKER_CARD);

    //le joker ne peut pas defendre contre une attaque de joker
    if (attackCard.value !== JOKER_CARD) {
      if (jokersInHand) blockingCards.push(...jokersInHand);
      if (jokersInReserve) blockingCards.push(...jokersInReserve);
    }
    return blockingCards;
  }

  async handleBlockAttackWithSeven(gameId: string, playerId: string, sevenCard: Card): Promise<GameType> {
    console.log('handleBlockAttackWithSeven', gameId);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) throw new Error('Game not found');

    const gameData = game.state as GameType;
    const playerIndex = gameData.players.indexOf(playerId);
    if (playerIndex === -1) throw new Error('Player not found');

    const gameState = gameData.playersGameStates[playerIndex];

    // Find the column containing the card 7
    let foundColumn: Suit | null = null;
    let foundCardIndex = -1;

    for (const suit of Object.keys(gameState.columns) as Suit[]) {
      const column = gameState.columns[suit];
      const cardIndex = column.cards.findIndex((card) => card.id === sevenCard.id && card.value === '7');
      if (cardIndex !== -1) {
        foundColumn = suit;
        foundCardIndex = cardIndex;
        break;
      }
    }

    if (!foundColumn || foundCardIndex === -1) {
      throw new Error('Card 7 not found in columns');
    }

    // Mark the card 7 as having lost its ability to defend
    const column = gameState.columns[foundColumn];
    const updatedCards = [...column.cards];

    // Update the card to mark it as having been used for defense
    // This will prevent it from being used for defense again
    updatedCards[foundCardIndex] = {
      ...updatedCards[foundCardIndex],
      hasDefended: true, // Add a flag to indicate it has been used for defense
    };

    gameState.columns[foundColumn].cards = updatedCards;

    // Reset the showBlockPopup flag
    gameState.showBlockPopup = false;

    // Update the message to indicate the attack was blocked with a card 7
    gameState.message = 'game.messages.blockWithSevenSuccess';

    // Add game message about blocking attack with seven
    this.addGameMessage(gameState, 'action', `You blocked an attack using the Seven in the ${foundColumn} column.`);

    // If this is a multiplayer game, notify the opponent
    if (gameData.players.length > 1) {
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponentState = gameData.playersGameStates[opponentIndex];

      this.addGameMessage(
        opponentState,
        'opponent',
        `Your opponent blocked your attack using a Seven in the ${foundColumn} column.`,
      );
    }

    // Save the updated game state
    game.state = gameData;
    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);
    return game.state;
  }

  async handleBlockAttackWithJoker(gameId: string, playerId: string, jokerCard: Card): Promise<GameType> {
    console.log('handleBlockAttack', gameId);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) throw new Error('Game not found');

    const gameData = game.state as GameType;
    const playerIndex = gameData.players.indexOf(playerId);
    if (playerIndex === -1) throw new Error('Player not found');

    const gameState = gameData.playersGameStates[playerIndex];

    // remove the joker from hand/reserve
    this.removeCardfromHandOrReserve(gameState, jokerCard);

    // Add the joker to the discard pile
    gameState.currentPlayer.discardPile = [...gameState.currentPlayer.discardPile, jokerCard];

    // Reset the showBlockPopup flag
    gameState.showBlockPopup = false;

    // Update the message to indicate the attack was blocked with a Joker
    gameState.message = 'game.messages.blockWithJokerSuccess';

    // Add game message about blocking attack with joker
    this.addGameMessage(gameState, 'action', `You blocked an attack using a Joker card.`);

    // If this is a multiplayer game, notify the opponent
    if (gameData.players.length > 1) {
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponentState = gameData.playersGameStates[opponentIndex];

      this.addGameMessage(opponentState, 'opponent', `Your opponent blocked your attack using a Joker card.`);
    }

    // Save the updated game state
    game.state = gameData;
    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);
    return game.state;
  }

  async setShowRevolutionPopup(gameId: string, playerId: string, showRevolutionPopup: boolean): Promise<Game | null> {
    console.log('setShowRevolutionPopup ');

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];

    gameState.showRevolutionPopup = showRevolutionPopup;

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);
    return game.state;
  }

  private canUseStrategicShuffle(gameState): boolean {
    return (
      gameState.phase === DISCARD_PHASE && // Uniquement en phase de défausse (début du tour)
      !gameState.hasDiscarded && // Pas encore défaussé
      !gameState.hasDrawn && // Pas encore pioché
      !gameState.hasPlayedAction && // Pas encore joué d'action
      !gameState.currentPlayer.hasUsedStrategicShuffle // N'a pas encore utilisé le mélange ce tour-ci
    );
  }

  private checkRevolution(gameData: GameType, playerState: GameState, opponentState: GameState, suit: Suit): GameState {
    console.log('checkRevolution ');

    const column = playerState.columns[suit];

    const isJokerReplaceCard = column.cards.some((card) => card.type === JOKER_CARD);

    // Vérifie si la colonne est complète (10 cartes)
    if (column.cards.length === 10 && !isJokerReplaceCard) {
      // Récupérer la carte de reserveSuit si elle existe
      const reserveSuitCard = column.reserveSuit;

      // Séparer les cartes face (valet et roi) des autres cartes
      const faceCards = column.cards.filter((card) => card.value === JACK_CARD || card.value === KING_CARD);

      // Ne défausser que les cartes qui ne sont pas des valets ou des rois
      const cardsToDiscard = column.cards.filter((card) => card.value !== JACK_CARD && card.value !== KING_CARD);

      // Ajouter l'activateur à la défausse si présent
      if (reserveSuitCard) {
        cardsToDiscard.push(reserveSuitCard);
      }

      // Réinitialise la colonne mais garde les cartes face
      playerState.columns[suit].cards = faceCards;
      // playerState.columns[suit].isLocked = false;
      playerState.columns[suit].hasLuckyCard = false;
      // playerState.columns[suit].activatorType = null;
      // playerState.columns[suit].sequence = [];
      playerState.columns[suit].reserveSuit = null;
      // playerState.columns[suit].isReserveSuitLocked = false;// S'assure que la colonne n'est pas verrouillée
      playerState.columns[suit].faceCards = column.faceCards; // Préserve les cartes face existantes
      playerState.columns[suit].attackStatus = {
        attackButtons: initialAttackButtons,
        lastAttackCard: { cardValue: '', turn: 0 },
      };

      playerState.currentPlayer.discardPile = [...playerState.currentPlayer.discardPile, ...cardsToDiscard];

      playerState.showRevolutionPopup = true;

      // Détruit le Roi adverse s’il est présent (même couleur).
      opponentState.columns[suit].faceCards = {};

      // Inflige 10 points de dégâts directs à l’adversaire
      opponentState.currentPlayer.health -= 10;

      // Check if the opponent's health is zero or below
      if (opponentState.currentPlayer.health <= 0) {
        opponentState.currentPlayer.health = 0;
        opponentState.isGameOver = true;
        playerState.isGameOver = true;
        opponentState.winner = playerState.currentPlayer.id;
        playerState.winner = playerState.currentPlayer.id;
        playerState.gameOverReason = 'You win';
        opponentState.gameOverReason = 'You lost';

        gameData.gameStatus = 'completed';
      }
    }

    return playerState;
  }

  async handleDiscardCard(gameId: string, playerId: string, card: Card): Promise<Game | null> {
    console.log('handleDiscard ', gameId);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];

    if (gameState.hasDiscarded || gameState.phase !== DISCARD_PHASE) return null;

    const isFromHand = gameState.currentPlayer.hand.some((c) => c.id === card.id);
    const isFromReserve = gameState.currentPlayer.reserve.some((c) => c.id === card.id);

    const newHand = isFromHand
      ? gameState.currentPlayer.hand.filter((c) => c.id !== card.id)
      : [...gameState.currentPlayer.hand];

    const newReserve = isFromReserve
      ? gameState.currentPlayer.reserve.filter((c) => c.id !== card.id)
      : [...gameState.currentPlayer.reserve];

    const newDiscardPile = [...gameState.currentPlayer.discardPile, card];

    gameState.currentPlayer.hand = newHand;
    gameState.currentPlayer.reserve = newReserve;
    gameState.currentPlayer.discardPile = newDiscardPile;
    gameState.hasDiscarded = true;
    gameState.phase = DRAW_PHASE;

    // Add game message about discarding a card
    this.addGameMessage(gameState, 'action', `You discarded ${card.value} of ${card.suit || 'joker'}.`);

    // If this is a multiplayer game, notify the opponent
    if (gameData.players.length > 1) {
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponentState = gameData.playersGameStates[opponentIndex];

      this.addGameMessage(opponentState, 'opponent', `Your opponent discarded a card.`);
    }

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);
    return game.state;
  }

  async handleDrawCard(gameId: string, playerId: string): Promise<Game | null> {
    console.log('handleDrawCard ', `${gameId} ${playerId}`);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];

    if (gameState.phase !== DRAW_PHASE || gameState.hasDrawn) return null;

    // Calculer combien de cartes manquent pour compléter la main et la réserve
    const currentHandCount = gameState.currentPlayer.hand.length;
    const currentReserveCount = gameState.currentPlayer.reserve.length;
    const maxHandCards = 5;
    const maxReserveCards = 2;

    // Calculer combien de cartes on peut ajouter
    const handSpace = Math.max(0, maxHandCards - currentHandCount);
    const reserveSpace = Math.max(0, maxReserveCards - currentReserveCount);
    const cardsNeeded = handSpace + reserveSpace;

    // Piocher les cartes nécessaires
    const [newDeck, drawnCards] = drawCards(gameState.deck, cardsNeeded);

    // Distribuer les cartes en priorité à la main
    const newHand = [...gameState.currentPlayer.hand];
    const newReserve = [...gameState.currentPlayer.reserve];

    drawnCards.forEach((card) => {
      if (newHand.length < maxHandCards) {
        newHand.push(card);
      } else if (newReserve.length < maxReserveCards) {
        newReserve.push(card);
      }
    });

    gameState.deck = newDeck;
    gameState.currentPlayer.hand = newHand;
    gameState.currentPlayer.reserve = newReserve;
    gameState.phase = PLAY_PHASE;
    gameState.hasDrawn = true;

    // Add game message about drawing cards
    this.addGameMessage(
      gameState,
      'action',
      `You drew ${drawnCards.length} card${drawnCards.length !== 1 ? 's' : ''}.`,
    );

    // If this is a multiplayer game, notify the opponent
    if (gameData.players.length > 1) {
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponentState = gameData.playersGameStates[opponentIndex];

      this.addGameMessage(
        opponentState,
        'opponent',
        `Your opponent drew ${drawnCards.length} card${drawnCards.length !== 1 ? 's' : ''}.`,
      );
    }

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);
    return game.state;
  }

  async handleSkipAction(gameId: string, playerId: string): Promise<Game | null> {
    console.log('handleSkipAction ', gameId);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];

    if (gameState.phase !== PLAY_PHASE || gameState.hasPlayedAction) return null;

    gameState.hasPlayedAction = true;
    gameState.canEndTurn = true;

    // Add game message about skipping action
    this.addGameMessage(gameState, 'action', `You skipped your action for this turn.`);

    // If this is a multiplayer game, notify the opponent
    if (gameData.players.length > 1) {
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponentState = gameData.playersGameStates[opponentIndex];

      this.addGameMessage(opponentState, 'opponent', `Your opponent skipped their action.`);
    }

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);
    return game.state;
  }

  async endTurn(gameId: string, playerId: string): Promise<Game | null> {
    console.log('handleEndTurn ', gameId);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    const gameData = await this._endTurn(game.state, playerId);

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    return game.state;
    //return game.state;
  }

  async _endTurn(gameData: Game, playerId: string): Promise<Game | null> {
    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];

    if (gameState.phase !== PLAY_PHASE) return null;

    const nextPhase =
      gameState.currentPlayer.reserve.length + gameState.currentPlayer.hand.length !== 7 ? DRAW_PHASE : DISCARD_PHASE;

    // Move to the next player's turn
    gameData.currentPlayerIndex = (gameData.currentPlayerIndex + 1) % gameData.players.length;

    gameState.currentPlayer.hasUsedStrategicShuffle = false;
    gameState.hasDrawn = false;
    gameState.hasDiscarded = nextPhase === DISCARD_PHASE ? false : true;
    gameState.phase = nextPhase;
    gameState.turn += 1;
    gameState.hasPlayedAction = false;
    gameState.selectedCards = [];
    gameState.blockedColumns = [];

    // Add game message about ending turn
    this.addGameMessage(gameState, 'phase', `Your turn has ended. It's now your opponent's turn.`);

    // If this is a multiplayer game, notify the opponent that it's their turn
    if (gameData.players.length > 1) {
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponentState = gameData.playersGameStates[opponentIndex];

      this.addGameMessage(opponentState, 'phase', `It's now your turn.`);
    }

    //re-initialiser les Buttons d'attaque
    const keys = Object.keys(gameState.columns);

    keys.forEach((suit) => {
      const column = gameState.columns[suit];
      const jackAttackCard = column.attackStatus.attackButtons.find((e) => e.id == JACK_CARD);

      const jackIndex = column.attackStatus.attackButtons.findIndex((e) => e.id == JACK_CARD);

      if ((gameState.turn - jackAttackCard.usedTurn) % 2 == 0 || (!jackAttackCard.usedTurn && !jackAttackCard.active)) {
        gameState.columns[suit].attackStatus.attackButtons[jackIndex] = {
          ...gameState.columns[suit].attackStatus.attackButtons[jackIndex],
          active: true,
        };
      }
    });

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    return gameData;
  }

  async handleRecycleDiscardPile(gameId: string, playerId: string): Promise<Game | null> {
    console.log('handleRecycleDiscardPile ', gameId);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];

    if (gameState.deck.length > 0 || gameState.currentPlayer.discardPile.length === 0) return null;

    const newDeck = shuffleDeck([...gameState.currentPlayer.discardPile]);

    gameState.deck = newDeck;
    gameState.currentPlayer.discardPile = [];

    // Add game message about recycling discard pile
    this.addGameMessage(
      gameState,
      'action',
      `You recycled your discard pile into a new deck with ${newDeck.length} cards.`,
    );

    // If this is a multiplayer game, notify the opponent
    if (gameData.players.length > 1) {
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponentState = gameData.playersGameStates[opponentIndex];

      this.addGameMessage(opponentState, 'opponent', `Your opponent recycled their discard pile into a new deck.`);
    }

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);
    return game.state;
  }

  async handleSurrender(gameId: string, playerId: string): Promise<Game | null> {
    console.log('handleSurrender ', gameId);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];

    // Set the game as over and the opponent as winner
    gameState.isGameOver = true;
    gameState.gameOverReason = 'game.gameOver.surrendered';
    gameState.winner = 'opponent'; // The opponent wins
    gameState.message = 'You surrendered. Your opponent wins.';

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    return game.state;
  }

  async handleAbortGame(gameId: string, playerId: string): Promise<Game | null> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
    });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];

    // Set the game as over with no winner
    gameState.isGameOver = true;
    gameState.winner = null; // No winner
    gameState.message = 'Game aborted due to setup time expiration.';

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // If this is a multiplayer game, update the opponent's state too
    if (gameData.players.length > 1) {
      // Find the opponent's index
      const opponentIndex = playerIndex === 0 ? 1 : 0;

      // Update opponent's game state
      gameData.playersGameStates[opponentIndex].isGameOver = true;
      gameData.playersGameStates[opponentIndex].winner = null;
      gameData.playersGameStates[opponentIndex].message = 'Game aborted due to setup time expiration.';
    }

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    return game.state;
  }

  async updateSetupTimer(gameId: string): Promise<GameTimer | null> {
    console.log('Updating setup timer for game:', gameId);

    // First, try to update an existing timer
    const updatedTimer = await this.timerService.updateTimer(gameId, TimerType.SETUP);

    // If timer exists and was updated successfully, return it
    if (updatedTimer) {
      console.log('Timer updated, remaining seconds:', updatedTimer.remainingSeconds);
      return updatedTimer;
    }

    console.log('Creating new timer with duration:', TIME_SETUP_LIMIT);
    const newTimer = await this.timerService.createTimer(gameId, TimerType.SETUP, TIME_SETUP_LIMIT);

    return newTimer;
  }

  /**
   * Updates or creates a turn timer for a specific game
   * Each turn has a time limit, and if a player doesn't take action during their turn,
   * they lose one card and the turn passes to the other player
   */
  async updateTurnTimer(gameId: string): Promise<GameTimer | null> {
    // First, try to update an existing timer
    const updatedTimer = await this.timerService.updateTimer(gameId, TimerType.TURN);

    // If timer exists and was updated successfully, return it
    if (updatedTimer) {
      // console.log(
      //   'Turn timer updated, remaining seconds:',
      //   updatedTimer.remainingSeconds,
      // );
      return updatedTimer;
    }

    // If no timer exists, create a new one
    console.log('Creating new turn timer with duration:', TIME_TURN_LIMIT);
    const newTimer = await this.timerService.createTimer(gameId, TimerType.TURN, TIME_TURN_LIMIT);

    return newTimer;
  }

  /**
   * Handles an attack action in the game
   * @param gameId - The ID of the game
   * @param playerId - The ID of the attacking player
   * @param attackTarget - The target of the attack
   * @returns Updated game state
   */
  async handleAttack(
    gameId: string,
    playerId: string,
    attackCard: Card,
    attackTarget: TargetAttackType,
  ): Promise<GameType | null> {
    console.log('handleAttack attackCard.value', attackCard.value);

    // Get the game data
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
    });
    if (!game) return null;

    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = gameData.players.indexOf(playerId);
    if (playerIndex === -1) return null;

    // Get the player's game state
    const playerState = gameData.playersGameStates[playerIndex];

    // Find the opponent's index
    const opponentIndex = playerIndex === 0 ? 1 : 0;

    // Get the opponent's game state
    const opponentState = gameData.playersGameStates[opponentIndex];

    // Check if it's the player's turn
    if (gameData.currentPlayerIndex !== playerIndex) {
      playerState.message = "It's not your turn to attack";
      return gameData;
    }

    // Check if the player has already played an action this turn
    if (playerState.hasPlayedAction) {
      playerState.message = "You've already played an action this turn";
      return gameData;
    }

    //handle end turn
    const updatedGameData = await this._endTurn(game.state, playerId);

    // Get opponent player ID
    const opponentPlayerId = updatedGameData.players[opponentIndex];

    this.addGameMessage(
      playerState,
      'action',
      `You are launching an attack using ${attackCard.value} on opponent's ${attackTarget.cardValue} of ${attackTarget.suit}`,
    );

    this.addGameMessage(
      opponentState,
      'opponent',
      `Opponent are launching an attack using ${attackCard.value} on ${attackTarget.cardValue} of ${attackTarget.suit}`,
    );

    //consume the attack
    this.consumeAttack(game, updatedGameData, attackCard, playerIndex);

    const blockingCards = this.getBlockingCards(opponentState, attackCard, attackTarget);

    if (blockingCards && blockingCards.length > 0) {
      // Store the pending attack in the game state
      updatedGameData.pendingAttack = {
        attackingPlayerId: playerId,
        defendingPlayerId: opponentPlayerId,
        attackCard,
        attackTarget,
        waitingForResponse: true,
        blockingCards: blockingCards,
      };

      // Set the showBlockPopup flag in the opponent's game state to ensure it persists on page refresh
      updatedGameData.playersGameStates[opponentIndex].showBlockPopup = true;

      // Save the game state with the pending attack
      game.state = updatedGameData;
      await this.gameRepository.save(game);

      return game.state;
    }

    // If no block possible, proceed with the attack
    const result = await this.dealAttackDamage(
      game,
      updatedGameData,
      attackCard,
      attackTarget,
      playerIndex,
      opponentIndex,
    );

    // Set attack result for both players
    updatedGameData.attackResult = {
      attackCard,
      target: attackTarget,
      isBlocked: false,
    };

    // Save the game state with the attack result
    game.state = updatedGameData;
    await this.gameRepository.save(game);

    return result;
  }

  /**
   * Handle attack with a Joker card
   * Joker can attack any unit
   */
  /**
   * Handle the response from a player about whether they want to block an attack with a Joker
   * @param gameId - The game ID
   * @param playerId - The defending player ID
   * @param willBlock - Whether the player will block the attack with a Joker
   * @param jokerCard - The Joker card to use for blocking (if willBlock is true)
   * @returns Updated game state
   */
  async handleBlockResponse(
    gameId: string,
    playerId: string,
    willBlock: boolean,
    blockingCard?: Card,
  ): Promise<GameType | null> {
    console.log('handleBlockResponse', gameId, playerId, willBlock);

    // Get the game data
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
    });
    if (!game) return null;

    const gameData = game.state as GameType;

    // Check if there is a pending attack
    if (!gameData.pendingAttack || !gameData.pendingAttack.waitingForResponse) {
      return gameData;
    }

    // Get the pending attack details
    const { attackingPlayerId, attackCard, attackTarget } = gameData.pendingAttack;

    // Find player indices
    const defendingPlayerIndex = gameData.players.indexOf(playerId);
    const attackingPlayerIndex = gameData.players.indexOf(attackingPlayerId);

    if (defendingPlayerIndex === -1 || attackingPlayerIndex === -1) return null;

    // Clear the pending attack
    gameData.pendingAttack.waitingForResponse = false;

    // Set attack result for both players
    gameData.attackResult = {
      attackCard,
      target: attackTarget,
      isBlocked: willBlock,
    };

    // Reset the showBlockPopup flag in the defending player's game state
    gameData.playersGameStates[defendingPlayerIndex].showBlockPopup = false;

    console.log('..willBlock ', willBlock);
    console.log('..blockingCard? ', blockingCard ? true : false);

    // If the player chose to block with a Joker or a card 7
    if (willBlock && blockingCard) {
      if (blockingCard.type === 'JOKER') {
        // Handle the block with Joker
        return await this.handleBlockAttackWithJoker(gameId, playerId, blockingCard);
      } else if (blockingCard.type === 'STANDARD') {
        // Handle the block with a card 7
        return await this.handleBlockAttackWithSeven(gameId, playerId, blockingCard);
      }
    } else {
      // Player declined to block, continue with the performing damages

      // Process the attack based on the card type
      return await this.dealAttackDamage(
        game,
        gameData,
        attackCard,
        attackTarget,
        attackingPlayerIndex,
        defendingPlayerIndex,
      );
    }
  }

  private async consumeAttack(game, gameData, attackCard, attackingPlayerIndex) {
    if (attackCard.value === 'JOKER') {
      this.consumeJokerAttack(
        game,
        gameData,
        gameData.playersGameStates[attackingPlayerIndex],
        attackCard,
        attackingPlayerIndex,
      );
    } else if (attackCard.value === 'J') {
      this.consumeJackAttack(
        game,
        gameData,
        gameData.playersGameStates[attackingPlayerIndex],
        attackCard,
        attackingPlayerIndex,
      );
    } else if (['A', '2', '3', '4', '5', '6', '8', '9'].includes(attackCard.value)) {
      this.consumeNumberCardAttack(
        game,
        gameData,
        gameData.playersGameStates[attackingPlayerIndex],
        attackCard,
        attackingPlayerIndex,
      );
    } else {
      // Invalid attack card
      gameData.playersGameStates[attackingPlayerIndex].message =
        `Card with value ${attackCard.value} cannot be used for attacks`;
      return gameData;
    }
  }

  private async dealAttackDamage(game, gameData, attackCard, attackTarget, attackingPlayerIndex, defendingPlayerIndex) {
    if (attackCard.value === 'JOKER') {
      await this.dealJokerAttackDamage(
        game,
        gameData,
        gameData.playersGameStates[attackingPlayerIndex],
        gameData.playersGameStates[defendingPlayerIndex],
        attackCard,
        attackTarget,
        attackingPlayerIndex,
        defendingPlayerIndex,
      );
    } else if (attackCard.value === 'J') {
      await this.dealJackAttack(
        game,
        gameData,
        gameData.playersGameStates[attackingPlayerIndex],
        gameData.playersGameStates[defendingPlayerIndex],
        attackCard,
        attackTarget,
        attackingPlayerIndex,
        defendingPlayerIndex,
      );
    } else if (['A', '2', '3', '4', '5', '6', '8', '9'].includes(attackCard.value)) {
      await this.dealNumberCardAttack(
        game,
        gameData,
        gameData.playersGameStates[attackingPlayerIndex],
        gameData.playersGameStates[defendingPlayerIndex],
        attackCard,
        attackTarget,
        attackingPlayerIndex,
        defendingPlayerIndex,
      );
    } else {
      // Invalid attack card
      gameData.playersGameStates[attackingPlayerIndex].message =
        `Card with value ${attackCard.value} cannot be used for attacks`;
      return gameData;
    }

    // Save the updated game
    console.log('.saved changes');

    game.state = gameData;
    await this.gameRepository.save(game);

    return gameData;
  }

  private async consumeJokerAttack(
    game: GameEntity,
    gameData: GameType,
    playerState: GameState,
    attackCard: Card,
    playerIndex: number,
  ) {
    //remove joker from hand/reserve
    this.removeCardfromHandOrReserve(playerState, attackCard);

    // Add the joker to the discard pile
    playerState.currentPlayer.discardPile.push(attackCard);

    // Update the game state
    gameData.playersGameStates[playerIndex] = playerState;
  }

  private async dealJokerAttackDamage(
    game: GameEntity,
    gameData: GameType,
    playerState: GameState,
    opponentState: GameState,
    attackCard: Card,
    attackTarget: TargetAttackType,
    playerIndex: number,
    opponentIndex: number,
  ) {
    console.log('................ Joker attackTarget.attackType ');

    if (attackTarget.attackType === 'unit' && attackTarget.suit && attackTarget.cardValue) {
      //As, 7 and 10 cannot be attacked
      if (['A', '7', '10'].includes(attackCard.value)) {
        return gameData;
      }

      // Unit attack with Joker
      const targetSuit = attackTarget.suit;
      const targetColumn = opponentState.columns[targetSuit];

      // Handle face cards (J and K) differently than regular cards
      let targetCardIndex = -1;
      let removedCard: Card | null = null;

      if (attackTarget.cardValue === 'J' || attackTarget.cardValue === 'K') {
        // For J and K, we need to check in the faceCards object
        const faceCard = attackTarget.cardValue === 'J' ? targetColumn.faceCards?.J : targetColumn.faceCards?.K;

        if (faceCard) {
          // Remove the face card from the column's faceCards
          if (attackTarget.cardValue === 'J') {
            const { J, ...restFaceCards } = targetColumn.faceCards;
            targetColumn.faceCards = restFaceCards;
            removedCard = J;
          } else {
            // K
            const { K, ...restFaceCards } = targetColumn.faceCards;
            targetColumn.faceCards = restFaceCards;
            removedCard = K;
          }
        }
      } else {
        // For regular cards (2-10), use the existing logic
        targetCardIndex = targetColumn.cards.findIndex((card) => card.value === attackTarget.cardValue);

        if (targetCardIndex !== -1) {
          // Remove the target card
          removedCard = targetColumn.cards.splice(targetCardIndex, 1)[0];
        }
      }

      if (removedCard) {
        targetColumn.isDestroyed = true;
        if (targetColumn.destroyedCards)
          targetColumn.destroyedCards.push({ card: removedCard, index: targetCardIndex });
        else targetColumn.destroyedCards = [{ card: removedCard, index: targetCardIndex }];

        // Add the removed card to the opponent's discard pile
        opponentState.currentPlayer.discardPile.push(removedCard);

        //deactivate the attack status of higher cards
        if (targetColumn.attackStatus && targetColumn.attackStatus.attackButtons) {
          // Save the current state of attack buttons before modifying them
          targetColumn.attackStatus.preDestroyButtons = JSON.parse(
            JSON.stringify(targetColumn.attackStatus.attackButtons),
          );

          // Deactivate attack buttons for all cards with higher value than the removed card
          targetColumn.attackStatus.attackButtons = targetColumn.attackStatus.attackButtons.map((button) => {
            const buttonCardValue = parseInt(button.id);

            // If the button's card value is higher than the removed card, deactivate it
            if (buttonCardValue > parseInt(removedCard.value)) {
              return { ...button, active: false, wasUsed: true };
            }
            return button;
          });
        }

        this.addGameMessage(
          playerState,
          'action',
          `You destroyed your opponent's ${removedCard.value} of ${targetSuit} with a Joker!`,
        );
        this.addGameMessage(
          opponentState,
          'opponent',
          `Your opponent destroyed your ${removedCard.value} of ${targetSuit} with a Joker!`,
        );
      } else {
        this.addGameMessage(playerState, 'action', 'Target card not found in the column');
        return gameData;
      }
    } else {
      this.addGameMessage(playerState, 'action', 'Invalid attack target for Joker');
      return gameData;
    }

    opponentState.showBlockPopup = false;

    // Update the game state
    gameData.playersGameStates[playerIndex] = playerState;
    gameData.playersGameStates[opponentIndex] = opponentState;

    // Reset pendingAttack to null since we're proceeding with the attack
    gameData.pendingAttack = null;

    console.log('......... end');

    // Save the updated game
    // game.state = gameData;
    // await this.gameRepository.save(game);

    // return gameData;
  }

  private async consumeNumberCardAttack(
    game: GameEntity,
    gameData: GameType,
    playerState: GameState,
    attackCard: Card,
    playerIndex: number,
  ) {
    // Disable all buttons in the same category
    const buttonsState = playerState.columns[attackCard.suit].attackStatus.attackButtons;
    const clickedButtonState = buttonsState.find((button) => button.id === attackCard.value);
    const newButtonsState = buttonsState.map((button) => {
      if (button.category === clickedButtonState.category) {
        return {
          ...button,
          active: false,
          wasUsed: true,
          usedTurn: playerState.turn - 1, //as turn is already incremented previous the execution of this function (_endTurn)
        };
      }
      return button;
    });

    // Update the column's attack status
    const updatedColumns = { ...playerState.columns };
    updatedColumns[attackCard.suit].attackStatus = {
      lastAttackCard: { cardValue: attackCard.value, turn: playerState.turn },
      attackButtons: newButtonsState,
    };

    playerState.columns = updatedColumns;

    // Update the game state
    gameData.playersGameStates[playerIndex] = playerState;

    // Reset pendingAttack to null since we're proceeding with the attack
    gameData.pendingAttack = null;
  }

  /**
   * Handle attack with a number card (1-9)
   * Number cards can attack opponent's units of the same suit with lower value
   * or attack opponent's health directly if not blocked by a King
   */
  private async dealNumberCardAttack(
    game: GameEntity,
    gameData: GameType,
    playerState: GameState,
    opponentState: GameState,
    attackCard: Card,
    attackTarget: TargetAttackType,
    playerIndex: number,
    opponentIndex: number,
  ) {
    const attackSuit = attackCard.suit as Suit;
    const attackValue = this.getNumericValueFromCard(attackCard);

    const defendingKing = opponentState.columns[attackCard.suit]?.faceCards?.K;

    // Vérifier si le Roi existe, il bloque l'attaque pour les unité <=6
    if (defendingKing && ['A', '2', '3', '4', '5', '6'].includes(attackCard.value)) {
      this.addGameMessage(playerState, 'action', `Attaque bloquée par le Roi de ${defendingKing.suit}!`);
      this.addGameMessage(opponentState, 'opponent', `Attaque bloquée par le Roi de ${defendingKing.suit}!`);
    }
    // Vérifier si le Roi existe et est attaqué par 8 ou 9, il est detruit et envoyer en défausse
    else if (defendingKing && ['8', '9'].includes(attackCard.value) && attackTarget.cardValue === 'K') {
      const updatedColumns = { ...opponentState.columns };
      const column = updatedColumns[defendingKing.suit];

      if (column && column.faceCards) {
        // Supprimer le Roi des faceCards
        const { K, ...restFaceCards } = column.faceCards;
        column.faceCards = restFaceCards;

        opponentState.columns = updatedColumns;
        opponentState.currentPlayer.discardPile = [...opponentState.currentPlayer.discardPile, defendingKing];

        this.addGameMessage(playerState, 'action', `King of ${K.suit} destroyed successfully`);

        this.addGameMessage(
          opponentState,
          'opponent',
          `Your opponent attacked your of ${K.suit}  King with ${attackCard.value} of ${attackSuit}`,
        );
      }
    }
    // le Roi n'existe pas
    else {
      if (attackTarget.attackType === 'health') {
        // Calculate damage based on card value (1-9)
        const damage = attackValue;

        // Apply damage to opponent's health
        opponentState.currentPlayer.health -= damage;

        this.addGameMessage(
          playerState,
          'action',
          `You attacked your opponent's health with ${attackCard.value} of ${attackSuit} for ${damage} damage!`,
        );
        this.addGameMessage(
          opponentState,
          'opponent',
          `Your opponent attacked your health with ${attackCard.value} of ${attackSuit} for ${damage} damage!`,
        );

        // Check if the opponent's health is zero or below
        if (opponentState.currentPlayer.health <= 0) {
          opponentState.currentPlayer.health = 0;
          opponentState.isGameOver = true;
          playerState.isGameOver = true;
          opponentState.winner = playerState.currentPlayer.id;
          playerState.winner = playerState.currentPlayer.id;
          gameData.gameStatus = 'completed';
        }
      } else if (attackTarget.attackType === 'unit' && attackTarget.cardValue === 'J') {
        const jackCard = opponentState.columns[attackCard.suit]?.faceCards?.J;

        if (jackCard) {
          const updatedColumns = { ...opponentState.columns };
          const column = updatedColumns[jackCard.suit];

          if (column && column.faceCards) {
            // Supprimer le Valet des faceCards
            const { J, ...restFaceCards } = column.faceCards;
            column.faceCards = restFaceCards;

            opponentState.columns = updatedColumns;
            opponentState.currentPlayer.discardPile = [...opponentState.currentPlayer.discardPile, jackCard];

            this.addGameMessage(playerState, 'action', `Jack of ${J.suit} destroyed successfully`);

            this.addGameMessage(opponentState, 'opponent', `Jack of ${J.suit} destroyed successfully`);
          }
        }
      } else {
        this.addGameMessage(playerState, 'action', 'Invalid attack target');
        console.log("^^^^^^^^^^^ 'Invalid attack target'");

        return gameData;
      }
    }

    // Update the game state
    gameData.playersGameStates[playerIndex] = playerState;
    gameData.playersGameStates[opponentIndex] = opponentState;

    // Reset pendingAttack to null since we're proceeding with the attack
    gameData.pendingAttack = null;
  }

  /**
   * Handles what happens when a player's turn timer expires
   * The player loses one card and the turn passes to the next player
   * @param gameId The ID of the game
   * @param playerId The ID of the player whose turn timed out
   * @returns Updated game state
   */
  async handleTurnTimeout(gameId: string, playerId: string): Promise<GameType | null> {
    console.log(`Turn timeout for player ${playerId} in game ${gameId}`);

    // Get the game data
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
    });
    if (!game) return null;

    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = gameData.players.indexOf(playerId);
    if (playerIndex === -1) return null;

    // Get the player's game state
    const playerState = gameData.playersGameStates[playerIndex];

    // Determine if we should take from hand or reserve
    const hasCardsInHand = playerState.currentPlayer.hand.length > 0;
    const hasCardsInReserve = playerState.currentPlayer.reserve.length > 0;

    let removedCard: Card | undefined;
    let sourceType = '';

    if (hasCardsInHand && hasCardsInReserve) {
      // Randomly choose between hand and reserve
      const takeFromHand = Math.random() < 0.5;

      if (takeFromHand) {
        // Take a random card from hand
        const randomIndex = Math.floor(Math.random() * playerState.currentPlayer.hand.length);
        removedCard = playerState.currentPlayer.hand.splice(randomIndex, 1)[0];
        sourceType = 'hand';
      } else {
        // Take a random card from reserve
        const randomIndex = Math.floor(Math.random() * playerState.currentPlayer.reserve.length);
        removedCard = playerState.currentPlayer.reserve.splice(randomIndex, 1)[0];
        sourceType = 'reserve';
      }
    } else if (hasCardsInHand) {
      // Only has cards in hand
      const randomIndex = Math.floor(Math.random() * playerState.currentPlayer.hand.length);
      removedCard = playerState.currentPlayer.hand.splice(randomIndex, 1)[0];
      sourceType = 'hand';
    } else if (hasCardsInReserve) {
      // Only has cards in reserve
      const randomIndex = Math.floor(Math.random() * playerState.currentPlayer.reserve.length);
      removedCard = playerState.currentPlayer.reserve.splice(randomIndex, 1)[0];
      sourceType = 'reserve';
    }

    // If we removed a card, add it to discard pile and draw a replacement
    if (removedCard) {
      playerState.currentPlayer.discardPile.push(removedCard);

      // Draw a new card from the deck to replace the discarded one
      if (playerState.deck.length > 0) {
        const newCard = playerState.deck.shift();
        if (newCard) {
          // Add the new card to the same location where the card was removed from
          if (sourceType === 'hand') {
            playerState.currentPlayer.hand.push(newCard);
            playerState.message = 'You lost a card from your hand due to turn timeout and drew a new one';
          } else {
            playerState.currentPlayer.reserve.push(newCard);
            playerState.message = 'You lost a card from your reserve due to turn timeout and drew a new one';
          }
        } else {
          playerState.message = `You lost a card from your ${sourceType} due to turn timeout`;
        }
      } else if (playerState.currentPlayer.discardPile.length > 1) {
        // If deck is empty, recycle discard pile (except for the card just discarded)
        const justDiscarded = playerState.currentPlayer.discardPile.pop(); // Remove the card we just added

        // Shuffle the discard pile and use it as the new deck
        playerState.deck = shuffleDeck([...playerState.currentPlayer.discardPile]);

        // Clear the discard pile and put back the just discarded card
        playerState.currentPlayer.discardPile = [];
        if (justDiscarded) {
          playerState.currentPlayer.discardPile.push(justDiscarded);
        }

        // Draw a new card from the newly recycled deck
        if (playerState.deck.length > 0) {
          const newCard = playerState.deck.shift();
          if (newCard) {
            // Add the new card to the same location where the card was removed from
            if (sourceType === 'hand') {
              playerState.currentPlayer.hand.push(newCard);
              playerState.message =
                'You lost a card from your hand due to turn timeout. Discard pile recycled and a new card drawn';
            } else {
              playerState.currentPlayer.reserve.push(newCard);
              playerState.message =
                'You lost a card from your reserve due to turn timeout. Discard pile recycled and a new card drawn';
            }
          }
        } else {
          playerState.message = `You lost a card from your ${sourceType} due to turn timeout`;
        }
      } else {
        playerState.message = `You lost a card from your ${sourceType} due to turn timeout`;
      }
    } else {
      // No cards to remove, just add a message
      playerState.message = 'Turn timeout - no cards to penalize';
    }

    // Move to the next player's turn
    gameData.currentPlayerIndex = (gameData.currentPlayerIndex + 1) % gameData.players.length;

    // Update the game state
    game.state = gameData;
    await this.gameRepository.save(game);

    return gameData;
  }

  async handleUpdateProfile(gameId: string, playerId: string, profile: Profile): Promise<Game | null> {
    console.log('handleUpdateProfile ', gameId);

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) return null;

    // Get the game state for the specific player
    const gameData = game.state as GameType;

    // Find the player index
    const playerIndex = playerId ? gameData.players.indexOf(playerId) : 0;
    if (playerIndex === -1) return null;

    const gameState = gameData.playersGameStates[playerIndex];

    gameState.currentPlayer.name = profile.name;
    gameState.currentPlayer.profile.epithet = profile.epithet;
    gameState.currentPlayer.profile.avatar = profile.avatar;

    // Update the player's game state in the game object
    gameData.playersGameStates[playerIndex] = gameState;

    // Save the updated game
    game.state = gameData;
    await this.gameRepository.save(game);

    await this.triggerAITurnIfNeeded(gameId);
    return game.state;
  }

  private removeCardfromHandOrReserve(playerState: GameState, cardToRemove: Card) {
    const cardIndexHand = playerState.currentPlayer.hand.findIndex((card) => card.id === cardToRemove.id);
    const cardIndexReserve = playerState.currentPlayer.reserve.findIndex((card) => card.id === cardToRemove.id);

    if (cardIndexHand != -1) {
      playerState.currentPlayer.hand.splice(cardIndexHand, 1);
      //update next phase
      playerState.hasDiscarded = true;
      playerState.phase = DRAW_PHASE;
    } else if (cardIndexReserve != -1) {
      playerState.currentPlayer.reserve.splice(cardIndexReserve, 1);
      //update next phase
      playerState.hasDiscarded = true;
      playerState.phase = DRAW_PHASE;
    }
  }

  private normalizeMaxHealth(playerState: GameState) {
    if (playerState.currentPlayer.health > playerState.currentPlayer.maxHealth)
      playerState.currentPlayer.maxHealth = playerState.currentPlayer.health;
  }

  /**
   * Check if health attack is blocked by a King in the same suit
   * @param attackCard - The card being used for attack
   * @param opponentState - The defending player's game state
   * @returns True if health attack is blocked, false otherwise
   */
  private isHealthAttackBlocked(attackCard: Card, opponentState: GameState): boolean {
    // Health attack is blocked if opponent has a King in the same suit as the attack card
    const attackSuit = attackCard.suit as Suit;
    return opponentState.columns[attackSuit]?.faceCards?.K !== undefined;
  }

  /**
   * Calculate damage points based on the card value
   * @param cardValue - The value of the card
   * @returns The damage points for the card
   */
  private calculateDamagePoints(cardValue: string): number {
    switch (cardValue) {
      case 'A':
        return 1;
      case '2':
        return 2;
      case '3':
        return 3;
      case '4':
        return 4;
      case '5':
        return 5;
      case '6':
        return 6;
      case '7':
        return 7;
      case '8':
        return 8;
      case '9':
        return 9;
      case '10':
        return 10;
      default:
        return 0;
    }
  }

  /**
   * Calculates valid attack targets based on the current attack card and game state
   * @param attackCard - The card being used for attack
   * @param playerState - The attacking player's game state
   * @param opponentState - The defending player's game state
   * @returns Array of valid attack targets
   */
  /**
   * Updates the valid attack targets for all cards in a player's hand
   * @param gameId - The game ID
   * @param playerId - The player's ID
   * @returns Updated game state
   */
  private getValidAttackTargets(playerState: GameState, opponentState: GameState): Record<string, TargetAttackType[]> {
    const validAttackTargets: Record<string, TargetAttackType[]> = {};

    // Calculate attack targets for each card in the player's hand
    for (const card of playerState.currentPlayer.hand) {
      if (card.value === 'JOKER') {
        const targets = this.calculateAttackTargets(card, playerState, opponentState);
        validAttackTargets[card.id] = targets;
      }
    }

    // Check reserve for Jokers only
    for (const card of playerState.currentPlayer.reserve) {
      if (card.value === 'JOKER') {
        const targets = this.calculateAttackTargets(card, playerState, opponentState);
        validAttackTargets[card.id] = targets;
      }
    }

    // Check cards placed in columns
    Object.keys(playerState.columns).forEach((suitKey) => {
      const suit = suitKey as Suit;
      const column = playerState.columns[suit];

      // Check face cards J
      if (column.faceCards) {
        if (column.faceCards.J) {
          const targets = this.calculateAttackTargets(column.faceCards.J, playerState, opponentState);

          validAttackTargets[column.faceCards.J.id] = targets;
        }
      }

      // Check regular cards in the column
      for (const card of column.cards) {
        // Only calculate for cards that can attack
        if (['A', '2', '3', '4', '5', '6', '8', '9'].includes(card.value)) {
          const targets = this.calculateAttackTargets(card, playerState, opponentState);
          validAttackTargets[card.id] = targets;
        }
      }
    });

    return validAttackTargets;
  }

  private calculateAttackTargets(
    attackCard: Card,
    playerState: GameState,
    opponentState: GameState,
  ): TargetAttackType[] {
    const targets: TargetAttackType[] = [];
    const phase = playerState.phase;
    const hasPlayedAction = playerState.hasPlayedAction;

    // Check if health attack is blocked by a King in the same suit
    const healthAttackBlocked = this.isHealthAttackBlocked(attackCard, opponentState);

    // Calculate damage points based on the card value
    const damagePoints = this.calculateDamagePoints(attackCard.value);

    // For Joker attacks
    if (attackCard.value === 'JOKER') {
      Object.keys(opponentState.columns).forEach((suitKey) => {
        const suit = suitKey as Suit;
        const opponentColumn = opponentState.columns[suit];

        // Add face cards as targets (except Queen)
        if (opponentColumn.faceCards) {
          if (opponentColumn.faceCards.K) {
            targets.push({
              suit,
              cardValue: 'K',
              attackType: 'unit',
              column: opponentColumn,
              valid: phase === 'PLAY' && !hasPlayedAction,
            });
          }

          if (opponentColumn.faceCards.J) {
            targets.push({
              suit,
              cardValue: 'J',
              attackType: 'unit',
              column: opponentColumn,
              valid: phase === 'PLAY' && !hasPlayedAction,
            });
          }
        }

        // Add standard cards 2,3,4,5,6,8,9
        for (let i = opponentColumn.cards.length - 1; i >= 0; i--) {
          const card = opponentColumn.cards[i];
          const isTarget = ['9', '8', '6', '5', '4', '3', '2'].includes(card.value);
          if (isTarget) {
            targets.push({
              suit,
              cardValue: card.value,
              attackType: 'unit',
              column: opponentColumn,
              valid: phase === 'PLAY' && !hasPlayedAction,
            });
          }
        }
      });
    } else if (attackCard.value === 'J') {
      // Jack can attack face cards and specific number cards in the same suit
      Object.keys(opponentState.columns).forEach((suitKey) => {
        const suit = suitKey as Suit;
        if (attackCard.suit === suit) {
          const opponentColumn = opponentState.columns[suit];

          // Add standard cards 2,3,4,5,6,8,9
          for (let i = opponentColumn.cards.length - 1; i >= 0; i--) {
            const card = opponentColumn.cards[i];
            const isTarget = ['9', '8', '6', '5', '4', '3', '2'].includes(card.value);

            if (isTarget) {
              targets.push({
                suit,
                cardValue: card.value,
                attackType: 'unit',
                column: opponentColumn,
                valid: phase === 'PLAY' && !hasPlayedAction,
              });
              break; //affiche la carte la plus haute
            }

            const isJokerReplaceCard = card.value === JOKER_CARD;

            if (isJokerReplaceCard) {
              break;
            }
          }
        }
      });
    } else {
      // Number cards can attack health or units
      if (!healthAttackBlocked && !attackCard.isJoker) {
        targets.push({
          cardValue: damagePoints.toString(),
          valid: phase === 'PLAY' && !hasPlayedAction,
          attackType: 'health',
          reason: undefined,
          suit: 'HEARTS', // Using a valid suit as a placeholder for health attacks
        });
      }

      // Check if the attack card can attack units
      const isHighUnit = ['8', '9'].includes(attackCard.value);
      Object.keys(opponentState.columns).forEach((suitKey) => {
        const suit = suitKey as Suit;
        const opponentColumn = opponentState.columns[suit];

        // Check if the opponent has a King/jack in the same suit
        const hasKing = opponentColumn.faceCards?.K !== undefined;
        const hasJack = opponentColumn.faceCards?.J !== undefined;

        if (isHighUnit) {
          if (hasKing) {
            targets.push({
              suit,
              cardValue: 'K',
              attackType: 'unit',
              column: opponentColumn,
              valid: phase === 'PLAY' && !hasPlayedAction,
            });
          }

          // Add Jack target if it exists and is the same color
          if (hasJack) {
            targets.push({
              suit,
              cardValue: 'J',
              attackType: 'unit',
              column: opponentColumn,
              valid: phase === 'PLAY' && !hasPlayedAction,
            });
          }
        } else {
          for (let i = opponentColumn.cards.length - 1; i >= 0; i--) {
            const card = opponentColumn.cards[i];
            const isUnit = ['A', '2', '3', '4', '5', '6', '7', '8', '9'].includes(card.value);
            const isLowUnit = ['A', '2', '3', '4', '5', '6'].includes(card.value);

            if (isUnit) {
              // Check if this unit can be attacked
              const attackButton = opponentColumn.attackStatus.attackButtons.find((btn) => btn.id === card.value);
              const canAttack = attackButton?.active && !attackButton?.wasUsed;

              // If opponent has a King, low units cannot be attacked
              const blockedByKing = hasKing && isLowUnit;

              if (!blockedByKing) {
                targets.push({
                  suit,
                  cardValue: card.value,
                  column: opponentColumn,
                  valid: !!(canAttack && !blockedByKing && phase === 'PLAY' && !hasPlayedAction),
                  reason: blockedByKing ? 'Protected by King' : !canAttack ? 'Already attacked' : undefined,
                });
              }
            }
          }
        }
      });
    }

    return targets;
  }
}
