# Using Your Treasury Address

## ✅ You DON'T Need to Redeploy!

The treasury address is **just a parameter** passed when initializing games. Your program code doesn't need to change.

## What You Need to Do

### 1. Set Environment Variable

```bash
export TREASURY_ADDRESS=8sFsMNii1Yd37FhVTWogbta2yGArDwdqHuSbcbyiMjHz
```

Or add to your shell profile (`~/.zshrc` or `~/.bashrc`):
```bash
echo 'export TREASURY_ADDRESS=8sFsMNii1Yd37FhVTWogbta2yGArDwdqHuSbcbyiMjHz' >> ~/.zshrc
source ~/.zshrc
```

### 2. Update Your Tests

The test will automatically use the persistent treasury, but you can also set it explicitly:

```bash
# The test creates/loads treasury-devnet-keypair.json automatically
# Make sure your treasury keypair file matches the address:
solana-keygen pubkey ./treasury-devnet-keypair.json
# Should output: 8sFsMNii1Yd37FhVTWogbta2yGArDwdqHuSbcbyiMjHz
```

### 3. Use for New Games

When initializing new games, use this treasury address:

```typescript
const TREASURY_ADDRESS = new PublicKey("8sFsMNii1Yd37FhVTWogbta2yGArDwdqHuSbcbyiMjHz");

await program.methods
  .initializeGame(gameId, costUsd, tokenMint, prizePool)
  .accounts({
    authority: wallet.publicKey,
    game: gamePda,
    treasury: TREASURY_ADDRESS, // ← Use your treasury
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 4. Existing Games

**Option A: Keep existing games as-is**
- Old games will continue using their original treasury
- New games will use your new treasury
- You can withdraw from both (need the respective keypairs)

**Option B: Reinitialize existing games** (if you want everything unified)
- Delete old game accounts, or
- Use different `gameId` values for new games
- Initialize with the new treasury address

## Your Current Setup

- ✅ **Program deployed**: `4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG`
- ✅ **Treasury address**: `8sFsMNii1Yd37FhVTWogbta2yGArDwdqHuSbcbyiMjHz`
- ✅ **Ready to use**: Just pass treasury address when initializing games

## Quick Test

Verify your treasury is set up correctly:

```bash
# Check treasury address
solana-keygen pubkey ./treasury-devnet-keypair.json

# Should output: 8sFsMNii1Yd37FhVTWogbta2yGArDwdqHuSbcbyiMjHz

# Check balance
solana balance 8sFsMNii1Yd37FhVTWogbta2yGArDwdqHuSbcbyiMjHz

# Fund if needed (devnet)
solana airdrop 2 8sFsMNii1Yd37FhVTWogbta2yGArDwdqHuSbcbyiMjHz
```

## Summary

- ❌ **NO redeployment needed** - program code is fine
- ✅ **Just use the treasury address** when initializing games
- ✅ **All new games** can use the same treasury address
- ✅ **One treasury** collects funds from all games

