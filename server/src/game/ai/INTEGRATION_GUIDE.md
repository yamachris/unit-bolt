# Guide d'intégration de l'IA dans UNIT

Ce guide explique comment intégrer complètement l'IA dans votre serveur de jeu UNIT.

## Étape 1: Importer les modules nécessaires

Dans `game.service.ts`, ajoutez ces imports:

```typescript
import { GameAIService } from './ai/game-ai.service';
import { GameAITurnManager } from './ai/game-ai-turn-manager';
```

## Étape 2: Initialiser l'IA dans le service

Dans le constructeur de `GameService`:

```typescript
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
    // Initialiser le gestionnaire de tours de l'IA
    this.aiTurnManager = new GameAITurnManager(this);
  }
}
```

## Étape 3: Modifier la création de jeu solo

Modifiez la méthode `createGame` pour ajouter automatiquement un joueur IA en mode solo:

```typescript
async createGame(mode: string, playersInfo: any[]): Promise<string> {
  const nbPlayers = mode === 'solo' ? 2 : playersInfo.length;
  const gameEntity = new GameEntity();
  gameEntity.state = this.initializeGame(mode, nbPlayers);
  gameEntity.game_mode = mode;

  // Ajouter le joueur humain
  gameEntity.state = this.addPlayer(
    gameEntity.state,
    playersInfo[0].playerId,
    playersInfo[0].socketId
  );

  // En mode solo, ajouter automatiquement un joueur IA
  if (mode === 'solo') {
    const aiPlayerId = `AI_${Date.now()}`;
    const aiSocketId = `AI_SOCKET_${Date.now()}`;
    gameEntity.state = this.addPlayer(gameEntity.state, aiPlayerId, aiSocketId);
  }

  // En mode multijoueur, ajouter le deuxième joueur humain
  if (playersInfo.length > 1 && mode === 'multiplayer') {
    gameEntity.state = this.addPlayer(
      gameEntity.state,
      playersInfo[1].playerId,
      playersInfo[1].socketId
    );
  }

  const savedGame = await this.gameRepository.save(gameEntity);

  // Créer un timer de setup pour le jeu
  await this.timerService.createTimer(
    savedGame.id,
    TimerType.SETUP,
    TIME_SETUP_LIMIT
  );

  return savedGame.id;
}
```

## Étape 4: Ajouter l'exécution automatique après chaque action

Créez une méthode utilitaire pour déclencher l'IA:

```typescript
async triggerAITurnIfNeeded(gameId: string): Promise<void> {
  const gameData = await this.getGameState(gameId);
  if (!gameData) return;

  const currentPlayerId = gameData.players[gameData.currentPlayerIndex];

  // Vérifier si c'est le tour de l'IA
  if (this.aiTurnManager.isAIPlayer(currentPlayerId)) {
    const currentPlayerState = gameData.playersGameStates[gameData.currentPlayerIndex];

    // Gérer la phase SETUP
    if (currentPlayerState.phase === 'SETUP') {
      await this.aiTurnManager.handleAISetup(gameId, currentPlayerId);
    }
    // Gérer les autres phases
    else {
      await this.aiTurnManager.handleAITurn(gameId, currentPlayerId);
    }
  }
}
```

## Étape 5: Appeler l'IA après chaque action du joueur

Modifiez chaque méthode d'action pour appeler l'IA après:

