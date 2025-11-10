# Treasury Setup Guide

## Understanding Treasury

**The treasury is NOT created by your program** - it's a regular Solana wallet/keypair that you create separately.

### How It Works

1. **Treasury = A Solana Wallet/Keypair**
   - Just like your Phantom wallet, but dedicated for collecting game revenue
   - Created using Solana CLI or programmatically
   - Stores the private key securely

2. **Program Stores Treasury Address**
   - When you initialize a game, you pass the treasury's **public key** (address)
   - The program stores this address in the Game account
   - All games can use the **same treasury address**

3. **Tokens Flow to Treasury**
   - When players play, tokens are transferred to the treasury's token account
   - The treasury keypair controls these token accounts
   - You need the treasury keypair to withdraw funds

## Creating a Treasury Wallet

### Option 1: Using Solana CLI (Recommended for Production)

```bash
# Generate a new keypair for treasury
solana-keygen new --outfile ./treasury-devnet-keypair.json --force

# Get the public key (address)
solana-keygen pubkey ./treasury-devnet-keypair.json

# Fund it with SOL (for devnet)
solana airdrop 2 --keypair ./treasury-devnet-keypair.json

# Verify
solana balance --keypair ./treasury-devnet-keypair.json
```

**For Mainnet:**
```bash
# Generate treasury keypair
solana-keygen new --outfile ./treasury-mainnet-keypair.json --force

# Get address
solana-keygen pubkey ./treasury-mainnet-keypair.json

# Transfer SOL to it (from your main wallet)
solana transfer <TREASURY_ADDRESS> 1 --allow-unfunded-recipient
```

### Option 2: Programmatically (TypeScript)

```typescript
import { Keypair } from "@solana/web3.js";
import * as fs from "fs";

// Generate treasury keypair
const treasury = Keypair.generate();

// Save to file
fs.writeFileSync(
  "./treasury-devnet-keypair.json",
  JSON.stringify(Array.from(treasury.secretKey))
);

console.log("Treasury address:", treasury.publicKey.toString());
console.log("Save this keypair securely!");
```

## Using a Single Treasury for All Games

### Architecture

```
┌─────────────────┐
│  Treasury Wallet│  ← Single wallet for all games
│  (Your Keypair) │
└────────┬────────┘
         │
         ├─── Game 1 ──→ Treasury Token Account (Token A)
         ├─── Game 2 ──→ Treasury Token Account (Token A)
         ├─── Game 3 ──→ Treasury Token Account (Token B)
         └─── Game N ──→ Treasury Token Account (Token X)
```

**Key Points:**
- **One treasury wallet** controls all funds
- **Multiple token accounts** (one per token type)
- All games reference the **same treasury address**

### Example: Initialize Multiple Games with Same Treasury

```typescript
// Create treasury once (or load existing)
const treasuryKeypair = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync("./treasury-devnet-keypair.json", "utf-8")))
);

const treasuryAddress = treasuryKeypair.publicKey;

// Game 1
await program.methods
  .initializeGame(new BN(1), new BN(500), tokenMintA, prizes1)
  .accounts({
    authority: adminWallet.publicKey,
    game: gamePda1,
    treasury: treasuryAddress, // ← Same treasury
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Game 2
await program.methods
  .initializeGame(new BN(2), new BN(300), tokenMintA, prizes2)
  .accounts({
    authority: adminWallet.publicKey,
    game: gamePda2,
    treasury: treasuryAddress, // ← Same treasury
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Production Setup

### Step 1: Create Treasury Wallet

```bash
# Generate treasury keypair
solana-keygen new --outfile ./treasury-mainnet-keypair.json --force

# Get address
TREASURY_ADDRESS=$(solana-keygen pubkey ./treasury-mainnet-keypair.json)
echo "Treasury Address: $TREASURY_ADDRESS"

# Fund with SOL (transfer from your main wallet)
solana transfer $TREASURY_ADDRESS 1 --allow-unfunded-recipient
```

### Step 2: Secure Storage

**CRITICAL:** Store the treasury keypair securely:

```bash
# Encrypt the keypair file
gpg --encrypt --recipient your@email.com treasury-mainnet-keypair.json

