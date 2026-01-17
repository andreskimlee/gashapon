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

import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program, BN, Idl } from '@coral-xyz/anchor';
import type { WalletContextState } from '@solana/wallet-adapter-react';

// Program ID for gachapon-game
const PROGRAM_ID = new PublicKey('4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG');

// Default token mint (pump.fun token)
const DEFAULT_TOKEN_MINT = new PublicKey('Cp95mjbZZnDvqCNYExmGYEzrgu6wAScf32Fmwt2Kpump');

// Treasury wallet (should be configured per environment)
const TREASURY_PUBKEY = new PublicKey('EgvbCzEZ1RvRKA1VdZEzPuJJKnEfB3jhG7S7mJVd6wzo');

export type PrizeTier = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface PrizeConfigInput {
  prizeId: number;
  name: string;
  description: string;        // Prize description
  imageUrl: string;           // Prize image URL
  metadataUri: string;
  physicalSku: string;
  tier: PrizeTier;
  probabilityBp: number;      // Probability in basis points (0-10000)
  costUsd: number;            // Cost/value of the prize in cents
  weightGrams: number;        // Prize weight in grams
  supplyTotal: number;
  supplyRemaining: number;
}

export interface DeployGameParams {
  gameId: number;
  name: string;               // Game name
  description: string;        // Game description
  imageUrl: string;           // Game image URL
  costUsdCents: number;       // Cost per play in USD cents (e.g., 500 = $5.00)
  tokenMint?: string;         // Optional custom token mint
  treasury?: string;          // Optional custom treasury
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
    [Buffer.from('game'), new BN(gameId).toArrayLike(Buffer, 'le', 8)],
    PROGRAM_ID
  );
  return pda;
}

/**
 * Get the config PDA address
 */
export function getConfigPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    PROGRAM_ID
  );
  return pda;
}

/**
 * Get the prize PDA address
 */
export function getPrizePda(gamePda: PublicKey, prizeIndex: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('prize'), gamePda.toBuffer(), Buffer.from([prizeIndex])],
    PROGRAM_ID
  );
  return pda;
}

/**
 * Convert tier string to Anchor enum format
 */
function tierToAnchor(tier: PrizeTier): object {
  switch (tier) {
    case 'common':
      return { common: {} };
    case 'uncommon':
      return { uncommon: {} };
    case 'rare':
      return { rare: {} };
    case 'legendary':
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
  idl: Idl
): Promise<DeployGameResult> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    return {
      success: false,
      error: 'Wallet not connected or does not support signing',
    };
  }

  try {
    // Create Anchor provider
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions!,
      },
      { commitment: 'confirmed' }
    );

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

    console.log('Deploying game with params:', {
      gameId: params.gameId,
      name: params.name,
      costUsdCents: params.costUsdCents,
      tokenMint: tokenMint.toString(),
      treasury: treasury.toString(),
      gamePda: gamePda.toString(),
      configPda: configPda.toString(),
      prizeCount: params.prizes.length,
    });

    // Step 1: Call initialize_game instruction (WITHOUT prizes)
    // New instruction signature: initialize_game(game_id, name, description, image_url, cost_usd, token_mint)
    const initSignature = await (program.methods as any)
      .initializeGame(
        new BN(params.gameId),
        params.name,
        params.description || '',
        params.imageUrl || '',
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
      .rpc();

    console.log('Game initialized:', initSignature);

    // Step 2: Add each prize separately
    const prizeSignatures: string[] = [];
    
    for (let i = 0; i < params.prizes.length; i++) {
      const prize = params.prizes[i];
      const prizePda = getPrizePda(gamePda, i);
      
      console.log(`Adding prize ${i}: ${prize.name}`);
      
      // add_prize(prize_index, prize_id, name, description, image_url, metadata_uri, physical_sku, tier, probability_bp, cost_usd, weight_grams, supply_total)
      const prizeSig = await (program.methods as any)
        .addPrize(
          i, // prize_index
          new BN(prize.prizeId),
          prize.name,
          prize.description || '',
          prize.imageUrl || '',
          prize.metadataUri || '',
          prize.physicalSku || '',
          tierToAnchor(prize.tier),
          prize.probabilityBp,
          new BN(prize.costUsd),
          prize.weightGrams,
          prize.supplyTotal
        )
        .accounts({
          authority: wallet.publicKey,
          game: gamePda,
          prize: prizePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log(`Prize ${i} added:`, prizeSig);
      prizeSignatures.push(prizeSig);
    }

    console.log('Game deployed successfully with', params.prizes.length, 'prizes');

    return {
      success: true,
      signature: initSignature,
      prizeSignatures,
      gamePda: gamePda.toString(),
    };
  } catch (error: any) {
    console.error('Error deploying game:', error);

    // Parse common errors
    let errorMessage = error.message || 'Unknown error';

    if (errorMessage.includes('Unauthorized')) {
      errorMessage =
        'Unauthorized: Your wallet is not the program authority. Only the admin wallet can deploy games.';
    } else if (errorMessage.includes('already in use')) {
      errorMessage = `Game ID ${params.gameId} already exists on-chain. Use a different game ID.`;
    } else if (errorMessage.includes('insufficient funds')) {
      errorMessage = 'Insufficient SOL to pay for transaction fees.';
    } else if (errorMessage.includes('custom program error')) {
      // Try to parse Anchor error
      const match = errorMessage.match(/custom program error: (0x[0-9a-fA-F]+)/);
      if (match) {
        const code = parseInt(match[1], 16);
        const errorNames: Record<number, string> = {
          6000: 'Invalid probabilities - must sum to <= 10000',
          6001: 'Game is inactive',
          6002: 'All prizes are out of stock',
          6003: 'Invalid VRF result',
          6004: 'Unauthorized',
          6005: 'Prize not found',
          6006: 'Insufficient funds',
          6007: 'Invalid token amount',
          6008: 'Math overflow',
          6009: 'String exceeds maximum length',
          6010: 'Too many prizes (max 16)',
          6011: 'Invalid prize index',
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
    const response = await fetch('/idl/gachapon_game.json');
    if (!response.ok) {
      console.error('Failed to fetch IDL:', response.statusText);
      return null;
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching IDL:', error);
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
      console.log('Config account not found - program may not be initialized');
      return null;
    }

    // Parse the Config account data
    // Skip 8-byte discriminator, then read 32-byte authority pubkey
    const data = accountInfo.data;
    if (data.length < 41) { // 8 + 32 + 1
      console.error('Config account data too short');
      return null;
    }

    const authorityBytes = data.slice(8, 40);
    const authority = new PublicKey(authorityBytes);
    
    return authority;
  } catch (error) {
    console.error('Error fetching program authority:', error);
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
      message: 'No wallet connected',
    };
  }

  try {
    const authority = await getProgramAuthority(connection);
    
    if (!authority) {
      return {
        isAuthorized: false,
        authorityAddress: null,
        walletAddress: walletPubkey.toString(),
        message: 'Program not initialized. Run initialize_program first.',
      };
    }

    const isAuthorized = authority.equals(walletPubkey);
    
    return {
      isAuthorized,
      authorityAddress: authority.toString(),
      walletAddress: walletPubkey.toString(),
      message: isAuthorized
        ? '✓ You are the program authority'
        : `✗ Not authorized. Authority is: ${authority.toString().slice(0, 8)}...${authority.toString().slice(-4)}`,
    };
  } catch (error) {
    console.error('Error checking authorization:', error);
    return {
      isAuthorized: false,
      authorityAddress: null,
      walletAddress: walletPubkey.toString(),
      message: 'Error checking authorization',
    };
  }
}
