/**
 * Odds Calculator for Gashapon Games
 *
 * Automatically calculates prize probabilities to achieve 80% profit margin.
 * Uses inverse price weighting - more expensive prizes have lower odds.
 *
 * Formula:
 * 1. Calculate raw weight for each prize: w_i = 1 / (cost_i ^ priceSensitivity)
 * 2. Normalize weights to determine relative probabilities
 * 3. Scale to achieve target profit margin
 * 4. Validate expected value <= (1 - profitMargin) * playCost
 */

export type PrizeTier = "common" | "uncommon" | "rare" | "legendary";

export interface PrizeInput {
  id: string; // Temporary client-side ID
  name: string;
  description?: string;
  imageUrl?: string;
  metadataUri?: string;
  physicalSku: string;
  costUsd: number; // Cost of the prize in USD (e.g., 5.99)
  weightGrams?: number; // Prize weight in grams for shipping
  // Package dimensions for UPS shipping (in inches)
  lengthInches?: number;
  widthInches?: number;
  heightInches?: number;
  supplyTotal: number;
}

export interface CalculatedPrize extends PrizeInput {
  tier: PrizeTier;
  probabilityBasisPoints: number; // 0-10000 (100.00%)
  probabilityPercent: number; // Human-readable percentage
  expectedValueUsd: number; // probability * cost
}

export interface OddsCalculationResult {
  prizes: CalculatedPrize[];
  totalProbabilityBp: number; // Sum of all probabilities
  totalProbabilityPercent: number;
  expectedValuePerPlay: number; // Total expected payout per play
  profitMarginPercent: number;
  profitPerPlay: number;
  isValid: boolean;
  validationMessage: string;
}

export interface OddsCalculatorConfig {
  playCostUsd: number; // What user pays per play
  targetProfitMargin: number; // 0.80 = 80%
  priceSensitivity: number; // Controls odds curve (1.0 = linear, 2.0 = quadratic)
  minimumWinRate: number; // Minimum total win probability (e.g., 0.4 = 40%)
  maximumWinRate: number; // Maximum total win probability (e.g., 0.95 = 95%)
}

// Claw machine style defaults:
// - LOW, FIXED play cost ($1-5) regardless of prize value
// - Win rate is CALCULATED to achieve profit margin
// - Expensive prizes = lower odds, cheap prizes = higher odds
export const DEFAULT_CONFIG: OddsCalculatorConfig = {
  playCostUsd: 2.0, // Fixed accessible entry point
  targetProfitMargin: 0.8, // 80% profit margin
  priceSensitivity: 1.2, // Moderate difference between cheap/expensive prizes
  minimumWinRate: 0.01, // 1% minimum (very rare wins possible)
  maximumWinRate: 0.5, // 50% maximum (can be overridden by user up to 95%)
};

/**
 * Determines prize tier based on probability
 */
function determineTier(probabilityBp: number): PrizeTier {
  if (probabilityBp >= 3000) return "common"; // >= 30%
  if (probabilityBp >= 1000) return "uncommon"; // >= 10%
  if (probabilityBp >= 100) return "rare"; // >= 1%
  return "legendary"; // < 1%
}

/**
 * Calculates prize odds using TIERED PROBABILITY with minimum floors.
 *
 * THE PROBLEM WITH PURE INVENTORY ECONOMICS:
 * Mixing expensive items ($500 PS5) with cheap items ($10 plush) creates
 * terrible player experience - win rates get dragged down to <1%.
 *
 * THE SOLUTION - TIERED APPROACH:
 * 1. Cheap prizes (<$30) get MINIMUM probability floors = more frequent wins
 * 2. Medium prizes ($30-$150) get moderate odds
 * 3. Expensive prizes (>$150) are treated as "jackpots" = very rare
 * 4. Adjust profit margin based on resulting expected value
 *
 * This creates a GACHA-style experience:
 * - Players win something 5-15% of the time (keeps them engaged)
 * - Most wins are common items (maintains profit)
 * - Jackpots are rare but possible (excitement factor)
 */
