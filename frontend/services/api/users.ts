/**
 * Users API Service
 *
 * Endpoints for user collection and redemptions
 */

import type { NFT } from "@/types/api/nfts";
import { apiClient } from "./client";

export const usersApi = {
  /**
   * Get a user's NFT collection
   * By default, backend filters out redeemed NFTs unless isRedeemed is provided
   */
  getCollection: async (
    wallet: string,
    params?: {
      tier?: "common" | "uncommon" | "rare" | "legendary";
      gameId?: number;
      isRedeemed?: boolean;
      hasListing?: boolean;
    }
  ): Promise<NFT[]> => {
    const query = new URLSearchParams();
    if (params?.tier) query.set("tier", params.tier);
    if (params?.gameId !== undefined)
      query.set("gameId", String(params.gameId));
    if (params?.isRedeemed !== undefined)
      query.set("isRedeemed", String(params.isRedeemed));
    if (params?.hasListing !== undefined)
      query.set("hasListing", String(params.hasListing));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiClient.get<NFT[]>(`/users/${wallet}/collection${suffix}`);
  },

  /**
   * Get a user's redemption history
   */
  getRedemptions: async (wallet: string) => {
    return apiClient.get(`/users/${wallet}/redemptions`);
  },
};
