// Configuration de l'application
export const config = {
  // URLs des serveurs
  // servers: {
  //   nextjs: "http://localhost:3006", // Serveur Next.js
  //   api:
  //     process.env.NEXT_PUBLIC_API_URL ||
  //     "https://www.unitcardgame.com" ||
  //     "http://localhost:3007", // API NestJS
  // },
  servers: {
    nextjs: "http://localhost:3006", // Serveur Next.js
    api: process.env.NEXT_PUBLIC_API_URL || "https://www.unitcardgame.com", // API NestJS
  },

  // Configuration du jeu
  game: {
    solo: {
      enabled: true,
    },
    online: {
      enabled: false,
      comingSoon: true,
    },
  },

  // Configuration de l'interface
  ui: {
    theme: "dark",
    animation: true,
    sound: true,
  },
};
