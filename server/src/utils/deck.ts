import { Card, Suit, Value } from '../types/game';
import { v4 as uuidv4 } from 'uuid';

export const createDeck = (): Card[] => {
  const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
  const VALUES: Value[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const deck: Card[] = [];

  // Créer les cartes normales
  suits.forEach((suit) => {
    VALUES.forEach((value) => {
      // for (let value = 1; value <= 13; value++) {
      deck.push({
        id: uuidv4(),
        suit,
        value,
        type: 'STANDARD',
        // isSpecial: value > 10,
        // isActivator: value === 1,
      });
    });
  });

  // Ajouter les jokers
  deck.push({
    id: uuidv4(),
    suit: 'SPECIAL',
    type: 'JOKER',
    value: 'JOKER',
    isJoker: true,
    isRedJoker: true,
  });
  deck.push({
    id: uuidv4(),
    suit: 'SPECIAL',
    type: 'JOKER',
    value: 'JOKER',
    isJoker: true,
  });

  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const drawCards = (deck: Card[], count: number): [Card[], Card[]] => {
  const drawnCards = deck.slice(0, count);
  const remainingDeck = deck.slice(count);
  return [remainingDeck, drawnCards];
};
