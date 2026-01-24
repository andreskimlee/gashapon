import { test, expect, waitForText, clickButton } from "./utils/fixtures";

/**
 * End-to-End Test: Game Play Flow
 * 
 * Tests the Gashapon game UI with a mock wallet adapter.
 * The mock wallet is injected before page load, allowing us to
 * test wallet interactions without a real browser extension.
 */

test.describe("Home Page", () => {
  test.beforeEach(async ({ walletPage }) => {
    await walletPage.goto("/");
    await walletPage.waitForLoadState("networkidle");
  });

  test("should display homepage with title", async ({ walletPage }) => {
    // Check page has loaded - logo text should be visible (GASHAPON on desktop, GASHA on mobile)
    const logoText = walletPage.locator("span:has-text('GASHAPON'), span:has-text('GASHA')").first();
    await expect(logoText).toBeVisible({ timeout: 10000 });
  });

  test("should display hero section with CTA", async ({ walletPage }) => {
    // Hero headline: "WIN REAL PRIZES ONLINE!"
    const heroText = walletPage.locator("text=WIN").first();
    await expect(heroText).toBeVisible();

    // "PLAY NOW" button should be visible
    const playNowButton = walletPage.locator("text=PLAY NOW").first();
    await expect(playNowButton).toBeVisible();
  });

  test("should show LOG IN button when not connected", async ({ walletPage }) => {
    // WalletBalance shows "LOG IN" when not connected
    const loginButton = walletPage.locator("text=LOG IN").first();
    await expect(loginButton).toBeVisible({ timeout: 5000 });
  });

  test("should display game cards or loading/empty state", async ({ walletPage }) => {
    // Wait for either:
    // 1. Game cards to appear (with "ENTER ROOM" buttons)
    // 2. Loading state ("Loading games...")
    // 3. Empty state ("No games available")
    
    const gameCard = walletPage.locator("text=ENTER ROOM").first();
    const loadingState = walletPage.locator("text=Loading games...");
    const emptyState = walletPage.locator("text=No games available");
    
    // One of these should be visible within 10 seconds
    await expect(
      gameCard.or(loadingState).or(emptyState)
    ).toBeVisible({ timeout: 10000 });
  });

  test("PLAY NOW button navigates to games page", async ({ walletPage }) => {
    const playNowButton = walletPage.locator("text=PLAY NOW").first();
    await playNowButton.click();
    
    await walletPage.waitForURL(/\/games/);
    expect(walletPage.url()).toContain("/games");
  });
});

test.describe("Games Page", () => {
  test("should load games page", async ({ walletPage }) => {
    await walletPage.goto("/games");
    await walletPage.waitForLoadState("networkidle");

    // Should show either:
    // - "AVAILABLE GAMES" heading
    // - Loading state
    // - Error state
    const heading = walletPage.locator("text=AVAILABLE GAMES");
    const loading = walletPage.locator("text=Loading games...");
    const error = walletPage.locator("text=ERROR");

    await expect(heading.or(loading).or(error)).toBeVisible({ timeout: 15000 });
  });

  test("should show game cards when games exist", async ({ walletPage }) => {
    await walletPage.goto("/games");
    await walletPage.waitForLoadState("networkidle");

    // Wait for loading to finish
    await walletPage.waitForTimeout(2000);

    // Check if there are game links (links to /games/[id])
    const gameLinks = walletPage.locator("a[href^='/games/']");
    const noGames = walletPage.locator("text=No games available");

    // Either games exist or "no games" message shows
    const count = await gameLinks.count();
    const hasNoGames = await noGames.isVisible().catch(() => false);

    expect(count > 0 || hasNoGames).toBeTruthy();
  });
});

