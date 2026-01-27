"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Loading from "../../components/Loading";
import PageNotFound from "@/components/PageNotFound";
import { useSearchParams } from "next/navigation";
import { gameApi } from "@/services/api";
import { gameSocket } from "@/services/socket";
import { Game } from "@/game-core/types/game";

// Import dynamique du composant App pour éviter les problèmes de SSR
const GameApp = dynamic(() => import("../../game-core/App"), {
  ssr: false,
  loading: () => <Loading />,
});

export default function SoloGame() {
  const searchParams = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gameState, setGameState] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const gameId = searchParams.get("gameId");

  const initialGameState: Game = {
    gameId: "",
    players: [],
    playersGameStates: [],
    currentPlayerIndex: 0,
    gameMode: "multiplayer",
    playerSockets: {},
    gameStatus: "waiting",
    turnTimeRemaining: 30,
  };

  useEffect(() => {
    if (!gameId) {
      console.log("Numero 2 ");
      setError("Game ID not found in URL");
      setIsLoading(false);
      return;
    }

    // Connect to socket if not already connected
    gameSocket.connect();

    // Load player playerNickname from localStorage
    const savedPlayerNickname = localStorage.getItem("playerNickname");
    const fetchGameState = async () => {
      try {
        const playerId = savedPlayerNickname ? savedPlayerNickname : "unknown";

        gameSocket.joinGame(gameId, playerId);

        const game = await gameApi.getGame(gameId, playerId);
        game.playersGameStates[0].gameId = gameId;

        setGameState(game);
      } catch (err) {
        console.error("Failed to fetch game state:", err);
        setError("Failed to load game. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameState();
  }, [gameId]);

  if (isLoading) return <Loading />;

  if (error) return <PageNotFound />;
  return <GameApp game={gameState ?? initialGameState} />;
}
