/**
 * Admin API Service
 *
 * API endpoints for game administration
 * All requests go through server-side API routes to keep ADMIN_API_KEY secret
 */

export interface CreatePrizeRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  physicalSku: string;
  tier: "common" | "uncommon" | "rare" | "legendary";
  probabilityBasisPoints: number;
  supplyTotal: number;
  metadataUri?: string;
  weightGrams?: number;
  lengthInches?: number;
  widthInches?: number;
  heightInches?: number;
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
    weightGrams: number | null;
    lengthInches: number | null;
    widthInches: number | null;
    heightInches: number | null;
  }[];
}

export interface UpdateOnChainRequest {
  onChainAddress: string;
  gameId: number;
}

/**
 * Admin API - routes through Next.js server-side API routes
 * This keeps ADMIN_API_KEY secret (not exposed to browser)
 */
export const adminApi = {
  /**
   * Create a new game with prizes
   */
  createGame: async (data: CreateGameRequest): Promise<CreateGameResponse> => {
    const response = await fetch("/api/admin/games", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`,
      }));
      throw new Error(error.message || error.error || "Failed to create game");
    }

    return response.json();
  },

  /**
   * Update game with on-chain address after deployment
   */
  updateOnChainAddress: async (
    gameId: number,
    data: UpdateOnChainRequest
  ): Promise<CreateGameResponse> => {
    const response = await fetch(`/api/admin/games/${gameId}/on-chain`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`,
      }));
      throw new Error(error.message || error.error || "Failed to update game");
    }

    return response.json();
  },

  /**
   * Activate a game
   */
  activateGame: async (gameId: number): Promise<CreateGameResponse> => {
    const response = await fetch(`/api/admin/games/${gameId}/activate`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`,
      }));
      throw new Error(error.message || error.error || "Failed to activate game");
    }

    return response.json();
  },

  /**
   * Deactivate a game
   */
  deactivateGame: async (gameId: number): Promise<CreateGameResponse> => {
    const response = await fetch(`/api/admin/games/${gameId}/deactivate`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`,
      }));
      throw new Error(error.message || error.error || "Failed to deactivate game");
    }

    return response.json();
  },
};
