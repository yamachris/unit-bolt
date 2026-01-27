import { useState, useEffect } from "react";

export function useDarkMode() {
  // Vérifier la préférence sauvegardée dans localStorage
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  // Effet d'initialisation - s'exécute une seule fois au montage du composant
  useEffect(() => {
    // Appliquer la classe directement sur le body plutôt que sur documentElement (root)
    if (isDark) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }

    // Synchro de l'état React avec la classe sur document.body
    const syncWithBodyClass = () => {
      const hasDarkClass = document.body.classList.contains("dark");
      if (hasDarkClass !== isDark) {
        setIsDark(hasDarkClass);
      }
    };

    // Vérifier périodiquement si la classe a changé (en cas de changement externe)
    const interval = setInterval(syncWithBodyClass, 100);

    // Nettoyer l'intervalle à la désinstallation du composant
    return () => clearInterval(interval);
  }, [isDark]);

  return { isDark, setIsDark };
}
