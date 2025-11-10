/**
 * Game Type Definitions
 * 
 * TypeScript types for game-related data structures
 */

export type PrizeTier = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface Prize {
  prizeId: number;
  name: string;
  description?: string;
  imageUrl?: string;
  metadataUri?: string;
  physicalItemSku: string;
  tier: PrizeTier;
  probabilityBasisPoints: number; // 10000 = 100%
  supplyTotal: number;
  supplyRemaining: number;
}

export interface Game {
  id: number;
  gameId?: number; // On-chain game ID
  onChainAddress: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  costInTokens: number | string; // Can be bigint from backend
  costInUsd?: number | string | null;
  isActive: boolean;
  totalPlays: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  prizes?: Prize[];
}

export interface PlayResult {
  playId: string;
  gameId: number;
  userWallet: string;
  prizeId?: number;
  nftMint?: string;
  transactionSignature: string;
  randomValue?: string;
  playedAt: string;
}

