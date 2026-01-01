#!/bin/bash
# Setup Phantom wallet for Solana CLI deployment

set -e

echo "🔐 Setting up Phantom wallet for Solana CLI..."
echo ""

# Check if keypair file exists
KEYPAIR_FILE="./phantom-devnet-keypair.json"

if [ ! -f "$KEYPAIR_FILE" ]; then
    echo "❌ Keypair file not found: $KEYPAIR_FILE"
    echo ""
    echo "📝 To create it:"
    echo "   1. Export your private key from Phantom wallet"
    echo "      (Settings → Security & Privacy → Export Private Key)"
    echo ""
    echo "   2. Convert it using the helper script:"
    echo "      npm install bs58  # if not already installed"
    echo "      node convert-phantom-key.js YOUR_PRIVATE_KEY"
    echo ""
    echo "   See PHANTOM_WALLET_SETUP.md for detailed instructions."
    exit 1
fi

# Check if Solana CLI is available
if ! command -v solana &> /dev/null; then
    echo "❌ Error: Solana CLI not found. Please install it first."
    echo "   Visit: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Set to devnet
echo "📡 Setting Solana cluster to devnet..."
solana config set --url devnet

# Set the keypair
echo "🔑 Setting keypair..."
solana config set --keypair "$KEYPAIR_FILE"

# Verify configuration
echo ""
echo "✅ Configuration:"
solana config get

echo ""
echo "💰 Checking balance..."
BALANCE_OUTPUT=$(solana balance 2>&1)
echo "$BALANCE_OUTPUT"

if echo "$BALANCE_OUTPUT" | grep -q "Error"; then
    echo ""
    echo "⚠️  Warning: Could not fetch balance. Make sure:"
    echo "   - You're connected to the internet"
    echo "   - Your wallet has SOL on devnet"
    echo "   - The keypair file is correct"
fi

echo ""
echo "📍 Wallet Address:"
solana address

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Next steps:"
echo "   - Deploy your program: ./deploy-devnet.sh"
echo "   - Or manually: anchor deploy --provider.cluster devnet"