export function calculateOdds(
  prizes: PrizeInput[],
  config: OddsCalculatorConfig = DEFAULT_CONFIG
): OddsCalculationResult {
  if (prizes.length === 0) {
    return {
      prizes: [],
      totalProbabilityBp: 0,
      totalProbabilityPercent: 0,
      expectedValuePerPlay: 0,
      profitMarginPercent: 100,
      profitPerPlay: config.playCostUsd,
      isValid: false,
      validationMessage: "No prizes added yet",
    };
  }

  const { playCostUsd, targetProfitMargin, priceSensitivity } = config;

  // Step 1: Calculate total inventory
  const totalPrizeValue = prizes.reduce((sum, prize) => {
    return sum + prize.costUsd * prize.supplyTotal;
  }, 0);

  const totalSupply = prizes.reduce((sum, prize) => {
    return sum + prize.supplyTotal;
  }, 0);

  if (totalSupply === 0 || totalPrizeValue === 0) {
    return {
      prizes: prizes.map((p) => ({
        ...p,
        tier: "common" as PrizeTier,
        probabilityBasisPoints: 0,
        probabilityPercent: 0,
        expectedValueUsd: 0,
      })),
      totalProbabilityBp: 0,
      totalProbabilityPercent: 0,
      expectedValuePerPlay: 0,
      profitMarginPercent: 100,
      profitPerPlay: playCostUsd,
      isValid: false,
      validationMessage: "No valid prizes with supply",
    };
  }

  // Step 2: Calculate max expected payout per play for target profit
  const maxExpectedPayout = playCostUsd * (1 - targetProfitMargin);

  // Step 3: Calculate TIERED probabilities
  // Key insight: probability should give cheap items higher odds while
  // staying within the expected payout budget

  // Price thresholds for tiers (relative to play cost)
  const COMMON_THRESHOLD = playCostUsd * 10; // < 10x play cost = common
  const RARE_THRESHOLD = playCostUsd * 50; // 10-50x play cost = rare
  // > 50x play cost = legendary/jackpot

  // Base probability multipliers for each tier
  const COMMON_MULT = 3.0; // Common items get 3x base weight
  const RARE_MULT = 0.5; // Rare items get 0.5x base weight
  const LEGENDARY_MULT = 0.1; // Legendary items get 0.1x base weight

  // Calculate weighted probabilities
  const weights = prizes.map((prize) => {
    if (prize.costUsd <= 0) return 0;

    // Determine tier multiplier based on price
    let tierMult: number;
    if (prize.costUsd <= COMMON_THRESHOLD) {
      tierMult = COMMON_MULT;
    } else if (prize.costUsd <= RARE_THRESHOLD) {
      tierMult = RARE_MULT;
    } else {
      tierMult = LEGENDARY_MULT;
    }

    // Weight = (supply × tierMult) / cost^sensitivity
    // This gives cheap items much higher relative probability
    return (
      (prize.supplyTotal * tierMult) / Math.pow(prize.costUsd, priceSensitivity)
    );
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight === 0) {
    return {
      prizes: prizes.map((p) => ({
        ...p,
        tier: "common" as PrizeTier,
        probabilityBasisPoints: 0,
        probabilityPercent: 0,
        expectedValueUsd: 0,
      })),
      totalProbabilityBp: 0,
      totalProbabilityPercent: 0,
      expectedValuePerPlay: 0,
      profitMarginPercent: 100,
      profitPerPlay: playCostUsd,
      isValid: false,
      validationMessage: "All prizes have zero or negative costs",
    };
  }

  // Step 4: Calculate raw probabilities (normalized weights)
  const rawProbabilities = weights.map((w) => w / totalWeight);

  // Step 5: Calculate what expected value would be at these ratios
  const rawExpectedValue = prizes.reduce((sum, prize, idx) => {
    return sum + rawProbabilities[idx] * prize.costUsd;
  }, 0);

  // Step 6: Scale probabilities to fit within max expected payout
  // PRIMARY CONSTRAINT: Never exceed max payout (protect profit margin)
  let scaleFactor = maxExpectedPayout / rawExpectedValue;

  // Calculate what the win rate would be at this scale
  const rawTotalProb = rawProbabilities.reduce((sum, p) => sum + p, 0);
  let scaledTotalProb = rawTotalProb * scaleFactor;

  // Win rate bounds from config (allow user customization)
  const MIN_WIN_RATE = config.minimumWinRate;
  const MAX_WIN_RATE = config.maximumWinRate;

  // Only boost win rate if we have profit headroom
  // Check: would boosting to MIN_WIN_RATE exceed our payout budget?
  if (scaledTotalProb < MIN_WIN_RATE) {
    const boostFactor = MIN_WIN_RATE / rawTotalProb;
    const boostedEV = rawExpectedValue * boostFactor;

    // Only apply boost if we'd still have positive profit
    // Use dynamic threshold based on target profit margin
    const maxAllowedPayout =
      playCostUsd * (1 - Math.max(0.15, targetProfitMargin - 0.65));
    if (boostedEV <= maxAllowedPayout) {
      scaleFactor = boostFactor;
      scaledTotalProb = MIN_WIN_RATE;
    }
    // Otherwise keep original scale factor (low win rate but profitable)
  } else if (scaledTotalProb > MAX_WIN_RATE) {
    scaleFactor = MAX_WIN_RATE / rawTotalProb;
  }

  // Step 7: Calculate final probabilities with minimum floor
  // IMPORTANT: Every prize must have at least SOME visible chance
  // This creates hope and excitement for jackpot items
  const MIN_PROBABILITY_BP = 1; // 0.01% minimum (1 basis point)

  const calculatedPrizes: CalculatedPrize[] = prizes.map((prize, idx) => {
    let probability = rawProbabilities[idx] * scaleFactor;

    // Enforce minimum probability for items with supply
    // Players need to SEE a number, even if tiny, to feel hope
    if (prize.supplyTotal > 0 && probability * 10000 < MIN_PROBABILITY_BP) {
      probability = MIN_PROBABILITY_BP / 10000; // 0.01%
    }

    const probabilityBasisPoints = Math.max(
      prize.supplyTotal > 0 ? MIN_PROBABILITY_BP : 0,
      Math.round(probability * 10000)
    );
    const expectedValueUsd = probability * prize.costUsd;

    return {
      ...prize,
      tier: determineTier(probabilityBasisPoints),
      probabilityBasisPoints,
      probabilityPercent: Number((probability * 100).toFixed(2)),
      expectedValueUsd: Number(expectedValueUsd.toFixed(4)),
    };
  });

  // Calculate totals
  const totalProbabilityBp = calculatedPrizes.reduce(
    (sum, p) => sum + p.probabilityBasisPoints,
    0
  );
  const expectedValuePerPlay = calculatedPrizes.reduce(
    (sum, p) => sum + p.expectedValueUsd,
    0
  );
  const profitPerPlay = playCostUsd - expectedValuePerPlay;
  const profitMarginPercent = (profitPerPlay / playCostUsd) * 100;

  // Step 8: Calculate how many plays to exhaust inventory at this rate
  const avgWinsPerPlay = totalProbabilityBp / 10000;
  const playsToExhaust =
    avgWinsPerPlay > 0 ? Math.ceil(totalSupply / avgWinsPerPlay) : 0;

  // Validation
  let isValid = true;
  let validationMessage = "";

  if (totalProbabilityBp > 10000) {
    isValid = false;
    validationMessage = "Win rate exceeds 100%. Increase play cost.";
  } else if (profitMarginPercent < 50) {
    isValid = false;
    validationMessage = `Profit margin ${profitMarginPercent.toFixed(0)}% too low. Increase play cost or reduce prizes.`;
  } else if (profitMarginPercent >= targetProfitMargin * 100 - 5) {
    validationMessage = `✓ ${profitMarginPercent.toFixed(0)}% profit, ${(totalProbabilityBp / 100).toFixed(1)}% win rate`;
  } else {
    validationMessage = `⚠ ${profitMarginPercent.toFixed(0)}% profit (target: ${(targetProfitMargin * 100).toFixed(0)}%) - ${(totalProbabilityBp / 100).toFixed(1)}% win rate`;
  }

  return {
    prizes: calculatedPrizes,
    totalProbabilityBp,
    totalProbabilityPercent: Number((totalProbabilityBp / 100).toFixed(2)),
    expectedValuePerPlay: Number(expectedValuePerPlay.toFixed(4)),
    profitMarginPercent: Number(profitMarginPercent.toFixed(2)),
    profitPerPlay: Number(profitPerPlay.toFixed(4)),
    isValid,
    validationMessage,
  };
}

/**
 * Generates a unique SKU based on game name and prize name
 */
export function generateSku(
  gameName: string,
  prizeName: string,
  index: number
): string {
  const gamePrefix = gameName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
  const prizePrefix = prizeName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
  return `${gamePrefix}-${prizePrefix}-${String(index + 1).padStart(3, "0")}`;
}

/**
 * Formats USD amount for display
 */
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Formats percentage for display with appropriate precision
 * - Values >= 1%: 2 decimal places (e.g., "5.25%")
 * - Values < 1%: 3 decimal places (e.g., "0.015%")
 * - Values < 0.01%: scientific notation or "< 0.01%"
 */
export function formatPercent(value: number): string {
  if (value >= 1) {
    return `${value.toFixed(2)}%`;
  } else if (value >= 0.01) {
    return `${value.toFixed(3)}%`;
  } else if (value > 0) {
    return `${value.toFixed(3)}%`; // Shows 0.010% etc.
  }
  return "0%";
}

/**
 * Formats odds in a human-friendly way
 * e.g., "1 in 100" or "1 in 10,000"
 */
export function formatOddsRatio(probabilityPercent: number): string {
  if (probabilityPercent <= 0) return "N/A";
  const ratio = Math.round(100 / probabilityPercent);
  if (ratio >= 1000) {
    return `1 in ${ratio.toLocaleString()}`;
  }
  return `1 in ${ratio}`;
}

/**
 * ============================================================================
 * GAME THEORY-OPTIMIZED PRICING ALGORITHM
 * ============================================================================
 *
 * Psychological principles applied:
 *
 * 1. VARIABLE RATIO REINFORCEMENT (Skinner)
 *    - Random rewards are the most addictive
 *    - Win rates between 5-15% feel achievable yet challenging
 *
 * 2. LOSS AVERSION (Kahneman & Tversky)
 *    - Play cost must feel "small" relative to prize value
 *    - Target: Play cost < 5% of average prize value
 *
 * 3. ANCHORING EFFECT
 *    - Players anchor on the prize value, not expected value
 *    - "$2 for a chance at $500" sounds amazing (250x return)
 *
 * 4. SUNK COST FALLACY
 *    - Low barrier = more likely to try once
 *    - Once invested, players rationalize continuing
 *
 * 5. SESSION ECONOMICS
 *    - Players budget for sessions, not single plays
 *    - Target: 10-20 plays per typical session ($10-$30)
 *
 * 6. PSYCHOLOGICAL PRICING
 *    - $X.99 feels cheaper than $X+1.00 (left-digit effect)
 *    - Charm pricing increases conversion
 *
 * 7. MINIMUM VIABLE WIN RATE
 *    - Even with expensive prizes, floor at 3-5%
 *    - Players need to SEE someone win to believe they can
 *
 * ============================================================================
 */
export function calculateOptimalPlayCost(
  prizes: PrizeInput[],
  config: Omit<OddsCalculatorConfig, "playCostUsd">
): {
  playCostUsd: number;
  expectedPayout: number;
  totalWinRate: number;
  totalPrizeValue: number;
  totalSupply: number;
  requiredRevenue: number;
  totalPlaysNeeded: number;
  psychologyFactors: {
    sessionPlays: number; // How many plays in a $20 session
    perceivedMultiplier: string; // e.g., "100x return"
    winRateFeeling: string; // e.g., "1 in 25 plays"
  };
} {
  if (prizes.length === 0 || prizes.every((p) => p.costUsd <= 0)) {
    return {
      playCostUsd: 1.99,
      expectedPayout: 0,
      totalWinRate: 0,
      totalPrizeValue: 0,
      totalSupply: 0,
      requiredRevenue: 0,
      totalPlaysNeeded: 0,
      psychologyFactors: {
        sessionPlays: 10,
        perceivedMultiplier: "0x",
        winRateFeeling: "N/A",
      },
    };
  }

  const { targetProfitMargin, minimumWinRate } = config;

  // ==========================================================================
  // STEP 1: Calculate inventory economics
  // ==========================================================================
  const totalPrizeValue = prizes.reduce((sum, prize) => {
    return sum + prize.costUsd * prize.supplyTotal;
  }, 0);

  const totalSupply = prizes.reduce((sum, prize) => {
    return sum + prize.supplyTotal;
  }, 0);

  if (totalSupply === 0) {
    return {
      playCostUsd: 1.99,
      expectedPayout: 0,
      totalWinRate: 0,
      totalPrizeValue: 0,
      totalSupply: 0,
      requiredRevenue: 0,
      totalPlaysNeeded: 0,
      psychologyFactors: {
        sessionPlays: 10,
        perceivedMultiplier: "0x",
        winRateFeeling: "N/A",
      },
    };
  }

  const avgPrizeValue = totalPrizeValue / totalSupply;
  const maxPrizeValue = Math.max(...prizes.map((p) => p.costUsd));

  // ==========================================================================
  // STEP 2: Determine play cost tier based on prize tier
  // Game theory: Higher perceived value = can charge more, but keep accessible
  // ==========================================================================

  // Price tiers based on average prize value
  // Key insight: Players will pay more when jackpots are visible
  let baseCost: number;
  let minCost: number;
  let maxCost: number;

  if (avgPrizeValue < 25) {
    // Budget tier: Arcade prizes, keychains, small items
    // Target: Impulse buy territory
    baseCost = 0.99;
    minCost = 0.49;
    maxCost = 1.99;
  } else if (avgPrizeValue < 75) {
    // Standard tier: Plushies, small electronics, games
    // Target: "Just a coffee" price
    baseCost = 1.99;
    minCost = 0.99;
    maxCost = 2.99;
  } else if (avgPrizeValue < 200) {
    // Premium tier: Controllers, AirPods, accessories
    // Target: "Movie ticket" price
    baseCost = 2.99;
    minCost = 1.99;
    maxCost = 4.99;
  } else if (avgPrizeValue < 500) {
    // High-value tier: Consoles, high-end electronics
    // Target: "Lunch" price - still feels accessible
    baseCost = 4.99;
    minCost = 2.99;
    maxCost = 7.99;
  } else {
    // Jackpot tier: Premium consoles, bundles
    // Target: Keep it under "dinner" price
    baseCost = 7.99;
    minCost = 4.99;
    maxCost = 14.99;
  }

  // ==========================================================================
  // STEP 3: Calculate required revenue
  // ==========================================================================
  const requiredRevenue = totalPrizeValue / (1 - targetProfitMargin);

  // ==========================================================================
  // STEP 4: Find optimal price that balances profit and psychology
  // ==========================================================================

  // Start with base cost and check if win rate is acceptable
  let playCostUsd = baseCost;
  let totalPlaysNeeded = requiredRevenue / playCostUsd;
  let winRate = totalSupply / totalPlaysNeeded;

  // CRITICAL: Enforce minimum win rate for player psychology
  // Below certain thresholds, players feel the game is rigged
  // However, for jackpot-tier prizes, players EXPECT rare wins
  const PSYCHOLOGICAL_MIN_WIN_RATE =
    avgPrizeValue > 300
      ? 0.005 // 0.5% for jackpot machines (1 in 200) - players expect rare jackpots
      : avgPrizeValue > 100
        ? 0.015 // 1.5% for premium prizes (1 in 67)
        : Math.max(minimumWinRate, 0.03); // 3% for regular prizes (1 in 33)

  // If win rate is too low, we need to INCREASE the play cost
  // This counter-intuitive move actually makes the game more enticing:
  // Players think "expensive = better odds" (which is true here)
  if (winRate < PSYCHOLOGICAL_MIN_WIN_RATE) {
    // Recalculate: we need totalPlays such that winRate = minRate
    // winRate = totalSupply / totalPlays
    // totalPlays = totalSupply / winRate
    const requiredPlays = totalSupply / PSYCHOLOGICAL_MIN_WIN_RATE;
    // revenue = plays × cost, so cost = revenue / plays
    const requiredCost = requiredRevenue / requiredPlays;

    // Apply this higher cost, but cap it at max for the tier
    playCostUsd = Math.min(requiredCost, maxCost);
  }

  // If win rate is too HIGH, we're leaving money on table
  // Lower the cost to increase plays needed
  // Use config max win rate instead of hard-coded value
  const configMaxWinRate = config.maximumWinRate ?? 0.25;
  if (winRate > configMaxWinRate) {
    const requiredPlays = totalSupply / configMaxWinRate;
    const requiredCost = requiredRevenue / requiredPlays;
    playCostUsd = Math.max(requiredCost, minCost);
  }

  // Ensure within bounds
  playCostUsd = Math.max(minCost, Math.min(maxCost, playCostUsd));

  // ==========================================================================
  // STEP 5: Apply psychological pricing (charm pricing)
  // ==========================================================================
  // Round to .99 or .49 price points (left-digit effect)
  playCostUsd = applyCharmPricing(playCostUsd);

  // ==========================================================================
  // STEP 6: Final calculations
  // ==========================================================================
  totalPlaysNeeded = requiredRevenue / playCostUsd;
  winRate = totalSupply / totalPlaysNeeded;
  const expectedPayout = totalPrizeValue / totalPlaysNeeded;

  // ==========================================================================
  // STEP 7: Calculate psychology factors for UI
  // ==========================================================================
  const SESSION_BUDGET = 20; // Typical player session budget
  const sessionPlays = Math.floor(SESSION_BUDGET / playCostUsd);
  const perceivedMultiplier = `${Math.round(maxPrizeValue / playCostUsd)}x`;
  const playsToWin = Math.round(1 / winRate);
  const winRateFeeling = `1 in ${playsToWin} plays`;

  return {
    playCostUsd,
    expectedPayout,
    totalWinRate: winRate * 100,
    totalPrizeValue,
    totalSupply,
    requiredRevenue,
    totalPlaysNeeded: Math.ceil(totalPlaysNeeded),
    psychologyFactors: {
      sessionPlays,
      perceivedMultiplier,
      winRateFeeling,
    },
  };
}

/**
 * Applies psychological "charm pricing" to make prices feel lower.
 * Uses the left-digit effect: $4.99 feels much cheaper than $5.00
 */
function applyCharmPricing(price: number): number {
  // Common charm price points
  const CHARM_PRICES = [
    0.49, 0.99, 1.49, 1.99, 2.49, 2.99, 3.49, 3.99, 4.49, 4.99, 5.99, 6.99,
    7.99, 9.99, 12.99, 14.99, 19.99,
  ];

  // Find the nearest charm price that doesn't exceed our target by too much
  // and doesn't go below by too much either
  let bestPrice = CHARM_PRICES[0];
  let bestDiff = Math.abs(price - bestPrice);

  for (const charm of CHARM_PRICES) {
    const diff = Math.abs(price - charm);
    // Prefer prices at or just below target
    // Weight: slight preference for lower prices (loss aversion)
    const weightedDiff = charm > price ? diff * 1.2 : diff;
    if (weightedDiff < bestDiff) {
      bestDiff = weightedDiff;
      bestPrice = charm;
    }
  }

  return bestPrice;
}