```typescript
async handleMoveToReserve(gameId: string, playerId: string, card: Card): Promise<Game | null> {
  // ... logique existante ...

  // Sauvegarder et retourner
  game.state = gameData;
  await this.gameRepository.save(game);

  // Déclencher l'IA si nécessaire
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}

async handleStartGame(gameId: string, playerId: string): Promise<Game | null> {
  // ... logique existante ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // Déclencher l'IA si nécessaire
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}

async handleDiscard(gameId: string, playerId: string, card: Card): Promise<Game | null> {
  // ... logique existante ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // Déclencher l'IA si nécessaire
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}

async handleDrawCard(gameId: string, playerId: string): Promise<Game | null> {
  // ... logique existante ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // Déclencher l'IA si nécessaire
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}

async handleCardPlace(gameId: string, playerId: string, suit: Suit, selectedCards: Card[]): Promise<Game | null> {
  // ... logique existante ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // Déclencher l'IA si nécessaire
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}

async handleAttack(gameId: string, playerId: string, attackCard: Card, attackTarget: AttackTarget): Promise<Game | null> {
  // ... logique existante ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // Déclencher l'IA si nécessaire
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

## Étape 6: Gérer les événements de défense

Modifiez le système de blocage pour que l'IA réponde automatiquement:

```typescript
async requestBlockFromOpponent(
  gameId: string,
  attackingPlayerId: string,
  attackCard: Card,
  attackTarget: AttackTarget
): Promise<void> {
  const gameData = await this.getGameState(gameId);
  if (!gameData) return;

  const opponentIndex = gameData.players.indexOf(attackingPlayerId) === 0 ? 1 : 0;
  const opponentId = gameData.players[opponentIndex];

  // Si l'adversaire est l'IA, répondre automatiquement
  if (this.aiTurnManager.isAIPlayer(opponentId)) {
    await this.aiTurnManager.handleAIDefense(
      gameId,
      opponentId,
      { card: attackCard, suit: attackTarget.suit }
    );
  } else {
    // Sinon, envoyer une requête au joueur humain
    // ... logique existante pour notifier le joueur ...
  }
}
```

## Étape 7: Gérer le défi de la Dame

Modifiez `handleQueenChallenge` pour que l'IA réponde automatiquement:

```typescript
async handleQueenChallenge(gameId: string, playerId: string, selectedCards: Card[]): Promise<GameType | null> {
  // ... logique existante jusqu'au point où on demande à l'adversaire de deviner ...

  const opponentId = gameData.players[opponentPlayerIndex];

  // Si l'adversaire est l'IA
  if (this.aiTurnManager.isAIPlayer(opponentId)) {
    await this.aiTurnManager.handleAIQueenChallenge(gameId, opponentId);
  } else {
    // Demander au joueur humain
    // ... logique existante ...
  }

  return game.state;
}
```

## Étape 8: Configuration du client

Dans le client, assurez-vous de gérer correctement les joueurs IA:

```typescript
// Dans votre composant de jeu
useEffect(() => {
  // Ne pas afficher de notification pour les actions de l'IA
  if (currentPlayerId.startsWith('AI_')) {
    // C'est le tour de l'IA, pas besoin de notification
    return;
  }

  // Afficher les notifications uniquement pour le joueur humain
}, [currentPlayerId]);
```

## Étape 9: Tests

Pour tester l'IA:

1. Créer une partie en mode solo
2. Vérifier que l'IA joue automatiquement après chaque action
3. Observer les logs serveur (préfixe 🤖) pour voir les décisions de l'IA

```bash
# Dans le terminal serveur, vous devriez voir:
🤖 AI: Making setup decision...
🤖 AI: Selected 2 cards for reserve
🤖 AI: Making turn decision...
🤖 AI: Phase: PLAY
🤖 AI: Decision: PLACE_CARD
🤖 AI: Reasoning: Continue building HEARTS column with 4
```

## Étape 10: Ajustements et optimisation

### Délais entre les actions de l'IA

Pour rendre le jeu plus naturel, l'IA attend entre chaque action:

```typescript
// Dans game-ai-turn-manager.ts
await new Promise(resolve => setTimeout(resolve, 500)); // 500ms entre chaque action
await new Promise(resolve => setTimeout(resolve, 1000)); // 1s avant de passer le tour
```

Vous pouvez ajuster ces valeurs selon vos préférences.

### Ajuster la difficulté

Pour rendre l'IA plus facile ou plus difficile, modifiez les poids dans `game-ai-evaluator.ts`:

```typescript
private readonly WEIGHTS = {
  HEALTH_DIFF: 10,          // ↓ Diminuer pour une IA moins défensive
  COLUMN_PROGRESS: 5,       // ↑ Augmenter pour une IA plus agressive
  REVOLUTION_READY: 100,    // Priorité des révolutions
  JOKER_VALUE: 20,          // ↓ Diminuer pour que l'IA utilise les Jokers plus facilement
  // ...
};
```

## Résumé des modifications nécessaires

1. ✅ Ajouter `GameAITurnManager` dans `GameService`
2. ✅ Modifier `createGame` pour ajouter l'IA en mode solo
3. ✅ Créer `triggerAITurnIfNeeded`
4. ✅ Appeler `triggerAITurnIfNeeded` après chaque action
5. ✅ Gérer les défenses de l'IA
6. ✅ Gérer les défis de la Dame pour l'IA
7. ✅ Configurer le client pour les joueurs IA

## Dépannage

### L'IA ne joue pas

- Vérifier que le joueur IA a un ID commençant par `AI_`
- Vérifier les logs serveur pour les erreurs
- S'assurer que `triggerAITurnIfNeeded` est appelé après chaque action

### L'IA joue trop vite

- Augmenter les délais dans `game-ai-turn-manager.ts`

### L'IA fait des erreurs

- Vérifier les logs de décision (préfixe 🤖)
- Ajuster les poids dans `game-ai-evaluator.ts`
- Vérifier que toutes les règles sont correctement implémentées

## Support

Pour plus d'informations, consultez:
- `README.md` - Architecture de l'IA
- `game-ai.service.ts` - Service principal
- `game-ai-strategy.ts` - Logique de décision
- `game-ai-evaluator.ts` - Évaluation du jeu
