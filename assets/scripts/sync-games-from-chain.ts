#!/usr/bin/env ts-node
/**
 * Sync Games from On-Chain to Database
 * 
 * Reads game data directly from Solana and inserts into the database.
 * Use this when:
 * - Games were created before the indexer was running
 * - The indexer missed events
 * - You need to manually sync on-chain state to DB
 * 
 * Usage:
 *   npx ts-node assets/scripts/sync-games-from-chain.ts --dry-run     # Preview only
 *   npx ts-node assets/scripts/sync-games-from-chain.ts               # Sync all games
 *   npx ts-node assets/scripts/sync-games-from-chain.ts --game=1      # Sync specific game
 */

import { BN } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

// Load environment variables
const PROJECT_ROOT = path.join(__dirname, '../..');
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.script') });

// Configuration
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_GAME_PROGRAM_ID || 'EKzLHZyU6WVfhYVXcE6R4hRE4YuWrva8NeLGMYB7ZDU6');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const MAX_PRIZES = 16;
const TIER_MAP: Record<number, string> = {
  0: 'common',
  1: 'uncommon',
  2: 'rare',
  3: 'legendary',
};

// ============================================================================
// HELPERS
// ============================================================================

function getGamePda(gameId: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('game'), new BN(gameId).toArrayLike(Buffer, 'le', 8)],
    PROGRAM_ID,
  );
  return pda;
}

function getPrizePda(gamePda: PublicKey, prizeIndex: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('prize'), gamePda.toBuffer(), Buffer.from([prizeIndex])],
    PROGRAM_ID,
  );
  return pda;
}

function readString(data: Buffer, offset: number): { value: string; newOffset: number } {
  const len = data.readUInt32LE(offset);
  offset += 4;
  const value = data.slice(offset, offset + len).toString('utf8');
  return { value, newOffset: offset + len };
}

// ============================================================================
// ON-CHAIN DATA FETCHING
// ============================================================================

interface OnChainGame {
  gameId: bigint;
  name: string;
  description: string;
  imageUrl: string;
  tokenMint: string;
  costUsd: number;
  treasury: string;
  prizeCount: number;
  totalPlays: bigint;
  isActive: boolean;
}

interface OnChainPrize {
  prizeIndex: number;
  prizeId: number;
  name: string;
  description: string;
  imageUrl: string;
  metadataUri: string;
  physicalSku: string;
  tier: number;
  probabilityBp: number;
  costUsd: number;
  weightGrams: number;
  lengthInches: number;
  widthInches: number;
  heightInches: number;
  supplyTotal: number;
  supplyRemaining: number;
}

async function fetchGameFromChain(connection: Connection, gameId: number): Promise<OnChainGame | null> {
  try {
    const gamePda = getGamePda(gameId);
    const accountInfo = await connection.getAccountInfo(gamePda);

    if (!accountInfo) {
      return null;
    }

    const data = accountInfo.data;
    let offset = 8; // Skip discriminator

    // authority (32 bytes)
    offset += 32;

    // game_id (u64)
    const gameIdValue = data.readBigUInt64LE(offset);
    offset += 8;

    // name (String)
    const nameResult = readString(data, offset);
    offset = nameResult.newOffset;

    // description (String)
    const descResult = readString(data, offset);
    offset = descResult.newOffset;

    // image_url (String)
    const imageResult = readString(data, offset);
    offset = imageResult.newOffset;

    // token_mint (32 bytes)
    const tokenMint = new PublicKey(data.slice(offset, offset + 32)).toString();
    offset += 32;

    // cost_usd (u64) - in cents
    const costUsdCents = Number(data.readBigUInt64LE(offset));
    offset += 8;

    // treasury (32 bytes)
    const treasury = new PublicKey(data.slice(offset, offset + 32)).toString();
    offset += 32;

    // prize_count (u8)
    const prizeCount = data.readUInt8(offset);
    offset += 1;

    // prize_probabilities (32 bytes)
    offset += MAX_PRIZES * 2;

    // total_supply_remaining (u32)
    offset += 4;

    // total_plays (u64)
    const totalPlays = data.readBigUInt64LE(offset);
    offset += 8;

    // is_active (bool)
    const isActive = data.readUInt8(offset) === 1;

    return {
      gameId: gameIdValue,
      name: nameResult.value,
      description: descResult.value,
      imageUrl: imageResult.value,
      tokenMint,
      costUsd: costUsdCents / 100,
      treasury,
      prizeCount,
      totalPlays,
      isActive,
    };
  } catch (error) {
    console.error(`Error fetching game ${gameId}:`, error);
    return null;
  }
}

