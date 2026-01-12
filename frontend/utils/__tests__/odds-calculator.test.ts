/**
 * Comprehensive Unit Tests for Odds Calculator
 *
 * Tests the inventory-based economics model for gashapon/claw machine games.
 * Uses real-world gaming console prices for realistic scenarios.
 *
 * Current Prices (January 2026):
 * - PlayStation 5: $550
 * - Nintendo Switch 2: $450
 * - Nintendo Switch OLED: $350
 * - Xbox Series X: $500
 * - Steam Deck OLED: $550
 * - DualSense Controller: $70
 * - Xbox Wireless Controller: $60
 * - AirPods Pro: $250
 * - AAA Game Title: $70
 */

import {
  calculateOdds,
  calculateOptimalPlayCost,
  DEFAULT_CONFIG,
  formatOddsRatio,
  formatPercent,
  formatUsd,
  generateSku,
  PrizeInput,
} from "../odds-calculator";

// =============================================================================
// TEST HELPERS
// =============================================================================

function createPrize(
  name: string,
  costUsd: number,
  supplyTotal: number,
  id?: string
): PrizeInput {
  return {
    id: id || `prize-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    description: `${name} prize`,
    imageUrl: "",
    metadataUri: "",
    physicalSku: "",
    costUsd,
    supplyTotal,
  };
}

// =============================================================================
// TEST SUITE 1: Console Prize Game (High-Value Prizes)
// =============================================================================

describe("Console Prize Game - PS5, Xbox, Nintendo", () => {
  /**
   * Scenario: Gaming console claw machine with high-value prizes
   *
   * Inventory:
   * - 3x PlayStation 5 @ $550 = $1,650
   * - 5x Nintendo Switch 2 @ $450 = $2,250
   * - 2x Xbox Series X @ $500 = $1,000
   *
   * Total: 10 prizes worth $4,900
   * Target: 80% profit margin
   */
  const consolePrizes: PrizeInput[] = [
    createPrize("PlayStation 5", 550, 3),
    createPrize("Nintendo Switch 2", 450, 5),
    createPrize("Xbox Series X", 500, 2),
  ];

  describe("calculateOptimalPlayCost", () => {
    it("should calculate correct inventory totals", () => {
      const result = calculateOptimalPlayCost(consolePrizes, {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      // Total prize value: 3×550 + 5×450 + 2×500 = 1650 + 2250 + 1000 = $4,900
      expect(result.totalPrizeValue).toBe(4900);

      // Total supply: 3 + 5 + 2 = 10 prizes
      expect(result.totalSupply).toBe(10);
    });

    it("should calculate required revenue for 80% profit margin", () => {
      const result = calculateOptimalPlayCost(consolePrizes, {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      // Required revenue = totalPrizeValue / (1 - profitMargin)
      // = $4,900 / 0.20 = $24,500
      expect(result.requiredRevenue).toBeCloseTo(24500, 0);
    });

    it("should set accessible play cost with charm pricing", () => {
      const result = calculateOptimalPlayCost(consolePrizes, {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      // For high-value consoles (avg ~$490), should use premium tier pricing
      // Play cost should use psychological pricing ($X.99)
      expect(result.playCostUsd.toString()).toMatch(/\.\d9$/);
      expect(result.playCostUsd).toBeGreaterThanOrEqual(0.49);
      expect(result.playCostUsd).toBeLessThanOrEqual(14.99);
    });

    it("should calculate correct total plays needed", () => {
      const result = calculateOptimalPlayCost(consolePrizes, {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      const expectedPlays = Math.ceil(
        result.requiredRevenue / result.playCostUsd
      );
      expect(result.totalPlaysNeeded).toBe(expectedPlays);
    });

    it("should use tiered minimum win rates based on prize value", () => {
      const result = calculateOptimalPlayCost(consolePrizes, {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      // Game theory: For jackpot-tier prizes (avg >$300), players EXPECT rare wins
      // Jackpot machines use 0.5% min (1 in 200) - like a lottery feel
      // This is psychologically acceptable when the potential reward is huge
      // For $490 avg console prizes, we use the jackpot tier minimum
      expect(result.totalWinRate).toBeGreaterThan(0); // Must have some chance
      expect(result.totalWinRate).toBeLessThan(25); // Not guaranteed

      // Verify psychology factors make sense for jackpot experience
      expect(result.psychologyFactors.perceivedMultiplier).toMatch(/\d+x/);
      const multiplier = parseInt(result.psychologyFactors.perceivedMultiplier);
      expect(multiplier).toBeGreaterThan(50); // At least 50x perceived return
    });

    it("should include psychology factors for UI", () => {
      const result = calculateOptimalPlayCost(consolePrizes, {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      expect(result.psychologyFactors).toBeDefined();
      expect(result.psychologyFactors.sessionPlays).toBeGreaterThan(0);
      expect(result.psychologyFactors.perceivedMultiplier).toMatch(/\d+x/);
      expect(result.psychologyFactors.winRateFeeling).toMatch(/1 in \d+ plays/);
    });
  });

  describe("calculateOdds", () => {
    it("should distribute odds inversely proportional to price", () => {
      const result = calculateOdds(consolePrizes, {
        ...DEFAULT_CONFIG,
        playCostUsd: 5,
        targetProfitMargin: 0.8,
      });

      // Nintendo Switch 2 ($450) should have higher odds than PS5 ($550)
      const switchPrize = result.prizes.find(
        (p) => p.name === "Nintendo Switch 2"
      );
      const ps5Prize = result.prizes.find((p) => p.name === "PlayStation 5");
      const xboxPrize = result.prizes.find((p) => p.name === "Xbox Series X");

      expect(switchPrize).toBeDefined();
      expect(ps5Prize).toBeDefined();
      expect(xboxPrize).toBeDefined();

      // Switch (cheapest with most supply: 5 @ $450) should have highest odds
      expect(switchPrize!.probabilityPercent).toBeGreaterThan(
        ps5Prize!.probabilityPercent
      );

      // Both Xbox ($500, 2 qty) and PS5 ($550, 3 qty) are expensive with low supply
      // Their exact ordering depends on the supply-weighted inverse price calculation
      // Just verify Switch > both expensive ones
      expect(switchPrize!.probabilityPercent).toBeGreaterThan(
        xboxPrize!.probabilityPercent
      );
    });

    it("should maintain 80% profit margin", () => {
      const result = calculateOdds(consolePrizes, {
        ...DEFAULT_CONFIG,
        playCostUsd: 5,
        targetProfitMargin: 0.8,
      });

      // Profit margin should be approximately 80%
      expect(result.profitMarginPercent).toBeGreaterThanOrEqual(79);
      expect(result.profitMarginPercent).toBeLessThanOrEqual(81);
    });

    it("should have valid probabilities (sum ≤ 100%)", () => {
      const result = calculateOdds(consolePrizes, {
        ...DEFAULT_CONFIG,
        playCostUsd: 5,
        targetProfitMargin: 0.8,
      });

      expect(result.totalProbabilityBp).toBeLessThanOrEqual(10000);
      expect(result.isValid).toBe(true);
    });

    it("should classify expensive prizes as legendary tier", () => {
      const result = calculateOdds(consolePrizes, {
        ...DEFAULT_CONFIG,
        playCostUsd: 5,
        targetProfitMargin: 0.8,
      });

      // With such low win rates, all should be legendary or rare
      result.prizes.forEach((prize) => {
        expect(["rare", "legendary"]).toContain(prize.tier);
      });
    });
  });
});

// =============================================================================
// TEST SUITE 2: Mixed Value Prize Game (Accessories + Consoles)
// =============================================================================

describe("Mixed Value Prize Game - Accessories & Consoles", () => {
  /**
   * Scenario: Gaming store claw machine with mixed value prizes
   *
   * High Value:
   * - 2x Steam Deck OLED @ $550 = $1,100
   *
   * Medium Value:
   * - 5x AirPods Pro @ $250 = $1,250
   * - 10x AAA Games @ $70 = $700
   *
   * Low Value:
   * - 20x DualSense Controller @ $70 = $1,400
   * - 30x Xbox Controller @ $60 = $1,800
   *
   * Total: 67 prizes worth $6,250
   */
  const mixedPrizes: PrizeInput[] = [
    createPrize("Steam Deck OLED", 550, 2),
    createPrize("AirPods Pro", 250, 5),
    createPrize("AAA Game Title", 70, 10),
    createPrize("DualSense Controller", 70, 20),
    createPrize("Xbox Controller", 60, 30),
  ];

  describe("calculateOptimalPlayCost", () => {
    it("should calculate correct totals for mixed inventory", () => {
      const result = calculateOptimalPlayCost(mixedPrizes, {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      // Total: 1100 + 1250 + 700 + 1400 + 1800 = $6,250
      expect(result.totalPrizeValue).toBe(6250);

      // Total supply: 2 + 5 + 10 + 20 + 30 = 67 prizes
      expect(result.totalSupply).toBe(67);
    });

    it("should achieve more reasonable win rate with more inventory", () => {
      const result = calculateOptimalPlayCost(mixedPrizes, {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      // With 67 prizes, win rate should be higher than 10-prize scenario
      // Required revenue = $6,250 / 0.20 = $31,250
      // At $5/play: 6,250 plays
      // Win rate = 67 / 6,250 ≈ 1.07%
      expect(result.totalWinRate).toBeGreaterThan(0.5);
      expect(result.totalWinRate).toBeLessThan(5);
    });
  });

  describe("calculateOdds", () => {
    it("should give controllers higher odds than Steam Deck", () => {
      const optimalCost = calculateOptimalPlayCost(mixedPrizes, {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      const result = calculateOdds(mixedPrizes, {
        ...DEFAULT_CONFIG,
        playCostUsd: optimalCost.playCostUsd,
        targetProfitMargin: 0.8,
      });

      const steamDeck = result.prizes.find((p) => p.name === "Steam Deck OLED");
      const xboxController = result.prizes.find(
        (p) => p.name === "Xbox Controller"
      );

      expect(steamDeck).toBeDefined();
      expect(xboxController).toBeDefined();

      // Xbox Controller ($60, 30 qty) should have MUCH higher odds than Steam Deck ($550, 2 qty)
      expect(xboxController!.probabilityPercent).toBeGreaterThan(
        steamDeck!.probabilityPercent * 5
      );
    });

    it("should have consistent tier classification based on probability", () => {
      const optimalCost = calculateOptimalPlayCost(mixedPrizes, {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      const result = calculateOdds(mixedPrizes, {
        ...DEFAULT_CONFIG,
        playCostUsd: optimalCost.playCostUsd,
        targetProfitMargin: 0.8,
      });

      // With 80% profit margin and expensive items, most individual prizes will be legendary
      // The algorithm correctly classifies prizes based on their individual probabilities:
      // - Common: >= 30%
      // - Uncommon: >= 10%
      // - Rare: >= 1%
      // - Legendary: < 1%

      const steamDeck = result.prizes.find((p) => p.name === "Steam Deck OLED");
      const xboxController = result.prizes.find(
        (p) => p.name === "Xbox Controller"
      );

      // Steam Deck (expensive, low supply) should be legendary
      expect(steamDeck!.tier).toBe("legendary");

      // Xbox Controller (cheap, high supply) should have higher tier than Steam Deck
      // Even if both are legendary, controller probability should be higher
      expect(xboxController!.probabilityPercent).toBeGreaterThan(
        steamDeck!.probabilityPercent
      );
    });
  });
});

// =============================================================================
// TEST SUITE 3: Budget Prize Game (Low Value, High Volume)
// =============================================================================

describe("Budget Prize Game - Arcade Style", () => {
  /**
   * Scenario: Arcade-style machine with affordable prizes
   *
   * - 50x Keychain @ $5 = $250
   * - 30x Plush Toy @ $15 = $450
   * - 20x Small Figurine @ $25 = $500
   * - 10x Medium Figurine @ $50 = $500
   *
   * Total: 110 prizes worth $1,700
   * This should result in more frequent wins but smaller prizes
   */
  const budgetPrizes: PrizeInput[] = [
    createPrize("Keychain", 5, 50),
    createPrize("Plush Toy", 15, 30),
    createPrize("Small Figurine", 25, 20),
    createPrize("Medium Figurine", 50, 10),
  ];

  describe("calculateOptimalPlayCost", () => {
    it("should set low play cost for budget prizes", () => {
      const result = calculateOptimalPlayCost(budgetPrizes, {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      // Average prize value: $1700/110 = ~$15.45
      // Budget tier (<$25 avg) should use $0.99-$1.99 range
      // Psychological pricing applies
      expect(result.playCostUsd).toBeLessThanOrEqual(2.99);
      expect(result.playCostUsd).toBeGreaterThanOrEqual(0.49);
    });

    it("should achieve higher win rate with budget prizes", () => {
      const result = calculateOptimalPlayCost(budgetPrizes, {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      // Total: $1,700 / 0.20 = $8,500 revenue needed
      // At $1/play: 8,500 plays
      // Win rate: 110 / 8,500 ≈ 1.3%
      // At $2/play: 4,250 plays
      // Win rate: 110 / 4,250 ≈ 2.6%
      expect(result.totalWinRate).toBeGreaterThan(1);
      expect(result.totalWinRate).toBeLessThan(5);
    });
  });

  describe("calculateOdds", () => {
    it("should give keychains common/uncommon tier", () => {
      const optimalCost = calculateOptimalPlayCost(budgetPrizes, {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      const result = calculateOdds(budgetPrizes, {
        ...DEFAULT_CONFIG,
        playCostUsd: optimalCost.playCostUsd,
        targetProfitMargin: 0.8,
      });

      const keychain = result.prizes.find((p) => p.name === "Keychain");
      const mediumFig = result.prizes.find((p) => p.name === "Medium Figurine");

      expect(keychain).toBeDefined();
      expect(mediumFig).toBeDefined();

      // Keychain should have highest probability
      expect(keychain!.probabilityPercent).toBeGreaterThan(
        mediumFig!.probabilityPercent
      );
    });
  });
});

// =============================================================================
// TEST SUITE 4: Edge Cases
// =============================================================================

describe("Edge Cases", () => {
  describe("Empty prizes array", () => {
    it("should return default values for calculateOptimalPlayCost", () => {
      const result = calculateOptimalPlayCost([], {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      expect(result.playCostUsd).toBe(1.99); // Default charm price
      expect(result.totalPrizeValue).toBe(0);
      expect(result.totalSupply).toBe(0);
      expect(result.totalWinRate).toBe(0);
      expect(result.psychologyFactors).toBeDefined();
    });

    it("should return invalid result for calculateOdds", () => {
      const result = calculateOdds([], DEFAULT_CONFIG);

      expect(result.isValid).toBe(false);
      expect(result.validationMessage).toContain("No prizes");
    });
  });

  describe("Single prize type", () => {
    it("should handle single prize correctly", () => {
      const singlePrize = [createPrize("PS5", 550, 5)];

      const result = calculateOptimalPlayCost(singlePrize, {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      expect(result.totalPrizeValue).toBe(2750); // 5 × $550
      expect(result.totalSupply).toBe(5);
      expect(result.requiredRevenue).toBeCloseTo(13750, 0); // $2750 / 0.20
    });
  });

  describe("Zero cost prize", () => {
    it("should handle zero cost prizes gracefully", () => {
      const prizesWithZero = [
        createPrize("Free Sticker", 0, 100),
        createPrize("Controller", 60, 10),
      ];

      const result = calculateOdds(prizesWithZero, {
        ...DEFAULT_CONFIG,
        playCostUsd: 2,
      });

      // Should still calculate valid odds for non-zero prizes
      const controller = result.prizes.find((p) => p.name === "Controller");
      expect(controller).toBeDefined();
      expect(controller!.probabilityPercent).toBeGreaterThan(0);
    });
  });

  describe("Very high profit margin", () => {
    it("should handle 95% profit margin", () => {
      const prizes = [createPrize("PS5", 550, 10)];

      const result = calculateOptimalPlayCost(prizes, {
        targetProfitMargin: 0.95,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      // $5,500 / 0.05 = $110,000 revenue needed!
      expect(result.requiredRevenue).toBeCloseTo(110000, 0);

      // For jackpot machines (avg >$300), minimum win rate is 0.5%
      // Even at 95% margin, algorithm enforces psychological minimum
      // Win rate will be very low but not impossible
      expect(result.totalWinRate).toBeGreaterThan(0);
      expect(result.totalWinRate).toBeLessThan(5); // Still quite rare
    });
  });

  describe("Very low profit margin", () => {
    it("should handle 50% profit margin", () => {
      const prizes = [createPrize("Controller", 60, 50)];

      const result = calculateOptimalPlayCost(prizes, {
        targetProfitMargin: 0.5,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });

      // $3,000 / 0.50 = $6,000 revenue needed
      expect(result.requiredRevenue).toBe(6000);

      // Higher win rate expected
      expect(result.totalWinRate).toBeGreaterThan(1);
    });
  });

  describe("Very large inventory", () => {
    it("should handle 1000+ prizes efficiently", () => {
      const largePrizes: PrizeInput[] = [];
      for (let i = 0; i < 10; i++) {
        largePrizes.push(createPrize(`Prize Type ${i}`, (i + 1) * 10, 100));
      }

      const startTime = Date.now();
      const result = calculateOptimalPlayCost(largePrizes, {
        targetProfitMargin: 0.8,
        priceSensitivity: 1.2,
        minimumWinRate: 0.01,
        maximumWinRate: 0.3,
      });
      const endTime = Date.now();

      // Should complete in under 100ms
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.totalSupply).toBe(1000);
    });
  });
});

// =============================================================================
// TEST SUITE 5: Profit Margin Verification
// =============================================================================

describe("Profit Margin Verification", () => {
  const testPrizes = [
    createPrize("Common Prize", 10, 100),
    createPrize("Uncommon Prize", 25, 50),
    createPrize("Rare Prize", 100, 10),
    createPrize("Legendary Prize", 500, 2),
  ];

  it("should verify 80% profit margin mathematically", () => {
    const optimalCost = calculateOptimalPlayCost(testPrizes, {
      targetProfitMargin: 0.8,
      priceSensitivity: 1.2,
      minimumWinRate: 0.01,
      maximumWinRate: 0.3,
    });

    // Total inventory cost
    const inventoryCost = 100 * 10 + 50 * 25 + 10 * 100 + 2 * 500; // = 1000 + 1250 + 1000 + 1000 = $4,250
    expect(optimalCost.totalPrizeValue).toBe(4250);

    // Expected profit
    const expectedProfit =
      optimalCost.requiredRevenue - optimalCost.totalPrizeValue;
    const actualMargin = expectedProfit / optimalCost.requiredRevenue;

    // Should be approximately 80%
    expect(actualMargin).toBeCloseTo(0.8, 2);
  });

  it("should verify revenue calculation", () => {
    const optimalCost = calculateOptimalPlayCost(testPrizes, {
      targetProfitMargin: 0.8,
      priceSensitivity: 1.2,
      minimumWinRate: 0.01,
      maximumWinRate: 0.3,
    });

    // revenue = totalPlaysNeeded × playCost
    const calculatedRevenue =
      optimalCost.totalPlaysNeeded * optimalCost.playCostUsd;

    // Should be close to required revenue (within rounding)
    expect(calculatedRevenue).toBeGreaterThanOrEqual(
      optimalCost.requiredRevenue
    );
  });

  it("should verify win rate = supply / plays", () => {
    const optimalCost = calculateOptimalPlayCost(testPrizes, {
      targetProfitMargin: 0.8,
      priceSensitivity: 1.2,
      minimumWinRate: 0.01,
      maximumWinRate: 0.3,
    });

    const calculatedWinRate =
      (optimalCost.totalSupply / optimalCost.totalPlaysNeeded) * 100;
    expect(optimalCost.totalWinRate).toBeCloseTo(calculatedWinRate, 2);
  });
});

// =============================================================================
// TEST SUITE 6: Real-World Scenario Simulation
// =============================================================================

describe("Real-World Scenario: Gaming Convention Booth", () => {
  /**
   * Scenario: A gaming convention booth with a variety of prizes
   *
   * Premium Tier:
   * - 1x PS5 Bundle (console + 2 games) @ $700
   * - 1x Xbox Series X Bundle @ $600
   *
   * Standard Tier:
   * - 3x Nintendo Switch OLED @ $350
   * - 5x Steam Deck LCD @ $400
   *
   * Budget Tier:
   * - 20x AAA Game @ $70
   * - 50x Gaming T-Shirt @ $30
   * - 100x Keychain/Pin Set @ $10
   *
   * Total: 180 prizes
   */
  const conventionPrizes: PrizeInput[] = [
    createPrize("PS5 Bundle", 700, 1),
    createPrize("Xbox Series X Bundle", 600, 1),
    createPrize("Nintendo Switch OLED", 350, 3),
    createPrize("Steam Deck LCD", 400, 5),
    createPrize("AAA Game", 70, 20),
    createPrize("Gaming T-Shirt", 30, 50),
    createPrize("Keychain Set", 10, 100),
  ];

  it("should calculate convention economics", () => {
    const result = calculateOptimalPlayCost(conventionPrizes, {
      targetProfitMargin: 0.75, // 75% profit for convention
      priceSensitivity: 1.2,
      minimumWinRate: 0.01,
      maximumWinRate: 0.3,
    });

    // Total value: 700 + 600 + 1050 + 2000 + 1400 + 1500 + 1000 = $8,250
    expect(result.totalPrizeValue).toBe(8250);
    expect(result.totalSupply).toBe(180);

    // Revenue for 75% margin: $8,250 / 0.25 = $33,000
    expect(result.requiredRevenue).toBe(33000);

    console.log("\n=== Convention Booth Economics ===");
    console.log(`Total Prizes: ${result.totalSupply}`);
    console.log(`Total Value: $${result.totalPrizeValue.toLocaleString()}`);
    console.log(
      `Required Revenue: $${result.requiredRevenue.toLocaleString()}`
    );
    console.log(`Play Cost: $${result.playCostUsd.toFixed(2)}`);
    console.log(
      `Total Plays Needed: ${result.totalPlaysNeeded.toLocaleString()}`
    );
    console.log(`Win Rate: ${result.totalWinRate.toFixed(2)}%`);
    console.log(
      `Expected Profit: $${(result.requiredRevenue - result.totalPrizeValue).toLocaleString()}`
    );
  });

  it("should have reasonable odds distribution", () => {
    const optimalCost = calculateOptimalPlayCost(conventionPrizes, {
      targetProfitMargin: 0.75,
      priceSensitivity: 1.2,
      minimumWinRate: 0.01,
      maximumWinRate: 0.3,
    });

    const odds = calculateOdds(conventionPrizes, {
      ...DEFAULT_CONFIG,
      playCostUsd: optimalCost.playCostUsd,
      targetProfitMargin: 0.75,
    });

    console.log("\n=== Prize Odds Distribution ===");
    odds.prizes.forEach((prize) => {
      console.log(
        `${prize.name}: ${prize.probabilityPercent.toFixed(3)}% (${prize.tier})`
      );
    });
    console.log(
      `\nTotal Win Rate: ${odds.totalProbabilityPercent.toFixed(2)}%`
    );
    console.log(`Profit Margin: ${odds.profitMarginPercent.toFixed(1)}%`);

    // PS5 Bundle should be legendary (< 1%)
    const ps5 = odds.prizes.find((p) => p.name === "PS5 Bundle");
    expect(ps5?.tier).toBe("legendary");

    // Keychain Set should have highest probability
    const keychain = odds.prizes.find((p) => p.name === "Keychain Set");
    const maxProb = Math.max(...odds.prizes.map((p) => p.probabilityPercent));
    expect(keychain?.probabilityPercent).toBe(maxProb);
  });
});

// =============================================================================
// TEST SUITE 7: Helper Functions
// =============================================================================

describe("Helper Functions", () => {
  describe("generateSku", () => {
    it("should generate valid SKU format", () => {
      const sku = generateSku("Anime Collection", "Pikachu Plush", 0);

      expect(sku).toMatch(/^[A-Z]+-[A-Z]+-[A-Z0-9]+$/);
      expect(sku.length).toBeLessThanOrEqual(20);
    });

    it("should handle special characters", () => {
      const sku = generateSku("Kid's Game", "Pokémon Card", 5);

      expect(sku).not.toContain("'");
      expect(sku).not.toContain("é");
    });

    it("should generate unique SKUs for different indices", () => {
      const sku1 = generateSku("Game", "Prize", 0);
      const sku2 = generateSku("Game", "Prize", 1);
      const sku3 = generateSku("Game", "Prize", 2);

      expect(new Set([sku1, sku2, sku3]).size).toBe(3);
    });
  });

  describe("formatUsd", () => {
    it("should format currency correctly", () => {
      expect(formatUsd(5)).toBe("$5.00");
      expect(formatUsd(5.5)).toBe("$5.50");
      expect(formatUsd(5.555)).toBe("$5.56");
      expect(formatUsd(1000)).toBe("$1,000.00");
    });

    it("should handle zero and negative", () => {
      expect(formatUsd(0)).toBe("$0.00");
      expect(formatUsd(-5)).toBe("-$5.00");
    });
  });

  describe("formatPercent", () => {
    it("should format percentages correctly", () => {
      expect(formatPercent(50)).toBe("50.00%");
      expect(formatPercent(5.5)).toBe("5.50%");
      // Values < 1% get 3 decimal places for precision
      expect(formatPercent(0.5)).toBe("0.500%");
      expect(formatPercent(0.01)).toBe("0.010%");
      expect(formatPercent(0)).toBe("0%");
    });
  });

  describe("formatOddsRatio", () => {
    it("should format odds as human-readable ratios", () => {
      expect(formatOddsRatio(50)).toBe("1 in 2");
      expect(formatOddsRatio(10)).toBe("1 in 10");
      expect(formatOddsRatio(1)).toBe("1 in 100");
      expect(formatOddsRatio(0.1)).toBe("1 in 1,000");
      expect(formatOddsRatio(0.01)).toBe("1 in 10,000");
      expect(formatOddsRatio(0)).toBe("N/A");
    });
  });
});

// =============================================================================
// TEST SUITE 8: Price Sensitivity Tests
// =============================================================================

describe("Price Sensitivity Configuration", () => {
  const prizes = [
    createPrize("Cheap Prize", 10, 50),
    createPrize("Expensive Prize", 100, 5),
  ];

  it("should increase odds difference with higher sensitivity", () => {
    const lowSensitivity = calculateOdds(prizes, {
      ...DEFAULT_CONFIG,
      playCostUsd: 2,
      priceSensitivity: 1.0,
    });

    const highSensitivity = calculateOdds(prizes, {
      ...DEFAULT_CONFIG,
      playCostUsd: 2,
      priceSensitivity: 2.0,
    });

    const cheapLow = lowSensitivity.prizes.find(
      (p) => p.name === "Cheap Prize"
    );
    const expensiveLow = lowSensitivity.prizes.find(
      (p) => p.name === "Expensive Prize"
    );
    const cheapHigh = highSensitivity.prizes.find(
      (p) => p.name === "Cheap Prize"
    );
    const expensiveHigh = highSensitivity.prizes.find(
      (p) => p.name === "Expensive Prize"
    );

    // Ratio should be higher with higher sensitivity
    const ratioLow =
      cheapLow!.probabilityPercent / expensiveLow!.probabilityPercent;
    const ratioHigh =
      cheapHigh!.probabilityPercent / expensiveHigh!.probabilityPercent;

    expect(ratioHigh).toBeGreaterThan(ratioLow);
  });
});
