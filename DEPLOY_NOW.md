# Deploy to Devnet - Step by Step

Since you've already set up your Phantom wallet with Solana CLI, here's how to deploy:

## 🚀 Deployment Steps

### Step 1: Set Up PATH (if needed)

If `solana` and `anchor` commands aren't in your PATH, add them:

```bash
# Add to your current shell session
export PATH="$HOME/.avm/bin:$PATH"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Or add to your ~/.zshrc to make it permanent:
echo 'export PATH="$HOME/.avm/bin:$PATH"' >> ~/.zshrc
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Step 2: Verify Configuration

```bash
# Check Solana is configured for devnet
solana config get

# Check your balance (should show ~2 SOL)
solana balance

# Verify your wallet address matches Phantom
solana address
```

### Step 3: Build the Program

```bash
# Make sure PATH is set
export PATH="$HOME/.avm/bin:$PATH"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Build the Anchor program
anchor build
```

This will:
- Compile your Rust program
- Generate the IDL file
- Create the `.so` binary in `target/deploy/`

### Step 4: Deploy to Devnet

```bash
# Deploy using Anchor
anchor deploy --provider.cluster devnet
```

**Note:** If you get a "wallet not found" error, you can specify the wallet explicitly:
```bash
anchor deploy --provider.cluster devnet --provider.wallet ./phantom-devnet-keypair.json
```

### Step 5: Verify Deployment

```bash
# Check the program on-chain
solana program show 4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG

# Or view on Solana Explorer
# https://explorer.solana.com/address/4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG?cluster=devnet
```

## 🎯 Quick Deploy (All in One)

If everything is set up, you can run:

```bash
# Set PATH
export PATH="$HOME/.avm/bin:$PATH"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Verify config
solana config get
solana balance

# Build and deploy
anchor build
anchor deploy --provider.cluster devnet

# Verify
solana program show 4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG
```

## ⚠️ Troubleshooting

### "command not found: solana" or "command not found: anchor"
- Make sure PATH is set (see Step 1)
- Or use full paths: `~/.avm/bin/anchor` and `~/.local/share/solana/install/active_release/bin/solana`

### "Insufficient funds"
- Check balance: `solana balance`
- Make sure you're on devnet: `solana config set --url devnet`
- If needed, get more devnet SOL: `solana airdrop 2`

### "Program ID mismatch"
- The program ID in your code (`4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG`) must match the keypair
- Check: `solana-keygen pubkey target/deploy/gachapon_game-keypair.json`
- Should output: `4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG`

### "Wallet not found"
- Verify wallet path: `solana config get`
- Or specify explicitly: `anchor deploy --provider.cluster devnet --provider.wallet ./phantom-devnet-keypair.json`

## ✅ Success!

Once deployed, you'll see:
- Program deployed successfully
- Program ID: `4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG`
- You can view it on [Solana Explorer](https://explorer.solana.com/address/4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG?cluster=devnet)

## 📝 Next Steps

After successful deployment:
1. Update your backend configuration to use the devnet program ID
2. Update your frontend to connect to devnet RPC
3. Test your program interactions on devnet
4. Monitor transactions on Solana Explorer

