import { Card, GameState as GameStateType, Suit, ColumnState } from '../../types/game';

export interface GameEvaluation {
  score: number;
  playerHealth: number;
  opponentHealth: number;
  playerAdvantage: number;
  columnProgression: Record<Suit, number>;
  threateningSuits: Suit[];
  defendableSuits: Suit[];
  revolutionOpportunities: Suit[];
  handQuality: number;
  attackOpportunities: number;
}

export class GameAIEvaluator {
  private readonly WEIGHTS = {
    HEALTH_DIFF: 10,
    COLUMN_PROGRESS: 5,
    REVOLUTION_READY: 100,
    NEAR_REVOLUTION: 50,
    KING_DEFENSE: 15,
    JOKER_VALUE: 20,
    SEVEN_VALUE: 8,
    ACE_VALUE: 10,
    VALET_VALUE: 15,
    DAME_VALUE: 12,
    COMPLETE_SEQUENCE: 30,
  };

  evaluateGameState(
    playerState: GameStateType,
    opponentState: GameStateType,
  ): GameEvaluation {
    const playerHealth = playerState.currentPlayer.health;
    const opponentHealth = opponentState.currentPlayer.health;

    const columnProgression = this.evaluateColumnProgression(playerState.columns);
    const revolutionOpportunities = this.findRevolutionOpportunities(playerState.columns);
    const threateningSuits = this.findThreateningSuits(opponentState.columns);
    const defendableSuits = this.findDefendableSuits(playerState.columns);
    const handQuality = this.evaluateHandQuality(playerState.currentPlayer.hand, playerState.currentPlayer.reserve);
    const attackOpportunities = this.countAttackOpportunities(playerState.columns);

    const score = this.calculateOverallScore(
      playerState,
      opponentState,
      columnProgression,
      revolutionOpportunities,
      threateningSuits,
    );

    return {
      score,
      playerHealth,
      opponentHealth,
      playerAdvantage: score,
      columnProgression,
      threateningSuits,
      defendableSuits,
      revolutionOpportunities,
      handQuality,
      attackOpportunities,
    };
  }

  private evaluateColumnProgression(columns: Record<Suit, ColumnState>): Record<Suit, number> {
    const progression: Record<Suit, number> = {
      HEARTS: 0,
      DIAMONDS: 0,
      CLUBS: 0,
      SPADES: 0,
    };

    const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];

    suits.forEach((suit) => {
      const column = columns[suit];
      if (column && column.cards.length > 0) {
        const highestCard = column.cards[column.cards.length - 1];
        const cardValueMap: Record<string, number> = {
          'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
          '7': 7, '8': 8, '9': 9, '10': 10
        };

        const cardValue = cardValueMap[highestCard.value] || 0;
        progression[suit] = (cardValue / 10) * 100;

        if (column.reserveSuit && cardValue >= 6) {
          progression[suit] += 20;
        }

        if (cardValue === 10) {
          progression[suit] = 100;
        }
      }
    });