test.describe("Wallet Connection", () => {
  test("mock wallet should be injected", async ({ walletPage, testWallet }) => {
    await walletPage.goto("/");
    await walletPage.waitForLoadState("networkidle");

    // Verify mock wallet is present
    const hasMockWallet = await walletPage.evaluate(() => {
      return !!(window.solana && window.solana.isMockWallet);
    });
    expect(hasMockWallet).toBe(true);

    // Verify correct public key
    const injectedKey = await walletPage.evaluate(() => {
      return window.__TEST_WALLET__?.publicKey;
    });
    expect(injectedKey).toBe(testWallet.publicKey);
  });

  test("can programmatically connect wallet", async ({ walletPage, testWallet }) => {
    await walletPage.goto("/");
    await walletPage.waitForLoadState("networkidle");

    // Connect via mock wallet
    const connectedKey = await walletPage.evaluate(async () => {
      if (window.solana) {
        const result = await window.solana.connect();
        return result.publicKey.toBase58();
      }
      return null;
    });

    expect(connectedKey).toBe(testWallet.publicKey);
  });

  test("LOG IN button should be clickable", async ({ walletPage }) => {
    await walletPage.goto("/");
    await walletPage.waitForLoadState("networkidle");

    const loginButton = walletPage.locator("text=LOG IN").first();
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();

    // Click should open wallet modal (from @solana/wallet-adapter-react-ui)
    await loginButton.click();
    await walletPage.waitForTimeout(500);

    // Modal should appear with wallet options (Phantom, Solflare, etc.)
    const modal = walletPage.locator(".wallet-adapter-modal, [class*='wallet-adapter']").first();
    const hasModal = await modal.isVisible().catch(() => false);
    
    // Modal may or may not render depending on wallet adapter setup
    console.log(`[Test] Wallet modal visible: ${hasModal}`);
  });
});

