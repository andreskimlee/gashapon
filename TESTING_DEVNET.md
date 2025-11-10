# Testing Your Deployed Program on Devnet

Now that your program is deployed to devnet, here's how to test interactions with it.

## 🎯 Quick Start

### Option 1: Run Automated Tests

Run the full test suite against devnet:

```bash
npm run test:devnet
```

This will:
- Initialize a game
- Play the game
- Finalize plays
- Update game status
- Replenish prize supply

### Option 2: Query Existing Game

Check if a game already exists and view its state:

```bash
npm run test:devnet:query
```

This script will:
- Connect to devnet
- Check your wallet balance
- Look for existing games
- Display game state and prizes

## 📋 Available Instructions

Your program has the following instructions you can test:

### 1. `initialize_game`
Creates a new game with prize pool configuration.

**Parameters:**
- `game_id: u64` - Unique game identifier
- `cost_usd: u64` - Cost in USD cents (e.g., 500 = $5.00)
- `token_mint: Pubkey` - SPL token mint address
- `prize_pool: Vec<PrizeConfig>` - Array of prize configurations

**Example:**
```typescript
await program.methods
  .initializeGame(
    new BN(1),           // game_id
    new BN(500),         // $5.00 in cents
    tokenMint,           // token mint
    prizePool            // array of prizes
  )
  .accounts({
    authority: wallet.publicKey,
    game: gamePda,
    treasury: treasuryKeypair.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 2. `play_game`
Initiates a game play by transferring tokens from user to treasury.

**Parameters:**
- `token_amount: u64` - Amount of tokens to pay

**Example:**
```typescript
await program.methods
  .playGame(new BN(100_000))  // token amount (6 decimals)
  .accounts({
    game: gamePda,
    user: user.publicKey,
    userTokenAccount: userAta,
    treasuryTokenAccount: treasuryAta,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([user])
  .rpc();
```

### 3. `finalize_play`
Finalizes a play and selects a prize based on random value.

**Parameters:**
- `random_value: [u8; 32]` - 32-byte random value (from VRF in production)

**Example:**
```typescript
const random = Buffer.alloc(32);
random.writeUInt32LE(5000, 0); // deterministic for testing

await program.methods
  .finalizePlay([...random] as any)
  .accounts({
    game: gamePda,
    user: user.publicKey,
  })
  .signers([user])
  .rpc();
```

### 4. `update_game_status`
Updates whether the game is active or inactive.

**Parameters:**
- `is_active: bool` - New active status

**Example:**
```typescript
await program.methods
  .updateGameStatus(true)
  .accounts({
    game: gamePda,
    authority: wallet.publicKey,
  })
  .rpc();
```

### 5. `replenish_prize_supply`
Adds more supply to a specific prize.

**Parameters:**
- `prize_id: u64` - ID of the prize to replenish
- `additional_supply: u32` - Amount to add

**Example:**
```typescript
await program.methods
  .replenishPrizeSupply(new BN(2), 5)  // prize_id 2, add 5 more
  .accounts({
    game: gamePda,
    authority: wallet.publicKey,
  })
  .rpc();
```

### 6. `withdraw_treasury`
Withdraws tokens from the game treasury.

**Parameters:**
- `amount: u64` - Amount to withdraw

**Example:**
```typescript
await program.methods
  .withdrawTreasury(new BN(50_000))
  .accounts({
    game: gamePda,
    authority: wallet.publicKey,
    treasuryAuthority: treasuryKeypair.publicKey,
    treasuryTokenAccount: treasuryAta,
    destinationTokenAccount: destinationAta,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([wallet.payer, treasuryKeypair])
  .rpc();
```

## 🔍 Reading Program State

### Fetch Game Account

```typescript
const game = await program.account.game.fetch(gamePda);
console.log("Game ID:", game.gameId.toString());
console.log("Authority:", game.authority.toString());
console.log("Is Active:", game.isActive);
console.log("Total Plays:", game.totalPlays.toString());
console.log("Prize Pool:", game.prizePool);
```

### View on Solana Explorer

View your program and transactions:
- **Program:** https://explorer.solana.com/address/4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG?cluster=devnet
- **Game PDA:** Replace with your game PDA address

## 🧪 Test Files

### `tests/game.devnet.spec.ts`
Full test suite for devnet. Run with:
```bash
npm run test:devnet
```

### `scripts/test-devnet.ts`
Simple query script. Run with:
```bash
npm run test:devnet:query
```

## 📝 Creating Your Own Test Script

Here's a template for creating custom test scripts:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import * as fs from "fs";

const PROGRAM_ID = new PublicKey("4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG");

async function main() {
  // Setup
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const wallet = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync("./phantom-devnet-keypair.json", "utf-8")))
  );
  
  // Load program
  const idl = JSON.parse(fs.readFileSync("./target/idl/gachapon_game.json", "utf-8"));
  const program = new anchor.Program(idl, PROGRAM_ID, new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    {}
  ));

  // Your test code here
  const gameId = new BN(1);
  const [gamePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), Buffer.from(gameId.toArray("le", 8))],
    program.programId
  );

  const game = await program.account.game.fetch(gamePda);
  console.log("Game:", game);
}

main();
```

## 🐛 Troubleshooting

### "Account does not exist"
- The game hasn't been initialized yet
- Run the initialization test first: `npm run test:devnet`

### "Insufficient funds"
- Your wallet needs SOL for transaction fees
- Get devnet SOL: `solana airdrop 2` (make sure you're on devnet)

### "Game is inactive"
- The game was deactivated (likely ran out of prizes)
- Use `update_game_status` to reactivate, or `replenish_prize_supply` to add more prizes

### "Out of stock"
- All prizes have `supply_remaining = 0`
- Use `replenish_prize_supply` to add more

## 🔗 Useful Links

- **Solana Explorer (Devnet):** https://explorer.solana.com/?cluster=devnet
- **Your Program:** https://explorer.solana.com/address/4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG?cluster=devnet
- **Anchor Docs:** https://www.anchor-lang.com/docs

## 🎮 Next Steps

1. **Run the tests:** `npm run test:devnet`
2. **Check game state:** `npm run test:devnet:query`
3. **Integrate with your backend:** Update your NestJS backend to use the devnet program ID
4. **Build frontend:** Connect your frontend to devnet RPC
5. **Monitor transactions:** Watch transactions on Solana Explorer

