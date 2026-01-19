/**
 * Hook to calculate dynamic token cost from USD price
 *
 * Uses React Query for caching - all components using the same tokenMint
 * share the cached price, eliminating redundant API calls.
 */

import { useTokenPrice } from "@/hooks/useTokenPrice";
import { formatTokenAmountCompact } from "@/utils/format";
import { useMemo } from "react";

interface TokenCostResult {
  tokenAmount: bigint | null;
  tokenAmountFormatted: string | null;
  priceUsd: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Default slippage tolerance (2%)
const DEFAULT_SLIPPAGE = 0.02;
// Default token decimals for pump.fun tokens
const DEFAULT_DECIMALS = 6;

/**
 * Calculate token amount from USD cost and price
 */
function calculateTokenAmount(
  costUsdCents: number,
  priceUsd: number,
  decimals: number = DEFAULT_DECIMALS,
  slippageTolerance: number = DEFAULT_SLIPPAGE
): bigint {
  // Convert cents to dollars
  const costUsd = costUsdCents / 100;

  // Calculate raw token amount
  const rawTokens = costUsd / priceUsd;

  // Add slippage buffer
  const tokensWithSlippage = rawTokens * (1 + slippageTolerance);

  // Convert to base units
  const baseUnits = Math.ceil(tokensWithSlippage * Math.pow(10, decimals));

  return BigInt(baseUnits);
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
  // Use React Query for price fetching (shared cache across components)
  const {
    data: tokenPrice,
    isLoading,
    error,
    refetch,
  } = useTokenPrice(tokenMint, {
    enabled: !!tokenMint && !!costUsdCents,
  });

  // Calculate token amount from cached price
  const { tokenAmount, priceUsd } = useMemo(() => {
    if (!tokenPrice?.priceUsd || !costUsdCents) {
      return { tokenAmount: null, priceUsd: null };
    }

    const amount = calculateTokenAmount(costUsdCents, tokenPrice.priceUsd);

    return {
      tokenAmount: amount,
      priceUsd: tokenPrice.priceUsd,
    };
  }, [tokenPrice?.priceUsd, costUsdCents]);

  // Format token amount for display
  const tokenAmountFormatted = useMemo(
    () =>
      tokenAmount !== null
        ? formatTokenAmountCompact(tokenAmount, DEFAULT_DECIMALS)
        : null,
    [tokenAmount]
  );

  return {
    tokenAmount,
    tokenAmountFormatted,
    priceUsd,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
