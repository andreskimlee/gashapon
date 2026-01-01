#!/bin/bash
# Deploy Anchor programs to Solana devnet

set -e  # Exit on error

echo "🚀 Deploying to Solana devnet..."

# Add common paths for Solana and Anchor
export PATH="$HOME/.avm/bin:$PATH"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Check if Solana CLI is available
if ! command -v solana &> /dev/null; then
    echo "❌ Error: Solana CLI not found."
    echo "   Trying common locations..."
    if [ -f "$HOME/.local/share/solana/install/active_release/bin/solana" ]; then
        export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
    else
        echo "   Please install Solana CLI:"
        echo "   Visit: https://docs.solana.com/cli/install-solana-cli-tools"
        exit 1
    fi
fi

# Check if Anchor CLI is available
if ! command -v anchor &> /dev/null; then
    echo "❌ Error: Anchor CLI not found."
    echo "   Trying common locations..."
    if [ -f "$HOME/.avm/bin/anchor" ]; then
        export PATH="$HOME/.avm/bin:$PATH"
    else
        echo "   Please install Anchor CLI:"
        echo "   Visit: https://www.anchor-lang.com/docs/installation"
        exit 1
    fi
fi

# Set to devnet
echo "📡 Setting Solana cluster to devnet..."
solana config set --url devnet

# Show current config
echo ""
echo "📋 Current Solana configuration:"
solana config get

# Check wallet balance
echo ""
echo "💰 Checking wallet balance..."
solana balance
echo "   (Make sure you have at least 1.5 SOL for deployment)"

# Build the program
echo ""
echo "🔨 Building Anchor program..."
anchor build

# Deploy to devnet
echo ""
echo "📦 Deploying program to devnet..."
anchor deploy --provider.cluster devnet

# Verify deployment
echo ""
echo "✅ Verifying deployment..."
PROGRAM_ID="4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG"
solana program show $PROGRAM_ID

echo ""
echo "🎉 Deployment complete!"
echo "   Program ID: $PROGRAM_ID"
echo "   View on Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"

