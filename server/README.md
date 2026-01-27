# UNIT Card Game - Backend

Backend NestJS pour le jeu de cartes UNIT.

## Structure du Projet

```
src/
├── config/              # Configuration
│   └── database.config.ts
│
├── websocket/          # Configuration WebSocket
│   ├── game.gateway.ts
│   └── websocket.module.ts
│
├── app.module.ts       # Module principal
└── main.ts            # Point d'entrée
```

## Configuration

### Variables d'Environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=unit_game
JWT_SECRET=your_jwt_secret
PORT=3001
```

## Installation

```bash
npm install
```

## Démarrage

```bash
# Développement
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Tests

```bash
# Tests unitaires
npm run test

# Tests e2e
npm run test:e2e

# Couverture de code
npm run test:cov
```

## WebSocket Events

### Événements Entrants

- `joinGame` : Rejoindre une partie
- `playCard` : Jouer une carte
- `drawCard` : Piocher une carte
- `endTurn` : Terminer son tour

### Événements Sortants

- `playerJoined` : Un joueur a rejoint la partie
- `cardPlayed` : Une carte a été jouée
- `cardDrawn` : Une carte a été piochée
- `turnEnded` : Un tour est terminé

## Base de Données

Le projet utilise PostgreSQL avec TypeORM. Les migrations et les entités seront ajoutées au fur et à mesure du développement.

## API REST

Les endpoints REST seront documentés ici une fois implémentés.

## Sécurité

- Authentification JWT
- Validation des données avec class-validator
- Protection CORS
- Rate limiting
