#!/bin/bash

# Devnet SOL Farming Script
# Runs overnight to accumulate SOL by periodically requesting airdrops

WALLET="8b6VWQXbgPXhBMHphHXvVkJYN9eG758FEC9LxyQfKkPC"
RPC_URL="https://api.devnet.solana.com"
TARGET_SOL=5  # Stop when we have this much
WAIT_MINUTES=20  # Wait between attempts (rate limit is ~2 per 8 hours, but sometimes resets faster)

echo "================================================"
echo "  Devnet SOL Farming Script"
echo "================================================"
echo "Wallet: $WALLET"
echo "Target: $TARGET_SOL SOL"
echo "Interval: $WAIT_MINUTES minutes between attempts"
echo "Started at: $(date)"
echo "================================================"
echo ""

# Function to get current balance
get_balance() {
  solana balance "$WALLET" --url "$RPC_URL" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' || echo "0"
}

# Function to attempt airdrop
try_airdrop() {
  local amount=$1
  echo "[$(date '+%H:%M:%S')] Attempting airdrop of $amount SOL..."
  
  result=$(solana airdrop "$amount" "$WALLET" --url "$RPC_URL" 2>&1)
  
  if echo "$result" | grep -q "Error"; then
    echo "[$(date '+%H:%M:%S')] ❌ Airdrop failed (rate limited or error)"
    return 1
  else
    echo "[$(date '+%H:%M:%S')] ✅ Airdrop successful!"
    return 0
  fi
}

# Main loop
attempt=0
while true; do
  attempt=$((attempt + 1))
  
  # Check current balance
  balance=$(get_balance)
  echo ""
  echo "=========================================="
  echo "[$(date '+%H:%M:%S')] Attempt #$attempt"
  echo "[$(date '+%H:%M:%S')] Current balance: $balance SOL"
  
  # Check if we've reached target
  if (( $(echo "$balance >= $TARGET_SOL" | bc -l) )); then
    echo ""
    echo "🎉 Target reached! Balance: $balance SOL"
    echo "You can now run:"
    echo "  anchor upgrade --provider.cluster devnet --program-id EKzLHZyU6WVfhYVXcE6R4hRE4YuWrva8NeLGMYB7ZDU6 target/deploy/gachapon_game.so"
    break
  fi
  
  # Try different airdrop amounts (larger amounts fail more often)
  for amount in 2 1 0.5; do
    if try_airdrop "$amount"; then
      break
    fi
    sleep 2
  done
  
  # Show updated balance
  sleep 3
  new_balance=$(get_balance)
  echo "[$(date '+%H:%M:%S')] Balance after attempt: $new_balance SOL"
  
  # Calculate time until next attempt
  next_time=$(date -d "+$WAIT_MINUTES minutes" '+%H:%M:%S' 2>/dev/null || date -v+${WAIT_MINUTES}M '+%H:%M:%S')
  echo "[$(date '+%H:%M:%S')] Sleeping $WAIT_MINUTES minutes... Next attempt at ~$next_time"
  echo "=========================================="
  
  # Sleep with countdown (show progress every 5 minutes)
  remaining=$((WAIT_MINUTES * 60))
  while [ $remaining -gt 0 ]; do
    if [ $((remaining % 300)) -eq 0 ] && [ $remaining -gt 0 ]; then
      echo "[$(date '+%H:%M:%S')] ... $((remaining / 60)) minutes remaining"
    fi
    sleep 60
    remaining=$((remaining - 60))
  done
done

echo ""
echo "Script completed at: $(date)"
