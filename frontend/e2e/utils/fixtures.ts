import { test as base, expect, Page } from "@playwright/test";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { createTestWallet, injectMockWallet, TestWallet } from "./wallet-mock";

// Environment variables for test configuration
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const TEST_WALLET_SECRET = process.env.TEST_WALLET_SECRET; // Optional: reuse a funded wallet

/**
 * Extended test fixture with wallet support
 */
export interface TestFixtures {
  testWallet: TestWallet;
  connection: Connection;
  walletPage: Page;
}

/**
 * Create the test fixture with wallet injection
 */
export const test = base.extend<TestFixtures>({
  // Create or reuse a test wallet
  testWallet: async ({}, use) => {
    const wallet = createTestWallet(TEST_WALLET_SECRET);
    console.log(`[Test] Using wallet: ${wallet.publicKey}`);
    await use(wallet);
  },

  // Solana connection
  connection: async ({}, use) => {
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    await use(connection);
  },

  // Page with wallet injected
  walletPage: async ({ page, testWallet }, use) => {
    // Inject mock wallet before navigating
    await injectMockWallet(page, testWallet);
    await use(page);
  },
});

export { expect };

/**
 * Helper to check wallet balance
 */
export async function getWalletBalance(
  connection: Connection,
  publicKey: string
): Promise<number> {
  const balance = await connection.getBalance(new PublicKey(publicKey));
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Helper to airdrop SOL to wallet (devnet only)
 */
export async function airdropSol(
  connection: Connection,
  publicKey: string,
  amount: number = 1
): Promise<void> {
  try {
    const sig = await connection.requestAirdrop(
      new PublicKey(publicKey),
      amount * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(sig, "confirmed");
    console.log(`[Test] Airdropped ${amount} SOL to ${publicKey}`);
  } catch (e) {
    console.warn(`[Test] Airdrop failed (may be rate limited):`, e);
  }
}

/**
 * Wait for an element with text
 */
export async function waitForText(
  page: Page,
  text: string,
  timeout: number = 10000
): Promise<void> {
  await page.getByText(text).waitFor({ timeout });
}

/**
 * Click button containing text
 */
export async function clickButton(page: Page, text: string): Promise<void> {
  await page.getByRole("button", { name: text }).click();
}

/**
 * Wait for transaction to be confirmed (poll backend or chain)
 */
export async function waitForTransaction(
  connection: Connection,
  signature: string,
  timeout: number = 30000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const status = await connection.getSignatureStatus(signature);
    if (status?.value?.confirmationStatus === "confirmed" ||
        status?.value?.confirmationStatus === "finalized") {
      return;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Transaction ${signature} not confirmed within ${timeout}ms`);
}
