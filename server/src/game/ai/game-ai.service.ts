import { Injectable } from '@nestjs/common';
import { GameAIEvaluator } from './game-ai-evaluator';
import { GameAIStrategy, AIDecision } from './game-ai-strategy';
import { Card, GameState as GameStateType, Suit } from '../../types/game';

@Injectable()
export class GameAIService {
  private evaluator: GameAIEvaluator;
  private strategy: GameAIStrategy;

  constructor() {
    this.evaluator = new GameAIEvaluator();
    this.strategy = new GameAIStrategy();
  }

  makeSetupDecision(hand: Card[]): Card[] {
    console.log('🤖 AI: Making setup decision...');
    const reserveCards = this.strategy.decideSetupCards(hand);
    console.log(`🤖 AI: Selected ${reserveCards.length} cards for reserve`);
    return reserveCards;
  }

  makeDiscardDecision(
    playerState: GameStateType,
    opponentState: GameStateType,
  ): Card | null {
    console.log('🤖 AI: Making discard decision...');

    const evaluation = this.evaluator.evaluateGameState(playerState, opponentState);
    const cardToDiscard = this.strategy.decideDiscard(playerState, evaluation);

    if (cardToDiscard) {
      console.log(`🤖 AI: Discarding ${cardToDiscard.value} of ${cardToDiscard.suit}`);
    }

    return cardToDiscard;
  }

  makeTurnDecision(
    playerState: GameStateType,
    opponentState: GameStateType,
  ): AIDecision {
    console.log('🤖 AI: Making turn decision...');
    console.log(`🤖 AI: Phase: ${playerState.phase}`);
    console.log(`🤖 AI: Health: ${playerState.currentPlayer.health}/${playerState.currentPlayer.maxHealth}`);
    console.log(`🤖 AI: Hand size: ${playerState.currentPlayer.hand.length}`);
    console.log(`🤖 AI: Reserve size: ${playerState.currentPlayer.reserve.length}`);

    const evaluation = this.evaluator.evaluateGameState(playerState, opponentState);

    console.log(`🤖 AI: Evaluation score: ${evaluation.score}`);
    console.log(`🤖 AI: Attack opportunities: ${evaluation.attackOpportunities}`);
    console.log(`🤖 AI: Revolution opportunities: ${evaluation.revolutionOpportunities.join(', ') || 'none'}`);

    const decision = this.strategy.decideNextAction(playerState, opponentState, evaluation);

    console.log(`🤖 AI: Decision: ${decision.action}`);
    if (decision.reasoning) {
      console.log(`🤖 AI: Reasoning: ${decision.reasoning}`);
    }

    return decision;
  }

  makeDefenseDecision(
    playerState: GameStateType,
    incomingAttack: { card: Card; suit: Suit },
  ): { willBlock: boolean; blockingCard?: Card } {
    console.log('🤖 AI: Making defense decision...');
    console.log(`🤖 AI: Incoming attack: ${incomingAttack.card.value} on ${incomingAttack.suit}`);

    const blockingCard = this.strategy.decideDefense(playerState, incomingAttack);

    if (blockingCard) {
      console.log(`🤖 AI: Blocking with ${blockingCard.value}`);
      return { willBlock: true, blockingCard };
    }

    console.log('🤖 AI: Not blocking this attack');
    return { willBlock: false };
  }

  makeQueenChallengeDecision(): { suit: Suit; color: string } {
    console.log('🤖 AI: Making Queen challenge decision...');

    const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
    const randomSuit = suits[Math.floor(Math.random() * suits.length)];

    const color = randomSuit === 'HEARTS' || randomSuit === 'DIAMONDS' ? 'red' : 'black';

    console.log(`🤖 AI: Guessing ${randomSuit} (${color})`);

    return { suit: randomSuit, color };
  }