async function fetchPrizeFromChain(connection: Connection, gamePda: PublicKey, prizeIndex: number): Promise<OnChainPrize | null> {
  try {
    const prizePda = getPrizePda(gamePda, prizeIndex);
    const accountInfo = await connection.getAccountInfo(prizePda);

    if (!accountInfo) {
      return null;
    }

    const data = accountInfo.data;
    let offset = 8; // Skip discriminator

    // game (32 bytes)
    offset += 32;

    // prize_index (u8)
    const prizeIdx = data.readUInt8(offset);
    offset += 1;

    // prize_id (u64)
    const prizeId = Number(data.readBigUInt64LE(offset));
    offset += 8;

    // name (String)
    const nameResult = readString(data, offset);
    offset = nameResult.newOffset;

    // description (String)
    const descResult = readString(data, offset);
    offset = descResult.newOffset;

    // image_url (String)
    const imageResult = readString(data, offset);
    offset = imageResult.newOffset;

    // metadata_uri (String)
    const metadataResult = readString(data, offset);
    offset = metadataResult.newOffset;

    // physical_sku (String)
    const skuResult = readString(data, offset);
    offset = skuResult.newOffset;

    // tier (u8)
    const tier = data.readUInt8(offset);
    offset += 1;

    // probability_bp (u16)
    const probabilityBp = data.readUInt16LE(offset);
    offset += 2;

    // cost_usd (u64) - in cents
    const costUsdCents = Number(data.readBigUInt64LE(offset));
    offset += 8;

    // weight_grams (u32)
    const weightGrams = data.readUInt32LE(offset);
    offset += 4;

    // length_hundredths (u16)
    const lengthHundredths = data.readUInt16LE(offset);
    offset += 2;

    // width_hundredths (u16)
    const widthHundredths = data.readUInt16LE(offset);
    offset += 2;

    // height_hundredths (u16)
    const heightHundredths = data.readUInt16LE(offset);
    offset += 2;

    // supply_total (u32)
    const supplyTotal = data.readUInt32LE(offset);
    offset += 4;

    // supply_remaining (u32)
    const supplyRemaining = data.readUInt32LE(offset);

    return {
      prizeIndex: prizeIdx,
      prizeId,
      name: nameResult.value,
      description: descResult.value,
      imageUrl: imageResult.value,
      metadataUri: metadataResult.value,
      physicalSku: skuResult.value,
      tier,
      probabilityBp,
      costUsd: costUsdCents / 100,
      weightGrams,
      lengthInches: lengthHundredths / 100,
      widthInches: widthHundredths / 100,
      heightInches: heightHundredths / 100,
      supplyTotal,
      supplyRemaining,
    };
  } catch (error) {
    console.error(`Error fetching prize ${prizeIndex}:`, error);
    return null;
  }
}

// ============================================================================
// DATABASE SYNC
// ============================================================================