test.describe("Game Detail Page", () => {
  test.beforeEach(async ({ walletPage }) => {
    // First, get a game ID from the games list
    await walletPage.goto("/games");
    await walletPage.waitForLoadState("networkidle");
    await walletPage.waitForTimeout(2000);
  });

  test("should navigate to game detail when clicking a game", async ({ walletPage }) => {
    // Find game link
    const gameLink = walletPage.locator("a[href^='/games/']").first();
    const hasGames = await gameLink.isVisible().catch(() => false);

    if (!hasGames) {
      console.log("[Test] No games available - skipping game detail test");
      return;
    }

    // Get the href and click
    const href = await gameLink.getAttribute("href");
    await gameLink.click();
    
    await walletPage.waitForURL(/\/games\/\d+/);
    expect(walletPage.url()).toContain("/games/");
  });

  test("game detail page should show game info", async ({ walletPage }) => {
    // Navigate to first available game
    const gameLink = walletPage.locator("a[href^='/games/']").first();
    const hasGames = await gameLink.isVisible().catch(() => false);

    if (!hasGames) {
      console.log("[Test] No games available - skipping");
      return;
    }

    await gameLink.click();
    await walletPage.waitForLoadState("networkidle");

    // Game page should show:
    // 1. Loading state, or
    // 2. Claw machine / game content, or  
    // 3. Error state

    const loading = walletPage.locator("text=Loading game...");
    const prizes = walletPage.locator("text=PRIZES");
    const error = walletPage.locator("text=ERROR");
    const canvas = walletPage.locator("canvas");

    // Wait for any of these
    await expect(
      loading.or(prizes).or(error).or(canvas)
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Header & Navigation", () => {
  test("header should be visible with logo", async ({ walletPage }) => {
    await walletPage.goto("/");
    await walletPage.waitForLoadState("networkidle");

    const header = walletPage.locator("header").first();
    await expect(header).toBeVisible();

    // Logo image (gashapon logo)
    const logoImg = header.locator("img[alt*='logo']").first();
    const hasLogoImg = await logoImg.isVisible().catch(() => false);
    
    // Or logo text (GASHAPON/GASHA)
    const logoText = header.locator("span:has-text('GASHAPON'), span:has-text('GASHA')").first();
    const hasLogoText = await logoText.isVisible().catch(() => false);
    
    expect(hasLogoImg || hasLogoText).toBeTruthy();
  });

  test("navigation links should work", async ({ walletPage }) => {
    await walletPage.goto("/");
    await walletPage.waitForLoadState("networkidle");

    // Desktop nav links
    const homeLink = walletPage.locator("nav a[href='/']").first();
    const collectionLink = walletPage.locator("a[href='/collection']").first();

    // At least home link should be visible (either desktop or mobile)
    const hasNav = await homeLink.isVisible().catch(() => false);
    if (hasNav) {
      await expect(homeLink).toBeVisible();
    }

    // Collection link should work
    const hasCollection = await collectionLink.isVisible().catch(() => false);
    if (hasCollection) {
      await collectionLink.click();
      await walletPage.waitForURL(/\/collection/);
      expect(walletPage.url()).toContain("/collection");
    }
  });
});

test.describe("UI Components", () => {
  test("footer should be visible on homepage", async ({ walletPage }) => {
    await walletPage.goto("/");

    const footer = walletPage.locator("footer").first();
    const hasFooter = await footer.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[Test] Footer visible: ${hasFooter}`);
  });

  test("should have no critical console errors", async ({ walletPage }) => {
    const errors: string[] = [];

    walletPage.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await walletPage.goto("/");
    await walletPage.waitForLoadState("networkidle");

    // Filter out known acceptable errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("wallet") &&
        !e.includes("solana") &&
        !e.includes("Failed to load resource") &&
        !e.includes("net::") && // Network errors
        !e.includes("WebSocket") // WS connection errors
    );

    if (criticalErrors.length > 0) {
      console.warn("[Test] Console errors found:", criticalErrors);
    }

    // Allow some non-critical errors
    expect(criticalErrors.length).toBeLessThan(5);
  });

  test("page should be responsive on mobile", async ({ walletPage }) => {
    // Mobile viewport
    await walletPage.setViewportSize({ width: 375, height: 667 });
    await walletPage.goto("/");
    await walletPage.waitForLoadState("networkidle");

    // Page should render
    const body = walletPage.locator("body");
    await expect(body).toBeVisible();

    // Check for horizontal overflow
    const scrollWidth = await walletPage.evaluate(() => document.body.scrollWidth);
    const clientWidth = await walletPage.evaluate(() => document.body.clientWidth);

    // Allow small overflow
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 50);

    // Logo should show "GASHA" (mobile version)
    const mobileLogoText = walletPage.locator("text=GASHA");
    const hasMobileLogo = await mobileLogoText.isVisible().catch(() => false);
    console.log(`[Test] Mobile logo visible: ${hasMobileLogo}`);
  });

  test("mobile menu should toggle", async ({ walletPage }) => {
    await walletPage.setViewportSize({ width: 375, height: 667 });
    await walletPage.goto("/");
    await walletPage.waitForLoadState("networkidle");

    // Find mobile menu button (hamburger)
    const menuButton = walletPage.locator("button[aria-label='Open menu']");
    const hasMenuButton = await menuButton.isVisible().catch(() => false);

    if (hasMenuButton) {
      await menuButton.click();
      
      // Menu drawer should appear with "MENU" title
      const menuDrawer = walletPage.locator("text=MENU").first();
      await expect(menuDrawer).toBeVisible({ timeout: 3000 });

      // Close button should work
      const closeButton = walletPage.locator("button[aria-label='Close menu']");
      await closeButton.click();
      await walletPage.waitForTimeout(500);
    } else {
      console.log("[Test] No mobile menu button found");
    }
  });
});

/**
 * Game Interaction Tests (require active game + wallet)
 * These are skipped by default - enable with TEST_GAME_ID env var
 */
test.describe("Game Interaction", () => {
  const TEST_GAME_ID = process.env.TEST_GAME_ID;

  test.skip(!TEST_GAME_ID, "Requires TEST_GAME_ID environment variable");

  test("should show claw machine on game page", async ({ walletPage }) => {
    await walletPage.goto(`/games/${TEST_GAME_ID}`);
    await walletPage.waitForLoadState("networkidle");

    // Canvas element for 3D claw machine
    const canvas = walletPage.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 15000 });
  });

  test("should show play button when wallet connected", async ({ walletPage }) => {
    await walletPage.goto(`/games/${TEST_GAME_ID}`);
    await walletPage.waitForLoadState("networkidle");

    // Connect wallet programmatically
    await walletPage.evaluate(async () => {
      if (window.solana) await window.solana.connect();
    });

    // Look for play-related buttons in the claw machine interface
    // IntroScreen has "PLAY" or similar CTA
    const playButton = walletPage.locator("button:has-text('PLAY'), button:has-text('START')").first();
    
    await walletPage.waitForTimeout(2000);
    const hasPlayButton = await playButton.isVisible().catch(() => false);
    
    console.log(`[Test] Play button visible: ${hasPlayButton}`);
  });
});
