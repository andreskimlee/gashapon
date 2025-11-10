# Token Accounts Explained

## What Are Token Accounts?

In Solana, **token accounts** are special accounts that hold tokens (like SPL tokens). Think of them as "wallets for tokens" - similar to how you have a SOL wallet, you need token accounts to hold specific tokens.

## Key Concepts

### 1. **Token Mint** (The Token Type)

- A token mint defines a specific token type (like USDC, your game currency, etc.)
- Each token has a unique mint address
- Example: `Cp95mjbZZnDvqCNYExmGYEzrgu6wAScf32Fmwt2Kpump` (your devnet token)

### 2. **Token Account** (Holds Tokens)

- Each token account holds tokens of **one specific mint**
- Each wallet can have **multiple token accounts** (one per token type)
- Token accounts are separate from your SOL wallet

### 3. **Associated Token Account (ATA)** (Recommended)

- A special type of token account that's **derived** from your wallet address + token mint
- Address is deterministic (same wallet + same mint = same ATA address)
- Solana's recommended way to hold tokens

## Why Do We Need Token Accounts?

### In Solana:

- **SOL** (native currency) → Stored directly in your wallet account
- **Tokens** (SPL tokens) → Must be stored in separate token accounts

### Why Separate?

1. **Different Programs**: SOL uses the System Program, tokens use the Token Program
2. **Security**: Token accounts have different permissions and authorities
3. **Flexibility**: You can have multiple token accounts for the same token type
4. **Programmability**: Token accounts support features like freezing, minting, etc.

## How Token Accounts Work

### Creating a Token Account

```typescript
// 1. Get the address (deterministic for ATAs)
const tokenAccount = await getAssociatedTokenAddress(
  tokenMint, // Which token?
  wallet.publicKey // Who owns it?
);

// 2. Create it (if it doesn't exist)
await createAssociatedTokenAccount(
  connection,
  payer, // Who pays for creation (rent)?
  tokenMint, // Which token?
  owner // Who owns the account?
);
```

### Transferring Tokens

```typescript
// Transfer from user's token account to treasury's token account
token::transfer(
  from: userTokenAccount,      // Source
  to: treasuryTokenAccount,    // Destination
  amount: 100_000              // How much
);
```

## In Your Game

### Your Setup:

- **Token Mint**: `Cp95mjbZZnDvqCNYExmGYEzrgu6wAScf32Fmwt2Kpump`
- **User Token Account**: Holds tokens for the user (to play the game)
- **Treasury Token Account**: Holds tokens collected from players

### Flow:

1. **User plays game** → Tokens transfer from `userTokenAccount` → `treasuryTokenAccount`
2. **Withdraw from treasury** → Tokens transfer from `treasuryTokenAccount` → `destinationTokenAccount`

## Example

```
Wallet: 8b6VWQXbgPXhBMHphHXvVkJYN9eG758FEC9LxyQfKkPC
├── SOL Balance: 1.47 SOL (stored directly)
└── Token Accounts:
    ├── Token Account #1 (for USDC)
    │   └── Balance: 100 USDC
    ├── Token Account #2 (for your game token)
    │   └── Balance: 1,000,000 tokens
    └── Token Account #3 (for another token)
        └── Balance: 50 tokens
```

## Why Create Token Accounts?

Token accounts **don't exist automatically**. You must create them before you can:

- Receive tokens
- Hold tokens
- Transfer tokens

### In Your Tests:

```typescript
// User needs a token account to receive tokens
const userAta = await getOrCreateAssociatedTokenAccount(
  connection,
  wallet.payer,
  tokenMint,
  user.publicKey
);

// Treasury needs a token account to receive tokens from players
const treasuryAta = await getOrCreateAssociatedTokenAccount(
  connection,
  wallet.payer,
  tokenMint,
  treasury.publicKey
);
```

## Key Differences

| Feature     | SOL Wallet           | Token Account           |
| ----------- | -------------------- | ----------------------- |
| **Holds**   | SOL (native)         | SPL Tokens              |
| **Created** | Automatically        | Must create             |
| **Address** | Wallet address       | Derived (ATA) or custom |
| **Program** | System Program       | Token Program           |
| **Rent**    | Exempt if > 0.89 SOL | Exempt if > minimum     |

## Common Operations

### Check Balance

```typescript
const balance = await connection.getTokenAccountBalance(tokenAccount);
console.log(balance.value.uiAmount); // Human-readable amount
```

### Transfer Tokens

```typescript
// Via program (like in your game)
token::transfer(from, to, amount);

// Or directly
await transfer(connection, payer, from, to, owner, amount);
```

### Mint Tokens

```typescript
await mintTo(
  connection,
  payer,
  tokenMint,
  tokenAccount, // Where to mint
  mintAuthority, // Who can mint
  amount // How much
);
```

## Summary

- **Token accounts** = Containers for tokens (like wallets for tokens)
- **One token account per token type** per wallet (for ATAs)
- **Must be created** before receiving/holding tokens
- **Separate from SOL wallet** - different programs, different accounts
- **ATA (Associated Token Account)** = Recommended, deterministic address

Think of it like:

- **SOL wallet** = Your main wallet (holds SOL)
- **Token accounts** = Separate boxes inside your wallet (one box per token type)