    return progression;
  }

  private findRevolutionOpportunities(columns: Record<Suit, ColumnState>): Suit[] {
    const opportunities: Suit[] = [];
    const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];

    suits.forEach((suit) => {
      const column = columns[suit];
      if (this.isRevolutionReady(column, suit)) {
        opportunities.push(suit);
      }
    });

    return opportunities;
  }

  private isRevolutionReady(column: ColumnState, suit: Suit): boolean {
    if (!column || column.cards.length < 9) return false;

    const hasJoker = column.cards.some(card => card.type === 'JOKER');
    if (hasJoker) return false;

    const expectedValues = ['A', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (let i = 0; i < expectedValues.length; i++) {
      const card = column.cards[i];
      if (!card || card.value !== expectedValues[i] || card.suit !== suit) {
        return false;
      }
    }

    const hasProperSeven = column.reserveSuit?.value === '7' && column.reserveSuit?.suit === suit;

    return hasProperSeven;
  }

  private findThreateningSuits(opponentColumns: Record<Suit, ColumnState>): Suit[] {
    const threatening: Suit[] = [];
    const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];

    suits.forEach((suit) => {
      const column = opponentColumns[suit];
      if (column && column.cards.length >= 7) {
        threatening.push(suit);
      }
    });

    return threatening;
  }

  private findDefendableSuits(columns: Record<Suit, ColumnState>): Suit[] {
    const defendable: Suit[] = [];
    const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];

    suits.forEach((suit) => {
      const column = columns[suit];
      if (column) {
        const hasSeven = column.cards.some(card => card.value === '7');
        const hasKing = column.faceCards?.K !== undefined;

        if (hasSeven || hasKing) {
          defendable.push(suit);
        }
      }
    });

    return defendable;
  }

  private evaluateHandQuality(hand: Card[], reserve: Card[]): number {
    let quality = 0;
    const allCards = [...hand, ...reserve];

    allCards.forEach(card => {
      if (card.type === 'JOKER') {
        quality += this.WEIGHTS.JOKER_VALUE;
      } else if (card.value === 'A') {
        quality += this.WEIGHTS.ACE_VALUE;
      } else if (card.value === '7') {
        quality += this.WEIGHTS.SEVEN_VALUE;
      } else if (card.value === 'J') {
        quality += this.WEIGHTS.VALET_VALUE;
      } else if (card.value === 'Q') {
        quality += this.WEIGHTS.DAME_VALUE;
      } else if (card.value === 'K') {
        quality += this.WEIGHTS.KING_DEFENSE;
      } else if (['8', '9', '10'].includes(card.value)) {
        quality += 5;
      } else {
        quality += 2;
      }
    });

    return quality;
  }

  private countAttackOpportunities(columns: Record<Suit, ColumnState>): number {
    let count = 0;
    const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];

    suits.forEach((suit) => {
      const column = columns[suit];
      if (column && column.attackStatus) {
        const activeButtons = column.attackStatus.attackButtons.filter(btn => btn.active && !btn.wasUsed);
        count += activeButtons.length;
      }

      if (column?.faceCards?.J) {
        count += 1;
      }
    });

    return count;
  }

  private calculateOverallScore(
    playerState: GameStateType,
    opponentState: GameStateType,
    columnProgression: Record<Suit, number>,
    revolutionOpportunities: Suit[],
    threateningSuits: Suit[],
  ): number {
    let score = 0;

    const healthDiff = playerState.currentPlayer.health - opponentState.currentPlayer.health;
    score += healthDiff * this.WEIGHTS.HEALTH_DIFF;

    Object.values(columnProgression).forEach(progress => {
      score += (progress / 100) * this.WEIGHTS.COLUMN_PROGRESS;
    });

    score += revolutionOpportunities.length * this.WEIGHTS.REVOLUTION_READY;

    score -= threateningSuits.length * 10;

    const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
    suits.forEach((suit) => {
      if (playerState.columns[suit]?.faceCards?.K) {
        score += this.WEIGHTS.KING_DEFENSE;
      }
    });

    return score;
  }

  shouldDefend(
    incomingAttack: { card: Card; suit: Suit },
    playerState: GameStateType,
  ): boolean {
    const playerHealth = playerState.currentPlayer.health;
    const isLifeThreatening = playerHealth <= 5;

    const hasJoker = [...playerState.currentPlayer.hand, ...playerState.currentPlayer.reserve]
      .some(card => card.type === 'JOKER');

    if (isLifeThreatening && hasJoker) {
      return true;
    }

    const targetColumn = playerState.columns[incomingAttack.suit];
    if (targetColumn && targetColumn.cards.length >= 7) {
      return true;
    }

    return false;
  }

  getCardValue(card: Card): number {
    const valueMap: Record<string, number> = {
      'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
      '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
    };

    if (card.type === 'JOKER') return 14;
    return valueMap[card.value] || 0;
  }
}
