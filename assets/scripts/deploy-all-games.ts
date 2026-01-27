#!/usr/bin/env ts-node
/**
 * Automated Game Deployment Script
 * 
 * Deploys all games from the CSV file to the Solana blockchain.
 * Uploads images to Cloudinary and creates games with prizes on-chain.
 * 
 * Prerequisites:
 * - Authority wallet keypair file
 * - Cloudinary credentials in .env
 * - Solana RPC URL
 * 
 * Usage:
 *   npx ts-node assets/scripts/deploy-all-games.ts --dry-run    # Preview only
 *   npx ts-node assets/scripts/deploy-all-games.ts              # Deploy all games
 *   npx ts-node assets/scripts/deploy-all-games.ts --game 1     # Deploy specific game
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, BN, Idl, Program } from '@coral-xyz/anchor';
import * as dotenv from 'dotenv';

// Load environment variables from .env.script (pulled from Vercel production)
const PROJECT_ROOT = path.join(__dirname, '../..');
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.script') });

// ============================================================================
// CONFIGURATION
// ============================================================================

const ASSETS_DIR = path.join(__dirname, '..');
const CSV_PATH = path.join(ASSETS_DIR, 'game-prizes-tracker.csv');
const GENERATED_DIR = path.join(ASSETS_DIR, 'generated');
const IDL_PATH = path.join(PROJECT_ROOT, 'frontend/public/idl/gachapon_game.json');

// Solana Configuration
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = process.env.NEXT_PUBLIC_GAME_PROGRAM_ID || '';
const TOKEN_MINT = process.env.NEXT_PUBLIC_TOKEN_MINT || '';

// Cloudinary Configuration (REQUIRED for NFT minting)
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

// Backend API URL for metadata
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ============================================================================
// TYPES
// ============================================================================

interface CSVRow {
  Game: string;
  'Prize Name': string;
  'Cost USD': string;
  'Weight (g)': string;
  'Length (in)': string;
  'Width (in)': string;
  'Height (in)': string;
  Supply: string;
  SKU: string;
  'Suggested Play Cost': string;
  'Image Ready': string;
  Sourced: string;
  Notes: string;
}

interface Prize {
  name: string;
  sku: string;
  costUsd: number;
  weightGrams: number;
  lengthInches: number;
  widthInches: number;
  heightInches: number;
  supply: number;
  imageLocalPath: string | null;
  imageUrl: string;
}

interface Game {
  gameNumber: number;
  name: string;
  prizes: Prize[];
  suggestedPlayCost: string;
  bannerLocalPath: string | null;
  bannerUrl: string;
}

type PrizeTier = 'common' | 'uncommon' | 'rare' | 'legendary';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sanitizeFilename(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseGameInfo(gameString: string): { gameNumber: number; gameName: string } {
  // Parse "GAME 1: Labubu" -> { gameNumber: 1, gameName: "Labubu" }
  const match = gameString.match(/GAME\s+(\d+):\s*(.+)/i);
  if (match) {
    return {
      gameNumber: parseInt(match[1], 10),
      gameName: match[2].trim(),
    };
  }
  return { gameNumber: 0, gameName: gameString };
}

function determineTier(probabilityBp: number): PrizeTier {
  if (probabilityBp >= 3000) return 'common';
  if (probabilityBp >= 1000) return 'uncommon';
  if (probabilityBp >= 100) return 'rare';
  return 'legendary';
}

function calculateProbabilities(prizes: Prize[], playCostUsd: number, targetProfitMargin: number = 0.8): {
  prize: Prize;
  probabilityBp: number;
  tier: PrizeTier;
}[] {
  // Calculate raw weights (inverse of cost)
  const priceSensitivity = 1.2;
  const weights = prizes.map(p => 1 / Math.pow(p.costUsd, priceSensitivity));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  // Normalize to get relative probabilities
  const relativeProbs = weights.map(w => w / totalWeight);
  
  // Calculate total expected value if all prizes sum to 100%
  const totalCost = prizes.reduce((sum, p) => sum + p.costUsd, 0);
  const avgCost = totalCost / prizes.length;
  
  // Scale factor to achieve target profit margin
  // EV = (1 - profitMargin) * playCost
  const targetEV = (1 - targetProfitMargin) * playCostUsd;
  const currentEV = relativeProbs.reduce((sum, prob, i) => sum + prob * prizes[i].costUsd, 0);
  const scaleFactor = Math.min(1, targetEV / currentEV);
  
  // Apply scale factor and convert to basis points
  return prizes.map((prize, i) => {
    const probabilityBp = Math.max(1, Math.round(relativeProbs[i] * scaleFactor * 10000));
    return {
      prize,
      probabilityBp,
      tier: determineTier(probabilityBp),
    };
  });
}

// ============================================================================
// CSV PARSING
// ============================================================================

function parseCSV(): Game[] {
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows: CSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const gamesMap = new Map<string, Game>();

  for (const row of rows) {
    const { gameNumber, gameName } = parseGameInfo(row.Game);
    const gameKey = `${gameNumber}-${gameName}`;

    if (!gamesMap.has(gameKey)) {
      const bannerFilename = `${sanitizeFilename(gameName)}-banner.png`;
      const bannerPath = path.join(GENERATED_DIR, 'games', bannerFilename);
      
      gamesMap.set(gameKey, {
        gameNumber,
        name: gameName,
        prizes: [],
        suggestedPlayCost: row['Suggested Play Cost'],
        bannerLocalPath: fs.existsSync(bannerPath) ? bannerPath : null,
        bannerUrl: '',
      });
    }

    const game = gamesMap.get(gameKey)!;
    const prizeFilename = `${sanitizeFilename(row['Prize Name'])}.png`;
    const prizePath = path.join(GENERATED_DIR, 'prizes', sanitizeFilename(gameName), prizeFilename);

    game.prizes.push({
      name: row['Prize Name'],
      sku: row.SKU,
      costUsd: parseFloat(row['Cost USD']) || 0,
      weightGrams: parseFloat(row['Weight (g)']) || 0,
      lengthInches: parseFloat(row['Length (in)']) || 0,
      widthInches: parseFloat(row['Width (in)']) || 0,
      heightInches: parseFloat(row['Height (in)']) || 0,
      supply: parseInt(row.Supply, 10) || 0,
      imageLocalPath: fs.existsSync(prizePath) ? prizePath : null,
      imageUrl: '',
    });
  }

  return Array.from(gamesMap.values()).sort((a, b) => a.gameNumber - b.gameNumber);
}

// ============================================================================
// IMAGE UPLOAD (Cloudinary) - REQUIRED for NFT minting
// ============================================================================

let cloudinaryConfigured = false;

async function initCloudinary(): Promise<boolean> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error('✗ Cloudinary credentials not found!');
    console.error('  Required env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
    return false;
  }

  // Dynamic import for cloudinary
  const cloudinary = await import('cloudinary');
  
  cloudinary.v2.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });

  cloudinaryConfigured = true;
  console.log(`✓ Cloudinary configured (cloud: ${CLOUDINARY_CLOUD_NAME})`);
  return true;
}

async function uploadToCloudinary(filePath: string, folder: string): Promise<string> {
  if (!cloudinaryConfigured) {
    throw new Error('Cloudinary not initialized. Call initCloudinary() first.');
  }

  const cloudinary = await import('cloudinary');

  try {
    const result = await cloudinary.v2.uploader.upload(filePath, {
      folder: `grabbit/${folder}`,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    });
    return result.secure_url;
  } catch (error: any) {
    throw new Error(`Failed to upload ${path.basename(filePath)}: ${error.message}`);
  }
}

async function checkImageExists(publicId: string): Promise<string | null> {
  if (!cloudinaryConfigured) return null;

  const cloudinary = await import('cloudinary');
  
  try {
    const result = await cloudinary.v2.api.resource(`grabbit/${publicId}`);
    return result.secure_url;
  } catch {
    return null;
  }
}

// ============================================================================
// BLOCKCHAIN DEPLOYMENT
// ============================================================================

function loadKeypair(keypairPath: string): Keypair {
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(keypairData));
}

function getGamePda(gameId: number, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('game'), new BN(gameId).toArrayLike(Buffer, 'le', 8)],
    programId
  );
  return pda;
}

function getConfigPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    programId
  );
  return pda;
}

function getPrizePda(gamePda: PublicKey, prizeIndex: number, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('prize'), gamePda.toBuffer(), Buffer.from([prizeIndex])],
    programId
  );
  return pda;
}

function tierToAnchor(tier: PrizeTier): object {
  switch (tier) {
    case 'common': return { common: {} };
    case 'uncommon': return { uncommon: {} };
    case 'rare': return { rare: {} };
    case 'legendary': return { legendary: {} };
  }
}

// ============================================================================
// FIND AVAILABLE GAME ID
// ============================================================================

async function findFirstAvailableGameId(
  connection: Connection,
  startingId: number = 1
): Promise<number> {
  const programId = new PublicKey(PROGRAM_ID);
  
  console.log(`  Searching for first available game ID starting from ${startingId}...`);
  
  for (let id = startingId; id < startingId + 100; id++) {
    const gamePda = getGamePda(id, programId);
    const account = await connection.getAccountInfo(gamePda);
    
    if (!account) {
      console.log(`  ✓ Found available game ID: ${id}`);
      return id;
    }
    console.log(`    Game ID ${id} exists, checking next...`);
  }
  
  throw new Error(`No available game ID found in range ${startingId}-${startingId + 99}`);
}

// ============================================================================
// MAIN DEPLOYMENT FUNCTION
// ============================================================================

async function deployGame(
  connection: Connection,
  program: Program,
  authority: Keypair,
  game: Game,
  gameId: number
): Promise<boolean> {
  const programId = new PublicKey(PROGRAM_ID);
  const gamePda = getGamePda(gameId, programId);
  const configPda = getConfigPda(programId);
  const tokenMint = new PublicKey(TOKEN_MINT);
  const treasury = authority.publicKey;

  // Check if game exists
  const existingGame = await connection.getAccountInfo(gamePda);
  if (existingGame) {
    console.log(`  ⏭ Game ${gameId} already exists on-chain, skipping`);
    return false;
  }

  // Parse play cost
  const playCostMatch = game.suggestedPlayCost.match(/\$(\d+)/);
  const playCostUsd = playCostMatch ? parseFloat(playCostMatch[1]) : 5;
  const playCostCents = Math.round(playCostUsd * 100);

  // Calculate probabilities
  const prizesWithOdds = calculateProbabilities(game.prizes, playCostUsd);

  console.log(`  Deploying game ${gameId}: ${game.name}`);
  console.log(`    Play cost: $${playCostUsd}`);
  console.log(`    Prizes: ${game.prizes.length}`);
  console.log(`    Banner: ${game.bannerUrl || 'none'}`);

  try {
    // Step 1: Initialize game
    console.log(`  Step 1: Initializing game...`);
    const initTx = await (program.methods as any)
      .initializeGame(
        new BN(gameId),
        game.name,
        `Win amazing ${game.name} prizes!`,
        game.bannerUrl || '',
        new BN(playCostCents),
        tokenMint
      )
      .accounts({
        authority: authority.publicKey,
        config: configPda,
        game: gamePda,
        treasury: treasury,
      })
      .signers([authority])
      .rpc({ skipPreflight: true });

    console.log(`    ✓ Game initialized: ${initTx.slice(0, 20)}...`);

    // Step 2: Add each prize
    for (let i = 0; i < prizesWithOdds.length; i++) {
      const { prize, probabilityBp, tier } = prizesWithOdds[i];
      const prizePda = getPrizePda(gamePda, i, programId);

      console.log(`  Step 2: Adding prize ${i + 1}/${prizesWithOdds.length}: ${prize.name} (${tier}, ${probabilityBp/100}%)`);

      const metadataUri = `${BACKEND_URL}/metadata/game/${gameId}/prize/${i + 1}`;

      const prizeTx = await (program.methods as any)
        .addPrize(
          i,
          new BN(i + 1),
          prize.name,
          '',
          prize.imageUrl || '',
          metadataUri,
          prize.sku,
          tierToAnchor(tier),
          probabilityBp,
          new BN(Math.round(prize.costUsd * 100)),
          prize.weightGrams,
          Math.round(prize.lengthInches * 100),
          Math.round(prize.widthInches * 100),
          Math.round(prize.heightInches * 100),
          prize.supply
        )
        .accounts({
          authority: authority.publicKey,
          game: gamePda,
          prize: prizePda,
        })
        .signers([authority])
        .rpc({ skipPreflight: true });

      console.log(`    ✓ Prize added: ${prizeTx.slice(0, 20)}...`);
    }

    console.log(`  ✅ Game ${gameId} deployed successfully!`);
    return true;

  } catch (error: any) {
    console.error(`  ✗ Failed to deploy game ${gameId}:`, error.message);
    return false;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const uploadOnly = args.includes('--upload-only');
  const skipUpload = args.includes('--skip-upload');
  const gameFilterArg = args.find(a => a.startsWith('--game='));
  const gameFilter = gameFilterArg ? parseInt(gameFilterArg.split('=')[1], 10) : null;
  const startIdArg = args.find(a => a.startsWith('--start-id='));
  const startId = startIdArg ? parseInt(startIdArg.split('=')[1], 10) : 1;
  const keypairArg = args.find(a => a.startsWith('--keypair='));
  const keypairPath = keypairArg?.split('=')[1] || process.env.AUTHORITY_KEYPAIR_PATH || '';

  console.log('='.repeat(60));
  console.log('GRABBIT GAME DEPLOYMENT SCRIPT');
  console.log('='.repeat(60));
  console.log();
  console.log(`Mode: ${dryRun ? 'DRY RUN (no actual deployment)' : uploadOnly ? 'UPLOAD ONLY' : 'LIVE DEPLOYMENT'}`);
  console.log(`CSV: ${CSV_PATH}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Program: ${PROGRAM_ID || 'NOT SET'}`);
  console.log();

  // Parse CSV
  console.log('Parsing CSV...');
  const games = parseCSV();
  console.log(`Found ${games.length} games with ${games.reduce((sum, g) => sum + g.prizes.length, 0)} total prizes`);
  console.log();

  // Filter if specified
  const gamesToDeploy = gameFilter 
    ? games.filter(g => g.gameNumber === gameFilter)
    : games;

  if (gamesToDeploy.length === 0) {
    console.log('No games to deploy.');
    return;
  }

  // Check for missing images
  const missingImages: string[] = [];
  for (const game of gamesToDeploy) {
    if (!game.bannerLocalPath) {
      missingImages.push(`Game ${game.gameNumber} (${game.name}): Missing banner`);
    }
    for (const prize of game.prizes) {
      if (!prize.imageLocalPath) {
        missingImages.push(`Game ${game.gameNumber} - ${prize.name}: Missing image`);
      }
    }
  }

  // Preview
  console.log('-'.repeat(60));
  console.log('GAMES TO DEPLOY:');
  console.log('-'.repeat(60));
  for (const game of gamesToDeploy) {
    const hasAllImages = game.bannerLocalPath && game.prizes.every(p => p.imageLocalPath);
    console.log(`\n📦 Game ${game.gameNumber}: ${game.name} ${hasAllImages ? '✓' : '⚠ MISSING IMAGES'}`);
    console.log(`   Play Cost: ${game.suggestedPlayCost}`);
    console.log(`   Prizes: ${game.prizes.length}`);
    console.log(`   Banner: ${game.bannerLocalPath ? '✓' : '✗ MISSING'}`);
    console.log(`   Prize Images: ${game.prizes.filter(p => p.imageLocalPath).length}/${game.prizes.length}`);
    
    for (const prize of game.prizes) {
      console.log(`     - ${prize.name} ($${prize.costUsd}, ${prize.supply} units) ${prize.imageLocalPath ? '✓' : '✗ MISSING'}`);
    }
  }

  if (missingImages.length > 0) {
    console.log('\n' + '⚠'.repeat(30));
    console.log('WARNING: Missing images detected!');
    console.log('NFTs require images. Generate missing images first:');
    console.log('  python3 assets/scripts/generate-all-images.py');
    console.log('\nMissing:');
    missingImages.forEach(m => console.log(`  - ${m}`));
    console.log('⚠'.repeat(30));
  }

  if (dryRun) {
    console.log('\n' + '='.repeat(60));
    console.log('DRY RUN COMPLETE - No changes made');
    console.log('='.repeat(60));
    console.log('\nOptions:');
    console.log('  --upload-only    Upload images to Cloudinary without blockchain deployment');
    console.log('  --skip-upload    Skip image upload, use existing Cloudinary URLs');
    console.log('  --game=N         Deploy only game number N from CSV');
    console.log('  --start-id=N     Start searching for available game IDs from N (default: 1)');
    console.log('\nTo deploy for real:');
    console.log('  npx ts-node assets/scripts/deploy-all-games.ts --keypair=/path/to/authority.json');
    return;
  }

  // Initialize Cloudinary (REQUIRED for NFT images)
  if (!skipUpload) {
    console.log('\nInitializing Cloudinary...');
    const cloudinaryOk = await initCloudinary();
    if (!cloudinaryOk) {
      console.error('✗ Cannot proceed without Cloudinary for NFT images');
      return;
    }
  }

  // Validate requirements for blockchain deployment
  if (!uploadOnly) {
    if (!PROGRAM_ID) {
      console.error('\n✗ NEXT_PUBLIC_GAME_PROGRAM_ID not set');
      return;
    }
    if (!TOKEN_MINT) {
      console.error('\n✗ NEXT_PUBLIC_TOKEN_MINT not set');
      return;
    }
    if (!keypairPath || !fs.existsSync(keypairPath)) {
      console.error('\n✗ Authority keypair not found. Provide --keypair=/path/to/authority.json');
      return;
    }
  }

  let authority: Keypair | null = null;
  let program: Program | null = null;
  let connection: Connection | null = null;

  if (!uploadOnly) {
    // Load keypair and IDL
    console.log('\nLoading authority keypair...');
    authority = loadKeypair(keypairPath);
    console.log(`Authority: ${authority.publicKey.toString()}`);

    console.log('Loading IDL...');
    if (!fs.existsSync(IDL_PATH)) {
      console.error(`✗ IDL not found at ${IDL_PATH}`);
      return;
    }
    const idl: Idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf-8'));

    // Connect to Solana
    console.log('Connecting to Solana...');
    connection = new Connection(RPC_URL, 'confirmed');
    
    // Create provider
    const wallet = {
      publicKey: authority.publicKey,
      signTransaction: async (tx: any) => { tx.sign(authority!); return tx; },
      signAllTransactions: async (txs: any[]) => { txs.forEach(tx => tx.sign(authority!)); return txs; },
    };
    const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
    program = new Program(idl, provider);
  }

  // Upload images and deploy games
  console.log('\n' + '='.repeat(60));
  console.log(uploadOnly ? 'UPLOADING IMAGES' : 'DEPLOYING GAMES');
  console.log('='.repeat(60));

  let deployed = 0;
  let failed = 0;
  let uploaded = 0;

  // Find first available game ID on-chain
  let nextGameId = startId;
  if (!uploadOnly && connection) {
    console.log('\nChecking on-chain for existing games...');
    nextGameId = await findFirstAvailableGameId(connection, startId);
    console.log(`Starting deployment from game ID: ${nextGameId}\n`);
  }

  for (let i = 0; i < gamesToDeploy.length; i++) {
    const game = gamesToDeploy[i];
    const gameId = uploadOnly ? game.gameNumber : nextGameId + i;
    
    console.log(`\n📦 Processing Game ${gameId}: ${game.name}`);

    // Upload banner
    if (!skipUpload && game.bannerLocalPath) {
      try {
        console.log(`  Uploading banner...`);
        game.bannerUrl = await uploadToCloudinary(game.bannerLocalPath, 'banners');
        console.log(`    ✓ ${game.bannerUrl}`);
        uploaded++;
      } catch (error: any) {
        console.error(`    ✗ ${error.message}`);
        failed++;
        continue;
      }
    }

    // Upload prize images
    let allPrizesUploaded = true;
    for (const prize of game.prizes) {
      if (!skipUpload && prize.imageLocalPath) {
        try {
          console.log(`  Uploading prize: ${prize.name}...`);
          prize.imageUrl = await uploadToCloudinary(prize.imageLocalPath, `prizes/${sanitizeFilename(game.name)}`);
          console.log(`    ✓ ${prize.imageUrl}`);
          uploaded++;
        } catch (error: any) {
          console.error(`    ✗ ${error.message}`);
          allPrizesUploaded = false;
        }
      } else if (!prize.imageLocalPath) {
        console.error(`    ✗ ${prize.name}: No local image file`);
        allPrizesUploaded = false;
      }
    }

    if (uploadOnly) {
      continue;
    }

    // Verify all images are uploaded before blockchain deployment
    if (!game.bannerUrl || !allPrizesUploaded) {
      console.error(`  ✗ Skipping blockchain deployment - missing images`);
      failed++;
      continue;
    }

    // Deploy to blockchain
    const success = await deployGame(connection!, program!, authority!, game, gameId);
    if (success) {
      deployed++;
    } else {
      failed++;
    }

    // Small delay between games
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('COMPLETE');
  console.log('='.repeat(60));
  console.log(`Images uploaded: ${uploaded}`);
  if (!uploadOnly) {
    console.log(`Games deployed: ${deployed}`);
    console.log(`Failed/Skipped: ${failed}`);
  }
}

main().catch(console.error);
