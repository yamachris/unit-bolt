import { io, Socket } from "socket.io-client";
import { Card, Profile, Game, AttackTarget } from "../game-core/types/game";
import {
  gameOverResponse,
  QueenCard,
  AttackResult,
} from "../game-core/types/game";

export interface MatchmakingStatusEvent {
  gameId: string;
  token: string;
  status: "waiting" | "matched";
}

class GameSocket {
  private socket: Socket | null = null;
  private gameStateCallback: ((state: Game) => void) | null = null;
  private isConnected: boolean = false;
  private token: string | null = null;
  private matchmakingStatusCallback:
    | ((event: MatchmakingStatusEvent) => void)
    | null = null;
  private gameStartCallback: ((gameId: string) => void) | null = null;
  private gameOverCallback: ((data: gameOverResponse) => void) | null = null;
  private attackResultCallback: ((data: AttackResult) => void) | null = null;
  private gameJoinedCallback: ((gameId: string) => void) | null = null;
  private setupTimerCallback:
    | ((data: {
        setupTimeRemaining: number;
        gameId: string;
        timerType: string;
      }) => void)
    | null = null;
  private turnTimerCallback:
    | ((data: {
        remainingSeconds: number;
        gameId: string;
        timerType: string;
        currentPlayerId: string;
        isPlayerTurn: boolean;
      }) => void)
    | null = null;
  private turnChangedCallback:
    | ((data: {
        gameId: string;
        previousPlayerId: string;
        currentPlayerId: string;
        turnNumber: number;
      }) => void)
    | null = null;
  private attackCallback:
    | ((data: {
        gameId: string;
        playerId: string;
        attackCard: Card;
        attackTarget: AttackTarget;
      }) => void)
    | null = null;
  private blockRequestCallback:
    | ((data: {
        gameId: string;
        attackCard: Card;
        attackTarget: AttackTarget;
        attackingPlayerId: string;
      }) => void)
    | null = null;

  getSocket(): Socket | null {
    return this.socket;
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }

  connect() {
    // Only connect if not already connected
    if (!this.isConnected) {
      // console.log("Connecting to socket...");
      // this.socket = io(
      //   process.env.NEXT_PUBLIC_API_URL ||
      //     "https://api.unitcardgame.com" ||
      //     "http://localhost:3007",
      //   {
      //     withCredentials: true,
      //   },
      // );
      this.socket = io(process.env.NEXT_PUBLIC_API_URL, {
        withCredentials: true,
      });

      this.socket.on("gameState", (state: Game) => {
        // console.log("received gameState emit");

        if (this.gameStateCallback) {
          this.gameStateCallback(state);
        }
      });

      this.socket.on("attackResult", (data: AttackResult) => {
        if (this.attackResultCallback) {
          this.attackResultCallback(data);
        }
      });

      this.socket.on("gameOver", (data: gameOverResponse) => {
        // console.log("received gameOver emit");

        if (this.gameOverCallback) {
          this.gameOverCallback(data);
        }
      });

      this.socket.on(
        "startSetupTimer",
        (data: {
          setupTimeRemaining: number;
          gameId: string;
          timerType: string;
        }) => {
          // console.log(`Timer update: ${data.timerType} - ${data.setupTimeRemaining}s remaining`);
          if (this.setupTimerCallback) {
            this.setupTimerCallback(data);
          }
        },
      );

      this.socket.on(
        "turnTimer",
        (data: {
          remainingSeconds: number;
          gameId: string;
          timerType: string;
          currentPlayerId: string;
          isPlayerTurn: boolean;
        }) => {
          if (this.turnTimerCallback) {
            this.turnTimerCallback(data);
          }
        },
      );

      this.socket.on(
        "turnChanged",
        (data: {
          gameId: string;
          previousPlayerId: string;
          currentPlayerId: string;
          turnNumber: number;
        }) => {
          // console.log(
          //   `Turn changed: Player ${data.previousPlayerId} -> Player ${data.currentPlayerId}, Turn ${data.turnNumber}`
          // );
          if (this.turnChangedCallback) {
            this.turnChangedCallback(data);
          }
        },
      );

      this.socket.on(
        "attackEvent",
        (data: {
          gameId: string;
          playerId: string;
          attackCard: Card;
          attackTarget: AttackTarget;
        }) => {
          // console.log("Received attack event:", data);
          if (this.attackCallback) {
            this.attackCallback(data);
          }
        },
      );

      this.socket.on(
        "blockRequest",
        (data: {
          gameId: string;
          attackCard: Card;
          attackTarget: AttackTarget;
          attackingPlayerId: string;
        }) => {
          // console.log("Received lockRequest event:", data);
          if (this.blockRequestCallback) {
            this.blockRequestCallback(data);
          }
        },
      );

      this.socket.on("connect", () => {
        // console.log("Socket connected!");
        this.isConnected = true;
      });

      this.socket.on("disconnect", () => {
        // console.log("Socket disconnected!");
        this.isConnected = false;
      });
    } else {
      // console.log("Socket already connected, reusing existing connection.");
    }
  }

