# Exemples d'utilisation de l'IA UNIT

Ce document contient des exemples pratiques d'utilisation de l'IA.

## Exemple 1: Test simple de l'IA

```typescript
import { GameAIService } from './game-ai.service';
import { createDeck, shuffleDeck, drawCards } from '../utils/deck';

async function testAISetup() {
  const aiService = new GameAIService();

  // Créer un deck et piocher 7 cartes
  const deck = createDeck();
  const shuffled = shuffleDeck(deck);
  const [_, hand] = drawCards(shuffled, 7);

  console.log('Main initiale:', hand.map(c => `${c.value}${c.suit[0]}`).join(', '));

  // L'IA choisit 2 cartes pour la réserve
  const reserveCards = aiService.makeSetupDecision(hand);

  console.log('Cartes mises en réserve:', reserveCards.map(c => `${c.value}${c.suit[0]}`).join(', '));
}

testAISetup();
```

## Exemple 2: Simulation d'un tour complet

```typescript
import { GameAIService } from './game-ai.service';
import { GameState } from '../../types/game';

async function simulateAITurn() {
  const aiService = new GameAIService();

  // État du jeu simulé
  const playerState: GameState = {
    gameId: 'test-game',
    startAt: Date.now(),
    currentPlayer: {
      id: 'AI_1',
      name: 'AI Player',
      health: 15,
      maxHealth: 15,
      hand: [
        /* ... cartes ... */
      ],
      reserve: [
        /* ... cartes ... */
      ],
      discardPile: [],
      deck: [],
      hasUsedStrategicShuffle: false,
      profile: { epithet: 'AI', avatar: '' },
    },
    deck: [],
    phase: 'PLAY',
    turn: 3,
    selectedCards: [],
    selectedSacrificeCards: [],
    columns: {
      HEARTS: {
        cards: [
          /* As de coeur */
        ],
        isLocked: false,
        hasLuckyCard: true,
        activatorType: 'JOKER',
        sequence: [],
        reserveSuit: null,
        faceCards: {},
        attackStatus: {
          attackButtons: [],
          lastAttackCard: { cardValue: '', turn: 0 },
        },
      },
      // ... autres colonnes ...
    },
    hasDiscarded: true,
    hasDrawn: true,
    hasPlayedAction: false,
    isGameOver: false,
    gameOverReason: '',
    playedCardsLastTurn: 0,
    attackMode: false,
    message: '',
    hasUsedFirstStrategicShuffle: false,
    awaitingStrategicShuffleConfirmation: false,
    language: 'fr',
    canEndTurn: false,
    isMessageClickable: false,
    exchangeMode: false,
    selectedForExchange: null,
    showRevolutionPopup: false,
    canBlock: false,
    blockedColumns: [],
    showSacrificePopup: false,
    showJokerExchangePopup: false,
    showBlockPopup: false,
    showQueenChallengePopup: false,
    sacrificeInfo: null,
    availableCards: [],
    setupTimeInit: 40,
    messages: [],
  };

  const opponentState: GameState = {
    /* ... état de l'adversaire ... */
  };

  // L'IA décide de son action
  const decision = aiService.makeTurnDecision(playerState, opponentState);

  console.log('Décision de l\'IA:', decision);
  console.log('Action:', decision.action);
  console.log('Raisonnement:', decision.reasoning);

  if (decision.cards) {
    console.log(
      'Cartes utilisées:',
      decision.cards.map((c) => `${c.value}${c.suit[0]}`).join(', ')
    );
  }

  if (decision.suit) {
    console.log('Colonne cible:', decision.suit);
  }
}

simulateAITurn();
```

## Exemple 3: Test de défense

