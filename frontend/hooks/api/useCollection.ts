/**
 * React Query hook for fetching user's NFT collection
 * Provides caching, automatic refetching, and loading states
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/services/api/users";
import type { NFT } from "@/types/api/nfts";

// Query key factory for collection queries
export const collectionKeys = {
  all: ["collection"] as const,
  user: (walletAddress: string) => [...collectionKeys.all, walletAddress] as const,
};

// API response type (nested structure from backend)
interface CollectionItemResponse {
  mintAddress: string;
  prize: {
    id: number;
    name: string;
    description: string;
    imageUrl: string;
    tier: string;
    physicalSku: string;
  };
  game: {
    id: number;
    name: string;
    gameId: number;
  };
  metadata: {
    name: string;
    symbol: string;
    uri: string;
  };
  isRedeemed: boolean;
  mintedAt: string;
  marketplaceListing?: {
    listingId: number;
    priceInTokens: string;
    isActive: boolean;
  };
  isPending?: boolean;
  sessionPda?: string;
}

/**
 * Transform API response to frontend NFT type
 */
function transformToNFT(item: CollectionItemResponse): NFT {
  return {
    id: 0, // Not provided by API, use mintAddress as unique identifier
    mintAddress: item.mintAddress,
    prizeId: item.prize.id,
    gameId: item.game.id,
    currentOwner: "", // Not needed for display
    isRedeemed: item.isRedeemed,
    mintedAt: item.mintedAt,
    name: item.metadata?.name || item.prize.name,
    imageUrl: item.prize.imageUrl,
    tier: item.prize.tier as NFT["tier"],
    metadataUri: item.metadata?.uri,
    isPending: item.isPending,
    sessionPda: item.sessionPda,
  };
}

/**
 * Fetches both redeemed and unredeemed NFTs for a wallet
 */
async function fetchCollection(walletAddress: string): Promise<NFT[]> {
  const [unredeemedData, redeemedData] = await Promise.all([
    usersApi.getCollection(walletAddress, { isRedeemed: false }),
    usersApi.getCollection(walletAddress, { isRedeemed: true }),
  ]);
  
  // Transform and combine, sort by mintedAt (newest first)
  const allItems = [...(unredeemedData as unknown as CollectionItemResponse[]), ...(redeemedData as unknown as CollectionItemResponse[])];
  return allItems
    .map(transformToNFT)
    .sort((a, b) => new Date(b.mintedAt).getTime() - new Date(a.mintedAt).getTime());
}

interface UseCollectionOptions {
  /** Enable or disable the query (e.g., when wallet is not connected) */
  enabled?: boolean;
}

/**
 * Hook to fetch and cache a user's NFT collection
 * 
 * @param walletAddress - The wallet address to fetch collection for
 * @param options - Query options
 * @returns Query result with NFTs, loading state, and error
 */
export function useCollection(
  walletAddress: string | undefined,
  options: UseCollectionOptions = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: walletAddress ? collectionKeys.user(walletAddress) : collectionKeys.all,
    queryFn: () => fetchCollection(walletAddress!),
    enabled: enabled && !!walletAddress,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (formerly cacheTime)
    refetchOnWindowFocus: false, // Don't refetch on tab focus
  });
}

/**
 * Hook to manually invalidate/refetch collection data
 * Useful after redemption or winning a prize
 */
export function useInvalidateCollection() {
  const queryClient = useQueryClient();

  return {
    /** Invalidate all collection queries */
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
    
    /** Invalidate collection for a specific wallet */
    invalidateForWallet: (walletAddress: string) =>
      queryClient.invalidateQueries({ queryKey: collectionKeys.user(walletAddress) }),
    
    /** Refetch collection for a specific wallet */
    refetchForWallet: (walletAddress: string) =>
      queryClient.refetchQueries({ queryKey: collectionKeys.user(walletAddress) }),
  };
}
