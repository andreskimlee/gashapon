import { Page, BrowserContext } from "@playwright/test";
import { Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

/**
 * Test wallet configuration
 * In real tests, you'd fund this wallet on devnet first
 */
export interface TestWallet {
  publicKey: string;
  secretKey: Uint8Array;
  keypair: Keypair;
}

/**
 * Create a test wallet from a secret key or generate a new one
 */
export function createTestWallet(secretKeyBase58?: string): TestWallet {
  let keypair: Keypair;
  
  if (secretKeyBase58) {
    const secretKey = bs58.decode(secretKeyBase58);
    keypair = Keypair.fromSecretKey(secretKey);
  } else {
    keypair = Keypair.generate();
  }
  
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: keypair.secretKey,
    keypair,
  };
}

/**
 * Wallet mock script to inject into the page
 * This creates a fake wallet adapter that signs transactions with our test keypair
 */
function getWalletMockScript(publicKeyBase58: string, secretKeyBase58: string): string {
  return `
    (function() {
      // Store wallet state
      window.__TEST_WALLET__ = {
        publicKey: '${publicKeyBase58}',
        secretKey: '${secretKeyBase58}',
        connected: false,
      };
      
      // Utility to decode base58
      const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      function decodeBase58(str) {
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
          const carry = BASE58_ALPHABET.indexOf(str[i]);
          if (carry < 0) throw new Error('Invalid base58 character');
          for (let j = 0; j < bytes.length; j++) {
            const x = bytes[j] * 58 + carry;
            bytes[j] = x % 256;
            carry = Math.floor(x / 256);
          }
          while (carry > 0) {
            bytes.push(carry % 256);
            carry = Math.floor(carry / 256);
          }
        }
        // Handle leading zeros
        for (let i = 0; i < str.length && str[i] === '1'; i++) {
          bytes.push(0);
        }
        return new Uint8Array(bytes.reverse());
      }
      
      // Mock wallet adapter that will be detected by the app
      window.__MOCK_SOLANA_WALLET__ = {
        isPhantom: true,
        isMockWallet: true,
        publicKey: null,
        
        connect: async function() {
          window.__TEST_WALLET__.connected = true;
          this.publicKey = {
            toBase58: () => window.__TEST_WALLET__.publicKey,
            toString: () => window.__TEST_WALLET__.publicKey,
            toBuffer: () => decodeBase58(window.__TEST_WALLET__.publicKey),
            toBytes: () => decodeBase58(window.__TEST_WALLET__.publicKey),
          };
          return { publicKey: this.publicKey };
        },
        
        disconnect: async function() {
          window.__TEST_WALLET__.connected = false;
          this.publicKey = null;
        },
        
        signTransaction: async function(transaction) {
          // This will be handled by the real signing in our test
          console.log('[MockWallet] signTransaction called');
          window.__PENDING_TX__ = transaction;
          return transaction;
        },
        
        signAllTransactions: async function(transactions) {
          console.log('[MockWallet] signAllTransactions called');
          return transactions;
        },
        
        signMessage: async function(message) {
          console.log('[MockWallet] signMessage called');
          return { signature: new Uint8Array(64) };
        },
        
        on: function(event, callback) {
          // Event listener stub
        },
        
        off: function(event, callback) {
          // Event listener removal stub
        },
      };
      
      // Expose to window.solana (Phantom standard)
      window.solana = window.__MOCK_SOLANA_WALLET__;
      
      console.log('[E2E] Mock wallet injected:', window.__TEST_WALLET__.publicKey);
    })();
  `;
}

/**
 * Inject the mock wallet into a page
 */
export async function injectMockWallet(page: Page, wallet: TestWallet): Promise<void> {
  const secretKeyBase58 = bs58.encode(wallet.secretKey);
  const script = getWalletMockScript(wallet.publicKey, secretKeyBase58);
  
  // Add script to run before any page script
  await page.addInitScript(script);
}

/**
 * Connect the mock wallet (simulate user clicking connect)
 */
export async function connectMockWallet(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (window.solana && window.solana.connect) {
      return window.solana.connect();
    }
    throw new Error("Mock wallet not found");
  });
}

/**
 * Get the connected wallet public key
 */
export async function getConnectedWallet(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    if (window.solana?.publicKey) {
      return window.solana.publicKey.toBase58();
    }
    return null;
  });
}

/**
 * Sign a transaction using the test keypair (server-side)
 * This is called when we need to actually sign transactions
 */
export function signTransaction(
  transaction: Transaction,
  wallet: TestWallet
): Transaction {
  transaction.sign(wallet.keypair);
  return transaction;
}

// Add TypeScript declarations for the window extensions
declare global {
  interface Window {
    __TEST_WALLET__?: {
      publicKey: string;
      secretKey: string;
      connected: boolean;
    };
    __MOCK_SOLANA_WALLET__?: {
      isPhantom: boolean;
      isMockWallet: boolean;
      publicKey: { toBase58: () => string } | null;
      connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
      disconnect: () => Promise<void>;
      signTransaction: (tx: unknown) => Promise<unknown>;
      signAllTransactions: (txs: unknown[]) => Promise<unknown[]>;
      signMessage: (msg: unknown) => Promise<{ signature: Uint8Array }>;
      on: (event: string, callback: () => void) => void;
      off: (event: string, callback: () => void) => void;
    };
    __PENDING_TX__?: unknown;
    solana?: Window["__MOCK_SOLANA_WALLET__"];
  }
}
