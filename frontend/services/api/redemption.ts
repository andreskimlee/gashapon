/**
 * Redemption API Service
 *
 * Endpoints for redeeming NFTs
 */

import { apiClient } from './client';
import type { RedemptionRequest, RedemptionResult } from '@/types/api/nfts';

export interface Redemption {
  id: number;
  nftMint: string;
  userWallet: string;
  prizeId: number;
  shipmentProvider: string;
  shipmentId: string;
  trackingNumber: string | null;
  carrier: string | null;
  carrierCode: string | null;
  labelPdfUrl: string | null;
  labelPngUrl: string | null;
  trackingUrl: string | null;
  status: 'processing' | 'shipped' | 'delivered' | 'failed';
  estimatedDelivery: string | null;
  redeemedAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
  retryCount: number;
  prize?: {
    id: number;
    name: string;
    imageUrl: string;
    tier: string;
    physicalSku: string;
  };
}

export const redemptionApi = {
  redeemNft: async (payload: RedemptionRequest): Promise<RedemptionResult> => {
    return apiClient.post<RedemptionResult>('/redemptions/nft', payload, {
      headers: {
        'X-Wallet-Address': payload.userWallet,
      },
    });
  },

  getAllRedemptions: async (): Promise<Redemption[]> => {
    return apiClient.get<Redemption[]>('/redemptions');
  },

  getRedemptionStatus: async (nftMint: string): Promise<Redemption> => {
    return apiClient.get<Redemption>(`/redemptions/nft/${nftMint}`);
  },

  getUserRedemptions: async (wallet: string): Promise<Redemption[]> => {
    return apiClient.get<Redemption[]>(`/redemptions/user/${wallet}`);
  },
};


