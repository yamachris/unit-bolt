# UNIT Card Game - Frontend

Application frontend Next.js pour le jeu de cartes UNIT.

## Structure du Projet

```
src/
├── app/                # Pages et composants Next.js
│   ├── layout.tsx
│   └── page.tsx
│
├── hooks/             # Hooks React personnalisés
│   └── useSocket.ts   # Hook pour la gestion WebSocket
│
└── ...               # Autres dossiers (components, stores, etc.)
```

## Configuration

### Variables d'Environnement

Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## Installation

```bash
npm install
```

## Démarrage

```bash
# Développement
npm run dev

# Production
npm run build
#deprecated
#npm start, use serve -s out ou sans "-s"
serve -s out
```

## Fonctionnalités

- Interface utilisateur moderne avec Tailwind CSS
- Communication en temps réel avec Socket.IO
- Gestion d'état avec Zustand
- Support TypeScript complet
- Optimisation des performances avec Next.js

## WebSocket

Le hook `useSocket` fournit les méthodes suivantes :

### Émission d'événements

- `joinGame(gameId)` : Rejoindre une partie
- `playCard(gameId, cardId, position)` : Jouer une carte
- `drawCard(gameId)` : Piocher une carte
- `endTurn(gameId)` : Terminer son tour

### Écoute d'événements

- `onPlayerJoined(callback)` : Un joueur a rejoint
- `onCardPlayed(callback)` : Une carte a été jouée
- `onCardDrawn(callback)` : Une carte a été piochée
- `onTurnEnded(callback)` : Un tour est terminé

## Styles

Le projet utilise Tailwind CSS pour le styling. La configuration se trouve dans :

- `tailwind.config.ts`
- `postcss.config.js`
- `src/app/globals.css`

## Tests

Les tests seront implémentés avec Jest et React Testing Library.

## Bonnes Pratiques

- Utilisation des hooks personnalisés pour la logique réutilisable
- Composants fonctionnels avec TypeScript
- Gestion des états avec Zustand
- Code formatting avec Prettier
- Linting avec ESLint
