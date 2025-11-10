#!/bin/bash
# Create a treasury wallet for devnet or mainnet

set -e

NETWORK=${1:-devnet}
KEYPAIR_FILE="./treasury-${NETWORK}-keypair.json"

echo "💰 Creating treasury wallet for ${NETWORK}..."

# Check if Solana CLI is available
export PATH="$HOME/.avm/bin:$PATH"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

if ! command -v solana-keygen &> /dev/null; then
    echo "❌ Error: Solana CLI not found. Please install it first."
    exit 1
fi

# Check if treasury already exists
if [ -f "$KEYPAIR_FILE" ]; then
    echo "⚠️  Treasury keypair already exists: $KEYPAIR_FILE"
    read -p "   Overwrite? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   Keeping existing treasury."
        exit 0
    fi
fi

# Generate new keypair
echo "🔑 Generating new treasury keypair..."
solana-keygen new --outfile "$KEYPAIR_FILE" --force --no-bip39-passphrase

# Get public key
TREASURY_ADDRESS=$(solana-keygen pubkey "$KEYPAIR_FILE")
echo ""
echo "✅ Treasury created!"
echo "   Address: $TREASURY_ADDRESS"
echo "   Keypair: $KEYPAIR_FILE"
echo ""

# Fund on devnet
if [ "$NETWORK" = "devnet" ]; then
    echo "💧 Funding treasury on devnet..."
    solana config set --url devnet
    solana airdrop 2 --keypair "$KEYPAIR_FILE" || echo "   ⚠️  Airdrop may be rate-limited, try again later"
    
    echo ""
    echo "💰 Treasury balance:"
    solana balance --keypair "$KEYPAIR_FILE"
fi

echo ""
echo "🔒 Security Reminder:"
echo "   - Keep $KEYPAIR_FILE secure"
echo "   - Never commit it to git"
echo "   - Consider encrypting for production"
echo ""
echo "📝 To use this treasury:"
echo "   export TREASURY_ADDRESS=$TREASURY_ADDRESS"
echo "   export TREASURY_KEYPAIR_PATH=$KEYPAIR_FILE"

