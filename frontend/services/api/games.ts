/**
 * Games API Service
 *
 * API endpoints for game-related operations
 */

import type { Game } from "@/types/game/game";
import { apiClient } from "./client";

export const gamesApi = {
  /**
   * Get all games (active and inactive)
   */
  getGames: async (): Promise<Game[]> => {
    return apiClient.get<Game[]>("/games");
  },

  /**
   * Get only active games
   */
  getActiveGames: async (): Promise<Game[]> => {
    return apiClient.get<Game[]>("/games?active=true");
  },

  /**
   * Get game by ID
   */
  getGame: async (gameId: number): Promise<Game> => {
    return apiClient.get<Game>(`/games/${gameId}`);
  },

  /**
   * Initiate game play (returns unsigned transaction)
   */
  playGame: async (gameId: number, userWallet: string, signature: string) => {
    return apiClient.post(`/games/${gameId}/play`, {
      userWallet,
      signature,
    });
  },

  /**
   * Finalize game play after VRF
   */
  finalizePlay: async (
    gameId: number,
    playId: string,
    prizeChoice: "nft" | "direct_redeem",
    encryptedShippingData?: string
  ) => {
    return apiClient.post(`/games/${gameId}/finalize`, {
      playId,
      prizeChoice,
      encryptedShippingData,
    });
  },

  /**
   * DEV ONLY: Simulate a play result (win/lose) without on-chain interaction.
   * Requires wallet header for auth.
   */
  simulatePlay: async (gameId: number, walletAddress: string) => {
    return apiClient.post(
      `/games/${gameId}/play/simulate`,
      {},
      {
        headers: {
          'X-Wallet-Address': walletAddress,
        },
      }
    );
  },
};
