/**
 * React Query hook for fetching token prices
 *
 * Uses React Query for:
 * - Automatic caching (all components using the same tokenMint share the cache)
 * - Deduplication (multiple calls for the same token = 1 request)
 * - Background refetching (keeps prices fresh)
 */

import { getTokenPrice, type TokenPrice } from "@/services/price/pump-fun";
import { useQuery } from "@tanstack/react-query";

// Query key factory for consistent cache keys
export const tokenPriceKeys = {
  all: ["tokenPrice"] as const,
  byMint: (mint: string) => ["tokenPrice", mint] as const,
};

/**
 * Hook to fetch and cache token price by mint address
 *
 * @param tokenMint The token mint address
 * @param options Additional query options
 */
export function useTokenPrice(
  tokenMint: string | undefined | null,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: tokenPriceKeys.byMint(tokenMint ?? ""),
    queryFn: async (): Promise<TokenPrice | null> => {
      if (!tokenMint) return null;
      return getTokenPrice(tokenMint);
    },
    enabled: !!tokenMint && (options?.enabled ?? true),
    // Refresh every 30 seconds by default
    refetchInterval: options?.refetchInterval ?? 30_000,
    // Consider data stale after 10 seconds
    staleTime: 10_000,
    // Keep previous data while refetching
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to prefetch token prices for multiple mints
 * Useful for prefetching on the home page before cards render
 */
export function usePrefetchTokenPrices(tokenMints: (string | undefined | null)[]) {
  const uniqueMints = [...new Set(tokenMints.filter(Boolean))] as string[];

  // Use a single query that fetches all unique mints
  return useQuery({
    queryKey: ["tokenPrices", "batch", ...uniqueMints.sort()],
    queryFn: async () => {
      // Fetch all prices in parallel
      const results = await Promise.all(
        uniqueMints.map(async (mint) => ({
          mint,
          price: await getTokenPrice(mint),
        }))
      );
      return results.reduce(
        (acc, { mint, price }) => {
          acc[mint] = price;
          return acc;
        },
        {} as Record<string, TokenPrice | null>
      );
    },
    enabled: uniqueMints.length > 0,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}