```typescript
import { GameAIService } from './game-ai.service';

async function testAIDefense() {
  const aiService = new GameAIService();

  const playerState: GameState = {
    /* ... état avec Joker en main ... */
    currentPlayer: {
      /* ... */
      health: 5, // PV critiques
      hand: [
        {
          id: 'joker-1',
          suit: 'SPECIAL',
          value: 'JOKER',
          type: 'JOKER',
          color: 'red',
        },
      ],
      /* ... */
    },
    /* ... */
  };

  const incomingAttack = {
    card: {
      id: 'valet-hearts',
      suit: 'HEARTS',
      value: 'J',
      type: 'STANDARD',
      color: 'red',
    },
    suit: 'HEARTS',
  };

  const defenseDecision = aiService.makeDefenseDecision(playerState, incomingAttack);

  console.log('Décision de défense:', defenseDecision);
  console.log('Va bloquer:', defenseDecision.willBlock);

  if (defenseDecision.blockingCard) {
    console.log(
      'Carte de blocage:',
      `${defenseDecision.blockingCard.value} ${defenseDecision.blockingCard.suit}`
    );
  }
}

testAIDefense();
```

## Exemple 4: Évaluation complète du jeu

```typescript
import { GameAIEvaluator } from './game-ai-evaluator';

async function evaluateGameState() {
  const evaluator = new GameAIEvaluator();

  const playerState: GameState = {
    /* ... */
    currentPlayer: {
      health: 12,
      maxHealth: 15,
      /* ... */
    },
    columns: {
      HEARTS: {
        cards: [
          /* As à 6 */
        ],
        reserveSuit: {
          /* 7 de coeur */
        },
        /* ... */
      },
      /* ... autres colonnes ... */
    },
    /* ... */
  };

  const opponentState: GameState = {
    /* ... état adverse ... */
  };

  const evaluation = evaluator.evaluateGameState(playerState, opponentState);

  console.log('📊 Évaluation du jeu:');
  console.log('Score global:', evaluation.score);
  console.log('Avantage joueur:', evaluation.playerAdvantage);
  console.log('PV joueur:', evaluation.playerHealth);
  console.log('PV adversaire:', evaluation.opponentHealth);
  console.log('\n📈 Progression des colonnes:');

  Object.entries(evaluation.columnProgression).forEach(([suit, progress]) => {
    console.log(`${suit}: ${progress.toFixed(1)}%`);
  });

  console.log('\n⚔️ Opportunités d\'attaque:', evaluation.attackOpportunities);
  console.log('🎯 Opportunités de Révolution:', evaluation.revolutionOpportunities);
  console.log('⚠️ Colonnes menaçantes:', evaluation.threateningSuits);
  console.log('🛡️ Colonnes défendables:', evaluation.defendableSuits);
  console.log('🃏 Qualité de la main:', evaluation.handQuality);
}

evaluateGameState();
```

## Exemple 5: Décision de sacrifice

```typescript
import { GameAIService } from './game-ai.service';

async function testSacrificeDecision() {
  const aiService = new GameAIService();

  const playerState: GameState = {
    /* ... état avec cartes sacrifiables ... */
    columns: {
      HEARTS: {
        cards: [
          { value: 'A' },
          { value: '2' },
          { value: '3' },
          { value: '4' }, // Carte la plus haute, sacrifiable
        ],
        /* ... */
      },
      DIAMONDS: {
        cards: [
          { value: 'A' },
          { value: '2' },
          { value: '3' },
          { value: '4' },
          { value: '5' }, // Carte la plus haute, sacrifiable
        ],
        /* ... */
      },
      CLUBS: {
        cards: [
          { value: 'A' },
          { value: '2' }, // Carte la plus haute, sacrifiable
        ],
        /* ... */
      },
      /* ... */
    },
    /* ... */
  };

  // Test pour invoquer un Roi (3 cartes)
  const kingDecision = aiService.shouldUseSacrifice(playerState, 'K');

  console.log('Décision pour invoquer un Roi:');
  console.log('Devrait sacrifier:', kingDecision.shouldSacrifice);

  if (kingDecision.cardsToSacrifice) {
    console.log(
      'Cartes à sacrifier:',
      kingDecision.cardsToSacrifice.map((c) => `${c.value}${c.suit[0]}`).join(', ')
    );
  }

  // Test pour invoquer une Dame (2 cartes)
  const queenDecision = aiService.shouldUseSacrifice(playerState, 'Q');

  console.log('\nDécision pour invoquer une Dame:');
  console.log('Devrait sacrifier:', queenDecision.shouldSacrifice);

  if (queenDecision.cardsToSacrifice) {
    console.log(
      'Cartes à sacrifier:',
      queenDecision.cardsToSacrifice.map((c) => `${c.value}${c.suit[0]}`).join(', ')
    );
  }

  // Test pour invoquer un Valet (1 carte: 8 ou 9)
  const jackDecision = aiService.shouldUseSacrifice(playerState, 'J');

  console.log('\nDécision pour invoquer un Valet:');
  console.log('Devrait sacrifier:', jackDecision.shouldSacrifice);

  if (jackDecision.cardsToSacrifice) {
    console.log(
      'Cartes à sacrifier:',
      jackDecision.cardsToSacrifice.map((c) => `${c.value}${c.suit[0]}`).join(', ')
    );
  }
}

testSacrificeDecision();
```

