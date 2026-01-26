/**
 * Pump.fun Price Service
 *
 * Fetches token prices via our proxy API to avoid CORS issues.
 * The proxy fetches from pump.fun server-side.
 */

export interface TokenPrice {
  priceUsd: number;
  priceSol: number;
  marketCapUsd: number;
  source: "pump.fun";
  timestamp: number;
}

/**
 * Fetch token price via our proxy API (avoids CORS)
 * 
 * Note: Caching is handled by React Query at the hook level.
 * This function is a pure fetch without internal caching.
 */
export async function getTokenPrice(
  tokenMint: string
): Promise<TokenPrice | null> {
  try {
    // Use our proxy API to avoid CORS issues
    const apiUrl = `/api/price/${tokenMint}`;
    console.log(`[PriceService] Fetching price via proxy: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[PriceService] Token ${tokenMint} not found`);
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API returned ${response.status}`);
    }

    const data = await response.json();

    console.log(
      `[PriceService] Price for ${data.symbol || tokenMint}: $${data.priceUsd.toFixed(10)}/token ` +
        `(market cap: $${data.marketCapUsd.toFixed(2)})`
    );

    const price: TokenPrice = {
      priceUsd: data.priceUsd,
      priceSol: data.priceSol,
      marketCapUsd: data.marketCapUsd,
      source: "pump.fun",
      timestamp: data.timestamp,
    };

    return price;
  } catch (error) {
    console.error(
      `[PriceService] Error fetching price for ${tokenMint}:`,
      error
    );
    return null;
  }
}

/**
 * Calculate the token amount required for a given USD cost
 *
 * @param costUsdCents The cost in USD cents (e.g., 500 = $5.00)
 * @param tokenMint The token mint address
 * @param tokenDecimals The token's decimal places (default: 6 for pump.fun tokens)
 * @param slippageTolerance Slippage tolerance (default: 1%)
 * @returns The token amount in base units, or null if price unavailable
 */
export async function calculateTokenAmount(
  costUsdCents: number,
  tokenMint: string,
  tokenDecimals: number = 6,
  slippageTolerance: number = 0.01
): Promise<{ tokenAmount: bigint; priceUsd: number } | null> {
  const price = await getTokenPrice(tokenMint);

  if (!price) {
    console.error(
      `[PriceService] Cannot calculate token amount - price unavailable for ${tokenMint}`
    );
    return null;
  }

  // Convert cents to dollars
  const costUsd = costUsdCents / 100;

  // Calculate raw token amount (in human-readable form)
  const rawTokens = costUsd / price.priceUsd;

  // Add slippage buffer (slightly MORE tokens to ensure payment is sufficient)
  const tokensWithSlippage = rawTokens * (1 + slippageTolerance);

  // Convert to base units (multiply by 10^decimals)
  const baseUnits = Math.ceil(tokensWithSlippage * Math.pow(10, tokenDecimals));

  console.log(
    `[PriceService] Token calculation: $${costUsd.toFixed(2)} @ $${price.priceUsd.toFixed(10)}/token = ` +
      `${rawTokens.toFixed(6)} tokens (with ${(slippageTolerance * 100).toFixed(1)}% slippage = ${tokensWithSlippage.toFixed(6)} = ${baseUnits} base units)`
  );

  return {
    tokenAmount: BigInt(baseUnits),
    priceUsd: price.priceUsd,
  };
}

