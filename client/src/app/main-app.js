import { config } from "./config";
import { pagesConfig } from "./app-pages-internals";

// Configuration globale de l'application
export const mainApp = {
  config,
  pages: pagesConfig,

  // Initialisation de l'application
  init() {
    // Vérifier que les serveurs sont disponibles
    // this.checkServers();

    // Initialiser les configurations
    this.initConfig();

    return this;
  },

  // Vérifier la disponibilité des serveurs
  // async checkServers() {
  //   try {
  //     const response = await fetch(config.servers.game);
  //     return response.ok;
  //   } catch (error) {
  //     console.warn("Server check failed:", error);
  //     return false;
  //   }
  // },

  // Initialiser les configurations
  initConfig() {
    // Vérifier et mettre à jour les configurations si nécessaire
    if (typeof window !== "undefined") {
      // Configuration côté client
      window.__APP_CONFIG__ = config;
    }
  },
};

export default mainApp.init();
