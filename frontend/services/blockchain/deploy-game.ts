/**
 * Blockchain Game Deployment Service
 *
 * Deploys games to the Solana blockchain using the gachapon-game program.
 * Uses the NEW program structure:
 * 1. initialize_game - creates game without prizes
 * 2. add_prize - adds each prize separately
 *
 * Requires admin wallet to sign the transaction.
 */

import { AnchorProvider, BN, Idl, Program } from "@coral-xyz/anchor";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";

import { GAME_PROGRAM_ID } from "@/utils/constants";

// Program ID for gachapon-game (from environment)
const PROGRAM_ID = new PublicKey(GAME_PROGRAM_ID);

// Default token mint (pump.fun token)
const DEFAULT_TOKEN_MINT = new PublicKey(
  "Cp95mjbZZnDvqCNYExmGYEzrgu6wAScf32Fmwt2Kpump"
);

// Treasury wallet (should be configured per environment)
const TREASURY_PUBKEY = new PublicKey(
  "EgvbCzEZ1RvRKA1VdZEzPuJJKnEfB3jhG7S7mJVd6wzo"
);

export type PrizeTier = "common" | "uncommon" | "rare" | "legendary";

export interface PrizeConfigInput {
  prizeId: number;
  name: string;
  description: string; // Prize description
  imageUrl: string; // Prize image URL
  metadataUri: string;
  physicalSku: string;
  tier: PrizeTier;
  probabilityBp: number; // Probability in basis points (0-10000)
  costUsd: number; // Cost/value of the prize in cents
  weightGrams: number; // Prize weight in grams
  lengthInches?: number; // Package length in inches
  widthInches?: number; // Package width in inches
  heightInches?: number; // Package height in inches
  supplyTotal: number;
  supplyRemaining: number;
}

export interface DeployGameParams {
  gameId: number;
  name: string; // Game name
  description: string; // Game description
  imageUrl: string; // Game image URL
  costUsdCents: number; // Cost per play in USD cents (e.g., 500 = $5.00)
  tokenMint?: string; // Optional custom token mint
  treasury?: string; // Optional custom treasury
  prizes: PrizeConfigInput[];
}

export interface DeployGameResult {
  success: boolean;
  signature?: string;
  prizeSignatures?: string[];
  gamePda?: string;
  error?: string;
}

/**
 * Get the game PDA address
 */
export function getGamePda(gameId: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), new BN(gameId).toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );
  return pda;
}

/**
 * Get the config PDA address
 */
export function getConfigPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
  return pda;
}

/**
 * Get the prize PDA address
 */
export function getPrizePda(gamePda: PublicKey, prizeIndex: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("prize"), gamePda.toBuffer(), Buffer.from([prizeIndex])],
    PROGRAM_ID
  );
  return pda;
}

/**
 * Convert tier string to Anchor enum format
 */
function tierToAnchor(tier: PrizeTier): object {
  switch (tier) {
    case "common":
      return { common: {} };
    case "uncommon":
      return { uncommon: {} };
    case "rare":
      return { rare: {} };
    case "legendary":
      return { legendary: {} };
    default:
      return { common: {} };
  }
}

/**
 * Deploy a game to the Solana blockchain
 *
 * Uses the NEW program structure:
 * 1. initialize_game - creates game without prizes
 * 2. add_prize - adds each prize separately
 *
 * NOTE: This requires the connected wallet to be the program authority.
 * The authority must have initialized the program first using initialize_program.
 */
