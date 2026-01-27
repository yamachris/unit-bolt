import { Card, GameState as GameStateType, Suit, ColumnState, TargetAttackType } from '../../types/game';
import { GameAIEvaluator, GameEvaluation } from './game-ai-evaluator';

export interface AIDecision {
  action: 'SETUP' | 'DISCARD' | 'DRAW' | 'PLACE_CARD' | 'ATTACK' | 'USE_SPECIAL' | 'END_TURN' | 'SACRIFICE' | 'DEFEND';
  cards?: Card[];
  suit?: Suit;
  target?: TargetAttackType;
  reasoning?: string;
}

export class GameAIStrategy {
  private evaluator: GameAIEvaluator;

  constructor() {
    this.evaluator = new GameAIEvaluator();
  }

  decideSetupCards(hand: Card[]): Card[] {
    const priorities = hand.map(card => ({
      card,
      priority: this.calculateSetupPriority(card),
    }));

    priorities.sort((a, b) => a.priority - b.priority);

    return priorities.slice(0, 2).map(p => p.card);
  }

  private calculateSetupPriority(card: Card): number {
    if (card.type === 'JOKER') return 1;
    if (card.value === 'A') return 2;
    if (card.value === '7') return 3;
    if (card.value === 'K') return 4;
    if (card.value === 'Q') return 5;
    if (card.value === 'J') return 6;
    if (card.value === '10') return 7;
    if (card.value === '9') return 8;
    if (card.value === '8') return 9;

    const numValue = parseInt(card.value);
    if (!isNaN(numValue)) {
      return 10 + numValue;
    }

    return 20;
  }

  decideDiscard(
    playerState: GameStateType,
    evaluation: GameEvaluation,
  ): Card | null {
    const hand = playerState.currentPlayer.hand;
    if (hand.length === 0) return null;

    const cardsByValue = hand.map(card => ({
      card,
      value: this.calculateDiscardValue(card, playerState, evaluation),
    }));

    cardsByValue.sort((a, b) => a.value - b.value);

    return cardsByValue[0].card;
  }

  private calculateDiscardValue(
    card: Card,
    playerState: GameStateType,
    evaluation: GameEvaluation,
  ): number {
    if (card.type === 'JOKER') return 1000;
    if (card.value === 'A') return 900;
    if (card.value === '7') return 850;
    if (card.value === 'K') return 800;
    if (card.value === 'Q') return 750;
    if (card.value === 'J') return 700;

    if (card.value === '10') {
      const column = playerState.columns[card.suit];
      if (column && column.cards.length === 9) {
        return 950;
      }
      return 100;
    }

    const column = playerState.columns[card.suit];
    if (column && column.cards.length > 0) {
      const nextExpectedValue = this.getNextExpectedCard(column);
      if (nextExpectedValue === card.value) {
        return 600;
      }
    }

    const numValue = parseInt(card.value);
    if (!isNaN(numValue)) {
      return 50 + numValue * 10;
    }

    return 50;
  }

  private getNextExpectedCard(column: ColumnState): string | null {
    if (!column.cards || column.cards.length === 0) return 'A';

    const lastCard = column.cards[column.cards.length - 1];
    const valueMap: Record<string, string> = {
      'A': '2', '2': '3', '3': '4', '4': '5', '5': '6',
      '6': '7', '7': '8', '8': '9', '9': '10', '10': null,
    };

    return valueMap[lastCard.value] || null;
  }

  decideNextAction(
    playerState: GameStateType,
    opponentState: GameStateType,
    evaluation: GameEvaluation,
  ): AIDecision {
    if (evaluation.revolutionOpportunities.length > 0) {
      const suit = evaluation.revolutionOpportunities[0];
      const column = playerState.columns[suit];
      if (column && column.cards.length === 9) {
        const tenCard = this.findCard(playerState, '10', suit);
        if (tenCard) {
          return {
            action: 'PLACE_CARD',
            cards: [tenCard],
            suit,
            reasoning: `Revolution ready on ${suit}!`,
          };
        }
      }
    }

    const buildAction = this.decideBuildColumn(playerState, opponentState, evaluation);
    if (buildAction) return buildAction;

    const specialAction = this.decideSpecialCard(playerState, opponentState, evaluation);
    if (specialAction) return specialAction;

    const attackAction = this.decideAttack(playerState, opponentState, evaluation);
    if (attackAction) return attackAction;

    return {
      action: 'END_TURN',
      reasoning: 'No beneficial action available',
    };
  }

  private decideBuildColumn(
    playerState: GameStateType,
    opponentState: GameStateType,
    evaluation: GameEvaluation,
  ): AIDecision | null {
    const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];