## Exemple 6: Utilisation du Joker

```typescript
import { GameAIService } from './game-ai.service';

async function testJokerUsage() {
  const aiService = new GameAIService();

  // Cas 1: PV bas → HEAL
  const lowHealthState: GameState = {
    /* ... */
    currentPlayer: {
      health: 4,
      maxHealth: 15,
      /* ... */
    },
    /* ... */
  };

  const opponentState: GameState = {
    /* ... */
  };

  let jokerDecision = aiService.evaluateJokerUse(lowHealthState, opponentState);
  console.log('PV bas (4/15) → Décision:', jokerDecision); // Expected: HEAL

  // Cas 2: Adversaire a une colonne avancée → ATTACK
  const threateningOpponent: GameState = {
    /* ... */
    columns: {
      HEARTS: {
        cards: Array(9).fill({ value: 'X' }), // 9 cartes
        /* ... */
      },
      /* ... */
    },
    /* ... */
  };

  jokerDecision = aiService.evaluateJokerUse(playerState, threateningOpponent);
  console.log('Adversaire avec 9 cartes → Décision:', jokerDecision); // Expected: ATTACK

  // Cas 3: Carte manquante dans une colonne → REPLACE
  const missingCardState: GameState = {
    /* ... */
    columns: {
      HEARTS: {
        cards: [
          /* As, 2, 3 */
        ],
        // Manque le 4 pour continuer
        /* ... */
      },
      /* ... */
    },
    /* ... */
  };

  jokerDecision = aiService.evaluateJokerUse(missingCardState, opponentState);
  console.log('Carte manquante dans colonne → Décision:', jokerDecision); // Expected: REPLACE

  // Cas 4: Situation stable → SAVE
  const stableState: GameState = {
    /* ... */
    currentPlayer: {
      health: 15,
      maxHealth: 15,
      /* ... */
    },
    /* ... */
  };

  const weakOpponent: GameState = {
    /* ... */
    columns: {
      HEARTS: { cards: [{ value: 'A' }] /* ... */ },
      DIAMONDS: { cards: [] /* ... */ },
      CLUBS: { cards: [] /* ... */ },
      SPADES: { cards: [] /* ... */ },
      /* ... */
    },
    /* ... */
  };

  jokerDecision = aiService.evaluateJokerUse(stableState, weakOpponent);
  console.log('Situation stable → Décision:', jokerDecision); // Expected: SAVE
}

testJokerUsage();
```

## Exemple 7: Test de mélange stratégique

```typescript
import { GameAIService } from './game-ai.service';

async function testStrategicShuffle() {
  const aiService = new GameAIService();

  // Cas 1: Deck presque vide
  const lowDeckState: GameState = {
    /* ... */
    currentPlayer: {
      deck: [
        /* Seulement 3 cartes */
      ],
      discardPile: [
        /* 15 cartes */
      ],
      /* ... */
    },
    /* ... */
  };

  const opponentState: GameState = {
    /* ... */
  };

  let shouldShuffle = aiService.shouldUseStrategicShuffle(lowDeckState, opponentState);
  console.log('Deck presque vide → Devrait mélanger:', shouldShuffle); // Expected: true

  // Cas 2: Main de mauvaise qualité
  const badHandState: GameState = {
    /* ... */
    turn: 5,
    currentPlayer: {
      hand: [
        { value: '2' /* ... */ },
        { value: '3' /* ... */ },
        { value: '4' /* ... */ },
      ],
      // Aucune carte importante
      /* ... */
    },
    /* ... */
  };

  shouldShuffle = aiService.shouldUseStrategicShuffle(badHandState, opponentState);
  console.log('Main de mauvaise qualité → Devrait mélanger:', shouldShuffle); // Expected: true (après tour 3)

  // Cas 3: Bon deck et bonne main
  const goodState: GameState = {
    /* ... */
    currentPlayer: {
      deck: [
        /* 25 cartes */
      ],
      hand: [
        { type: 'JOKER' /* ... */ },
        { value: 'A' /* ... */ },
        { value: 'K' /* ... */ },
      ],
      // Bonnes cartes
      /* ... */
    },
    /* ... */
  };

  shouldShuffle = aiService.shouldUseStrategicShuffle(goodState, opponentState);
  console.log('Deck et main bons → Devrait mélanger:', shouldShuffle); // Expected: false
}

testStrategicShuffle();
```

