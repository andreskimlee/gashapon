/**
 * Marketplace API Type Definitions
 */

export interface MarketplaceListing {
  id: number;
  nftMint: string;
  sellerWallet: string;
  priceInTokens: number;
  priceInSol?: number;
  isActive: boolean;
  onChainListingAddress?: string;
  listedAt: string;
  cancelledAt?: string;
  soldAt?: string;
  buyerWallet?: string;
  saleTx?: string;
  // Extended NFT data
  nft?: {
    name: string;
    imageUrl?: string;
    tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  };
}

export interface CreateListingRequest {
  nftMint: string;
  priceInTokens: number;
  sellerWallet: string;
  signature: string;
}

export interface PurchaseRequest {
  listingId: string;
  buyerWallet: string;
  signature: string;
}

export interface MarketplaceSale {
  id: number;
  listingId: number;
  nftMint: string;
  sellerWallet: string;
  buyerWallet: string;
  priceInTokens: number;
  platformFeeTokens: number;
  transactionSignature: string;
  soldAt: string;
}

