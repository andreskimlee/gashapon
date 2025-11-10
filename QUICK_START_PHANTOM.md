# Quick Start: Deploy with Phantom Wallet

## 🚀 Quick Setup (3 Steps)

### Step 1: Export Private Key from Phantom

1. Open **Phantom wallet** in your browser
2. Click **Settings** (gear icon) → **Security & Privacy**
3. Click **Export Private Key**
4. Enter your password
5. **Copy the private key** (long string of characters)

### Step 2: Convert to Keypair Format

```bash
# Install bs58 if needed (check if backend/node_modules/bs58 exists first)
npm install bs58

# Convert your private key
node convert-phantom-key.js YOUR_PRIVATE_KEY_HERE
```

This creates `phantom-devnet-keypair.json` in your project root.

### Step 3: Configure & Deploy

```bash
# Setup Solana CLI with your Phantom wallet
./setup-phantom-wallet.sh

# Deploy to devnet
./deploy-devnet.sh
```

That's it! 🎉

---

## 📋 Detailed Instructions

For more detailed instructions, troubleshooting, and security best practices, see:
- **[PHANTOM_WALLET_SETUP.md](./PHANTOM_WALLET_SETUP.md)** - Complete Phantom wallet setup guide
- **[DEPLOY_DEVNET.md](./DEPLOY_DEVNET.md)** - Full deployment guide

## 🔒 Security Reminder

- **Never commit** `phantom-devnet-keypair.json` to git (it's already in `.gitignore`)
- **Never share** your private key with anyone
- Consider using a **separate wallet** for deployment (not your main Phantom wallet)

