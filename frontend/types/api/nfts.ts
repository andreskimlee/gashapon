/**
 * NFT API Type Definitions
 */

export interface NFT {
  id: number;
  mintAddress: string;
  prizeId: number;
  gameId: number;
  currentOwner: string;
  isRedeemed: boolean;
  redemptionTx?: string;
  mintedAt: string;
  redeemedAt?: string;
  // Extended NFT metadata
  name?: string;
  imageUrl?: string;
  tier?: 'common' | 'uncommon' | 'rare' | 'legendary';
  metadataUri?: string;
}

export interface RedemptionRequest {
  nftMint: string;
  userWallet: string;
  signature: string;
  encryptedShippingData: string;
}

export interface RedemptionResult {
  success: boolean;
  redemptionId?: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  error?: string;
}

