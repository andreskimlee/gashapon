# Treasury vs Authority: When to Use the Same Wallet

## Current Architecture

Your program has **two separate roles**:

### 1. **Authority** (`game.authority`)
- **Controls**: Game management operations
- **Can do**:
  - Update game status (active/inactive)
  - Replenish prize supply
  - Initiate treasury withdrawals
  - Close the game
- **Used frequently**: For day-to-day operations

### 2. **Treasury** (`game.treasury`)
- **Controls**: Where funds are collected
- **Can do**:
  - Receive tokens from players
  - Sign withdrawals (must match `treasury_authority` in `withdraw_treasury`)
- **Used infrequently**: Only for withdrawals

## Key Security Feature

Notice in `withdraw_treasury`:
```rust
pub struct WithdrawTreasury<'info> {
  #[account(has_one = authority)]  // Authority must authorize
  pub game: Account<'info, Game>,
  pub authority: Signer<'info>,
  pub treasury_authority: Signer<'info>,  // Treasury must sign
  // ...
}
```

**Both must sign**:
- `authority` - authorizes the withdrawal
- `treasury_authority` - actually signs the transfer

This means:
- ✅ If authority is compromised → funds are still safe (treasury must also sign)
- ✅ If treasury is compromised → can't withdraw without authority authorization
- ✅ Both must be compromised → funds at risk

## When to Use the Same Wallet

### ✅ **Use Same Wallet For:**
- **Testing/Devnet** - Simpler, less overhead
- **Small projects** - Single person/team managing everything
- **MVP/Prototype** - Get it working first, optimize later

### ✅ **Use Separate Wallets For:**
- **Production** - Better security
- **Large funds** - Treasury in cold storage/multi-sig
- **Multiple games** - Share treasury, different authorities
- **Team operations** - Different people manage vs. hold funds

## Your Current Setup

You have:
- **Treasury**: `8sFsMNii1Yd37FhVTWogbta2yGArDwdqHuSbcbyiMjHz` (fixed, persistent)
- **Authority**: `8b6VWQXbgPXhBMHphHXvVkJYN9eG758FEC9LxyQfKkPC` (your Phantom wallet)

This is **perfect for devnet/testing**! You can:
1. Keep treasury separate (good practice)
2. Or use the same wallet for both (simpler)

## Recommendation

For **devnet/testing**: Use the same wallet for both - it's simpler and you're not holding real funds.

For **production**: Keep them separate for security.

## How to Use Same Wallet

If you want to use your wallet as both authority and treasury:

```typescript
// In your test/initialization:
const treasury = wallet.publicKey; // Use wallet as treasury
const authority = wallet.publicKey; // Use wallet as authority

// Initialize game:
await gameProgram.methods
  .initializeGame(gameId, costUsd, tokenMint, prizePool)
  .accounts({
    authority: wallet.publicKey,
    game: gamePda,
    treasury: wallet.publicKey, // Same as authority
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Withdraw (both signers are the same):
await gameProgram.methods
  .withdrawTreasury(amount)
  .accounts({
    game: gamePda,
    authority: wallet.publicKey,
    treasuryAuthority: wallet.publicKey, // Same wallet
    // ...
  })
  .signers([wallet.payer]) // Only need one signer
  .rpc();
```

## Summary

- **For testing**: Same wallet is fine ✅
- **For production**: Separate wallets recommended ✅
- **Your current setup**: Good for devnet! ✅

The separation gives you flexibility - you can always use the same wallet if you prefer simplicity.

