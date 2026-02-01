/**
 * Helius Transaction Utilities
 * 
 * Provides optimized transaction sending using Helius infrastructure:
 * - Priority Fee API for dynamic fee estimation
 * - Compute unit optimization via simulation
 * - Robust confirmation with retry logic
 */

import {
  Connection,
  Transaction,
  VersionedTransaction,
  ComputeBudgetProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/utils/constants";

/**
 * Get recommended priority fee from Helius Priority Fee API
 */
export async function getPriorityFeeEstimate(
  _connection: Connection,
  transaction: Transaction | VersionedTransaction
): Promise<number> {
  try {
    // Serialize transaction for the API
    const serialized = transaction.serialize({ requireAllSignatures: false });
    const base64 = Buffer.from(serialized).toString("base64");

    const response = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "priority-fee",
        method: "getPriorityFeeEstimate",
        params: [
          {
            transaction: base64,
            options: { recommended: true },
          },
        ],
      }),
    });

    const data = await response.json();
    
    if (data.result?.priorityFeeEstimate) {
      console.log(`[Helius] Priority fee estimate: ${data.result.priorityFeeEstimate} microLamports`);
      return Math.ceil(data.result.priorityFeeEstimate);
    }

    // Fallback to a reasonable default if API fails
    console.warn("[Helius] Could not get priority fee estimate, using default");
    return 50_000; // 50k microLamports (~$0.001)
  } catch (error) {
    console.error("[Helius] Priority fee API error:", error);
    return 50_000; // Fallback
  }
}

/**
 * Simulate transaction to get optimal compute units
 */
export async function getOptimalComputeUnits(
  connection: Connection,
  transaction: Transaction,
  defaultUnits: number = 200_000
): Promise<number> {
  try {
    // Add high CU limit for simulation
    const testTx = new Transaction();
    testTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }));
    testTx.add(...transaction.instructions);
    testTx.feePayer = transaction.feePayer;
    testTx.recentBlockhash = transaction.recentBlockhash;

    const simulation = await connection.simulateTransaction(testTx);
    
    if (simulation.value.err) {
      console.warn("[Helius] Simulation failed:", simulation.value.err);
      return defaultUnits;
    }

    if (simulation.value.unitsConsumed) {
      // Add 15% buffer
      const optimized = Math.ceil(simulation.value.unitsConsumed * 1.15);
      console.log(`[Helius] Optimal CU: ${optimized} (simulated: ${simulation.value.unitsConsumed})`);
      return optimized;
    }

    return defaultUnits;
  } catch (error) {
    console.error("[Helius] CU simulation error:", error);
    return defaultUnits;
  }
}

/**
 * Add priority fee and compute budget instructions to a transaction
 */
export function addComputeBudgetInstructions(
  instructions: TransactionInstruction[],
  computeUnits: number,
  priorityFee: number
): TransactionInstruction[] {
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
    ...instructions,
  ];
}

/**
 * Confirm transaction with robust polling and timeout
 * Returns when confirmed or throws if blockhash expires
 */
export async function confirmTransactionWithPolling(
  connection: Connection,
  signature: string,
  lastValidBlockHeight: number,
  pollIntervalMs: number = 1000
): Promise<void> {
  console.log(`[Helius] Polling for confirmation: ${signature}`);
  
  let attempts = 0;
  const maxAttempts = 120; // ~2 minutes max

  while (attempts < maxAttempts) {
    attempts++;

    try {
      // Check signature status
      const statuses = await connection.getSignatureStatuses([signature]);
      const status = statuses?.value?.[0];

      if (status) {
        if (status.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
        }
        
        if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") {
          console.log(`[Helius] Transaction confirmed (${status.confirmationStatus}) after ${attempts} polls`);
          return;
        }
      }

      // Check if blockhash expired
      const currentBlockHeight = await connection.getBlockHeight("confirmed");
      if (currentBlockHeight > lastValidBlockHeight) {
        throw new Error("Transaction expired: blockhash no longer valid");
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    } catch (error: any) {
      // Re-throw confirmation errors
      if (error.message?.includes("Transaction failed") || error.message?.includes("expired")) {
        throw error;
      }
      // Log but continue polling on network errors
      console.warn(`[Helius] Poll attempt ${attempts} failed:`, error.message);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }

  throw new Error(`Transaction not confirmed after ${maxAttempts} attempts`);
}

/**
 * Send transaction with Helius optimizations
 * - Adds priority fee
 * - Uses skipPreflight for faster submission
 * - Polls for confirmation
 */
export async function sendWithHeliusOptimizations(
  connection: Connection,
  signedTransaction: Transaction | VersionedTransaction,
  lastValidBlockHeight: number
): Promise<string> {
  // Send transaction
  const rawTransaction = signedTransaction.serialize();
  const signature = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: true,
    maxRetries: 0, // We handle retries ourselves
  });

  console.log(`[Helius] Transaction sent: ${signature}`);

  // Poll for confirmation
  await confirmTransactionWithPolling(connection, signature, lastValidBlockHeight);

  return signature;
}