  shouldUseSacrifice(
    playerState: GameStateType,
    targetCard: 'K' | 'Q' | 'J',
  ): { shouldSacrifice: boolean; cardsToSacrifice?: Card[] } {
    const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
    const availableCards: Card[] = [];

    for (const suit of suits) {
      const column = playerState.columns[suit];
      if (column && column.cards.length > 0) {
        const topCard = column.cards[column.cards.length - 1];

        if (topCard.value !== 'A' && topCard.value !== '7' && topCard.value !== '10') {
          availableCards.push(topCard);
        }
      }
    }

    const requiredCount = targetCard === 'K' ? 3 : targetCard === 'Q' ? 2 : 1;

    if (availableCards.length >= requiredCount) {
      if (targetCard === 'J') {
        const validCards = availableCards.filter(
          card => card.value === '8' || card.value === '9'
        );

        if (validCards.length > 0) {
          return {
            shouldSacrifice: true,
            cardsToSacrifice: [validCards[0]],
          };
        }
      } else {
        availableCards.sort((a, b) => {
          const getValue = (card: Card): number => {
            const valueMap: Record<string, number> = {
              '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
              '8': 8, '9': 9
            };
            return valueMap[card.value] || 0;
          };

          return getValue(a) - getValue(b);
        });

        return {
          shouldSacrifice: true,
          cardsToSacrifice: availableCards.slice(0, requiredCount),
        };
      }
    }

    return { shouldSacrifice: false };
  }

  shouldUseStrategicShuffle(
    playerState: GameStateType,
    opponentState: GameStateType,
  ): boolean {
    const handQuality = this.evaluator['evaluateHandQuality'](
      playerState.currentPlayer.hand,
      playerState.currentPlayer.reserve,
    );

    const deckSize = playerState.deck.length;
    const discardSize = playerState.currentPlayer.discardPile.length;

    if (deckSize < 5 && discardSize > 10) {
      console.log('🤖 AI: Deck running low, considering strategic shuffle');
      return true;
    }

    if (handQuality < 50 && playerState.turn > 3) {
      console.log('🤖 AI: Hand quality low, considering strategic shuffle');
      return true;
    }

    return false;
  }

  evaluateJokerUse(
    playerState: GameStateType,
    opponentState: GameStateType,
  ): 'ATTACK' | 'HEAL' | 'REPLACE' | 'SAVE' {
    const healthPercent = playerState.currentPlayer.health / playerState.currentPlayer.maxHealth;

    if (healthPercent < 0.3) {
      console.log('🤖 AI: Low health, use Joker for healing');
      return 'HEAL';
    }

    const opponentProgress = Object.values(opponentState.columns)
      .filter(col => col && col.cards)
      .reduce((max, col) => Math.max(max, col.cards.length), 0);

    if (opponentProgress >= 8) {
      console.log('🤖 AI: Opponent has advanced column, use Joker for attack');
      return 'ATTACK';
    }

    const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
    for (const suit of suits) {
      const column = playerState.columns[suit];
      if (column && column.cards.length > 0) {
        const nextExpected = this.getNextExpectedValue(column);
        if (nextExpected && !this.hasCard(playerState, nextExpected, suit)) {
          console.log(`🤖 AI: Missing ${nextExpected} in ${suit}, consider Joker replacement`);
          return 'REPLACE';
        }
      }
    }

    console.log('🤖 AI: Save Joker for later');
    return 'SAVE';
  }

  private getNextExpectedValue(column: any): string | null {
    if (!column.cards || column.cards.length === 0) return 'A';

    const lastCard = column.cards[column.cards.length - 1];
    const valueMap: Record<string, string> = {
      'A': '2', '2': '3', '3': '4', '4': '5', '5': '6',
      '6': '7', '7': '8', '8': '9', '9': '10'
    };

    return valueMap[lastCard.value] || null;
  }

  private hasCard(playerState: GameStateType, value: string, suit: Suit): boolean {
    const allCards = [...playerState.currentPlayer.hand, ...playerState.currentPlayer.reserve];
    return allCards.some(card => card.value === value && card.suit === suit);
  }
}
