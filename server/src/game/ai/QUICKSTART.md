# 🤖 IA UNIT - Démarrage Rapide

## 📦 Ce qui a été créé

Une IA complète et intelligente capable de jouer à UNIT en respectant toutes vos règles de jeu.

### Fichiers créés

```
server/src/game/ai/
├── game-ai-evaluator.ts      # Évalue l'état du jeu et calcule les scores
├── game-ai-strategy.ts        # Détermine les actions stratégiques
├── game-ai.service.ts         # Service principal orchestrant l'IA
├── game-ai-controller.ts      # Contrôleur traduisant les décisions en actions
├── game-ai-turn-manager.ts    # Gestionnaire automatisant les tours de l'IA
├── README.md                  # Documentation complète de l'architecture
├── INTEGRATION_GUIDE.md       # Guide pas à pas pour l'intégration
├── EXAMPLE_USAGE.md           # Exemples d'utilisation
└── QUICKSTART.md              # Ce fichier
```

## 🎯 Capacités de l'IA

L'IA comprend et applique TOUTES vos règles:

✅ **Phase Setup** - Choisit intelligemment 2 cartes pour la réserve
✅ **Construction** - Bâtit des colonnes stratégiquement (As → 10)
✅ **Activation** - Utilise 7 de chance et Jokers pour activer les colonnes
✅ **Révolution** - Priorise et exécute les Révolutions quand possible
✅ **Attaque** - Attaque avec unités, Valet, Joker au bon moment
✅ **Défense** - Bloque les attaques avec Joker ou 7 de chance
✅ **Cartes spéciales** - Utilise Roi (défense), Dame (soin), Valet (destruction)
✅ **Sacrifice** - Sacrifie des cartes pour invoquer les têtes de jeu
✅ **Gestion du Joker** - Décide quand utiliser le Joker (attaque/soin/remplacement/sauver)
✅ **Mélange stratégique** - Utilise le mélange quand c'est avantageux
✅ **Défi de la Dame** - Répond aux défis de la Dame

## 🚀 Démarrage en 3 étapes

### 1. Activer l'IA dans le module

Fichier déjà modifié: `server/src/game/game.module.ts`

```typescript
import { GameAIService } from './ai/game-ai.service';
// ...
providers: [GameService, GameGateway, TimerService, GameAIService],
```

### 2. Intégrer dans GameService

Dans `server/src/game/game.service.ts`, ajoutez:

```typescript
import { GameAITurnManager } from './ai/game-ai-turn-manager';

export class GameService {
  private aiTurnManager: GameAITurnManager;

  constructor(...) {
    // ... constructeur existant ...
    this.aiTurnManager = new GameAITurnManager(this);
  }

  // Ajouter cette méthode
  async triggerAITurnIfNeeded(gameId: string): Promise<void> {
    const gameData = await this.getGameState(gameId);
    if (!gameData) return;

    const currentPlayerId = gameData.players[gameData.currentPlayerIndex];

    if (this.aiTurnManager.isAIPlayer(currentPlayerId)) {
      const currentPlayerState = gameData.playersGameStates[gameData.currentPlayerIndex];

      if (currentPlayerState.phase === 'SETUP') {
        await this.aiTurnManager.handleAISetup(gameId, currentPlayerId);
      } else {
        await this.aiTurnManager.handleAITurn(gameId, currentPlayerId);
      }
    }
  }
}
```

### 3. Créer un joueur IA en mode solo

Modifiez la méthode `createGame` pour ajouter automatiquement l'IA:

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

  // ⭐ Ajouter automatiquement l'IA en mode solo
  if (mode === 'solo') {
    const aiPlayerId = `AI_${Date.now()}`;
    const aiSocketId = `AI_SOCKET_${Date.now()}`;
    gameEntity.state = this.addPlayer(gameEntity.state, aiPlayerId, aiSocketId);
  }

  // ... reste du code ...
}
```

### 4. Déclencher l'IA après chaque action

Ajoutez à la fin de CHAQUE méthode d'action:

```typescript
// Exemple: handleMoveToReserve
async handleMoveToReserve(gameId: string, playerId: string, card: Card): Promise<Game | null> {
  // ... code existant ...

  game.state = gameData;
  await this.gameRepository.save(game);

  // ⭐ Déclencher l'IA
  await this.triggerAITurnIfNeeded(gameId);

  return game.state;
}

