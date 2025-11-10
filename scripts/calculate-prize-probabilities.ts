/**
 * Prize Probability Calculator
 *
 * Calculates probabilities for prizes based on their costs to ensure profitability.
 *
 * Formula:
 * - Higher cost prizes = lower probability
 * - Lower cost prizes = higher probability
 * - Total probability < 1.0 (some plays lose)
 * - Ensures: game_cost > expected_value + overhead
 */

interface Prize {
  prizeId: number;
  name: string;
  costUsd: number; // Cost of physical good in USD cents
  supplyTotal: number;
}

interface GameConfig {
  gameCostUsd: number; // What user pays in USD cents
  prizes: Prize[];
  targetWinRate: number; // e.g., 0.7 = 70% win rate
  overheadPercent: number; // e.g., 0.2 = 20% overhead for operations
  priceSensitivity: number; // Controls how much price affects odds (higher = more sensitive)
}

interface CalculatedPrize extends Prize {
  probabilityBp: number; // Probability in basis points (0-10000)
  expectedValue: number; // prob * cost
}

/**
 * Calculate probabilities using inverse price weighting
 *
 * prob_i = (k / cost_i^alpha) normalized to target win rate
 * where alpha controls price sensitivity
 */
export function calculateProbabilities(config: GameConfig): CalculatedPrize[] {
  const { prizes, targetWinRate, priceSensitivity } = config;

  // Calculate raw weights (inverse of cost)
  const weights = prizes.map((prize) => {
    // Higher cost = lower weight
    // Using power function for sensitivity
    return Math.pow(prize.costUsd, -priceSensitivity);
  });

  // Sum of weights
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // Calculate probabilities (normalized to target win rate)
  const calculatedPrizes: CalculatedPrize[] = prizes.map((prize, idx) => {
    const rawProb = (weights[idx] / totalWeight) * targetWinRate;
    const probabilityBp = Math.round(rawProb * 10000); // Convert to basis points

    return {
      ...prize,
      probabilityBp,
      expectedValue: (probabilityBp / 10000) * prize.costUsd,
    };
  });

  return calculatedPrizes;
}

/**
 * Validate profitability
 */
export function validateProfitability(
  gameCostUsd: number,
  calculatedPrizes: CalculatedPrize[],
  overheadPercent: number
): {
  isValid: boolean;
  expectedValue: number;
  profitMargin: number;
  message: string;
} {
  const expectedValue = calculatedPrizes.reduce(
    (sum, prize) => sum + prize.expectedValue,
    0
  );

  const overhead = gameCostUsd * overheadPercent;
  const totalCost = expectedValue + overhead;
  const profitMargin = ((gameCostUsd - totalCost) / gameCostUsd) * 100;

  const isValid = gameCostUsd > totalCost;

  const message = isValid
    ? `✅ Profitable: ${profitMargin.toFixed(2)}% margin`
    : `❌ Not profitable: Expected loss of ${((totalCost - gameCostUsd) / 100).toFixed(2)} USD per play`;

  return {
    isValid,
    expectedValue,
    profitMargin,
    message,
  };
}

/**
 * Example usage
 */
export function example() {
  // Example: Sneaker game with Jordan 1s and smaller prizes
  const config: GameConfig = {
    gameCostUsd: 1000, // $10 per play
    targetWinRate: 0.7, // 70% win rate (30% lose)
    overheadPercent: 0.15, // 15% overhead
    priceSensitivity: 1.5, // Moderate sensitivity
    prizes: [
      {
        prizeId: 1,
        name: "Sticker Pack",
        costUsd: 50, // $0.50
        supplyTotal: 10000,
      },
      {
        prizeId: 2,
        name: "Keychain",
        costUsd: 200, // $2.00
        supplyTotal: 5000,
      },
      {
        prizeId: 3,
        name: "T-Shirt",
        costUsd: 1500, // $15.00
        supplyTotal: 1000,
      },
      {
        prizeId: 4,
        name: "Jordan 1 Retro",
        costUsd: 15000, // $150.00
        supplyTotal: 50,
      },
    ],
  };

  const calculated = calculateProbabilities(config);
  const validation = validateProfitability(
    config.gameCostUsd,
    calculated,
    config.overheadPercent
  );

  console.log("\n🎰 Prize Probability Calculation");
  console.log("=".repeat(60));
  console.log(`Game Cost: $${(config.gameCostUsd / 100).toFixed(2)}`);
  console.log(`Target Win Rate: ${(config.targetWinRate * 100).toFixed(0)}%`);
  console.log(`Overhead: ${(config.overheadPercent * 100).toFixed(0)}%`);
  console.log("\nPrizes:");

  calculated.forEach((prize) => {
    console.log(`\n  ${prize.name}:`);
    console.log(`    Cost: $${(prize.costUsd / 100).toFixed(2)}`);
    console.log(`    Probability: ${(prize.probabilityBp / 100).toFixed(2)}%`);
    console.log(
      `    Expected Value: $${(prize.expectedValue / 100).toFixed(4)}`
    );
    console.log(`    Supply: ${prize.supplyTotal}`);
  });

  console.log(`\n${validation.message}`);
  console.log(
    `Expected Value: $${(validation.expectedValue / 100).toFixed(2)}`
  );
  console.log(`Profit Margin: ${validation.profitMargin.toFixed(2)}%`);

  // Output for program initialization
  console.log("\n📋 For Program Initialization:");
  console.log("const prizePool = [");
  calculated.forEach((prize) => {
    console.log(`  {`);
    console.log(`    prizeId: new BN(${prize.prizeId}),`);
    console.log(`    name: "${prize.name}",`);
    console.log(
      `    metadataUri: "ipfs://${prize.name.toLowerCase().replace(/\s+/g, "-")}",`
    );
    console.log(`    physicalSku: "SKU-${prize.prizeId}",`);
    console.log(`    tier: { ${getTier(prize.probabilityBp)}: {} },`);
    console.log(`    probabilityBp: ${prize.probabilityBp},`);
    console.log(`    supplyTotal: ${prize.supplyTotal},`);
    console.log(`    supplyRemaining: ${prize.supplyTotal},`);
    console.log(`  },`);
  });
  console.log("];");

  return { calculated, validation };
}

function getTier(probabilityBp: number): string {
  if (probabilityBp >= 5000) return "common";
  if (probabilityBp >= 1000) return "uncommon";
  if (probabilityBp >= 100) return "rare";
  return "legendary";
}

// Run example if executed directly
if (require.main === module) {
  example();
}