## Exemple 8: Simulation d'une partie complète

```typescript
import { GameAIService } from './game-ai.service';
import { GameAITurnManager } from './game-ai-turn-manager';

async function simulateFullGame() {
  // Créer un mock du service de jeu
  const mockGameService = {
    getGameState: async (gameId) => {
      /* ... retourner l'état du jeu ... */
    },
    handleMoveToReserve: async (gameId, playerId, card) => {
      console.log(`🎮 ${playerId} déplace ${card.value} vers la réserve`);
    },
    handleStartGame: async (gameId, playerId) => {
      console.log(`🎮 ${playerId} démarre le jeu`);
    },
    handleDiscard: async (gameId, playerId, card) => {
      console.log(`🎮 ${playerId} défausse ${card.value}`);
    },
    handleDrawCard: async (gameId, playerId) => {
      console.log(`🎮 ${playerId} pioche une carte`);
    },
    handleCardPlace: async (gameId, playerId, suit, cards) => {
      console.log(
        `🎮 ${playerId} pose ${cards.map((c) => c.value).join(', ')} sur ${suit}`
      );
    },
    handleAttack: async (gameId, playerId, attackCard, target) => {
      console.log(`🎮 ${playerId} attaque avec ${attackCard.value}`);
    },
    handlePassTurn: async (gameId, playerId) => {
      console.log(`🎮 ${playerId} passe son tour`);
    },
  };

  const aiTurnManager = new GameAITurnManager(mockGameService);

  const gameId = 'test-game-1';
  const aiPlayerId = 'AI_1';

  console.log('🎲 Démarrage de la simulation de partie...\n');

  // Phase SETUP
  console.log('📝 Phase SETUP');
  await aiTurnManager.handleAISetup(gameId, aiPlayerId);

  console.log('\n⏭️ Passage au tour 1...\n');

  // Tour 1
  console.log('🎯 Tour 1');
  await aiTurnManager.handleAITurn(gameId, aiPlayerId);

  console.log('\n⏭️ Passage au tour 2...\n');

  // Tour 2
  console.log('🎯 Tour 2');
  await aiTurnManager.handleAITurn(gameId, aiPlayerId);

  console.log('\n✅ Simulation terminée');
}

simulateFullGame();
```

## Notes d'utilisation

### Exécuter les exemples

Pour exécuter ces exemples:

```bash
# Dans le dossier server
cd /tmp/cc-agent/63066562/project/server

# Créer un fichier de test
echo "import { testAISetup } from './src/game/ai/EXAMPLE_USAGE';" > test-ai.ts

# Exécuter avec ts-node
npx ts-node test-ai.ts
```

### Modifier les exemples

Ces exemples sont des templates que vous pouvez adapter:

1. Modifiez les états de jeu pour tester différents scénarios
2. Ajoutez des logs pour mieux comprendre les décisions
3. Créez vos propres tests en vous inspirant de ces exemples

### Debug

Pour déboguer l'IA:

1. Activez les logs détaillés dans `game-ai.service.ts`
2. Utilisez `console.log` dans les méthodes de décision
3. Comparez les décisions de l'IA avec ce que vous feriez

## Ressources supplémentaires

- `README.md` - Architecture complète de l'IA
- `INTEGRATION_GUIDE.md` - Guide d'intégration pas à pas
- `game-ai-strategy.ts` - Logique de décision détaillée
- `game-ai-evaluator.ts` - Système d'évaluation
