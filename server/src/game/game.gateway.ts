import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TimerType } from '../entities/game-timer.entity';
import { TimerService } from './timer.service';
import { GameService } from './game.service';
import { Card, Profile, Game as GameType, TargetAttackType, QueenCard } from 'src/types/game';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game as GameEntity } from '../entities/game.entity';
import { TIME_TURN_LIMIT } from 'src/constants/timers';

// just to seach quickly https://www.unitcardgame.com

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGIN,
    credentials: true,
  },
})
export class GameGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  // Map to track active matchmaking sockets
  private activeMatchmakingSockets: Map<string, { timestamp: number; playerId: string }> = new Map();

  // Map to track active games with setup timers
  private setupTimers: { [gameId: string]: NodeJS.Timeout } = {};
  private turnTimers: { [gameId: string]: NodeJS.Timeout } = {};

  // Map to track player readiness in the setup phase
  private playerReadiness: { [gameId: string]: Set<string> } = {};

  constructor(
    private readonly gameService: GameService,
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    private readonly timerService: TimerService,
  ) {}

  afterInit() {
    // Clean up any stale timers every 5 minutes
    setInterval(() => this.cleanupStaleTimers(), 5 * 60 * 1000);
  }

  private cleanupStaleTimers() {
    // This method cleans up any timers for games that might have been abandoned
    console.log(`Cleaning up stale timers. Active games: ${Object.keys(this.setupTimers).length}`);
  }

  @SubscribeMessage('joinGame')
  async handleJoinGame(@MessageBody() data: { gameId: string; playerId: string }, @ConnectedSocket() client: Socket) {
    console.log('joinGame ', data.gameId, ' ', data.playerId);

    client.join(data.gameId);
    client.join(data.playerId + data.gameId);

    console.log('...joind 1..... ', data.playerId + data.gameId);

    // Get the full game state
    const fullGameState = await this.gameService.getGameState(data.gameId);

    // Send personalized game states to each player
    for (const playerId of fullGameState.players) {
      // Get player-specific view of the game

      const playerGameState = this.gameService.isolatePlayerState(fullGameState, data.gameId, playerId);

      // Get this player's socket ID
      const socketId = fullGameState.playerSockets[playerId];

      if (socketId) {
        // Emit directly to this player's socket
        this.server.to(socketId).emit('gameState', playerGameState);
      }
    }

    // Get the game state to check if we're in setup phase
    const gameState = await this.gameService.getGameState(data.gameId);

    // Start setup timer for this game only if:
    // 1. We don't already have a timer for this game
    // 2. The game is still in setup phase
    if (!this.setupTimers[data.gameId] && gameState) {
      // Check if any player is still in setup phase
      const isSetupPhase = gameState.playersGameStates.some((state) => state.phase === 'SETUP');

      // Only start the timer if we're in setup phase and the game isn't completed
      if (isSetupPhase && gameState.gameStatus !== 'completed') {
        console.log(`Starting setup timer for game ${data.gameId} - first join or reconnect during setup phase`);
        this.startSetupTimer(data.gameId);
      }
    }
  }

  @SubscribeMessage('findMatch')
  async handleFindMatch(
    @MessageBody() data: { playerId: string; socketId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('findMatch');

    try {
      // Store the client in our active matchmaking map to prevent it from being removed from the queue
      const socketId = client.id;

      console.log('*********** socketId ', socketId);
      console.log('*********** player ', data.playerId);

      // Add this socket to our active matchmaking tracking
      this.activeMatchmakingSockets.set(socketId, {
        timestamp: Date.now(),
        playerId: data.playerId,
      });

      // Set up a cleanup timer for this matchmaking session
      setTimeout(() => {
        // If the socket is still in matchmaking after 2 minutes, clean it up
        if (this.activeMatchmakingSockets.has(socketId)) {
          console.log(`Cleaning up stale matchmaking session for ${socketId}`);
          this.activeMatchmakingSockets.delete(socketId);
        }
      }, 120000); // 2 minutes

      // Call the matchmaking service
      const result = await this.gameService.findOrCreateMultiplayerGame(data.playerId, socketId);

      console.log(`Matchmaking result:`, result);

      // Send the result back to the client
      client.emit('matchmakingStatus', result);

      // If a match was found, notify the waiting player
      if (result.status === 'matched') {
        console.log(`Match found, setting up game for ${data.playerId}`);

        // Remove this socket from active matchmaking tracking since a match was found
        console.log(`Removing ${socketId} from active matchmaking tracking (match found)`);
        this.activeMatchmakingSockets.delete(socketId);

        // The game ID will be the real game ID
        const gameId = result.gameId;

        // Join the game room
        console.log(`Joining both room ${gameId} ${data.playerId}`);
        client.join(gameId);
        client.join(data.playerId + gameId);

        console.log('...joind 2..... ', data.playerId + gameId);

        // Get player-specific game state for this player
        console.log(`Getting player-specific game state for ${data.playerId} (${socketId})`);
        const playerGame = await this.gameService.getPlayerState(gameId, data.playerId);
        if (playerGame) {
          console.log(`Emitting player-specific gameState to ${socketId}`);
          client.emit('gameState', playerGame);
        }

        // If this player was matched with someone who was waiting,
        // we need to notify the waiting player as well
        const waitingPlayerId = result.waitingPlayerId;
        if (waitingPlayerId) {
          console.log(`Notifying waiting player ${waitingPlayerId}`);
          // Find the socket for the waiting player
          const waitingPlayerSocket = this.server.sockets.sockets.get(waitingPlayerId);
          if (waitingPlayerSocket) {
            console.log(`Found waiting player socket, joining game room ${gameId}`);

            // Join the game room
            waitingPlayerSocket.join(gameId);
            // Also join a room with the player's ID
            waitingPlayerSocket.join(data.playerId + gameId);

            console.log('...joind waiting..... ', data.playerId + gameId);

            // Send the matchmaking status to the waiting player
            console.log(`Emitting matchmakingStatus to waiting player ${waitingPlayerId}`);
            waitingPlayerSocket.emit('matchmakingStatus', {
              gameId: result.gameId,
              token: result.waitingPlayerToken || '',
              status: 'matched',
            });

            // Get and send player-specific game state for the waiting player
            console.log(`Getting player-specific game state for waiting player ${waitingPlayerId}`);
            // Get the player-specific game state directly using the waiting player ID
            const waitingPlayerGame = await this.gameService.getPlayerState(gameId, waitingPlayerId);
            if (waitingPlayerGame) {
              console.log(`Emitting player-specific gameState to waiting player ${waitingPlayerId}`);
              waitingPlayerSocket.emit('gameState', waitingPlayerGame);
            }
          } else {
            console.log(`Could not find socket for waiting player ${waitingPlayerId}`);
          }
        }
      } else {
        console.log(`Player ${data.playerId} added to matchmaking queue with status: ${result.status}`);
      }

      // Add a check to see if the client is still connected after all this processing
      console.log(
        `After matchmaking, client ${socketId} connection state - connected: ${client.connected}, disconnected: ${client.disconnected}`,
      );
    } catch (error) {
      console.error('Error finding match:', error);
      client.emit('error', { message: 'Failed to find a match' });
    }
  }

  @SubscribeMessage('cancelMatchmaking')
  async handleCancelMatchmaking(@MessageBody() data: { tempGameId: string }, @ConnectedSocket() client: Socket) {
    try {
      console.log(`Canceling matchmaking for game: ${data.tempGameId}, socket: ${client.id}`);

      this.activeMatchmakingSockets.delete(client.id);

      // Call the service to cancel matchmaking
      await this.gameService.removeFromMatchmakingQueue(data.tempGameId);

      // Send confirmation back to the client
      // client.emit('matchmakingCanceled', { success: true });

      return { success: true };
    } catch (error) {
      console.error('Error canceling matchmaking:', error);
      client.emit('error', { message: 'Failed to cancel matchmaking' });
      return { success: false, error: 'Failed to cancel matchmaking' };
    }
  }

  @SubscribeMessage('moveToReserve')
  async moveToReserve(
    @MessageBody() data: { gameId: string; playerId: string; card: Card },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('moveToReserve ', data.gameId, ' ', data.playerId);

    const gameState = await this.gameService.moveToReserve(data.gameId, data.playerId, data.card);

    this.server
      .to(client.id)
      .emit('gameState', this.gameService.isolatePlayerState(gameState, data.gameId, data.playerId));
  }

  @SubscribeMessage('startGame')
  async handleStartGame(@MessageBody() data: { gameId: string; playerId: string }, @ConnectedSocket() client: Socket) {
    console.log('startGame', data.gameId, ' ', data.playerId, ' ', client.id);

    const gameState = await this.gameService.handleStartGame(data.gameId, data.playerId);

    // Track player readiness
    if (!this.playerReadiness[data.gameId]) {
      this.playerReadiness[data.gameId] = new Set<string>();
    }
    this.playerReadiness[data.gameId].add(data.playerId);

    // Get the game to check how many players there are
    const game = await this.gameService.getGameState(data.gameId);
    if (game) {
      const gameData = game as GameType;
      const totalPlayers = gameData.players.length;
      const readyPlayers = this.playerReadiness[data.gameId].size;

      console.log(`Player readiness for game ${data.gameId}: ${readyPlayers}/${totalPlayers} players ready`);

      // Only clear setup timer and start turn timer when all players are ready
      if (readyPlayers >= totalPlayers) {
        console.log(`All players ready for game ${data.gameId}, clearing setup timer and starting turn timer`);

        // Clear setup timer when all players are ready
        this.clearSetupTimer(data.gameId);

        // Start the turn timer for the game
        // this.startTurnTimer(data.gameId); //tbc

        // Clean up the readiness tracking
        delete this.playerReadiness[data.gameId];
      }
    }

    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('placeCard')
  async handlePlaceCard(
    @MessageBody()
    data: {
      gameId: string;
      playerId: string;
      suit: string;
      selectedCards: Card[];
    },
  ) {
    const gameState = await this.gameService.handleCardPlace(
      data.gameId,
      data.playerId,
      data.suit as any,
      data.selectedCards,
    );

    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('jokerExchange')
  async handleJokerExchange(
    @MessageBody()
    data: {
      gameId: string;
      playerId: string;
      suit: string;
      selectedCard: Card;
    },
  ) {
    const gameState = await this.gameService.handleJokerExchange(data.gameId, data.playerId, data.selectedCard);
    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('jokerAction')
  async handleJokerAction(
    @MessageBody()
    data: {
      gameId: string;
      playerId: string;
      jokerCard: Card;
      action: string;
    },
  ) {
    const gameState = await this.gameService.handleJokerAction(data.gameId, data.playerId, data.jokerCard, data.action);
    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('abortGame')
  async abortGame(@MessageBody() data: { gameId: string; playerId: string }, @ConnectedSocket() client: Socket) {
    console.log('abortGame ', data.gameId, ' player: ', data.playerId, client);

    const gameState = await this.gameService.handleAbortGame(data.gameId, data.playerId);

    // Clear setup timer when game is aborted
    this.clearSetupTimer(data.gameId);

    if (gameState) {
      // Notify all players in the game room
      this.sendGameStateToAllPlayers(gameState, data.gameId);
    }
  }

  // Setup timer methods
  private async startSetupTimer(gameId: string) {
    // Clear any existing timer for this game
    this.clearSetupTimer(gameId);

    // Set up a new timer
    const interval = setInterval(async () => {
      try {
        // Update the timer - this now returns a GameTimer object, not the game state
        const updatedTimer = await this.gameService.updateSetupTimer(gameId);

        if (!updatedTimer) {
          this.clearSetupTimer(gameId);
          return;
        }

        console.log(`Setup Timer update: ${updatedTimer.remainingSeconds}s remaining`);

        // Get the game state to check if we're still in setup phase
        const gameState = await this.gameService.getGameState(gameId);
        if (!gameState) {
          this.clearSetupTimer(gameId);
          return;
        }

        // Check if the game is still in setup phase
        const isSetupPhase = gameState.playersGameStates.some((state) => state.phase === 'SETUP');

        if (!isSetupPhase || gameState.gameStatus === 'completed' || updatedTimer.isExpired) {
          this.clearSetupTimer(gameId);

          // If timer expired, abort the game
          if (updatedTimer.isExpired && !gameState.playersGameStates[0].isGameOver) {
            // Get the game to update
            const game = await this.gameRepository.findOne({
              where: { id: gameId },
            });

            if (game) {
              const gameData = game.state as GameType;

              // Abort the game for all players
              for (const playerState of gameData.playersGameStates) {
                playerState.isGameOver = true;
                playerState.winner = null;
                playerState.message = 'Game aborted due to setup time expiration.';
              }

              gameData.gameStatus = 'completed';

              // Save the updated game state
              game.state = gameData;
              await this.gameRepository.save(game);

              console.log('game over...');

              // Notify all clients that the game is over
              this.server.to(gameId).emit('gameOver', {
                gameId: gameId,
                message: 'Game aborted due to setup time expiration.',
              });
            }
          }

          return;
        }

        // Send the timer update to all clients in the room
        this.server.to(gameId).emit('startSetupTimer', {
          setupTimeRemaining: updatedTimer.remainingSeconds,
          gameId: gameId,
          timerType: updatedTimer.timerType,
        });
      } catch (error) {
        console.error(`Error updating setup timer for game ${gameId}:`, error);
        this.clearSetupTimer(gameId);
      }
    }, 800); // Update every 800 ms

    // Store the interval reference
    this.setupTimers[gameId] = interval;
  }

  private clearSetupTimer(gameId: string) {
    const timer = this.setupTimers[gameId];

    console.log('clearSetupTimer ................. ', timer ? true : false);

    if (timer) {
      console.log(`Clearing setup timer for game ${gameId}`);
      clearInterval(timer);
      delete this.setupTimers[gameId];
    }
  }

  /**
   * Starts a turn timer for a specific game
   * If a player doesn't take action during their turn (10 seconds),
   * they lose one card and the turn passes to the other player
   */
  private async startTurnTimer(gameId: string) {
    // Clear any existing turn timer for this game
    this.clearTurnTimer(gameId);

    // Set up a new timer
    const interval = setInterval(async () => {
      try {
        // Update the timer
        const updatedTimer = await this.gameService.updateTurnTimer(gameId);

        if (!updatedTimer) {
          this.clearTurnTimer(gameId);
          return;
        }
        console.log('..........send turnTimer ', updatedTimer.remainingSeconds);

        this.server.to(gameId).emit('turnTimer', {
          remainingSeconds: updatedTimer.remainingSeconds,
          gameId: gameId,
          timerType: updatedTimer.timerType,
        });

        // Get the game state to check if we're still in play phase
        const gameState = await this.gameService.getGameState(gameId);
        if (!gameState) {
          this.clearTurnTimer(gameId);
          return;
        }

        // Check if the game is over
        if (gameState.gameStatus === 'completed') {
          this.clearTurnTimer(gameId);
          return;
        }

        // If time has expired, penalize the current player and move to the next player
        if (updatedTimer.isExpired) {
          this.clearTurnTimer(gameId);

          console.log('Turn timer expired, penalizing player');

          // Get the game to update
          const game = await this.gameService.getGameState(gameId);
          if (game) {
            const gameData = game as GameType;
            const currentPlayerIndex = gameData.currentPlayerIndex;
            const currentPlayerId = gameData.players[currentPlayerIndex];

            // Penalize the current player (lose a card) and move to the next player
            const penalizedGame = await this.gameService.handleTurnTimeout(gameId, currentPlayerId);

            // Reset the turn timer for the next player
            await this.timerService.resetTimer(gameId, TimerType.TURN);

            penalizedGame.turnTimeRemaining = TIME_TURN_LIMIT;
            // Get updated game state for each player
            this.sendGameStateToAllPlayers(penalizedGame, gameId);

            this.startTurnTimer(gameId);
          }

          // Continue the timer for the next player
        }
      } catch (error) {
        console.error(`Error updating turn timer for game ${gameId}:`, error);
        this.clearTurnTimer(gameId);
      }
    }, 800); // Update every 800 ms

    // Store the interval reference
    this.turnTimers[gameId] = interval;
  }

  private clearTurnTimer(gameId: string) {
    const timer = this.turnTimers[gameId];
    if (timer) {
      console.log(`Clearing turn timer for game ${gameId}`);
      clearInterval(timer);
      delete this.turnTimers[gameId];
    }
  }

  @SubscribeMessage('activatorExchange')
  async handleActivatorExchange(
    @MessageBody()
    data: {
      gameId: string;
      playerId: string;
      columnCard: Card;
      playerCard: Card;
    },
  ) {
    const gameState = await this.gameService.handleActivatorExchange(
      data.gameId,
      data.playerId,
      data.columnCard,
      data.playerCard,
    );
    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('attack')
  async handleAttack(
    @MessageBody()
    data: {
      gameId: string;
      playerId: string;
      attackCard: Card;
      attackTarget: TargetAttackType;
    },
  ) {
    const gameState = await this.gameService.handleAttack(
      data.gameId,
      data.playerId,
      data.attackCard,
      data.attackTarget,
    );

    // Check if we have a block request
    if (gameState && gameState['pendingAttack']) {
      const blockRequest = gameState['pendingAttack'];

      // Emit blockRequest event to the defending player
      this.server.to(blockRequest.defendingPlayerId + data.gameId).emit('blockRequest', { blockRequest });

      this.sendGameStateToAllPlayers(gameState, data.gameId);
      return;
    }

    // Normal attack flow (no block)
    // Find the opponent player ID
    const opponentPlayerId = gameState.players.find((id) => id !== data.playerId);

    if (opponentPlayerId) {
      // Emit attackEvent to the opponent player with attack details
      this.server.to(opponentPlayerId + data.gameId).emit('attackEvent', {
        attackCard: data.attackCard,
        attackTarget: data.attackTarget,
        attackingPlayerId: data.playerId,
      });
    }

    // If there's an attack result, emit the attack result event
    if (gameState.attackResult) {
      for (const playerId of gameState.players) {
        this.server.to(playerId + data.gameId).emit('attackResult', gameState.attackResult);
      }
    }

    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('strategicShuffle')
  async handleStrategicShuffle(
    @MessageBody()
    data: {
      gameId: string;
      playerId: string;
    },
  ) {
    const gameState = await this.gameService.handleStrategicShuffle(data.gameId, data.playerId);
    console.log('.... handSS ', data.gameId);

    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('discardCard')
  async handleDiscard(@MessageBody() data: { gameId: string; playerId: string; card: Card }) {
    const gameState = await this.gameService.handleDiscardCard(data.gameId, data.playerId, data.card);
    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('drawCard')
  async handleDrawCard(@MessageBody() data: { gameId: string; playerId: string }) {
    const gameState = await this.gameService.handleDrawCard(data.gameId, data.playerId);
    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('exchangeCards')
  async handleExchangeCard(
    @MessageBody()
    data: {
      gameId: string;
      playerId: string;
      card1: Card;
      card2: Card;
    },
  ) {
    const gameState = await this.gameService.handleExchangeCards(data.gameId, data.playerId, data.card1, data.card2);
    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('sacrificeSpecialCard')
  async handleSacrificeSpecialCard(
    @MessageBody()
    data: {
      gameId: string;
      playerId: string;
      specialCard: Card;
      selectedCards: Card[];
    },
  ) {
    const gameState = await this.gameService.handleSacrificeSpecialCard(
      data.gameId,
      data.playerId,
      data.specialCard,
      data.selectedCards,
    );
    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('blockResponse')
  async handleBlockResponse(
    @MessageBody()
    data: {
      gameId: string;
      playerId: string;
      willBlock: boolean;
      blockingCard?: Card;
    },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('handleBlockResponse', data, client);

    const gameState = await this.gameService.handleBlockResponse(
      data.gameId,
      data.playerId,
      data.willBlock,
      data.blockingCard,
    );

    // Send the updated game state to both players
    for (const playerId of gameState.players) {
      const playerGameState = this.gameService.isolatePlayerState(gameState, data.gameId, playerId);

      // Send the game state to the player
      this.server.to(playerId + data.gameId).emit('gameState', playerGameState);

      // If there's an attack result, emit the attack result event
      if (playerGameState.attackResult) {
        this.server.to(playerId + data.gameId).emit('attackResult', playerGameState.attackResult);
      }
    }

    // Send updated game state to all players
    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('skipAction')
  async handleSkipAction(@MessageBody() data: { gameId: string; playerId: string }) {
    const gameState = await this.gameService.handleSkipAction(data.gameId, data.playerId);
    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('queenChallenge')
  async handleQueenChallenge(
    @MessageBody()
    data: {
      gameId: string;
      playerId: string;
      selectedCards: Card[];
    },
  ) {
    console.log('queenChallenge', data);

    // Use the game service to handle the queen challenge
    const gameState = await this.gameService.handleQueenChallenge(data.gameId, data.playerId, data.selectedCards);

    if (gameState) {
      // Send the updated game state to all players
      this.sendGameStateToAllPlayers(gameState, data.gameId);
    }
  }

  @SubscribeMessage('queenChallengeResponse')
  async handleQueenChallengeResponse(
    @MessageBody()
    data: {
      gameId: string;
      playerId: string;
      selectedQueen: QueenCard;
    },
  ) {
    console.log('queenChallengeResponse', data);

    // Use the game service to handle the queen challenge response
    const gameState = await this.gameService.handleQueenChallengeResponse(
      data.gameId,
      data.playerId,
      data.selectedQueen,
    );

    if (gameState) {
      // Send the updated game state to all players
      this.sendGameStateToAllPlayers(gameState, data.gameId);
    }
  }

  @SubscribeMessage('recycleDiscardPile')
  async handleRecycleDiscardPile(@MessageBody() data: { gameId: string; playerId: string }) {
    const gameState = await this.gameService.handleRecycleDiscardPile(data.gameId, data.playerId);
    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('endTurn')
  async handleEndTurn(@MessageBody() data: { gameId: string; playerId: string }) {
    const gameState = await this.gameService.endTurn(data.gameId, data.playerId);

    // Reset the turn timer for the next player
    await this.timerService.resetTimer(data.gameId, TimerType.TURN);

    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('surrender')
  async HandleSurrender(@MessageBody() data: { gameId: string; playerId: string }) {
    const gameState = await this.gameService.handleSurrender(data.gameId, data.playerId);

    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('updateProfile')
  async handleUpdateProfile(@MessageBody() data: { gameId: string; playerId: string; profile: Profile }) {
    const gameState = await this.gameService.handleUpdateProfile(data.gameId, data.playerId, data.profile);
    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  @SubscribeMessage('showRevolutionPopup')
  async setShowRevolutionPopup(
    @MessageBody()
    data: {
      gameId: string;
      playerId: string;
      showRevolutionPopup: boolean;
    },
  ) {
    const gameState = await this.gameService.setShowRevolutionPopup(
      data.gameId,
      data.playerId,
      data.showRevolutionPopup,
    );
    this.sendGameStateToAllPlayers(gameState, data.gameId);
  }

  async sendGameStateToAllPlayers(gameState: GameType, gameId: string) {
    if (gameState) {
      const gameData = gameState as GameType;

      // Send updated game state to each player
      for (const playerId of gameData.players) {
        const playerState = this.gameService.isolatePlayerState(gameData, gameState.gameId, playerId);

        if (playerState) {
          // Emit directly to this player's socket
          this.server.to(playerId + gameId).emit('gameState', playerState);
        }
      }
    }
  }
}
