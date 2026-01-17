/**
 * Hook to calculate dynamic token cost from USD price
 *
 * Fetches the current token price from pump.fun and calculates
 * how many tokens are needed for a given USD cost.
 */

import { calculateTokenAmount } from "@/services/price/pump-fun";
import { formatTokenAmountCompact } from "@/utils/format";
import { useCallback, useEffect, useState } from "react";

interface TokenCostResult {
  tokenAmount: bigint | null;
  tokenAmountFormatted: string | null;
  priceUsd: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to get the dynamic token cost for a game
 *
 * @param tokenMint The token mint address (from game.currencyTokenMintAddress)
 * @param costUsdCents The cost in USD cents (e.g., 99 = $0.99)
 */
export function useTokenCost(
  tokenMint: string | undefined | null,
  costUsdCents: number | undefined
): TokenCostResult {
  const [tokenAmount, setTokenAmount] = useState<bigint | null>(null);
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCost = useCallback(async () => {
    if (!tokenMint || !costUsdCents) {
      setTokenAmount(null);
      setPriceUsd(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Calculate token amount using pump.fun price
      const result = await calculateTokenAmount(
        costUsdCents,
        tokenMint,
        6,
        0.02
      );
      if (!result) {
        throw new Error("Could not fetch token price");
      }

      setTokenAmount(result.tokenAmount);
      setPriceUsd(result.priceUsd);
    } catch (err) {
      console.error("[useTokenCost] Error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to calculate token cost"
      );
    } finally {
      setLoading(false);
    }
  }, [tokenMint, costUsdCents]);

  useEffect(() => {
    fetchCost();

    // Refresh every 30 seconds to keep price updated
    const interval = setInterval(fetchCost, 30000);
    return () => clearInterval(interval);
  }, [fetchCost]);

  // Format token amount for display in compact form (e.g., "854K")
  const tokenAmountFormatted =
    tokenAmount !== null ? formatTokenAmountCompact(tokenAmount, 6) : null;

  return {
    tokenAmount,
    tokenAmountFormatted,
    priceUsd,
    loading,
    error,
    refetch: fetchCost,
  };
}
