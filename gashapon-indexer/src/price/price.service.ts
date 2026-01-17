import { Injectable, Logger } from '@nestjs/common';

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

interface TokenPrice {
  priceUsd: number;
  priceSol: number;
  marketCapUsd: number;
  source: 'pump.fun' | 'raydium' | 'fallback';
  timestamp: number;
}

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);

  // Network configuration
  private readonly network = process.env.SOLANA_NETWORK || 'devnet';
  private readonly isDevnet = this.network === 'devnet';

  // pump.fun API URLs
  private readonly PUMP_FUN_API_URL = this.isDevnet
    ? 'https://frontend-api-devnet-v3.pump.fun/coins-v2'
    : 'https://frontend-api-v3.pump.fun/coins-v2';

  // Cache prices for 5 seconds to reduce stale price risk
  private priceCache: Map<string, { price: TokenPrice; expiresAt: number }> =
    new Map();
  private readonly CACHE_TTL_MS = 5_000; // 5 seconds (reduced from 10)

  // Price history for TWAP calculation (prevents flash manipulation)
  private priceHistory: Map<string, { price: number; timestamp: number }[]> =
    new Map();
  private readonly TWAP_WINDOW_MS = 60_000; // 1 minute window
  private readonly TWAP_MIN_SAMPLES = 3; // Minimum samples for TWAP

  // Slippage tolerance (1% - tighter to prevent gaming)
  private readonly SLIPPAGE_TOLERANCE = 0.01;

  // Maximum age of a transaction before we reject verification (prevents stale plays)
  private readonly MAX_TX_AGE_SECONDS = 60; // 1 minute

  /**
   * Get the current price of a token in USD
   * First tries pump.fun API, then falls back to Raydium if available
   */
  async getTokenPriceUsd(tokenMint: string): Promise<TokenPrice | null> {
    // Check cache first
    const cached = this.priceCache.get(tokenMint);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(
        `Using cached price for ${tokenMint}: $${cached.price.priceUsd}`,
      );
      return cached.price;
    }

    // Try pump.fun API
    const pumpPrice = await this.fetchPumpFunPrice(tokenMint);
    if (pumpPrice) {
      this.cachePrice(tokenMint, pumpPrice);
      return pumpPrice;
    }

    // TODO: Add Raydium fallback for tokens that graduated from pump.fun
    // const raydiumPrice = await this.fetchRaydiumPrice(tokenMint);
    // if (raydiumPrice) {
    //   this.cachePrice(tokenMint, raydiumPrice);
    //   return raydiumPrice;
    // }

    this.logger.warn(`Could not fetch price for token: ${tokenMint}`);
    return null;
  }

  /**
   * Fetch price from pump.fun API
   * Uses devnet or mainnet API based on SOLANA_NETWORK env var
   */
  private async fetchPumpFunPrice(
    tokenMint: string,
  ): Promise<TokenPrice | null> {
    try {
      const apiUrl = `${this.PUMP_FUN_API_URL}/${tokenMint}`;
      this.logger.debug(
        `Fetching price from pump.fun (${this.network}): ${apiUrl}`,
      );

      const response = await fetch(apiUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Gashapon-Indexer/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          this.logger.debug(
            `Token ${tokenMint} not found on pump.fun (${this.network})`,
          );
          return null;
        }
        throw new Error(`pump.fun API (${this.network}) returned ${response.status}`);
      }

      const data: PumpFunCoinResponse = await response.json();

      // All pump.fun tokens have a fixed supply of 1 billion tokens
      const PUMP_FUN_TOTAL_SUPPLY = 1_000_000_000;

      // Price per token = market cap / total supply
      const priceUsd = data.usd_market_cap / PUMP_FUN_TOTAL_SUPPLY;
      const priceSol = data.market_cap / PUMP_FUN_TOTAL_SUPPLY;

      this.logger.debug(
        `pump.fun price for ${data.symbol}: $${priceUsd.toFixed(10)}/token ` +
          `(market cap: $${data.usd_market_cap.toFixed(2)})`,
      );

      return {
        priceUsd,
        priceSol,
        marketCapUsd: data.usd_market_cap,
        source: 'pump.fun',
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error(
        `Error fetching pump.fun price for ${tokenMint}: ${error}`,
      );
      return null;
    }
  }

  /**
   * Cache a price for a token and add to price history for TWAP
   */
  private cachePrice(tokenMint: string, price: TokenPrice): void {
    this.priceCache.set(tokenMint, {
      price,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    // Add to price history for TWAP calculation
    this.addToPriceHistory(tokenMint, price.priceUsd);
  }

  /**
   * Add a price sample to the history for TWAP calculation
   */
  private addToPriceHistory(tokenMint: string, priceUsd: number): void {
    const now = Date.now();
    const history = this.priceHistory.get(tokenMint) || [];

    // Add new sample
    history.push({ price: priceUsd, timestamp: now });

    // Remove samples older than TWAP window
    const cutoff = now - this.TWAP_WINDOW_MS;
    const filtered = history.filter((s) => s.timestamp > cutoff);

    this.priceHistory.set(tokenMint, filtered);
  }

  /**
   * Calculate Time-Weighted Average Price (TWAP) to prevent flash manipulation
   * Falls back to spot price if not enough history
   */
  private getTwapPrice(tokenMint: string, spotPrice: number): number {
    const history = this.priceHistory.get(tokenMint) || [];

    if (history.length < this.TWAP_MIN_SAMPLES) {
      this.logger.debug(
        `TWAP: Not enough samples (${history.length}/${this.TWAP_MIN_SAMPLES}), using spot price`,
      );
      return spotPrice;
    }

    // Simple average (could be enhanced with time-weighting)
    const sum = history.reduce((acc, s) => acc + s.price, 0);
    const twap = sum / history.length;

    this.logger.debug(
      `TWAP for ${tokenMint}: $${twap.toFixed(10)} (${history.length} samples, spot=$${spotPrice.toFixed(10)})`,
    );

    return twap;
  }

  /**
   * Detect potential price manipulation by comparing spot vs TWAP
   * Returns true if manipulation is suspected
   */
  private detectManipulation(
    tokenMint: string,
    spotPrice: number,
    twapPrice: number,
  ): { isManipulated: boolean; deviation: number } {
    // If spot price deviates more than 10% from TWAP, flag as potential manipulation
    const deviation = Math.abs(spotPrice - twapPrice) / twapPrice;
    const isManipulated = deviation > 0.1; // 10% threshold

    if (isManipulated) {
      this.logger.warn(
        `⚠️ Potential price manipulation detected for ${tokenMint}: ` +
          `spot=$${spotPrice.toFixed(8)}, twap=$${twapPrice.toFixed(8)}, deviation=${(deviation * 100).toFixed(1)}%`,
      );
    }

    return { isManipulated, deviation };
  }

  /**
   * Calculate the minimum token amount required for a given USD cost
   * @param costUsdCents The cost in USD cents (e.g., 500 = $5.00)
   * @param tokenPriceUsd The current token price in USD
   * @param tokenDecimals The token's decimal places (default: 6)
   * @returns The minimum token amount in base units
   */
  calculateMinTokens(
    costUsdCents: number,
    tokenPriceUsd: number,
    tokenDecimals: number = 6,
  ): bigint {
    // Convert cents to dollars
    const costUsd = costUsdCents / 100;

    // Calculate raw token amount (in human-readable form)
    const rawTokens = costUsd / tokenPriceUsd;

    // Apply slippage tolerance (allow slightly less due to price movement)
    const tokensWithSlippage = rawTokens * (1 - this.SLIPPAGE_TOLERANCE);

    // Convert to base units (multiply by 10^decimals)
    const baseUnits = Math.floor(
      tokensWithSlippage * Math.pow(10, tokenDecimals),
    );

    return BigInt(baseUnits);
  }

  /**
   * Verify that a payment amount is sufficient for the given USD cost
   * Implements multiple anti-gaming protections:
   * 1. TWAP-based pricing (prevents flash manipulation)
   * 2. Manipulation detection (flags suspicious price deviations)
   * 3. Transaction age check (rejects stale plays)
   * 4. Conservative use of higher price (spot vs TWAP)
   *
   * @param tokenAmount The amount of tokens paid (in base units)
   * @param costUsdCents The required cost in USD cents
   * @param tokenMint The token mint address
   * @param tokenDecimals The token's decimal places (default: 6)
   * @param txTimestamp Optional transaction timestamp (unix seconds)
   * @returns Object with verification result and details
   */
  async verifyPayment(
    tokenAmount: bigint,
    costUsdCents: number,
    tokenMint: string,
    tokenDecimals: number = 6,
    txTimestamp?: number,
  ): Promise<{
    isValid: boolean;
    tokenPrice: number | null;
    requiredTokens: bigint | null;
    actualUsdValue: number | null;
    message: string;
    flags: {
      isStale: boolean;
      isManipulated: boolean;
      usedTwap: boolean;
    };
  }> {
    const flags = {
      isStale: false,
      isManipulated: false,
      usedTwap: false,
    };

    // 1. Check transaction age (prevent stale plays)
    if (txTimestamp) {
      const txAge = Math.floor(Date.now() / 1000) - txTimestamp;
      if (txAge > this.MAX_TX_AGE_SECONDS) {
        flags.isStale = true;
        this.logger.warn(
          `Transaction too old: ${txAge}s > ${this.MAX_TX_AGE_SECONDS}s max`,
        );
        return {
          isValid: false,
          tokenPrice: null,
          requiredTokens: null,
          actualUsdValue: null,
          message: `Transaction too old (${txAge}s). Max age is ${this.MAX_TX_AGE_SECONDS}s.`,
          flags,
        };
      }
    }

    // 2. Get current token price
    const price = await this.getTokenPriceUsd(tokenMint);

    if (!price) {
      return {
        isValid: false,
        tokenPrice: null,
        requiredTokens: null,
        actualUsdValue: null,
        message: `Could not fetch price for token ${tokenMint}`,
        flags,
      };
    }

    const spotPrice = price.priceUsd;

    // 3. Calculate TWAP and check for manipulation
    const twapPrice = this.getTwapPrice(tokenMint, spotPrice);
    const manipulation = this.detectManipulation(
      tokenMint,
      spotPrice,
      twapPrice,
    );
    flags.isManipulated = manipulation.isManipulated;

    // 4. Choose price conservatively (use HIGHER price to prevent gaming)
    // If user manipulated price DOWN, TWAP will be higher → more tokens required
    // If user manipulated price UP, spot will be higher → more tokens required
    let priceForCalculation: number;

    if (manipulation.isManipulated) {
      // Use the higher of spot vs TWAP (conservative)
      priceForCalculation = Math.min(spotPrice, twapPrice);
      flags.usedTwap = priceForCalculation === twapPrice;
      this.logger.warn(
        `Using conservative price due to manipulation: $${priceForCalculation.toFixed(10)}`,
      );
    } else {
      // Normal case: use spot price
      priceForCalculation = spotPrice;
    }

    // 5. Calculate minimum required tokens using conservative price
    const requiredTokens = this.calculateMinTokens(
      costUsdCents,
      priceForCalculation,
      tokenDecimals,
    );

    // 6. Calculate actual USD value using spot price (what user actually paid)
    const tokenAmountHuman = Number(tokenAmount) / Math.pow(10, tokenDecimals);
    const actualUsdValue = tokenAmountHuman * spotPrice;

    // 7. Check if payment is sufficient
    const isValid = tokenAmount >= requiredTokens;

    const requiredUsd = costUsdCents / 100;

    this.logger.log(
      `Payment verification: ` +
        `paid=${tokenAmount} tokens ($${actualUsdValue.toFixed(2)}), ` +
        `required=${requiredTokens} tokens ($${requiredUsd.toFixed(2)}), ` +
        `spotPrice=$${spotPrice.toFixed(10)}, ` +
        `twapPrice=$${twapPrice.toFixed(10)}, ` +
        `usedPrice=$${priceForCalculation.toFixed(10)}, ` +
        `valid=${isValid}, ` +
        `flags=${JSON.stringify(flags)}`,
    );

    return {
      isValid,
      tokenPrice: priceForCalculation,
      requiredTokens,
      actualUsdValue,
      message: isValid
        ? `Payment verified: $${actualUsdValue.toFixed(2)} >= $${requiredUsd.toFixed(2)}`
        : `Insufficient payment: $${actualUsdValue.toFixed(2)} < $${requiredUsd.toFixed(2)}${flags.isManipulated ? ' (manipulation detected)' : ''}`,
      flags,
    };
  }

  /**
   * Clear the price cache (useful for testing)
   */
  clearCache(): void {
    this.priceCache.clear();
  }
}
