#!/usr/bin/env ts-node

/**
 * Script to initialize a game with the new program structure
 * - initialize_game creates the game without prizes
 * - add_prize adds each prize separately
 */

import * as anchor from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import BN from "bn.js";
import * as fs from "fs";
import * as path from "path";

// Use game ID 4 (game IDs 1-3 have incompatible old structure)
const GAME_ID = new BN(4);
const TREASURY_PATH = path.join(process.cwd(), "treasury-devnet-keypair.json");
const WALLET_PATH = path.join(process.cwd(), "phantom-devnet-keypair.json");

// Prize configuration
const PRIZES = [
  {
    prizeId: new BN(1),
    name: "Common Capsule",
    description: "A common prize from the gachapon",
    imageUrl: "https://example.com/common.png",
    metadataUri: "https://arweave.net/common",
    physicalSku: "SKU-COMMON-001",
    tier: { common: {} },
    probabilityBp: 7000, // 70%
    costUsd: new BN(100), // $1.00
    supplyTotal: 100,
  },
  {
    prizeId: new BN(2),
    name: "Uncommon Figure",
    description: "An uncommon collectible figure",
    imageUrl: "https://example.com/uncommon.png",
    metadataUri: "https://arweave.net/uncommon",
    physicalSku: "SKU-UNCOMMON-001",
    tier: { uncommon: {} },
    probabilityBp: 2000, // 20%
    costUsd: new BN(500), // $5.00
    supplyTotal: 50,
  },
  {
    prizeId: new BN(3),
    name: "Rare Collectible",
    description: "A rare limited edition item",
    imageUrl: "https://example.com/rare.png",
    metadataUri: "https://arweave.net/rare",
    physicalSku: "SKU-RARE-001",
    tier: { rare: {} },
    probabilityBp: 900, // 9% - leaves 1% for no prize (loss)
    costUsd: new BN(2500), // $25.00
    supplyTotal: 20,
  },
  {
    prizeId: new BN(4),
    name: "Legendary Trophy",
    description: "An extremely rare legendary prize",
    imageUrl: "https://example.com/legendary.png",
    metadataUri: "https://arweave.net/legendary",
    physicalSku: "SKU-LEGENDARY-001",
    tier: { legendary: {} },
    probabilityBp: 100, // 1% 
    costUsd: new BN(10000), // $100.00
    supplyTotal: 5,
  },
];

