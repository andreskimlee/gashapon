#!/usr/bin/env ts-node

/**
 * Script to close existing game account and reinitialize with correct treasury
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

// Use game ID 2 to avoid conflicts with existing game ID 1
// Change this to 1 if you want to reinitialize the existing game (requires closing it first)
const GAME_ID = new BN(2);
const TREASURY_PATH = path.join(process.cwd(), "treasury-devnet-keypair.json");
const WALLET_PATH = path.join(process.cwd(), "phantom-devnet-keypair.json");

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

  console.log("🎮 Game PDA:", gamePda.toString());

  // Check if game exists
  let existingGame;
  try {
    existingGame = await gameProgram.account.game.fetch(gamePda);
    console.log("\n📊 Existing game found:");
    console.log("   - Game ID:", existingGame.gameId.toString());
    console.log("   - Treasury:", existingGame.treasury.toString());
    console.log("   - Token Mint:", existingGame.tokenMint.toString());
    console.log("   - Total Plays:", existingGame.totalPlays.toString());

    if (existingGame.treasury.equals(treasury.publicKey)) {
      console.log("\n✅ Game already uses the correct treasury!");
      console.log("   No reinitialization needed.");
      process.exit(0);
    }
  } catch (error: any) {
    if (error.message?.includes("Account does not exist")) {
      console.log("\n✅ No existing game found - will initialize new game");
      existingGame = null;
    } else {
      throw error;
    }
  }

  // Get token mint (use existing game's mint or create new)
  let tokenMint: PublicKey;
  const envTokenMint = process.env.DEVNET_TOKEN_MINT;
  
  if (existingGame) {
    tokenMint = existingGame.tokenMint;
    console.log("\n🪙 Using existing token mint:", tokenMint.toString());
  } else if (envTokenMint) {
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
  }

  // Close existing game account if it exists
  if (existingGame) {
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
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Verify account is closed
      const accountInfo = await connection.getAccountInfo(gamePda);
      if (accountInfo) {
        console.log("   ⚠️  Account still exists, waiting longer...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      console.log("   ✅ Account closed");
    } catch (error: any) {
      console.error("   ❌ Error closing account:", error.message);
      if (error.message?.includes("Account does not exist")) {
        console.log("   ✅ Account already closed or doesn't exist");
      } else {
        throw error;
      }
    }
  }

  // Initialize game with correct treasury
  console.log("\n🚀 Initializing game with correct treasury...");
  
  const prizePool = [
    {
      prizeId: new BN(1),
      name: "Common Prize",
      metadataUri: "ipfs://common",
      physicalSku: "SKU-COMMON",
      tier: { common: {} } as any,
      probabilityBp: 9000,
      supplyTotal: 100,
      supplyRemaining: 100,
    },
    {
      prizeId: new BN(2),
      name: "Rare Prize",
      metadataUri: "ipfs://rare",
      physicalSku: "SKU-RARE",
      tier: { rare: {} } as any,
      probabilityBp: 1000,
      supplyTotal: 10,
      supplyRemaining: 10,
    },
  ];

  try {
    const tx = await gameProgram.methods
      .initializeGame(GAME_ID, new BN(500), tokenMint, prizePool)
      .accounts({
        authority: wallet.publicKey,
        game: gamePda,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("   ✅ Transaction:", tx);
    console.log(
      "   📍 View on Explorer:",
      `https://explorer.solana.com/tx/${tx}?cluster=devnet`
    );

    // Wait and verify
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const game = await gameProgram.account.game.fetch(gamePda);
    console.log("\n✅ Game reinitialized successfully!");
    console.log("   - Game ID:", game.gameId.toString());
    console.log("   - Treasury:", game.treasury.toString());
    console.log("   - Token Mint:", game.tokenMint.toString());
    console.log("   - Is Active:", game.isActive);
    
    if (game.treasury.equals(treasury.publicKey)) {
      console.log("\n✅ Treasury matches! You can now run the tests.");
    } else {
      console.log("\n⚠️  Warning: Treasury mismatch!");
    }
  } catch (error: any) {
    if (error.message?.includes("already in use") || error.message?.includes("AccountDiscriminatorAlreadySet")) {
      console.error("\n❌ Error: Game account already exists and cannot be reinitialized.");
      console.error("   The program doesn't support closing accounts.");
      console.error("\n💡 Solutions:");
      console.error("   1. Use a different game ID (modify GAME_ID in this script)");
      console.error("   2. Add a close instruction to the program");
      console.error("   3. Manually close the account using Solana CLI (complex)");
      process.exit(1);
    } else {
      throw error;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

