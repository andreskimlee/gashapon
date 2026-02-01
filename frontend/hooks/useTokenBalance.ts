/**
 * useTokenBalance Hook
 *
 * Fetches and caches the user's token balance via server-side API proxy.
 * Uses React Query for caching and automatic refetching.
 */

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";

// Query key factory
export const balanceKeys = {
  all: ["balance"] as const,
  user: (walletAddress: string) => [...balanceKeys.all, walletAddress] as const,
};

async function fetchBalance(walletAddress: string): Promise<number | null> {
  const response = await fetch(`/api/balance/${walletAddress}`);
  
  if (!response.ok) {
    console.error("[useTokenBalance] API error:", await response.json().catch(() => ({})));
    return null;
  }

  const data = await response.json();
  return data.balance ?? null;
}

interface UseTokenBalanceOptions {
  /** Refresh interval in milliseconds (default: 15000) */
  refetchInterval?: number;
  /** Enable or disable the query */
  enabled?: boolean;
}

/**
 * Hook to fetch and cache the user's token balance
 * 
 * @param options - Query options
 * @returns Balance data with loading state
 */
export function useTokenBalance(options: UseTokenBalanceOptions = {}) {
  const { publicKey, connected } = useWallet();
  const { refetchInterval = 15000, enabled = true } = options;
  const walletAddress = publicKey?.toString();

  const query = useQuery({
    queryKey: walletAddress ? balanceKeys.user(walletAddress) : balanceKeys.all,
    queryFn: () => fetchBalance(walletAddress!),
    enabled: enabled && connected && !!walletAddress,
    staleTime: 10 * 1000, // Consider fresh for 10 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: connected ? refetchInterval : false,
    refetchOnWindowFocus: false,
  });

  return {
    balance: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to check if user has sufficient balance to play
 * 
 * @param requiredAmount - The amount needed to play
 * @returns Whether user has enough balance and related state
 */
export function useHasSufficientBalance(requiredAmount: number | undefined) {
  const { balance, isLoading } = useTokenBalance();
  const { connected } = useWallet();

  // Can't determine if not connected or still loading
  if (!connected || isLoading || balance === null || requiredAmount === undefined) {
    return {
      hasSufficientBalance: null, // Unknown
      balance,
      requiredAmount,
      isLoading,
      shortfall: null,
    };
  }

  const hasSufficientBalance = balance >= requiredAmount;
  const shortfall = hasSufficientBalance ? 0 : requiredAmount - balance;

  return {
    hasSufficientBalance,
    balance,
    requiredAmount,
    isLoading: false,
    shortfall,
  };
}

/**
 * Hook to invalidate balance cache (useful after transactions)
 */
export function useInvalidateBalance() {
  const queryClient = useQueryClient();
  const { publicKey } = useWallet();

  return {
    /** Invalidate current user's balance */
    invalidate: () => {
      if (publicKey) {
        queryClient.invalidateQueries({ queryKey: balanceKeys.user(publicKey.toString()) });
      }
    },
    /** Invalidate all balance queries */
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: balanceKeys.all }),
  };
}