export async function deployGame(
  connection: Connection,
  wallet: WalletContextState,
  params: DeployGameParams,
  idl: Idl,
  onProgress?: (message: string) => void
): Promise<DeployGameResult> {
  const log = (msg: string) => {
    console.log(`[Deploy] ${msg}`);
    onProgress?.(msg);
  };

  if (!wallet.publicKey || !wallet.signTransaction) {
    return {
      success: false,
      error: "Wallet not connected or does not support signing",
    };
  }

  try {
    log("Creating Anchor provider...");
    
    // Create Anchor provider with longer timeout for devnet
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions!,
      },
      { 
        commitment: "confirmed", 
        skipPreflight: true,
        preflightCommitment: "confirmed",
      }
    );

    log("Creating program instance...");
    
    // Create program instance
    const program = new Program(idl, provider);

    // Calculate PDAs
    const gamePda = getGamePda(params.gameId);
    const configPda = getConfigPda();

    const tokenMint = params.tokenMint
      ? new PublicKey(params.tokenMint)
      : DEFAULT_TOKEN_MINT;

    const treasury = params.treasury
      ? new PublicKey(params.treasury)
      : TREASURY_PUBKEY;

    log(`Deploying game ID ${params.gameId}: ${params.name}`);
    log(`Game PDA: ${gamePda.toString()}`);
    log(`Config PDA: ${configPda.toString()}`);
    log(`Token mint: ${tokenMint.toString()}`);
    log(`Treasury: ${treasury.toString()}`);
    log(`Authority (your wallet): ${wallet.publicKey.toString()}`);
    log(`Prizes: ${params.prizes.length}`);

    // Verify authority before proceeding
    log("Verifying program authority...");
    try {
      const configAccount = await connection.getAccountInfo(configPda);
      if (!configAccount) {
        return { success: false, error: "Program config not initialized. Run initialize_config first." };
      }
      // Authority is at offset 8 (after discriminator), 32 bytes
      const onChainAuthority = new PublicKey(configAccount.data.slice(8, 40));
      log(`On-chain authority: ${onChainAuthority.toString()}`);
      
      if (!onChainAuthority.equals(wallet.publicKey)) {
        return { 
          success: false, 
          error: `Wrong wallet! Your wallet: ${wallet.publicKey.toString().slice(0, 8)}... Required: ${onChainAuthority.toString().slice(0, 8)}...` 
        };
      }
      log("Authority verified ✓");
    } catch (err) {
      log(`Warning: Could not verify authority: ${err}`);
    }

    // Double-check game doesn't exist
    log("Checking if game already exists...");
    const existingGame = await connection.getAccountInfo(gamePda);
    if (existingGame) {
      return { success: false, error: `Game ID ${params.gameId} already exists on-chain. Use a different ID.` };
    }
    log("Game ID available ✓");

    // Step 1: Call initialize_game instruction (WITHOUT prizes)
    log("Step 1/2: Initializing game (please approve in wallet)...");
    
    let initSignature: string;
    try {
      // Use Promise.race to add timeout
      const rpcPromise = (program.methods as any)
        .initializeGame(
          new BN(params.gameId),
          params.name,
          params.description || "",
          params.imageUrl || "",
          new BN(params.costUsdCents),
          tokenMint
        )
        .accounts({
          authority: wallet.publicKey,
          config: configPda,
          game: gamePda,
          treasury: treasury,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Transaction timed out after 60 seconds. Check Solana Explorer for status.")), 60000)
      );
      
      initSignature = await Promise.race([rpcPromise, timeoutPromise]);
      
      log("Transaction confirmed!");
    } catch (err: any) {
      console.error("Initialize game error:", err);
      const errMsg = err?.message || String(err);
      if (errMsg.includes("User rejected") || errMsg.includes("cancelled")) {
        return { success: false, error: "Transaction cancelled by user" };
      }
      if (errMsg.includes("timed out")) {
        return { success: false, error: errMsg };
      }
      // Check for specific on-chain errors
      if (errMsg.includes("already in use") || errMsg.includes("Account already exists")) {
        return { success: false, error: `Game ID ${params.gameId} already exists. Try the next ID.` };
      }
      if (errMsg.includes("Unauthorized") || errMsg.includes("ConstraintHasOne")) {
        return { success: false, error: "Unauthorized: Your wallet is not the program authority." };
      }
      if (errMsg.includes("0x1") || errMsg.includes("insufficient")) {
        return { success: false, error: "Insufficient SOL for transaction fees. Fund your wallet with devnet SOL." };
      }
      return { success: false, error: `Initialize game failed: ${errMsg}` };
    }

    log(`Game initialized! Signature: ${initSignature.slice(0, 20)}...`);

    // Step 2: Add each prize separately
    const prizeSignatures: string[] = [];

    for (let i = 0; i < params.prizes.length; i++) {
      const prize = params.prizes[i];
      const prizePda = getPrizePda(gamePda, i);

      // Convert inches to hundredths (650 = 6.50 inches)
      const lengthHundredths = prize.lengthInches ? Math.round(prize.lengthInches * 100) : 0;
      const widthHundredths = prize.widthInches ? Math.round(prize.widthInches * 100) : 0;
      const heightHundredths = prize.heightInches ? Math.round(prize.heightInches * 100) : 0;

      log(`Step 2/2: Adding prize ${i + 1}/${params.prizes.length}: ${prize.name}`);

      // add_prize(prize_index, prize_id, name, description, image_url, metadata_uri, physical_sku, tier, probability_bp, cost_usd, weight_grams, length_hundredths, width_hundredths, height_hundredths, supply_total)
      let prizeSig: string;
      try {
        prizeSig = await (program.methods as any)
          .addPrize(
          i, // prize_index (u8)
          new BN(prize.prizeId), // prize_id (u64)
          prize.name, // name (string)
          prize.description || "", // description (string)
          prize.imageUrl || "", // image_url (string)
          prize.metadataUri || "", // metadata_uri (string)
          prize.physicalSku || "", // physical_sku (string)
          tierToAnchor(prize.tier), // tier (PrizeTier enum)
          prize.probabilityBp, // probability_bp (u16)
          new BN(prize.costUsd), // cost_usd (u64)
          prize.weightGrams ?? 0, // weight_grams (u32)
          lengthHundredths, // length_hundredths (u16)
          widthHundredths, // width_hundredths (u16)
          heightHundredths, // height_hundredths (u16)
          prize.supplyTotal // supply_total (u32)
        )
        .accounts({
          authority: wallet.publicKey,
          game: gamePda,
          prize: prizePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      } catch (err: any) {
        console.error(`Add prize ${i} error:`, err);
        const errMsg = err?.message || String(err);
        if (errMsg.includes("User rejected") || errMsg.includes("cancelled")) {
          return { success: false, error: "Transaction cancelled by user" };
        }
        return { success: false, error: `Add prize ${i} failed: ${errMsg}` };
      }

      log(`Prize ${i + 1} added: ${prizeSig.slice(0, 20)}...`);
      prizeSignatures.push(prizeSig);
    }

    log(`✅ Game deployed successfully with ${params.prizes.length} prizes!`);

    return {
      success: true,
      signature: initSignature,
      prizeSignatures,
      gamePda: gamePda.toString(),
    };
  } catch (error: any) {
    console.error("Error deploying game:", error);

    // Parse common errors
    let errorMessage = error.message || "Unknown error";

    if (errorMessage.includes("Unauthorized")) {
      errorMessage =
        "Unauthorized: Your wallet is not the program authority. Only the admin wallet can deploy games.";
    } else if (errorMessage.includes("already in use")) {
      errorMessage = `Game ID ${params.gameId} already exists on-chain. Use a different game ID.`;
    } else if (errorMessage.includes("insufficient funds")) {
      errorMessage = "Insufficient SOL to pay for transaction fees.";
    } else if (errorMessage.includes("custom program error")) {
      // Try to parse Anchor error
      const match = errorMessage.match(
        /custom program error: (0x[0-9a-fA-F]+)/
      );
      if (match) {
        const code = parseInt(match[1], 16);
        const errorNames: Record<number, string> = {
          6000: "Invalid probabilities - must sum to <= 10000",
          6001: "Game is inactive",
          6002: "All prizes are out of stock",
          6003: "Invalid VRF result",
          6004: "Unauthorized",
          6005: "Prize not found",
          6006: "Insufficient funds",
          6007: "Invalid token amount",
          6008: "Math overflow",
          6009: "String exceeds maximum length",
          6010: "Too many prizes (max 16)",
          6011: "Invalid prize index",
        };
        errorMessage = errorNames[code] || `Program error: ${code}`;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if a game exists on-chain
 */
export async function checkGameExists(
  connection: Connection,
  gameId: number
): Promise<boolean> {
  try {
    const gamePda = getGamePda(gameId);
    const accountInfo = await connection.getAccountInfo(gamePda);
    return accountInfo !== null;
  } catch {
    return false;
  }
}

/**
 * Fetch the IDL from the deployed program or from a local file
 */
export async function fetchIdl(): Promise<Idl | null> {
  try {
    // In production, you might want to fetch from a CDN or your API
    const response = await fetch("/idl/gachapon_game.json");
    if (!response.ok) {
      console.error("Failed to fetch IDL:", response.statusText);
      return null;
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching IDL:", error);
    return null;
  }
}

/**
 * Config account structure (matches on-chain Config struct)
 */
export interface ProgramConfig {
  authority: PublicKey;
  bump: number;
}

/**
 * Fetch the program authority from the Config PDA
 */
export async function getProgramAuthority(
  connection: Connection
): Promise<PublicKey | null> {
  try {
    const configPda = getConfigPda();
    const accountInfo = await connection.getAccountInfo(configPda);

    if (!accountInfo) {
      console.log("Config account not found - program may not be initialized");
      return null;
    }

    // Parse the Config account data
    // Skip 8-byte discriminator, then read 32-byte authority pubkey
    const data = accountInfo.data;
    if (data.length < 41) {
      // 8 + 32 + 1
      console.error("Config account data too short");
      return null;
    }

    const authorityBytes = data.slice(8, 40);
    const authority = new PublicKey(authorityBytes);

    return authority;
  } catch (error) {
    console.error("Error fetching program authority:", error);
    return null;
  }
}

/**
 * Check if a wallet is authorized to deploy games
 */
export async function checkWalletAuthorization(
  connection: Connection,
  walletPubkey: PublicKey | null
): Promise<{
  isAuthorized: boolean;
  authorityAddress: string | null;
  walletAddress: string | null;
  message: string;
}> {
  if (!walletPubkey) {
    return {
      isAuthorized: false,
      authorityAddress: null,
      walletAddress: null,
      message: "No wallet connected",
    };
  }

  try {
    const authority = await getProgramAuthority(connection);

    if (!authority) {
      return {
        isAuthorized: false,
        authorityAddress: null,
        walletAddress: walletPubkey.toString(),
        message: "Program not initialized. Run initialize_program first.",
      };
    }

    const isAuthorized = authority.equals(walletPubkey);

    return {
      isAuthorized,
      authorityAddress: authority.toString(),
      walletAddress: walletPubkey.toString(),
      message: isAuthorized
        ? "✓ You are the program authority"
        : `✗ Not authorized. Authority is: ${authority.toString().slice(0, 8)}...${authority.toString().slice(-4)}`,
    };
  } catch (error) {
    console.error("Error checking authorization:", error);
    return {
      isAuthorized: false,
      authorityAddress: null,
      walletAddress: walletPubkey.toString(),
      message: "Error checking authorization",
    };
  }
}