# Store encrypted version
# Delete unencrypted version from disk
rm treasury-mainnet-keypair.json

# Store backup in secure location (password manager, hardware wallet, etc.)
```

### Step 3: Use in Your Backend

```typescript
// backend/src/config/treasury.config.ts
import { Keypair } from "@solana/web3.js";
import * as fs from "fs";

export function getTreasuryKeypair(): Keypair {
  const treasuryPath = process.env.TREASURY_KEYPAIR_PATH || "./treasury-mainnet-keypair.json";
  const secretKey = JSON.parse(fs.readFileSync(treasuryPath, "utf-8"));
  return Keypair.fromSecretKey(Buffer.from(secretKey));
}

export function getTreasuryAddress(): PublicKey {
  return getTreasuryKeypair().publicKey;
}
```

### Step 4: Environment Variables

```bash
# .env.production
TREASURY_KEYPAIR_PATH=/secure/path/to/treasury-mainnet-keypair.json
TREASURY_ADDRESS=YOUR_TREASURY_ADDRESS_HERE
```

## Withdrawal Process

### Using the Program's Withdraw Instruction

```typescript
const treasuryKeypair = getTreasuryKeypair();
const treasuryAddress = treasuryKeypair.publicKey;

// Get treasury token account for the token
const treasuryAta = await getAssociatedTokenAddress(
  tokenMint,
  treasuryAddress
);

// Withdraw from any game (they all use same treasury)
await program.methods
  .withdrawTreasury(amount)
  .accounts({
    game: gamePda, // Any game - they all use same treasury
    authority: adminWallet.publicKey,
    treasuryAuthority: treasuryAddress,
    treasuryTokenAccount: treasuryAta,
    destinationTokenAccount: destinationAta,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([adminWallet, treasuryKeypair]) // Both must sign
  .rpc();
```

### Direct Token Transfer (Alternative)

Since treasury token accounts are regular SPL token accounts, you can also withdraw directly:

```typescript
import { transfer } from "@solana/spl-token";

await transfer(
  connection,
  treasuryKeypair, // Signer
  treasuryTokenAccount, // Source
  destinationTokenAccount, // Destination
  treasuryKeypair, // Authority
  amount
);
```

## Security Best Practices

1. **Never commit treasury keypair to git**
   ```bash
   # Add to .gitignore
   echo "treasury-*-keypair.json" >> .gitignore
   ```

2. **Use environment variables**
   - Store treasury path in environment variables
   - Never hardcode paths or keys

3. **Consider Multisig for Production**
   - Use Squads Protocol or similar for treasury
   - Requires multiple signatures for withdrawals
   - More secure than single keypair

4. **Separate Devnet and Mainnet Treasuries**
   - Use different keypairs for devnet vs mainnet
   - Never mix them

5. **Monitor Treasury Balance**
   - Set up alerts for large deposits
   - Regular audits of treasury accounts

## Testing with Shared Treasury

Update your tests to use a persistent treasury:

```typescript
// Load or create treasury
let treasury: Keypair;
const treasuryPath = "./treasury-devnet-keypair.json";

if (fs.existsSync(treasuryPath)) {
  treasury = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(treasuryPath, "utf-8")))
  );
  console.log("💰 Using existing treasury:", treasury.publicKey.toString());
} else {
  treasury = Keypair.generate();
  fs.writeFileSync(
    treasuryPath,
    JSON.stringify(Array.from(treasury.secretKey))
  );
  console.log("💰 Created new treasury:", treasury.publicKey.toString());
}

// Use same treasury for all games
const treasuryAddress = treasury.publicKey;
```

## Summary

- ✅ **Treasury = Regular Solana wallet/keypair** (created via CLI or code)
- ✅ **One treasury for all games** (just use the same address)
- ✅ **Create once, reuse everywhere** (store keypair securely)
- ✅ **Treasury keypair needed for withdrawals** (must sign transactions)
- ✅ **Production-ready**: Use CLI to create, store securely, use env vars

