import React, { useEffect, useState } from "react";
import { useGameStore } from "./store/GameStore";
import { Header } from "./components/Header";
import { GameBoard } from "./components/GameBoard";
import { GameControls } from "./components/GameControls";
import { SetupPhase } from "./components/SetupPhase";
import { PlayerArea } from "./components/PlayerArea";
import { DeckArea } from "./components/DeckArea";
import { GameOver } from "./components/GameOver";
import { ThemeToggle } from "./components/ThemeToggle";
import { LanguageSelector } from "./components/LanguageSelector";
import { useTranslation } from "react-i18next";
import { I18nextProvider } from "react-i18next";
import { AudioManager } from "./sound-design/audioManager";
import { SacrificePopup } from "./components/SacrificePopup";
import { JokerExchangePopup } from "./components/JokerExchangePopup";
import Loading from "../components/Loading";
import { Game } from "./types/game";
import GameLog from "./components/GameLog";

interface AppProps {
  game?: Game;
}

export default function App({ game }: AppProps) {
  const { phase, initializeGame, isGameOver, gameOverReason } = useGameStore();
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (game) initializeGame(game);
    setIsLoading(false);
  }, [game, initializeGame]);

  useEffect(() => {
    // Démarrer la musique automatiquement au chargement de l'application
    const audioManager = AudioManager.getInstance();
    audioManager.playBackgroundMusic();
    return () => {
      audioManager.stopBackgroundMusic();
    };
  }, []);

  if (isLoading) return <Loading />;

  return (
    <I18nextProvider i18n={i18n}>
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-green-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="fixed top-4 left-4 z-50">
          <LanguageSelector />
        </div>
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>

        {isGameOver && <GameOver message={gameOverReason} />}
        {phase === "SETUP" && <SetupPhase />}
        {!isGameOver && phase !== "SETUP" && (
          <>
            <div className="pb-[calc(144px+80px)] container mx-auto px-4 py-4">
              <Header />
              <main className="mt-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <aside className="md:w-40 flex-shrink-0">
                    <DeckArea />
                  </aside>
                  <div className="flex-1">
                    <GameBoard />
                  </div>
                </div>
              </main>
            </div>
            <div className="fixed bottom-0 left-0 right-0">
              <PlayerArea />
              <GameControls />
            </div>
          </>
        )}
        <JokerExchangePopup />
        <SacrificePopup />

        {/* Journal de partie complet */}
        <GameLog />
      </div>
    </I18nextProvider>
  );
}
