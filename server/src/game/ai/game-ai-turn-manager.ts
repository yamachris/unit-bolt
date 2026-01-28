import { GameAIService } from './game-ai.service';
import { GameAIController } from './game-ai-controller';
import { GameType, Card, Suit } from '../../types/game';

export class GameAITurnManager {
  private aiController: GameAIController;
  private aiService: GameAIService;
  private gameServiceRef: any;

  constructor(gameServiceRef: any) {
    this.aiService = new GameAIService();
    this.aiController = new GameAIController(this.aiService);
    this.gameServiceRef = gameServiceRef;
  }

  async handleAISetup(gameId: string, aiPlayerId: string): Promise<void> {
    console.log(`🤖 AI Setup Phase for player ${aiPlayerId}`);

    const gameData = await this.gameServiceRef.getGameState(gameId);
    if (!gameData) return;

    const aiPlayerIndex = gameData.players.indexOf(aiPlayerId);
    if (aiPlayerIndex === -1) return;

    const { reserveCards } = await this.aiController.executeSetupPhase(gameData, aiPlayerIndex);

    for (const card of reserveCards) {
      await this.gameServiceRef.handleMoveToReserve(gameId, aiPlayerId, card);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    await this.gameServiceRef.handleStartGame(gameId, aiPlayerId);
  }

  async handleAITurn(gameId: string, aiPlayerId: string): Promise<void> {
    console.log(`🤖 AI Turn for player ${aiPlayerId}`);

    let gameData = await this.gameServiceRef.getGameState(gameId);
    if (!gameData) return;

    let aiPlayerIndex = gameData.players.indexOf(aiPlayerId);
    if (aiPlayerIndex === -1) return;

    let aiState = gameData.playersGameStates[aiPlayerIndex];

    if (aiState.phase === 'DISCARD' && !aiState.hasDiscarded) {
      await this.handleAIDiscard(gameId, aiPlayerId, gameData, aiPlayerIndex);
      // Refresh game state after discard
      gameData = await this.gameServiceRef.getGameState(gameId);
      if (!gameData) return;
      aiState = gameData.playersGameStates[aiPlayerIndex];
    }

    if (aiState.phase === 'DRAW' && !aiState.hasDrawn) {
      await this.handleAIDraw(gameId, aiPlayerId);
      // Refresh game state after draw
      gameData = await this.gameServiceRef.getGameState(gameId);
      if (!gameData) return;
      aiState = gameData.playersGameStates[aiPlayerIndex];
    }

    if (aiState.phase === 'PLAY' && !aiState.hasPlayedAction) {
      await this.handleAIPlay(gameId, aiPlayerId, gameData, aiPlayerIndex);
      // Refresh game state after play
      gameData = await this.gameServiceRef.getGameState(gameId);
      if (!gameData) return;
      aiState = gameData.playersGameStates[aiPlayerIndex];
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Always try to end turn if in PLAY phase
    if (aiState.phase === 'PLAY' || aiState.canEndTurn || aiState.hasPlayedAction) {
      await this.gameServiceRef.endTurn(gameId, aiPlayerId);
    }
  }

  private async handleAIDiscard(
    gameId: string,
    aiPlayerId: string,
    gameData: GameType,
    aiPlayerIndex: number,
  ): Promise<void> {
    console.log('🤖 AI: Discard Phase');

    const { cardToDiscard } = await this.aiController.executeDiscardPhase(gameData, aiPlayerIndex);

    if (cardToDiscard) {
      await this.gameServiceRef.handleDiscard(gameId, aiPlayerId, cardToDiscard);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  private async handleAIDraw(gameId: string, aiPlayerId: string): Promise<void> {
    console.log('🤖 AI: Draw Phase');

    await this.gameServiceRef.handleDrawCard(gameId, aiPlayerId);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async handleAIPlay(
    gameId: string,
    aiPlayerId: string,
    gameData: GameType,
    aiPlayerIndex: number,
  ): Promise<void> {
    console.log('🤖 AI: Play Phase');

    const decision = await this.aiController.executeTurn(gameData, aiPlayerIndex);

    switch (decision.action) {
      case 'PLACE_CARD':
        if (decision.suit && decision.cards) {
          await this.gameServiceRef.handleCardPlace(gameId, aiPlayerId, decision.suit, decision.cards);
        }
        break;

      case 'ATTACK':
        if (decision.cards && decision.target) {
          await this.gameServiceRef.handleAttack(gameId, aiPlayerId, decision.cards[0], decision.target);
        }
        break;

      case 'USE_SPECIAL':
        if (decision.cards && decision.cards.length > 0) {
          const card = decision.cards[0];
          if (card.type === 'JOKER') {
            const jokerAction = this.aiService.evaluateJokerUse(
              gameData.playersGameStates[aiPlayerIndex],
              gameData.playersGameStates[aiPlayerIndex === 0 ? 1 : 0],
            );

            if (jokerAction === 'HEAL') {
              await this.gameServiceRef.handleJokerAction(gameId, aiPlayerId, card, 'heal');
            } else if (jokerAction === 'ATTACK') {
              await this.gameServiceRef.handleJokerAction(gameId, aiPlayerId, card, 'attack');
            }
          } else if (decision.suit && decision.cards.length >= 2) {
            await this.gameServiceRef.handleCardPlace(gameId, aiPlayerId, decision.suit, decision.cards);
          }
        }
        break;

      case 'END_TURN':
      default:
        break;
    }

    await new Promise(resolve => setTimeout(resolve, 800));
  }

  async handleAIDefense(
    gameId: string,
    aiPlayerId: string,
    incomingAttack: { card: Card; suit: Suit },
  ): Promise<void> {
    console.log(`🤖 AI Defense for player ${aiPlayerId}`);

    const gameData = await this.gameServiceRef.getGameState(gameId);
    if (!gameData) return;

    const aiPlayerIndex = gameData.players.indexOf(aiPlayerId);
    if (aiPlayerIndex === -1) return;

    const defenseDecision = await this.aiController.executeDefense(gameData, aiPlayerIndex, incomingAttack);

    await this.gameServiceRef.handleBlockResponse(
      gameId,
      aiPlayerId,
      defenseDecision.willBlock,
      defenseDecision.blockingCard,
    );
  }

  async handleAIQueenChallenge(gameId: string, aiPlayerId: string): Promise<void> {
    console.log(`🤖 AI Queen Challenge for player ${aiPlayerId}`);

    const gameData = await this.gameServiceRef.getGameState(gameId);
    if (!gameData) return;

    const aiPlayerIndex = gameData.players.indexOf(aiPlayerId);
    if (aiPlayerIndex === -1) return;

    const response = await this.aiController.executeQueenChallenge(gameData, aiPlayerIndex);

    await this.gameServiceRef.handleQueenChallengeResponse(gameId, aiPlayerId, response);
  }

  isAIPlayer(playerId: string): boolean {
    return playerId.startsWith('AI_');
  }
}
