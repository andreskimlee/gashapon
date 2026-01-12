/**
 * Admin API Service
 *
 * API endpoints for game administration
 */

import { apiClient } from "./client";

export interface CreatePrizeRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  physicalSku: string;
  tier: "common" | "uncommon" | "rare" | "legendary";
  probabilityBasisPoints: number;
  supplyTotal: number;
  metadataUri?: string;
}

export interface CreateGameRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  costInTokens: number;
  costInUsd?: number;
  prizes: CreatePrizeRequest[];
}

export interface CreateGameResponse {
  id: number;
  gameId: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  costInTokens: number;
  costInUsd: number | null;
  onChainAddress: string;
  isActive: boolean;
  totalPlays: number;
  createdAt: string;
  updatedAt: string;
  prizes: {
    id: number;
    prizeId: number;
    name: string;
    description: string | null;
    imageUrl: string | null;
    physicalSku: string;
    tier: string;
    probabilityBasisPoints: number;
    supplyTotal: number;
    supplyRemaining: number;
    metadataUri: string | null;
  }[];
}

export interface UpdateOnChainRequest {
  onChainAddress: string;
  gameId: number;
}

const ADMIN_API_KEY =
  process.env.NEXT_PUBLIC_ADMIN_API_KEY || "admin-secret-key-change-me";

export const adminApi = {
  /**
   * Create a new game with prizes
   */
  createGame: async (data: CreateGameRequest): Promise<CreateGameResponse> => {
    return apiClient.post<CreateGameResponse>("/admin/games", data, {
      headers: {
        "x-admin-key": ADMIN_API_KEY,
      },
    });
  },

  /**
   * Update game with on-chain address after deployment
   */
  updateOnChainAddress: async (
    gameId: number,
    data: UpdateOnChainRequest
  ): Promise<CreateGameResponse> => {
    return apiClient.patch<CreateGameResponse>(
      `/admin/games/${gameId}/on-chain`,
      data,
      {
        headers: {
          "x-admin-key": ADMIN_API_KEY,
        },
      }
    );
  },

  /**
   * Activate a game
   */
  activateGame: async (gameId: number): Promise<CreateGameResponse> => {
    return apiClient.patch<CreateGameResponse>(
      `/admin/games/${gameId}/activate`,
      {},
      {
        headers: {
          "x-admin-key": ADMIN_API_KEY,
        },
      }
    );
  },

  /**
   * Deactivate a game
   */
  deactivateGame: async (gameId: number): Promise<CreateGameResponse> => {
    return apiClient.patch<CreateGameResponse>(
      `/admin/games/${gameId}/deactivate`,
      {},
      {
        headers: {
          "x-admin-key": ADMIN_API_KEY,
        },
      }
    );
  },
};
