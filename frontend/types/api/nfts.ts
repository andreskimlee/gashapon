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
  // Pending status - true if prize won but NFT not yet minted on-chain
  isPending?: boolean;
  // Session PDA for claiming (only present when isPending is true)
  sessionPda?: string;
}

export interface RedemptionRequest {
  nftMint: string;
  userWallet: string;
  signature: string;
  message: string;
  timestamp: number;
  encryptedShippingData: string;
}

export interface RedemptionResult {
  success: boolean;
  redemptionId?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  estimatedDelivery?: string;
  error?: string;
}

