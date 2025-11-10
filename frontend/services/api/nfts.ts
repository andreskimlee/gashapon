/**
 * NFTs API Service
 *
 * Endpoints for NFT operations (mint, etc.)
 */

import { apiClient } from './client';

export const nftsApi = {
  /**
   * Mint NFT for a won prize using a play transaction signature
   * Requires wallet header for auth
   */
  mintFromPlay: async (playSignature: string, walletAddress: string) => {
    return apiClient.post(
      '/nfts/mint',
      { playSignature },
      {
        headers: {
          'X-Wallet-Address': walletAddress,
        },
      }
    );
  },
};