  disconnect() {
    if (this.socket && this.isConnected) {
      // console.log("Disconnecting socket...");
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  joinGame(gameId: string, playerId: string) {
    if (this.socket) {
      // console.log("joinGame ", gameId);
      this.socket.emit("joinGame", { gameId, playerId });
    }
  }

  onGameState(callback: (state: Game) => void) {
    this.gameStateCallback = callback;
  }

  onAttackResult(callback: (data: AttackResult) => void) {
    this.attackResultCallback = callback;
  }

  onGameOver(callback: (data: gameOverResponse) => void) {
    this.gameOverCallback = callback;
  }

  onSetupTimer(
    callback: (data: {
      setupTimeRemaining: number;
      gameId: string;
      timerType: string;
    }) => void,
  ) {
    this.setupTimerCallback = callback;
  }

  onTurnTimer(
    callback: (data: {
      remainingSeconds: number;
      gameId: string;
      timerType: string;
      currentPlayerId: string;
      isPlayerTurn: boolean;
    }) => void,
  ) {
    this.turnTimerCallback = callback;
  }

  onTurnChanged(
    callback: (data: {
      gameId: string;
      previousPlayerId: string;
      currentPlayerId: string;
      turnNumber: number;
    }) => void,
  ) {
    this.turnChangedCallback = callback;
  }

  onAttack(
    callback: (data: {
      gameId: string;
      playerId: string;
      attackCard: Card;
      attackTarget: AttackTarget;
    }) => void,
  ) {
    this.attackCallback = callback;
  }

  onBlockRequest(
    callback: (data: {
      gameId: string;
      attackCard: Card;
      attackTarget: AttackTarget;
      attackingPlayerId: string;
    }) => void,
  ) {
    this.blockRequestCallback = callback;
  }

  handleBlockResponse(
    gameId: string,
    playerId: string,
    willBlock: boolean,
    blockingCard?: Card,
  ) {
    if (this.socket && this.isConnected) {
      this.socket.emit("blockResponse", {
        gameId,
        playerId,
        willBlock,
        blockingCard,
      });
    }
  }

  handleQueenChallenge(
    gameId: string,
    playerId: string,
    selectedCards: Card[],
  ) {
    if (this.socket && this.isConnected) {
      this.socket.emit("queenChallenge", {
        gameId,
        playerId,
        selectedCards,
      });
    }
  }

  handleQueenChallengeResponse(
    gameId: string,
    playerId: string,
    selectedQueen: QueenCard,
  ) {
    if (this.socket && this.isConnected) {
      this.socket.emit("queenChallengeResponse", {
        gameId,
        playerId,
        selectedQueen,
      });
    }
  }

  moveToReserve(gameId: string, playerId: string, card: Card) {
    if (this.socket) {
      this.socket.emit("moveToReserve", { gameId, playerId, card });
    }
  }

  startGame(gameId: string, playerId: string) {
    if (this.socket) {
      this.socket.emit("startGame", { gameId, playerId });
    }
  }

  handleDiscard(gameId: string, playerId: string, card: Card) {
    if (this.socket) {
      this.socket.emit("discardCard", { gameId, playerId, card });
    }
  }

  handleDrawCard(gameId: string, playerId: string) {
    // console.log(gameId);

    if (this.socket) {
      this.socket.emit("drawCard", { gameId, playerId });
    }
  }

  handleSkipAction(gameId: string, playerId: string) {
    if (this.socket) {
      this.socket.emit("skipAction", { gameId, playerId });
    }
  }

  handlePassTurn(gameId: string, playerId: string) {
    if (this.socket) {
      this.socket.emit("endTurn", { gameId, playerId });
    }
  }

  handlePlaceCard(
    gameId: string,
    playerId: string,
    suit: string,
    selectedCards: Card[],
  ) {
    if (this.socket) {
      this.socket.emit("placeCard", { gameId, playerId, suit, selectedCards });
    }
  }

  handleStrategicShuffle(gameId: string, playerId: string) {
    // console.log("handleStrategicShuffle");

    if (this.socket) {
      this.socket.emit("strategicShuffle", { gameId, playerId });
    }
  }

  handleExchangeCards(
    gameId: string,
    playerId: string,
    card1: Card,
    card2: Card,
  ) {
    if (this.socket) {
      this.socket.emit("exchangeCards", { gameId, playerId, card1, card2 });
    }
  }

  handleRecycleDiscardPile(gameId: string, playerId: string) {
    if (this.socket) {
      this.socket.emit("recycleDiscardPile", { gameId, playerId });
    }
  }

  handleJokerExchange(gameId: string, playerId: string, selectedCard: Card) {
    if (this.socket) {
      this.socket.emit("jokerExchange", { gameId, playerId, selectedCard });
    }
  }

  handleJokerAction(
    gameId: string,
    playerId: string,
    jokerCard: Card,
    action: string,
  ) {
    if (this.socket) {
      this.socket.emit("jokerAction", { gameId, playerId, jokerCard, action });
    }
  }

  handleAttack(
    gameId: string,
    playerId: string,
    attackCard: Card,
    attackTarget: AttackTarget,
  ) {
    if (this.socket) {
      this.socket.emit("attack", {
        gameId,
        playerId,
        attackCard,
        attackTarget,
      });
    }
  }

  handleSurrender(gameId: string, playerId: string) {
    if (this.socket) {
      this.socket.emit("surrender", { gameId, playerId });
    }
  }

  handleUpdateProfile(gameId: string, playerId: string, profile: Profile) {
    if (this.socket) {
      this.socket.emit("updateProfile", { gameId, playerId, profile });
    }
  }

  handleSacrificeSpecialCard(
    gameId: string,
    playerId: string,
    specialCard: Card,
    selectedCards: Card[],
  ) {
    if (this.socket) {
      this.socket.emit("sacrificeSpecialCard", {
        gameId,
        playerId,
        specialCard,
        selectedCards,
      });
    }
  }

  // handleBlock(gameId: string, playerId: string, suit: Suit) {
  //   if (this.socket) {
  //     this.socket.emit("block", { gameId, playerId, suit });
  //   }
  // }

  // handleBlockAttackWithJoker(gameId: string, playerId: string, jokerCard: Card) {
  //   if (this.socket) {
  //     this.socket.emit("blockAttackWithJoker", { gameId, playerId, jokerCard });
  //   }
  // }

  abortGame(gameId: string, playerId: string) {
    if (this.socket) {
      this.socket.emit("abortGame", { gameId, playerId });
    }
  }

  handleActivatorExchange(
    gameId: string,
    playerId: string,
    columnCard: Card,
    playerCard: Card,
  ) {
    if (this.socket) {
      this.socket.emit("activatorExchange", {
        gameId,
        playerId,
        columnCard,
        playerCard,
      });
    }
  }

  setShowRevolutionPopup(
    gameId: string,
    playerId: string,
    showRevolutionPopup: boolean,
  ) {
    if (this.socket) {
      this.socket.emit("showRevolutionPopup", {
        gameId,
        playerId,
        showRevolutionPopup,
      });
    }
  }

  findMatch(playerId: string): Promise<MatchmakingStatusEvent> {
    // console.log("Finding match for player:", playerId);
    // console.log("Current socket state:", this.socket ? `Connected: ${this.socket.connected}` : "No socket");
    // this.setPlayerName(playerName);

    // if (!this.socket) {
    //   // console.log("No socket found, connecting...");
    //   this.connect();
    // } else if (!this.socket.connected) {
    //   // console.log("Socket exists but not connected, reconnecting...");
    //   this.disconnect();
    //   this.connect();
    // }

    if (this.socket) {
      // console.log("Sending findMatch event with socket ID:", this.socket.id);

      // Use WebSockets for matchmaking instead of HTTP to avoid preflight issues
      // This way we only use one communication channel and avoid duplicate requests
      this.socket.emit("findMatch", {
        playerId,
        socketId: this.socket.id,
      });

      // Return a promise that resolves when we get a matchmaking status event
      return new Promise((resolve, reject) => {
        // console.log("Setting up matchmaking status listener");

        // Set up a listener for matchmaking status that stays active
        // We'll use the permanent matchmakingStatusCallback for ongoing updates
        const tempMatchmakingHandler = (event: MatchmakingStatusEvent) => {
          // console.log("Received matchmaking status:", event);
          if (event.token) {
            // console.log("Received token with matchmaking status, saving token");
            this.setToken(event.token);
          }

          // We don't remove the listener here anymore
          // Just resolve the promise with the initial response
          // console.log("Resolving promise with matchmaking status");
          resolve(event);

          // If we got matched, we can remove this temporary handler
          // since the main matchmakingStatusCallback will handle further updates
          if (event.status === "matched") {
            // console.log("Matched status received, removing temporary handler");
            this.socket?.off("matchmakingStatus", tempMatchmakingHandler);
          } else {
            // console.log("Waiting status received, keeping temporary handler active");
          }
        };

        // Set up the temporary listener alongside the permanent one
        this.socket?.on("matchmakingStatus", tempMatchmakingHandler);

        // Set a timeout to avoid hanging indefinitely
        setTimeout(() => {
          // console.log("Matchmaking timeout reached, removing temporary handler");
          this.socket?.off("matchmakingStatus", tempMatchmakingHandler);
          reject(new Error("Matchmaking request timed out"));
        }, 20000); // 20 seconds timeout
      });
    }

    // console.log("Socket not connected, rejecting promise");
    return Promise.reject("Socket not connected");
  }

  setMatchmakingStatusCallback(
    callback: (event: MatchmakingStatusEvent) => void,
  ) {
    this.matchmakingStatusCallback = callback;
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem("jwt_token", token);

    // If socket is already connected, reconnect with the new token
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }

  cancelMatchmaking(tempGameId: string) {
    // console.log("cancelMatchmaking ");

    if (this.socket) {
      // Notify the server we're canceling matchmaking
      this.socket.emit("cancelMatchmaking", { tempGameId });
      // console.log("emit cancelMatchmaking ");
    }
    return Promise.reject("Socket not connected");
  }
}

export const gameSocket = new GameSocket();
