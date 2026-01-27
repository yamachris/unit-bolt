# UNIT Game AI System

## Architecture

L'IA du jeu UNIT est composée de plusieurs modules:

### 1. GameAIEvaluator (`game-ai-evaluator.ts`)
Évalue l'état actuel du jeu et calcule des scores pour aider à la prise de décision.

**Fonctionnalités principales:**
- Évaluation de la progression des colonnes
- Détection des opportunités de Révolution
- Identification des menaces adverses
- Évaluation de la qualité de la main
- Calcul du score global du jeu

### 2. GameAIStrategy (`game-ai-strategy.ts`)
Détermine les actions stratégiques à prendre basées sur l'évaluation du jeu.

**Décisions principales:**
- Sélection des cartes pour la réserve (phase SETUP)
- Choix de la carte à défausser
- Construction stratégique des colonnes
- Utilisation des cartes spéciales (Roi, Dame, Valet)
- Décisions d'attaque et de défense
- Utilisation optimale du Joker

### 3. GameAIService (`game-ai.service.ts`)
Service principal orchestrant tous les modules de l'IA.

**Méthodes publiques:**
- `makeSetupDecision(hand: Card[]): Card[]` - Choisit les cartes pour la réserve
- `makeDiscardDecision(playerState, opponentState): Card` - Choisit la carte à défausser
- `makeTurnDecision(playerState, opponentState): AIDecision` - Décide de l'action à effectuer
- `makeDefenseDecision(playerState, incomingAttack): {willBlock, blockingCard}` - Décide de bloquer une attaque
- `makeQueenChallengeDecision(): {suit, color}` - Répond au défi de la Dame
- `shouldUseStrategicShuffle(playerState, opponentState): boolean` - Décide d'utiliser le mélange stratégique

### 4. GameAIController (`game-ai-controller.ts`)
Contrôleur qui traduit les décisions de l'IA en actions concrètes.

### 5. GameAITurnManager (`game-ai-turn-manager.ts`)
Gestionnaire de tours qui coordonne l'exécution automatique des actions de l'IA.

## Stratégie de l'IA

### Priorités de l'IA

1. **Révolution** - Priorité maximale si possible
2. **Construction de colonnes** - Avancer vers la Révolution
3. **Défense** - Placer des Rois sur les colonnes menacées
4. **Soin** - Utiliser Dame/Joker si PV < 50%
5. **Attaque** - Utiliser Valet ou unités pour détruire les colonnes adverses

### Évaluation des cartes

L'IA évalue chaque carte selon son utilité stratégique:

- **Joker**: 20 points (carte la plus précieuse)
- **As**: 10 points (démarre une colonne)
- **7 de chance**: 8 points (active une colonne)
- **Valet**: 15 points (destruction de colonne)
- **Dame**: 12 points (soin)
- **Roi**: 15 points (défense)
- **8, 9, 10**: 5 points (cartes hautes)
- **2-6**: 2 points (cartes de base)

### Logique de défense

L'IA décide de bloquer une attaque si:
- Ses PV sont critiques (≤ 5)
- La colonne attaquée a une progression importante (≥ 7 cartes)
- Elle possède un Joker ou un 7 de chance actif

### Utilisation du Joker

L'IA évalue l'utilisation du Joker selon le contexte:
- **HEAL**: Si PV < 30% du maximum
- **ATTACK**: Si l'adversaire a une colonne avec 8+ cartes
- **REPLACE**: Si une carte manquante bloque la progression
- **SAVE**: Conserver pour plus tard

## Intégration dans le jeu

### Mode Solo

Pour créer un jeu solo avec l'IA:

```typescript
// Dans game.service.ts
async createSoloGame(playerId: string, socketId: string): Promise<string> {
  // Créer le jeu avec le joueur humain
  const gameId = await this.createGame('solo', [
    { playerId, socketId }
  ]);

  // Ajouter le joueur IA
  const aiPlayerId = `AI_${Date.now()}`;
  const aiSocketId = `AI_SOCKET_${Date.now()}`;

  await this.addPlayer(gameId, aiPlayerId, aiSocketId);

  return gameId;
}
```

### Exécution automatique des tours de l'IA

L'IA doit être appelée automatiquement après chaque action du joueur humain:

```typescript
// Après chaque action du joueur
async afterPlayerAction(gameId: string) {
  const gameData = await this.getGameState(gameId);
  const currentPlayer = gameData.players[gameData.currentPlayerIndex];

  // Si c'est le tour de l'IA
  if (this.aiTurnManager.isAIPlayer(currentPlayer)) {
    await this.aiTurnManager.handleAITurn(gameId, currentPlayer);
  }
}
```

## Améliorations futures

1. **Niveaux de difficulté**
   - Facile: L'IA fait des erreurs occasionnelles
   - Normal: L'IA actuelle
   - Difficile: L'IA anticipe plusieurs coups à l'avance

2. **Apprentissage**
   - Sauvegarder les parties
   - Analyser les stratégies gagnantes
   - Ajuster les poids de l'évaluateur

3. **Personnalité**
   - Style agressif (attaques fréquentes)
   - Style défensif (priorisation des Rois et défenses)
   - Style révolutionnaire (focus sur les Révolutions)

## Tests

Pour tester l'IA:

```typescript
// Test de décision de setup
const hand = [...]; // 7 cartes
const aiService = new GameAIService();
const reserveCards = aiService.makeSetupDecision(hand);
console.log('Reserve cards:', reserveCards);

// Test de décision de tour
const playerState = {...};
const opponentState = {...};
const decision = aiService.makeTurnDecision(playerState, opponentState);
console.log('AI Decision:', decision);
```

## Debug

L'IA affiche des logs détaillés avec le préfixe 🤖:

```
🤖 AI: Making turn decision...
🤖 AI: Phase: PLAY
🤖 AI: Health: 15/15
🤖 AI: Hand size: 5
🤖 AI: Reserve size: 2
🤖 AI: Evaluation score: 42
🤖 AI: Attack opportunities: 3
🤖 AI: Revolution opportunities: none
🤖 AI: Decision: PLACE_CARD
🤖 AI: Reasoning: Continue building HEARTS column with 4
```

Ces logs permettent de comprendre le raisonnement de l'IA et de déboguer son comportement.
