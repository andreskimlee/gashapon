#!/usr/bin/env ts-node

/**
 * Quick script to check if an existing game's treasury matches your treasury keypair
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import BN from "bn.js";

const TREASURY_PATH = path.join(process.cwd(), "treasury-devnet-keypair.json");
const GAME_ID = new BN(1); // Change this if your game uses a different ID

async function main() {
  const connection = new Connection(
    process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com",
    "confirmed"
  );

  // Load treasury
  if (!fs.existsSync(TREASURY_PATH)) {
    console.error(`❌ Treasury keypair not found at: ${TREASURY_PATH}`);
    console.error("   Run: ./scripts/create-treasury.sh");
    process.exit(1);
  }

  const treasury = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(TREASURY_PATH, "utf-8")))
  );
  console.log("💰 Your treasury address:", treasury.publicKey.toString());

  // Load program
  const wallet = new anchor.Wallet(Keypair.generate()); // Dummy wallet for IDL loading
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const idlPath = path.join(process.cwd(), "target/idl/gachapon_game.json");
  const gameProgramIdl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const programId = new PublicKey(gameProgramIdl.address);
  gameProgramIdl.address = programId.toString();

  const gameProgram = new anchor.Program(
    gameProgramIdl as anchor.Idl,
    provider
  );

  // Calculate game PDA
  const [gamePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), Buffer.from(GAME_ID.toArray("le", 8))],
    programId
  );

  console.log("🎮 Game PDA:", gamePda.toString());

  // Fetch game
  try {
    const game = await gameProgram.account.game.fetch(gamePda);
    console.log("\n📊 Game Info:");
    console.log("   - Game ID:", game.gameId.toString());
    console.log("   - Treasury:", game.treasury.toString());
    console.log("   - Token Mint:", game.tokenMint.toString());
    console.log("   - Is Active:", game.isActive);

    // Check if treasury matches
    if (game.treasury.equals(treasury.publicKey)) {
      console.log("\n✅ Treasury matches! Everything is aligned.");
    } else {
      console.log("\n⚠️  Treasury mismatch!");
      console.log("   Game treasury:", game.treasury.toString());
      console.log("   Your treasury:", treasury.publicKey.toString());
      console.log("\n💡 Options:");
      console.log("   1. Use a new gameId for new games (they'll use your treasury)");
      console.log("   2. Reinitialize this game with your treasury");
      console.log("   3. Keep using the old treasury for this game");
    }
  } catch (error: any) {
    if (error.message?.includes("Account does not exist")) {
      console.log("\n✅ No game found at this PDA - you can initialize with your treasury!");
    } else {
      throw error;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

