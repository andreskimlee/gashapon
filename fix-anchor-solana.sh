#!/bin/bash
# Fix script for Anchor and Solana version issues

set -e

echo "🔧 Fixing Anchor and Solana setup..."

# Add AVM to PATH if not already there
export PATH="$HOME/.avm/bin:$PATH"

# Try to install Anchor 0.30.1 with force
echo "📦 Installing Anchor 0.30.1..."
if command -v avm &> /dev/null; then
    avm install 0.30.1 --force || {
        echo "⚠️  Could not install Anchor 0.30.1 via avm"
        echo "   Trying alternative method..."
        # Remove existing binary if it exists and causes issues
        rm -f ~/.avm/bin/anchor-0.30.1 2>/dev/null || true
    }
else
    echo "⚠️  avm not found in PATH. Adding ~/.avm/bin to PATH..."
    export PATH="$HOME/.avm/bin:$PATH"
    if [ -f ~/.avm/bin/avm ]; then
        ~/.avm/bin/avm install 0.30.1 --force || echo "⚠️  Installation failed, but continuing..."
    fi
fi

# Check Solana version and rustc
echo ""
echo "🔍 Checking Solana and Rust versions..."
if command -v solana &> /dev/null; then
    SOLANA_VERSION=$(solana --version 2>/dev/null || echo "unknown")
    echo "   Solana version: $SOLANA_VERSION"
else
    echo "   Solana not found in PATH"
fi

if command -v rustc &> /dev/null; then
    RUSTC_VERSION=$(rustc --version 2>/dev/null || echo "unknown")
    echo "   Rustc version: $RUSTC_VERSION"
    
    # Check if rustc version is too old
    if echo "$RUSTC_VERSION" | grep -q "1.79"; then
        echo ""
        echo "⚠️  WARNING: Your rustc version (1.79.0-dev) is too old for indexmap@2.12.0"
        echo "   You need rustc 1.82+ to build this project."
        echo ""
        echo "   To fix this, update Solana tools:"
        echo "   sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
        echo ""
        echo "   Or if you have network issues, download manually from:"
        echo "   https://github.com/solana-labs/solana/releases"
        echo ""
    fi
else
    echo "   Rustc not found in PATH"
fi

echo ""
echo "✅ Setup check complete!"
echo ""
echo "Next steps:"
echo "1. If rustc version is 1.79, update Solana tools as shown above"
echo "2. Make sure ~/.avm/bin is in your PATH (add to ~/.zshrc):"
echo "   export PATH=\"\$HOME/.avm/bin:\$PATH\""
echo "3. Try running: npm run anchor:test"

