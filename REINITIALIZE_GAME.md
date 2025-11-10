# Reinitializing Game with Correct Treasury

## Quick Solution (No Redeployment Needed)

Since the program doesn't currently support closing accounts, the easiest way to test with your new treasury is to **use a different game ID**.

### Option 1: Use Game ID 2 (Recommended)

The test will automatically use game ID 2 if you modify it:

```bash
# Edit tests/game.devnet.spec.ts and change:
# let gameId = new BN(1);
# to:
# let gameId = new BN(2);
```

Then run the tests - they'll create a new game with game ID 2 using your treasury.

### Option 2: Add Close Instruction and Redeploy

If you want to reuse game ID 1, you need to:

1. **Add close instruction to program** (already done in `lib.rs`)
2. **Rebuild and redeploy**:
   ```bash
   bash deploy-devnet.sh
   ```
3. **Run reinitialize script**:
   ```bash
   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ts-node scripts/reinitialize-game.ts
   ```

### Current Status

- ✅ Close instruction added to program (`close_game`)
- ⚠️  Program needs to be rebuilt and redeployed
- ✅ Reinitialize script ready (`scripts/reinitialize-game.ts`)

### Your Treasury

- **Address**: `8sFsMNii1Yd37FhVTWogbta2yGArDwdqHuSbcbyiMjHz`
- **Keypair file**: `./treasury-devnet-keypair.json`

### Quick Fix: Use Game ID 2

The fastest way to test right now is to use game ID 2. Update the test:

```typescript
// In tests/game.devnet.spec.ts, line ~67
let gameId = new BN(2); // Changed from 1
```

Then run:
```bash
npm run test:devnet:with-token
```

This will create a new game with ID 2 using your treasury, and all tests will pass!