async function syncGameToDatabase(
  supabase: AnySupabase,
  connection: Connection,
  gameId: number,
  dryRun: boolean
): Promise<boolean> {
  console.log(`\n📦 Syncing Game ID ${gameId}...`);

  // Fetch game from chain
  const game = await fetchGameFromChain(connection, gameId);
  if (!game) {
    console.log(`  ⏭ Game ${gameId} not found on-chain`);
    return false;
  }

  const gamePda = getGamePda(gameId);
  console.log(`  Name: ${game.name}`);
  console.log(`  Description: ${game.description.slice(0, 50)}...`);
  console.log(`  Cost: $${game.costUsd}`);
  console.log(`  Prizes: ${game.prizeCount}`);
  console.log(`  Active: ${game.isActive}`);
  console.log(`  PDA: ${gamePda.toString()}`);

  if (dryRun) {
    console.log(`  [DRY RUN] Would insert game into database`);
    
    // Still fetch prizes for preview
    for (let i = 0; i < game.prizeCount; i++) {
      const prize = await fetchPrizeFromChain(connection, gamePda, i);
      if (prize) {
        console.log(`    Prize ${i + 1}: ${prize.name} ($${prize.costUsd}, ${prize.probabilityBp/100}%, ${prize.supplyRemaining}/${prize.supplyTotal})`);
      }
    }
    return true;
  }

  // Insert game into database
  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .upsert({
      gameId: gameId.toString(),
      name: game.name,
      description: game.description,
      imageUrl: game.imageUrl || null,
      costInTokens: Math.round(game.costUsd * 100),
      costInUsd: game.costUsd,
      currencyTokenMintAddress: game.tokenMint,
      onChainAddress: gamePda.toString(),
      isActive: game.isActive,
      totalPlays: Number(game.totalPlays),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, {
      onConflict: 'gameId',
    })
    .select('id')
    .single();

  if (gameError) {
    console.error(`  ✗ Failed to insert game: ${gameError.message}`);
    return false;
  }

  const dbGameId = (gameData as { id: number }).id;
  console.log(`  ✓ Game inserted with DB ID: ${dbGameId}`);

  // Fetch and insert prizes
  for (let i = 0; i < game.prizeCount; i++) {
    const prize = await fetchPrizeFromChain(connection, gamePda, i);
    if (!prize) {
      console.log(`    ⚠ Prize ${i} not found on-chain`);
      continue;
    }

    const { error: prizeError } = await supabase
      .from('prizes')
      .upsert({
        gameId: dbGameId,
        prizeId: prize.prizeId,
        prizeIndex: prize.prizeIndex,
        name: prize.name,
        description: prize.description || null,
        imageUrl: prize.imageUrl || null,
        metadataUri: prize.metadataUri || null,
        physicalSku: prize.physicalSku,
        tier: TIER_MAP[prize.tier] || 'common',
        probabilityBasisPoints: prize.probabilityBp,
        costInUsd: prize.costUsd,
        weightGrams: prize.weightGrams,
        lengthInches: prize.lengthInches || null,
        widthInches: prize.widthInches || null,
        heightInches: prize.heightInches || null,
        supplyTotal: prize.supplyTotal,
        supplyRemaining: prize.supplyRemaining,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, {
        onConflict: 'gameId,prizeId',
      });

    if (prizeError) {
      console.error(`    ✗ Prize ${i} error: ${prizeError.message}`);
    } else {
      console.log(`    ✓ Prize ${i + 1}: ${prize.name} (${TIER_MAP[prize.tier]}, ${prize.probabilityBp/100}%)`);
    }
  }

  return true;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const gameArg = args.find(a => a.startsWith('--game='));
  const specificGame = gameArg ? parseInt(gameArg.split('=')[1], 10) : null;
  const maxScanArg = args.find(a => a.startsWith('--max-scan='));
  const maxScan = maxScanArg ? parseInt(maxScanArg.split('=')[1], 10) : 50;

  console.log('='.repeat(60));
  console.log('SYNC GAMES FROM ON-CHAIN TO DATABASE');
  console.log('='.repeat(60));
  console.log();
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE SYNC'}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Program: ${PROGRAM_ID.toString()}`);
  console.log(`Supabase: ${SUPABASE_URL ? '✓' : '✗ NOT SET'}`);
  console.log();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('✗ Supabase credentials not set');
    return;
  }

  const connection = new Connection(RPC_URL, 'confirmed');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  let synced = 0;
  let notFound = 0;

  if (specificGame !== null) {
    // Sync specific game
    const success = await syncGameToDatabase(supabase, connection, specificGame, dryRun);
    if (success) synced++;
  } else {
    // Scan for all games
    console.log(`Scanning game IDs 1-${maxScan}...`);
    
    for (let id = 1; id <= maxScan; id++) {
      const gamePda = getGamePda(id);
      const account = await connection.getAccountInfo(gamePda);
      
      if (account) {
        const success = await syncGameToDatabase(supabase, connection, id, dryRun);
        if (success) synced++;
      } else {
        notFound++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SYNC COMPLETE');
  console.log('='.repeat(60));
  console.log(`Games synced: ${synced}`);
  console.log(`IDs not found: ${notFound}`);
  
  if (dryRun) {
    console.log('\nTo sync for real, run without --dry-run');
  }
}

main().catch(console.error);
