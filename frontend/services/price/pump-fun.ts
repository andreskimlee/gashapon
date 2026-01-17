/**
 * Pump.fun Price Service
 *
 * Fetches token prices from pump.fun API to calculate
 * the correct token amount for a given USD cost.
 */

const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
const isDevnet = SOLANA_NETWORK === "devnet";

// pump.fun API URLs
const PUMP_FUN_API_URL = isDevnet
  ? "https://frontend-api-devnet-v3.pump.fun/coins-v2"
  : "https://frontend-api-v3.pump.fun/coins-v2";

interface PumpFunCoinResponse {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  metadata_uri: string;
  twitter: string | null;
  telegram: string | null;
  bonding_curve: string;
  associated_bonding_curve: string;
  creator: string;
  created_timestamp: number;
  raydium_pool: string | null;
  complete: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  total_supply: number;
  website: string | null;
  show_name: boolean;
  king_of_the_hill_timestamp: number | null;
  market_cap: number;
  reply_count: number;
  last_reply: number | null;
  nsfw: boolean;
  market_id: string | null;
  inverted: boolean | null;
  usd_market_cap: number;
}

export interface TokenPrice {
  priceUsd: number;
  priceSol: number;
  marketCapUsd: number;
  source: "pump.fun";
  timestamp: number;
}

// Cache prices for 10 seconds client-side
const priceCache: Map<string, { price: TokenPrice; expiresAt: number }> =
  new Map();
const CACHE_TTL_MS = 10_000;

/**
 * Fetch token price from pump.fun API
 */
export async function getTokenPrice(
  tokenMint: string
): Promise<TokenPrice | null> {
  // Check cache first
  const cached = priceCache.get(tokenMint);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(
      `[PriceService] Using cached price for ${tokenMint}: $${cached.price.priceUsd}`
    );
    return cached.price;
  }

  try {
    const apiUrl = `${PUMP_FUN_API_URL}/${tokenMint}`;
    console.log(
      `[PriceService] Fetching price from pump.fun (${SOLANA_NETWORK}): ${apiUrl}`
    );

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(
          `[PriceService] Token ${tokenMint} not found on pump.fun (${SOLANA_NETWORK})`
        );
        return null;
      }
      throw new Error(
        `pump.fun API (${SOLANA_NETWORK}) returned ${response.status}`
      );
    }

    const data: PumpFunCoinResponse = await response.json();

    // All pump.fun tokens have a fixed supply of 1 billion tokens
    const PUMP_FUN_TOTAL_SUPPLY = 1_000_000_000;

    // Price per token = market cap / total supply
    const priceUsd = data.usd_market_cap / PUMP_FUN_TOTAL_SUPPLY;
    const priceSol = data.market_cap / PUMP_FUN_TOTAL_SUPPLY;

    console.log(
      `[PriceService] pump.fun price for ${data.symbol}: $${priceUsd.toFixed(10)}/token ` +
        `(market cap: $${data.usd_market_cap.toFixed(2)})`
    );

    const price: TokenPrice = {
      priceUsd,
      priceSol,
      marketCapUsd: data.usd_market_cap,
      source: "pump.fun",
      timestamp: Date.now(),
    };

    // Cache the price
    priceCache.set(tokenMint, {
      price,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return price;
  } catch (error) {
    console.error(
      `[PriceService] Error fetching pump.fun price for ${tokenMint}:`,
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

/**
 * Clear the price cache (useful for testing or forcing refresh)
 */
export function clearPriceCache(): void {
  priceCache.clear();
}
