import axios from "axios";
import { Suit, Game } from "../game-core/types/game";

// just to seach quickly https://www.unitcardgame.com

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface CreatedGame {
  gameId: string;
  token: string;
}

export const gameApi = {
  createSoloGame: async (
    playerNickname: string,
    socketId: string,
  ): Promise<CreatedGame> => {
    const response = await axios.post(`${API_URL}/game/create`, {
      mode: "solo",
      creatorPlayerId: playerNickname,
      socketId: socketId,
    });
    return response.data;
  },
  createMultiplayerGame: async (
    playerNickname: string,
    socketId: string,
  ): Promise<CreatedGame> => {
    const response = await axios.post(`${API_URL}/game/create`, {
      mode: "multiplayer",
      creatorPlayerId: playerNickname,
      socketId: socketId,
    });
    return response.data;
  },

  getGame: async (gameId: string, playerId: string): Promise<Game> => {
    const response = await axios.get(`${API_URL}/game/${gameId}`, {
      params: { playerId },
    });
    return response.data;
  },

  checkMatchStatus: async (tempGameId: string) => {
    const response = await axios.get(
      `${API_URL}/game/check-match-status/${tempGameId}`,
    );
    return await response.data;
  },

  placeCard: async (
    gameId: string,
    suit: Suit,
    position: number,
  ): Promise<Game> => {
    const response = await axios.put(`${API_URL}/game/${gameId}/place-card`, {
      suit,
      position,
    });
    return response.data;
  },

  drawCard: async (gameId: string): Promise<Game> => {
    const response = await axios.post(`${API_URL}/game/${gameId}/draw-card`);
    return response.data;
  },

  discard: async (gameId: string, cardId: string): Promise<Game> => {
    const response = await axios.post(`${API_URL}/game/${gameId}/discard`, {
      cardId,
    });
    return response.data;
  },

  endTurn: async (gameId: string): Promise<Game> => {
    const response = await axios.post(`${API_URL}/game/${gameId}/end-turn`);
    return response.data;
  },

  selectCard: async (gameId: string, cardId: string): Promise<Game> => {
    const response = await axios.put(`${API_URL}/game/${gameId}/select-card`, {
      cardId,
    });
    return response.data;
  },
};
