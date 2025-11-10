# How to Collect Funds from Your Programs

## Overview

Your programs collect funds in two places:

1. **Game Program**: Player payments go to a `treasury` token account (specified when initializing each game)
2. **Marketplace Program**: Platform fees (2%) go to a `platform_treasury` token account (configured in the marketplace config)

## Fund Collection Methods

### Option 1: Direct Token Account Transfer (Simplest)

Since the treasury accounts are **regular token accounts** owned by your wallet, you can withdraw funds directly using the SPL Token program **without** going through your Anchor programs.

**For Game Treasury:**
```typescript
import { transfer } from "@solana/spl-token";

// Transfer from game treasury to your wallet
await transfer(
  connection,
  treasuryAuthority, // Your wallet (signer)
  treasuryTokenAccount, // Source: treasury token account
  destinationTokenAccount, // Destination: your wallet's token account
  treasuryAuthority, // Authority (your wallet)
  amount // Amount to withdraw
);
```

**For Marketplace Platform Treasury:**
```typescript
// Same approach - platform_treasury is just a regular token account
await transfer(
  connection,
  platformTreasuryAuthority, // Your wallet (signer)
  platformTreasuryTokenAccount, // Source: platform treasury token account
  destinationTokenAccount, // Destination: your wallet's token account
  platformTreasuryAuthority, // Authority (your wallet)
  amount // Amount to withdraw
);
```

### Option 2: Using the Withdrawal Instructions (Added)

I've added withdrawal instructions to both programs for programmatic control:

#### Game Program: `withdraw_treasury`

**Rust Signature:**
```rust
pub fn withdraw_treasury(
  ctx: Context<WithdrawTreasury>,
  amount: u64,
) -> Result<()>
```

**TypeScript Usage:**
```typescript
await gameProgram.methods
  .withdrawTreasury(new BN(amount))
  .accounts({
    game: gamePda,
    authority: gameAuthority, // Must match game.authority
    treasuryAuthority: treasuryWallet, // Must own the treasury token account
    treasuryTokenAccount: treasuryTokenAccountPubkey,
    destinationTokenAccount: yourWalletTokenAccount,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([gameAuthority, treasuryWallet])
  .rpc();
```

**Requirements:**
- `authority` must match `game.authority`
- `treasury_authority` must own the treasury token account
- Both must sign the transaction

#### Marketplace Program: `withdraw_platform_fees`

**Rust Signature:**
```rust
pub fn withdraw_platform_fees(
  ctx: Context<WithdrawPlatformFees>,
  amount: u64,
) -> Result<()>
```

**TypeScript Usage:**
```typescript
await marketplaceProgram.methods
  .withdrawPlatformFees(new BN(amount))
  .accounts({
    admin: adminWallet, // Must match config.authority
    config: configPda,
    treasuryAuthority: platformTreasuryWallet, // Must own platform_treasury
    platformTreasuryTokenAccount: platformTreasuryTokenAccountPubkey,
    destinationTokenAccount: yourWalletTokenAccount,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([adminWallet, platformTreasuryWallet])
  .rpc();
```

**Requirements:**
- `admin` must match `config.authority`
- `treasury_authority` must own the platform_treasury token account
- Both must sign the transaction

## Important Notes

### Security Considerations

1. **Treasury Ownership**: The treasury accounts are owned by **your wallet**, not by the program. This means:
   - You have full control over withdrawals
   - You can withdraw at any time using standard SPL Token transfers
   - The program instructions are optional - they just add validation

2. **Authority Checks**: The withdrawal instructions verify:
   - Game authority matches (for game withdrawals)
   - Config authority matches (for marketplace withdrawals)
   - Treasury authority owns the token account

3. **Multi-Signature**: Both withdrawal instructions require two signers:
   - Game/config authority (validates you're authorized)
   - Treasury authority (owns the funds)

### Which Method to Use?

- **Option 1 (Direct Transfer)**: Use when you just want to withdraw funds quickly. Faster, simpler, no program interaction needed.
- **Option 2 (Program Instructions)**: Use when you want:
  - Audit trail (events are emitted)
  - Programmatic validation
  - Integration with other program logic
  - Better tracking in your backend

## Example: Complete Withdrawal Flow

```typescript
// 1. Get treasury token account balance
const treasuryBalance = await getAccount(
  connection,
  treasuryTokenAccountPubkey
);

// 2. Get your destination token account (create if needed)
const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  payer,
  tokenMint,
  yourWallet.publicKey
);

// 3. Withdraw using direct transfer (simplest)
await transfer(
  connection,
  treasuryAuthority, // Your wallet that owns the treasury
  treasuryTokenAccountPubkey,
  destinationTokenAccount.address,
  treasuryAuthority,
  treasuryBalance.amount // Or specific amount
);

// OR use the program instruction (for audit trail)
await gameProgram.methods
  .withdrawTreasury(new BN(treasuryBalance.amount.toString()))
  .accounts({
    game: gamePda,
    authority: gameAuthority,
    treasuryAuthority: treasuryAuthority,
    treasuryTokenAccount: treasuryTokenAccountPubkey,
    destinationTokenAccount: destinationTokenAccount.address,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([gameAuthority, treasuryAuthority])
  .rpc();
```

## Checking Balances

```typescript
import { getAccount } from "@solana/spl-token";

// Check game treasury balance
const treasuryAccount = await getAccount(connection, treasuryTokenAccountPubkey);
console.log(`Treasury balance: ${treasuryAccount.amount}`);

// Check platform treasury balance
const platformTreasuryAccount = await getAccount(
  connection,
  platformTreasuryTokenAccountPubkey
);
console.log(`Platform treasury balance: ${platformTreasuryAccount.amount}`);
```