// Répéter pour:
// - handleStartGame
// - handleDiscard
// - handleDrawCard
// - handleCardPlace
// - handleAttack
// - handleJokerAction
// - handleQueenChallenge
// - etc.
```

## 🧪 Tester l'IA

1. Démarrez le serveur:
   ```bash
   cd server
   npm run start:dev
   ```

2. Créez une partie en mode solo depuis le client

3. Observez les logs serveur (préfixe 🤖):
   ```
   🤖 AI: Making setup decision...
   🤖 AI: Selected 2 cards for reserve
   🤖 AI: Making turn decision...
   🤖 AI: Phase: PLAY
   🤖 AI: Decision: PLACE_CARD
   🤖 AI: Reasoning: Continue building HEARTS column with 4
   ```

## ⚙️ Configuration

### Ajuster la difficulté

Dans `game-ai-evaluator.ts`, modifiez les poids:

```typescript
private readonly WEIGHTS = {
  HEALTH_DIFF: 10,      // ↓ Diminuer = IA moins défensive
  COLUMN_PROGRESS: 5,   // ↑ Augmenter = IA plus agressive
  REVOLUTION_READY: 100,// Priorité des révolutions
  JOKER_VALUE: 20,      // ↓ Diminuer = utilise Jokers plus facilement
};
```

### Ajuster la vitesse

Dans `game-ai-turn-manager.ts`, modifiez les délais:

```typescript
await new Promise(resolve => setTimeout(resolve, 500));  // Entre actions
await new Promise(resolve => setTimeout(resolve, 1000)); // Avant fin de tour
```

## 📖 Documentation complète

- **README.md** - Architecture détaillée de l'IA
- **INTEGRATION_GUIDE.md** - Guide d'intégration complet avec exemples
- **EXAMPLE_USAGE.md** - 8 exemples d'utilisation pratiques

## 🐛 Dépannage rapide

### L'IA ne joue pas
- ✅ Vérifier que l'ID du joueur commence par `AI_`
- ✅ Vérifier que `triggerAITurnIfNeeded` est appelé après chaque action
- ✅ Regarder les logs serveur pour les erreurs

### L'IA fait des erreurs
- ✅ Consulter les logs de décision (🤖)
- ✅ Vérifier que toutes les règles sont implémentées côté serveur
- ✅ Ajuster les poids dans `game-ai-evaluator.ts`

### L'IA joue trop vite/lentement
- ✅ Ajuster les `setTimeout` dans `game-ai-turn-manager.ts`

## 🎮 Prochaines étapes

1. **Tester en profondeur** - Jouez contre l'IA pour identifier les bugs
2. **Ajuster la difficulté** - Modifiez les poids selon vos besoins
3. **Ajouter des variantes** - Créez différents profils d'IA (agressif, défensif, etc.)
4. **Optimiser** - Améliorez les décisions basées sur les parties réelles

## 💡 Points clés

- L'IA respecte TOUTES vos règles de jeu
- Elle joue automatiquement quand c'est son tour
- Elle prend des décisions stratégiques intelligentes
- Elle s'adapte à l'état du jeu en temps réel
- Elle est entièrement personnalisable

## ✨ Caractéristiques avancées

- **Évaluation contextuelle** - Analyse l'état complet du jeu
- **Décisions multi-critères** - Pèse plusieurs facteurs simultanément
- **Anticipation** - Identifie les menaces et opportunités
- **Adaptation** - Change de stratégie selon la situation
- **Logging détaillé** - Permet de comprendre chaque décision

## 🎯 Résultat

Vous avez maintenant une IA complète, intelligente et configurable qui:
- ✅ Joue selon toutes vos règles
- ✅ Prend des décisions stratégiques
- ✅ S'intègre facilement dans votre jeu
- ✅ Est entièrement documentée
- ✅ Peut être testée et améliorée

**L'IA est prête à jouer! 🎉**

---

Pour plus de détails, consultez les autres fichiers de documentation dans ce dossier.
