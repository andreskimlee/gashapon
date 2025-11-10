# Deploying to Devnet

This guide will help you deploy your Anchor programs to Solana devnet.

## Prerequisites

1. **Solana CLI installed** - Make sure you have Solana CLI installed and in your PATH
2. **Anchor CLI installed** - Anchor CLI should be available (version 0.32.1)
3. **Wallet with SOL** - You mentioned you have a wallet with 2 SOL on devnet ✅
4. **Wallet configured** - Your wallet should be set as the default Solana wallet

### Setting Up Phantom Wallet

If you're using **Phantom wallet**, see **[PHANTOM_WALLET_SETUP.md](./PHANTOM_WALLET_SETUP.md)** for detailed instructions on:

- Exporting your private key from Phantom
- Converting it to Solana CLI keypair format
- Configuring Solana CLI to use your Phantom wallet

## Step 1: Configure Solana CLI for Devnet

First, make sure your Solana CLI is configured to use devnet:

```bash
# Set the cluster to devnet
solana config set --url devnet

# Verify your wallet is set correctly
solana config get

# Check your wallet balance (should show ~2 SOL)
solana balance

# If your wallet is not set, set it:
# solana config set --keypair ~/.config/solana/id.json
# Or specify your wallet path if different
```

## Step 2: Verify Program Keypair

The program ID in your Rust code must match the keypair's public key. Let's verify:

```bash
# Get the public key from the keypair
solana-keygen pubkey target/deploy/gachapon_game-keypair.json
```

This should output: `4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG`

If it doesn't match, you'll need to either:

- Update the `declare_id!()` in `programs/gachapon-game/src/lib.rs` to match the keypair, OR
- Generate a new keypair and update both the code and Anchor.toml

## Step 3: Build the Program

Build your Anchor program:

```bash
anchor build
```

This will:

- Compile your Rust program
- Generate the IDL (Interface Definition Language) file
- Create the `.so` binary in `target/deploy/`

## Step 4: Deploy to Devnet

Deploy using Anchor with the devnet cluster flag:

```bash
anchor deploy --provider.cluster devnet
```

This command will:

1. Use the devnet configuration from `Anchor.toml`
2. Deploy the program to devnet
3. Use your configured wallet to pay for deployment fees

**Note:** If you want to specify a different wallet, you can use:

```bash
anchor deploy --provider.cluster devnet --provider.wallet ~/path/to/your/wallet.json
```

## Step 5: Verify Deployment

After deployment, verify your program is deployed:

```bash
# Check program account info
solana program show 4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG

# Or using Anchor
anchor verify 4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG --provider.cluster devnet
```

## Troubleshooting

### Error: "Insufficient funds"

- Make sure your wallet has enough SOL (2 SOL should be plenty for devnet)
- Check your balance: `solana balance`
- If needed, airdrop more: `solana airdrop 2`

### Error: "Program ID mismatch"

- The program ID in your Rust code (`declare_id!()`) must match the keypair's public key
- Check the keypair: `solana-keygen pubkey target/deploy/gachapon_game-keypair.json`
- Update `programs/gachapon-game/src/lib.rs` if needed

### Error: "Wallet not found"

- Verify your wallet path: `solana config get`
- Set the correct wallet: `solana config set --keypair /path/to/wallet.json`

### Error: "Cluster mismatch"

- Make sure you're using `--provider.cluster devnet` flag
- Or temporarily change `cluster = "devnet"` in `Anchor.toml` (remember to change it back!)

## Quick Deploy Script

You can also create a simple deploy script:

```bash
#!/bin/bash
# deploy-devnet.sh

# Set to devnet
solana config set --url devnet

# Build
anchor build

# Deploy
anchor deploy --provider.cluster devnet

# Verify
solana program show 4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG
```

Make it executable: `chmod +x deploy-devnet.sh` and run: `./deploy-devnet.sh`

## Next Steps

After successful deployment:

1. Update your backend configuration to use the devnet program ID
2. Update your frontend to connect to devnet
3. Test your program interactions on devnet
4. Monitor your program using Solana Explorer: https://explorer.solana.com/?cluster=devnet