    for (const suit of suits) {
      const column = playerState.columns[suit];

      if (!column.cards || column.cards.length === 0) {
        const ace = this.findCard(playerState, 'A', suit);
        const activator = this.findActivator(playerState);

        if (ace && activator) {
          return {
            action: 'PLACE_CARD',
            cards: [ace, activator],
            suit,
            reasoning: `Start new column on ${suit}`,
          };
        }
      } else {
        const nextValue = this.getNextExpectedCard(column);
        if (nextValue) {
          if (nextValue === '7' && column.cards.length === 6) {
            if (column.reserveSuit) {
              return {
                action: 'PLACE_CARD',
                cards: [],
                suit,
                reasoning: `Place 7 from reserve to column on ${suit}`,
              };
            } else {
              const seven = this.findCard(playerState, '7', suit);
              if (seven) {
                return {
                  action: 'PLACE_CARD',
                  cards: [seven],
                  suit,
                  reasoning: `Place 7 to activate column on ${suit}`,
                };
              }
            }
          } else {
            const nextCard = this.findCard(playerState, nextValue, suit);
            if (nextCard) {
              if (column.cards.length >= 6 && !column.reserveSuit) {
                return null;
              }

              return {
                action: 'PLACE_CARD',
                cards: [nextCard],
                suit,
                reasoning: `Continue building ${suit} column with ${nextValue}`,
              };
            }
          }
        }
      }
    }

    return null;
  }

  private decideSpecialCard(
    playerState: GameStateType,
    opponentState: GameStateType,
    evaluation: GameEvaluation,
  ): AIDecision | null {
    if (playerState.currentPlayer.health < playerState.currentPlayer.maxHealth * 0.5) {
      const queen = this.findSpecialCard(playerState, 'Q');
      const activator = this.findActivator(playerState);

      if (queen && activator) {
        return {
          action: 'USE_SPECIAL',
          cards: [queen, activator],
          suit: queen.suit,
          reasoning: 'Heal with Queen',
        };
      }

      const joker = this.findJoker(playerState);
      if (joker) {
        return {
          action: 'USE_SPECIAL',
          cards: [joker],
          reasoning: 'Heal with Joker',
        };
      }
    }

    if (evaluation.threateningSuits.length > 0) {
      const threateningSuit = evaluation.threateningSuits[0];
      const king = this.findSpecialCard(playerState, 'K');
      const activator = this.findActivator(playerState);

      if (king && king.suit === threateningSuit && activator) {
        return {
          action: 'USE_SPECIAL',
          cards: [king, activator],
          suit: threateningSuit,
          reasoning: `Defend with King on ${threateningSuit}`,
        };
      }
    }

    return null;
  }

  private decideAttack(
    playerState: GameStateType,
    opponentState: GameStateType,
    evaluation: GameEvaluation,
  ): AIDecision | null {
    if (evaluation.attackOpportunities === 0) return null;

    const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];

    for (const suit of suits) {
      const column = playerState.columns[suit];
      if (!column) continue;

      const valet = column.faceCards?.J;
      if (valet) {
        const opponentColumn = opponentState.columns[suit];
        if (opponentColumn && opponentColumn.cards.length > 0) {
          return {
            action: 'ATTACK',
            cards: [valet],
            suit,
            target: {
              suit,
              valid: true,
            },
            reasoning: `Attack with Valet on ${suit}`,
          };
        }
      }

      if (column.attackStatus) {
        const activeButton = column.attackStatus.attackButtons.find(
          btn => btn.active && !btn.wasUsed
        );

        if (activeButton) {
          const attackCard = column.cards.find(c => c.value === activeButton.id);
          if (attackCard) {
            return {
              action: 'ATTACK',
              cards: [attackCard],
              suit,
              target: {
                suit,
                cardValue: activeButton.id,
                valid: true,
              },
              reasoning: `Attack with ${activeButton.id} from ${suit}`,
            };
          }
        }
      }
    }

    return null;
  }

  decideDefense(
    playerState: GameStateType,
    incomingAttack: { card: Card; suit: Suit },
  ): Card | null {
    const shouldDefend = this.evaluator.shouldDefend(incomingAttack, playerState);

    if (!shouldDefend) return null;

    const joker = this.findJoker(playerState);
    if (joker) return joker;

    const targetColumn = playerState.columns[incomingAttack.suit];
    if (targetColumn) {
      const seven = targetColumn.cards.find(card => card.value === '7' && !card.hasDefended);
      if (seven) return seven;
    }

    return null;
  }

  private findCard(playerState: GameStateType, value: string, suit: Suit): Card | null {
    const allCards = [...playerState.currentPlayer.hand, ...playerState.currentPlayer.reserve];

    return allCards.find(card => card.value === value && (card.suit === suit || card.suit === suit as string)) || null;
  }

  private findActivator(playerState: GameStateType): Card | null {
    const allCards = [...playerState.currentPlayer.hand, ...playerState.currentPlayer.reserve];

    const joker = allCards.find(card => card.type === 'JOKER');
    if (joker) return joker;

    const seven = allCards.find(card => card.value === '7');
    return seven || null;
  }

  private findJoker(playerState: GameStateType): Card | null {
    const allCards = [...playerState.currentPlayer.hand, ...playerState.currentPlayer.reserve];
    return allCards.find(card => card.type === 'JOKER') || null;
  }

  private findSpecialCard(playerState: GameStateType, value: string): Card | null {
    const allCards = [...playerState.currentPlayer.hand, ...playerState.currentPlayer.reserve];
    return allCards.find(card => card.value === value) || null;
  }
}
