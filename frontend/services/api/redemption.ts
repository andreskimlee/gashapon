/**
 * Redemption API Service
 *
 * Endpoints for redeeming NFTs
 */

import { apiClient } from './client';
import type { RedemptionRequest, RedemptionResult } from '@/types/api/nfts';

export const redemptionApi = {
  redeemNft: async (payload: RedemptionRequest): Promise<RedemptionResult> => {
    return apiClient.post<RedemptionResult>('/redemptions/nft', payload, {
      headers: {
        'X-Wallet-Address': payload.userWallet,
      },
    });
  },
};


