import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Vous pouvez ajouter vos couleurs personnalisées ici
      },
      fontFamily: {
        // Vous pouvez ajouter vos polices personnalisées ici
      },
    },
  },
  plugins: [],
};
export default config;
