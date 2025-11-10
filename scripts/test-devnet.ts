#!/usr/bin/env ts-node
/**
 * Simple script to test interactions with the deployed program on devnet
 * 
 * Usage: ts-node scripts/test-devnet.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, Connection } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG");
const DEVNET_RPC = "https://api.devnet.solana.com";

async function main() {
  console.log("🚀 Testing Gachapon Game on Devnet\n");

  // Setup connection and wallet
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(
      JSON.parse(
        fs.readFileSync(
          path.join(__dirname, "../phantom-devnet-keypair.json"),
          "utf-8"
        )
      )
    )
  );

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    anchor.AnchorProvider.defaultOptions()
  );

  console.log("🔑 Wallet:", wallet.publicKey.toString());
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("💰 Balance:", balance / anchor.web3.LAMPORTS_PER_SOL, "SOL\n");

  // Load program
  const idl = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../target/idl/gachapon_game.json"),
      "utf-8"
    )
  );
  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  // Test parameters
  const gameId = new BN(1);
  const [gamePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), Buffer.from(gameId.toArray("le", 8))],
    program.programId
  );

  console.log("🎮 Game PDA:", gamePda.toString());
  console.log("📋 Program ID:", PROGRAM_ID.toString());
  console.log("");

  // Check if game exists
  try {
    const game = await program.account.game.fetch(gamePda);
    console.log("✅ Game found!");
    console.log("   Game ID:", game.gameId.toString());
    console.log("   Authority:", game.authority.toString());
    console.log("   Is Active:", game.isActive);
    console.log("   Total Plays:", game.totalPlays.toString());
    console.log("   Prize Pool Size:", game.prizePool.length);
    console.log("");

    // List prizes
    console.log("🎁 Prizes:");
    game.prizePool.forEach((prize: any, index: number) => {
      console.log(`   ${index + 1}. ${prize.name}`);
      console.log(`      ID: ${prize.prizeId.toString()}`);
      console.log(`      Tier: ${JSON.stringify(prize.tier)}`);
      console.log(`      Probability: ${prize.probabilityBp / 100}%`);
      console.log(`      Supply: ${prize.supplyRemaining}/${prize.supplyTotal}`);
      console.log("");
    });
  } catch (error: any) {
    if (error.message?.includes("Account does not exist")) {
      console.log("❌ Game not found. Initialize it first!");
      console.log("");
      console.log("To initialize a game, use:");
      console.log("  anchor test --skip-local-validator");
      console.log("  or run the test file: tests/game.devnet.spec.ts");
    } else {
      throw error;
    }
  }

  // Example: Query recent events (if you have an indexer)
  console.log("📊 To view transactions on Explorer:");
  console.log(`   https://explorer.solana.com/address/${PROGRAM_ID.toString()}?cluster=devnet`);
}

main()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