async function main() {
  const connection = new Connection(
    process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com",
    "confirmed"
  );

  // Load wallet
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load treasury
  if (!fs.existsSync(TREASURY_PATH)) {
    console.error(`❌ Treasury keypair not found at: ${TREASURY_PATH}`);
    process.exit(1);
  }
  const treasury = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(TREASURY_PATH, "utf-8")))
  );

  console.log("🔑 Wallet:", wallet.publicKey.toString());
  console.log("💰 Treasury:", treasury.publicKey.toString());

  // Load program
  const idlPath = path.join(process.cwd(), "target/idl/gachapon_game.json");
  const gameProgramIdl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const programId = new PublicKey(
    "4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG"
  );
  gameProgramIdl.address = programId.toString();
  const gameProgram = new anchor.Program(
    gameProgramIdl as anchor.Idl,
    provider
  ) as any;

  // Calculate game PDA
  const [gamePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), Buffer.from(GAME_ID.toArray("le", 8))],
    programId
  );
  
  // Calculate config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );

  console.log("🎮 Game PDA:", gamePda.toString());
  console.log("⚙️  Config PDA:", configPda.toString());

  // Check if game account exists (raw check, not trying to decode)
  let existingGameAccount = await connection.getAccountInfo(gamePda);
  
  if (existingGameAccount) {
    console.log("\n📊 Existing game account found (may have old structure)");
    console.log("   - Data length:", existingGameAccount.data.length, "bytes");
    console.log("   - Owner:", existingGameAccount.owner.toString());
    
    // Try to close the old account first
    console.log("\n🗑️  Closing existing game account...");
    try {
      const closeTx = await gameProgram.methods
        .closeGame()
        .accounts({
          game: gamePda,
          authority: wallet.publicKey,
        })
        .rpc();

      console.log("   ✅ Close transaction:", closeTx);
      console.log(
        "   📍 View on Explorer:",
        `https://explorer.solana.com/tx/${closeTx}?cluster=devnet`
      );

      // Wait for account to be closed
      await new Promise((resolve) => setTimeout(resolve, 3000));
      existingGameAccount = await connection.getAccountInfo(gamePda);
      if (existingGameAccount) {
        console.log("   ⚠️  Account still exists - may need manual cleanup");
      } else {
        console.log("   ✅ Account closed successfully");
      }
    } catch (error: any) {
      console.error("   ❌ Error closing account:", error.message);
      // If close fails, the account may have old structure incompatible with close
      // We'll try to proceed with a new game ID instead
      console.log("\n⚠️  Cannot close old account. Try using a different GAME_ID.");
      console.log("   Current GAME_ID:", GAME_ID.toString());
      process.exit(1);
    }
  } else {
    console.log("\n✅ No existing game found - will initialize new game");
  }

  // Get token mint
  let tokenMint: PublicKey;
  const envTokenMint = process.env.DEVNET_TOKEN_MINT;
  
  if (envTokenMint) {
    tokenMint = new PublicKey(envTokenMint);
    console.log("\n🪙 Using token mint from env:", tokenMint.toString());
  } else {
    console.log("\n🪙 Creating new token mint...");
    tokenMint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      6
    );
    console.log("   ✅ Token mint:", tokenMint.toString());
    console.log("   💡 Set DEVNET_TOKEN_MINT env var to reuse this mint");
  }

  // Step 1: Initialize game (without prizes)
  console.log("\n🚀 Step 1: Initializing game...");
  
  try {
    const tx = await gameProgram.methods
      .initializeGame(
        GAME_ID,
        "Kawaii Capsule Machine",
        "Win adorable prizes in this pastel gachapon!",
        "https://example.com/game.png",
        new BN(500), // $5.00 cost
        tokenMint
      )
      .accounts({
        authority: wallet.publicKey,
        config: configPda,
        game: gamePda,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("   ✅ Game initialized:", tx);
    console.log(
      "   📍 View on Explorer:",
      `https://explorer.solana.com/tx/${tx}?cluster=devnet`
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error: any) {
    if (error.message?.includes("already in use")) {
      console.log("   ⚠️  Game already exists");
    } else {
      throw error;
    }
  }

  // Step 2: Add prizes one by one
  console.log("\n🎁 Step 2: Adding prizes...");
  
  for (let i = 0; i < PRIZES.length; i++) {
    const prize = PRIZES[i];
    const prizeIndex = i;
    
    // Calculate prize PDA
    const [prizePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("prize"), gamePda.toBuffer(), Buffer.from([prizeIndex])],
      programId
    );

    console.log(`\n   Adding prize ${prizeIndex}: ${prize.name}`);
    console.log(`   Prize PDA: ${prizePda.toString()}`);
    
    try {
      const tx = await gameProgram.methods
        .addPrize(
          prizeIndex,
          prize.prizeId,
          prize.name,
          prize.description,
          prize.imageUrl,
          prize.metadataUri,
          prize.physicalSku,
          prize.tier,
          prize.probabilityBp,
          prize.costUsd,
          prize.supplyTotal
        )
        .accounts({
          authority: wallet.publicKey,
          game: gamePda,
          prize: prizePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`   ✅ Prize added: ${tx}`);
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error: any) {
      if (error.message?.includes("already in use")) {
        console.log(`   ⚠️  Prize ${prizeIndex} already exists`);
      } else {
        console.error(`   ❌ Error adding prize: ${error.message}`);
        throw error;
      }
    }
  }

  // Verify final state
  console.log("\n📊 Verifying final game state...");
  const game = await gameProgram.account.game.fetch(gamePda);
  console.log("   - Game ID:", game.gameId.toString());
  console.log("   - Treasury:", game.treasury.toString());
  console.log("   - Token Mint:", game.tokenMint.toString());
  console.log("   - Prize Count:", game.prizeCount);
  console.log("   - Total Supply Remaining:", game.totalSupplyRemaining);
  console.log("   - Is Active:", game.isActive);
  console.log("   - Prize Probabilities:", game.prizeProbabilities.slice(0, game.prizeCount).join(", "));
  
  const totalProb = game.prizeProbabilities.slice(0, game.prizeCount).reduce((a: number, b: number) => a + b, 0);
  console.log(`   - Total Probability: ${totalProb}/10000 (${(totalProb / 100).toFixed(2)}%)`);
  console.log(`   - Loss Rate: ${(10000 - totalProb) / 100}%`);

  console.log("\n✅ Game setup complete!");
  console.log(`   Game PDA: ${gamePda.toString()}`);
  console.log(`   Token Mint: ${tokenMint.toString()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
