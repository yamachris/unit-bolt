# Modifications nécessaires pour intégrer l'IA

Ce document liste TOUTES les modifications à apporter aux fichiers existants pour intégrer l'IA.

## ✅ Modifications déjà effectuées

### 1. game.module.ts
**Fichier**: `server/src/game/game.module.ts`
**Statut**: ✅ DÉJÀ MODIFIÉ

```typescript
import { GameAIService } from './ai/game-ai.service'; // Ajouté

@Module({
  imports: [TypeOrmModule.forFeature([Game, Player, MatchmakingQueue, GameTimer]), AuthModule],
  providers: [GameService, GameGateway, TimerService, GameAIService], // GameAIService ajouté
  controllers: [GameController],
})
export class GameModule {}
```

## 🔧 Modifications à effectuer

### 2. game.service.ts
**Fichier**: `server/src/game/game.service.ts`
**Statut**: ⏳ À MODIFIER

#### 2.1. Ajouter les imports (en haut du fichier)

```typescript
import { GameAITurnManager } from './ai/game-ai-turn-manager';
```

#### 2.2. Ajouter la propriété privée dans la classe

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
    // ⭐ Ajouter cette ligne
    this.aiTurnManager = new GameAITurnManager(this);
  }

  // ... reste du code ...
}
```

#### 2.3. Ajouter la méthode triggerAITurnIfNeeded (après le constructeur)

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

#### 2.4. Modifier la méthode createGame

```typescript
async createGame(mode: string, playersInfo: any[]): Promise<string> {
  // ⭐ Modifier cette ligne
  const nbPlayers = mode === 'solo' ? 2 : playersInfo.length; // Au lieu de: playersInfo.length

  const gameEntity = new GameEntity();
  gameEntity.state = this.initializeGame(mode, nbPlayers);
  gameEntity.game_mode = mode;

  // Ajouter le joueur humain
  gameEntity.state = this.addPlayer(
    gameEntity.state,
    playersInfo[0].playerId,
    playersInfo[0].socketId
  );

  // ⭐ Ajouter ce bloc
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

#### 2.5. Ajouter l'appel à triggerAITurnIfNeeded dans TOUTES les méthodes d'action

Cherchez et modifiez ces méthodes (ajoutez l'appel juste avant le `return`):

##### handleMoveToReserve

```typescript
async handleMoveToReserve(gameId: string, playerId: string, card: Card): Promise<Game | null> {
  // ... code existant ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Ajouter cette ligne
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

##### handleStartGame

```typescript
async handleStartGame(gameId: string, playerId: string): Promise<Game | null> {
  // ... code existant ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Ajouter cette ligne
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

##### handleDiscard

```typescript
async handleDiscard(gameId: string, playerId: string, card: Card): Promise<Game | null> {
  // ... code existant ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Ajouter cette ligne
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

##### handleDrawCard

```typescript
async handleDrawCard(gameId: string, playerId: string): Promise<Game | null> {
  // ... code existant ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Ajouter cette ligne
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

##### handleCardPlace

```typescript
async handleCardPlace(gameId: string, playerId: string, suit: Suit, selectedCards: Card[]): Promise<Game | null> {
  // ... code existant ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Ajouter cette ligne
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

##### handleJokerAction

```typescript
async handleJokerAction(gameId: string, playerId: string, jokerCard: Card, action: string): Promise<Game | null> {
  // ... code existant ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Ajouter cette ligne
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

##### handleQueenChallenge

```typescript
async handleQueenChallenge(gameId: string, playerId: string, selectedCards: Card[]): Promise<GameType | null> {
  // ... code existant ...

  // ⭐ Modifier le bloc qui demande à l'adversaire de deviner
  const opponentId = gameData.players[opponentPlayerIndex];

  // Si l'adversaire est l'IA, répondre automatiquement
  if (this.aiTurnManager.isAIPlayer(opponentId)) {
    await this.aiTurnManager.handleAIQueenChallenge(gameId, opponentId);
  } else {
    // Demander au joueur humain (code existant)
    // ...
  }

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Ajouter cette ligne
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

##### handleAttack

```typescript
async handleAttack(gameId: string, playerId: string, attackCard: Card, attackTarget: AttackTarget): Promise<Game | null> {
  // ... code existant ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Ajouter cette ligne
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

##### handleSacrificeSpecialCard

```typescript
async handleSacrificeSpecialCard(
  gameId: string,
  playerId: string,
  specialCard: Card,
  selectedCards: Card[]
): Promise<Game | null> {
  // ... code existant ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Ajouter cette ligne
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

##### handleActivatorExchange

```typescript
async handleActivatorExchange(
  gameId: string,
  playerId: string,
  columnCard: Card,
  playerCard: Card
): Promise<Game | null> {
  // ... code existant ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Ajouter cette ligne
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

##### handleJokerExchange

```typescript
async handleJokerExchange(gameId: string, playerId: string, selectedCard: Card): Promise<Game | null> {
  // ... code existant ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Ajouter cette ligne
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

##### handleBlockResponse

```typescript
async handleBlockResponse(
  gameId: string,
  playerId: string,
  willBlock: boolean,
  blockingCard?: Card
): Promise<Game | null> {
  // ... code existant ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Ajouter cette ligne
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

##### handleStrategicShuffle

```typescript
async handleStrategicShuffle(gameId: string, playerId: string): Promise<Game | null> {
  // ... code existant ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Ajouter cette ligne
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

##### handleRecycleDiscardPile

```typescript
async handleRecycleDiscardPile(gameId: string, playerId: string): Promise<Game | null> {
  // ... code existant ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Ajouter cette ligne
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

##### handleExchangeCards

```typescript
async handleExchangeCards(
  gameId: string,
  playerId: string,
  card1: Card,
  card2: Card
): Promise<Game | null> {
  // ... code existant ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Ajouter cette ligne
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}
```

#### 2.6. Modifier la gestion des requêtes de blocage

Si vous avez une méthode qui envoie une requête de blocage à l'adversaire, modifiez-la:

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

  // ⭐ Ajouter ce bloc
  // Si l'adversaire est l'IA, répondre automatiquement
  if (this.aiTurnManager.isAIPlayer(opponentId)) {
    await this.aiTurnManager.handleAIDefense(
      gameId,
      opponentId,
      { card: attackCard, suit: attackTarget.suit }
    );
    return;
  }

  // Sinon, envoyer une requête au joueur humain (code existant)
  // ...
}
```

## 📋 Checklist

Avant de tester, assurez-vous que:

- [ ] `game.module.ts` inclut `GameAIService` dans les providers
- [ ] `game.service.ts` importe `GameAITurnManager`
- [ ] `game.service.ts` initialise `aiTurnManager` dans le constructeur
- [ ] La méthode `triggerAITurnIfNeeded` est ajoutée
- [ ] La méthode `createGame` crée un joueur IA en mode solo
- [ ] TOUTES les méthodes d'action appellent `triggerAITurnIfNeeded`
- [ ] La gestion du défi de la Dame détecte les joueurs IA
- [ ] La gestion des blocages détecte les joueurs IA

## 🧪 Test rapide

Après avoir fait ces modifications:

1. Démarrez le serveur
2. Créez une partie en mode solo
3. Regardez les logs serveur - vous devriez voir:
   ```
   🤖 AI: Making setup decision...
   🤖 AI: Selected 2 cards for reserve
   ```

4. Jouez un tour - l'IA devrait jouer automatiquement après vous

## 🔍 Vérification des modifications

Pour vérifier que tout est en place:

```bash
# Dans le dossier server
cd /tmp/cc-agent/63066562/project/server

# Vérifier que GameAIService est importé
grep -n "GameAIService" src/game/game.module.ts

# Vérifier que GameAITurnManager est importé
grep -n "GameAITurnManager" src/game/game.service.ts

# Vérifier que triggerAITurnIfNeeded est appelé
grep -n "triggerAITurnIfNeeded" src/game/game.service.ts
```

## 💡 Conseils

- Faites les modifications une par une
- Testez après chaque modification majeure
- Utilisez les logs (🤖) pour déboguer
- Consultez les autres fichiers de documentation si besoin

## 📞 Support

Si vous rencontrez des problèmes:

1. Vérifiez les logs serveur
2. Consultez `INTEGRATION_GUIDE.md` pour plus de détails
3. Regardez `EXAMPLE_USAGE.md` pour des exemples de test
4. Vérifiez que toutes les modifications sont appliquées

---

**Une fois toutes ces modifications effectuées, l'IA sera fonctionnelle! 🎉**
