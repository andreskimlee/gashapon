#!/usr/bin/env ts-node

/**
 * Script to initialize the gachapon program with an authority wallet
 * 
 * This must be run ONCE before any games can be created.
 * The wallet that runs this script becomes the program authority.
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("EKzLHZyU6WVfhYVXcE6R4hRE4YuWrva8NeLGMYB7ZDU6");
const WALLET_PATH = path.join(process.cwd(), "phantom-devnet-keypair.json");
const IDL_PATH = path.join(process.cwd(), "target/idl/gachapon_game.json");

async function main() {
  console.log("🚀 Initializing Gachapon Program...\n");

  // Connect to devnet
  const connection = new Connection(
    process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com",
    "confirmed"
  );

  // Load wallet
  if (!fs.existsSync(WALLET_PATH)) {
    console.error(`❌ Wallet keypair not found at: ${WALLET_PATH}`);
    process.exit(1);
  }

  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);

  console.log("📍 Network:", connection.rpcEndpoint);
  console.log("👛 Authority Wallet:", wallet.publicKey.toString());

  // Check wallet balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("💰 Wallet Balance:", (balance / 1e9).toFixed(4), "SOL");

  if (balance < 0.01 * 1e9) {
    console.error("\n❌ Insufficient balance. Need at least 0.01 SOL");
    console.log("   Run: solana airdrop 1 " + wallet.publicKey.toString() + " --url devnet");
    process.exit(1);
  }

  // Load IDL
  if (!fs.existsSync(IDL_PATH)) {
    console.error(`❌ IDL not found at: ${IDL_PATH}`);
    console.log("   Run: anchor build");
    process.exit(1);
  }

  const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));

  // Setup provider
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Create program instance
  const program = new anchor.Program(idl, provider);

  // Calculate Config PDA
  const [configPda, configBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  console.log("\n📋 Config PDA:", configPda.toString());

  // Check if already initialized
  const existingConfig = await connection.getAccountInfo(configPda);
  if (existingConfig) {
    console.log("\n⚠️  Program already initialized!");
    
    // Parse existing authority
    const authorityBytes = existingConfig.data.slice(8, 40);
    const existingAuthority = new PublicKey(authorityBytes);
    console.log("   Current Authority:", existingAuthority.toString());
    
    if (existingAuthority.equals(wallet.publicKey)) {
      console.log("   ✅ Your wallet is already the authority!");
    } else {
      console.log("   ❌ Authority is a different wallet");
    }
    return;
  }

  console.log("\n🔧 Initializing program...");

  try {
    const tx = await (program.methods as any)
      .initializeProgram()
      .accounts({
        authority: wallet.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("\n✅ Program initialized successfully!");
    console.log("   Transaction:", tx);
    console.log("   Config PDA:", configPda.toString());
    console.log("   Authority:", wallet.publicKey.toString());
    console.log("\n🎮 You can now create games from the admin panel!");

  } catch (error: any) {
    console.error("\n❌ Error initializing program:", error.message);
    
    if (error.logs) {
      console.log("\nProgram logs:");
      error.logs.forEach((log: string) => console.log("  ", log));
    }
  }
}

main().catch(console.error);

