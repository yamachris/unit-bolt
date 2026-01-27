import { GameAIService } from './game-ai.service';
import { GameState as GameStateType, Card, Suit, GameType } from '../../types/game';

export class GameAIController {
  constructor(private aiService: GameAIService) {}

  async executeSetupPhase(
    gameData: GameType,
    aiPlayerIndex: number,
  ): Promise<{ reserveCards: Card[] }> {
    const aiState = gameData.playersGameStates[aiPlayerIndex];
    const hand = aiState.currentPlayer.hand;

    const reserveCards = this.aiService.makeSetupDecision(hand);

    return { reserveCards };
  }

  async executeDiscardPhase(
    gameData: GameType,
    aiPlayerIndex: number,
  ): Promise<{ cardToDiscard: Card | null }> {
    const aiState = gameData.playersGameStates[aiPlayerIndex];
    const opponentIndex = aiPlayerIndex === 0 ? 1 : 0;
    const opponentState = gameData.playersGameStates[opponentIndex];

    const cardToDiscard = this.aiService.makeDiscardDecision(aiState, opponentState);

    return { cardToDiscard };
  }

  async executeTurn(
    gameData: GameType,
    aiPlayerIndex: number,
  ): Promise<{
    action: string;
    cards?: Card[];
    suit?: Suit;
    target?: any;
  }> {
    const aiState = gameData.playersGameStates[aiPlayerIndex];
    const opponentIndex = aiPlayerIndex === 0 ? 1 : 0;
    const opponentState = gameData.playersGameStates[opponentIndex];

    const decision = this.aiService.makeTurnDecision(aiState, opponentState);

    return {
      action: decision.action,
      cards: decision.cards,
      suit: decision.suit,
      target: decision.target,
    };
  }

  async executeDefense(
    gameData: GameType,
    aiPlayerIndex: number,
    incomingAttack: { card: Card; suit: Suit },
  ): Promise<{ willBlock: boolean; blockingCard?: Card }> {
    const aiState = gameData.playersGameStates[aiPlayerIndex];

    const defenseDecision = this.aiService.makeDefenseDecision(aiState, incomingAttack);

    return defenseDecision;
  }

  async executeQueenChallenge(
    gameData: GameType,
    aiPlayerIndex: number,
  ): Promise<{ suit: Suit; color: string }> {
    const response = this.aiService.makeQueenChallengeDecision();

    return response;
  }

  shouldUseStrategicShuffle(
    gameData: GameType,
    aiPlayerIndex: number,
  ): boolean {
    const aiState = gameData.playersGameStates[aiPlayerIndex];
    const opponentIndex = aiPlayerIndex === 0 ? 1 : 0;
    const opponentState = gameData.playersGameStates[opponentIndex];

    return this.aiService.shouldUseStrategicShuffle(aiState, opponentState);
  }

  evaluateJokerUse(
    gameData: GameType,
    aiPlayerIndex: number,
  ): 'ATTACK' | 'HEAL' | 'REPLACE' | 'SAVE' {
    const aiState = gameData.playersGameStates[aiPlayerIndex];
    const opponentIndex = aiPlayerIndex === 0 ? 1 : 0;
    const opponentState = gameData.playersGameStates[opponentIndex];

    return this.aiService.evaluateJokerUse(aiState, opponentState);
  }
}
