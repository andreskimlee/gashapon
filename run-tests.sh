#!/bin/bash
# Script to run Anchor tests with proper setup

set -e

export PATH="$HOME/.cargo/bin:$HOME/.avm/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo "🔨 Building programs..."
anchor build

echo "🧪 Starting test validator in background..."
solana-test-validator --reset &
VALIDATOR_PID=$!

# Wait for validator to be ready
echo "⏳ Waiting for validator to start..."
sleep 5

# Check if validator is running
if ! kill -0 $VALIDATOR_PID 2>/dev/null; then
    echo "❌ Validator failed to start"
    exit 1
fi

echo "✅ Validator started (PID: $VALIDATOR_PID)"

# Run tests
echo "🧪 Running tests..."
npm test || TEST_EXIT_CODE=$?

# Cleanup: kill validator
echo "🧹 Cleaning up..."
kill $VALIDATOR_PID 2>/dev/null || true
wait $VALIDATOR_PID 2>/dev/null || true

exit ${TEST_EXIT_CODE:-0}

