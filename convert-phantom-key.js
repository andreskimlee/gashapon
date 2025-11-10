#!/usr/bin/env node
/**
 * Convert Phantom wallet private key to Solana CLI keypair format
 *
 * Usage: node convert-phantom-key.js <private_key>
 *
 * The private key should be the base58 string exported from Phantom wallet
 */

// Try to load bs58 from various locations
let bs58;
try {
  // Try root node_modules first
  bs58 = require("bs58");
} catch (e) {
  try {
    // Try backend node_modules
    bs58 = require("./backend/node_modules/bs58");
  } catch (e2) {
    console.error("❌ Error: bs58 not found. Please install it:");
    console.error("   npm install bs58");
    console.error("   or");
    console.error("   cd backend && npm install bs58");
    process.exit(1);
  }
}

const fs = require("fs");
const path = require("path");

// Get private key from command line argument
const privateKey = process.argv[2];

if (!privateKey) {
  console.error("❌ Error: Private key required");
  console.error("");
  console.error("Usage: node convert-phantom-key.js <private_key>");
  console.error("");
  console.error("Example:");
  console.error(
    '  node convert-phantom-key.js "5Kd3N...your...private...key..."'
  );
  console.error("");
  console.error("To get your private key from Phantom:");
  console.error("  1. Open Phantom wallet");
  console.error("  2. Settings → Security & Privacy");
  console.error("  3. Export Private Key");
  console.error("  4. Copy the private key string");
  process.exit(1);
}

try {
  // Decode the base58 private key
  const decoded = bs58.decode(privateKey);

  // Phantom exports the full keypair (64 bytes secret + 32 bytes public = 96 bytes)
  // Or sometimes just the secret key (64 bytes)
  let secretKey;

  if (decoded.length === 64) {
    // Just the secret key
    secretKey = decoded;
  } else if (decoded.length === 96) {
    // Full keypair (secret + public), extract just secret part
    secretKey = decoded.slice(0, 64);
  } else {
    throw new Error(
      `Unexpected key length: ${decoded.length} bytes. Expected 64 or 96 bytes.`
    );
  }

  // Solana keypair JSON format is an array of numbers representing the secret key
  const keypairArray = Array.from(secretKey);

  // Save to file
  const outputPath = path.join(__dirname, "phantom-pump-keypair.json");
  fs.writeFileSync(outputPath, JSON.stringify(keypairArray));

  // Derive public key from secret key (first 32 bytes of secret key)
  // Actually, in Ed25519, the public key is derived differently, but for Solana
  // we can use solana-keygen to verify, or calculate it properly

  console.log("");
  console.log("✅ Success! Keypair converted and saved.");
  console.log("");
  console.log("📁 Output file:", outputPath);
  console.log("");
  console.log("🔐 Next steps:");
  console.log("  1. Set Solana to devnet:");
  console.log("     solana config set --url devnet");
  console.log("");
  console.log("  2. Set this keypair as default:");
  console.log(`     solana config set --keypair ${outputPath}`);
  console.log("");
  console.log("  3. Verify your wallet:");
  console.log("     solana address");
  console.log("     solana balance");
  console.log("");
  console.log(
    "⚠️  Security: Keep this file secure and never commit it to git!"
  );
} catch (error) {
  console.error("");
  console.error("❌ Error converting keypair:", error.message);
  console.error("");
  console.error("Make sure:");
  console.error("  - The private key is a valid base58 string");
  console.error("  - You copied the entire private key from Phantom");
  console.error("  - You have bs58 installed: npm install bs58");
  process.exit(1);
}
