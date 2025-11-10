# Devnet SOL Requirements for Testing

## Current Balance

You have **~0.118 SOL** remaining after deployment.

## Estimated Costs for Testing

### Per Test Run (Full Suite)

- **Token Mint Creation:** ~0.00144 SOL (rent)
- **Token Accounts (2x):** ~0.004 SOL (rent)
- **Game Account Initialization:** ~0.01-0.02 SOL (rent, depends on prize pool size)
- **Transaction Fees:** ~0.003 SOL (6-10 transactions × ~0.0005 SOL each)
- **Airdrops for Test Accounts:** Free (devnet)

**Total per test run: ~0.02-0.03 SOL**

### Recommended Balance

- **Minimum:** 0.1 SOL (for 3-4 test runs)
- **Comfortable:** 0.5 SOL (for extensive testing)
- **Safe:** 1-2 SOL (for development and testing)

## Getting More Devnet SOL

### Method 1: Solana CLI Airdrop (Easiest)

```bash
# Make sure you're on devnet
export PATH="$HOME/.avm/bin:$PATH"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana config set --url devnet

# Request airdrop (up to 2 SOL per request)
solana airdrop 2 --keypair ./phantom-devnet-keypair.json

# Check balance
solana balance --keypair ./phantom-devnet-keypair.json
```

**Note:** Devnet airdrops are rate-limited:

- Usually 2 SOL per request
- May have cooldown periods
- If rate-limited, wait a few minutes and try again

### Method 2: Solana Faucet (Web)

1. Visit: https://faucet.solana.com/
2. Enter your wallet address: `8b6VWQXbgPXhBMHphHXvVkJYN9eG758FEC9LxyQfKkPC`
3. Select "Devnet"
4. Complete CAPTCHA
5. Receive 2 SOL

### Method 3: Multiple Airdrop Requests

If you need more than 2 SOL, you can request multiple times:

```bash
# Request multiple airdrops (wait between requests)
solana airdrop 2 --keypair ./phantom-devnet-keypair.json
# Wait 30-60 seconds
solana airdrop 2 --keypair ./phantom-devnet-keypair.json
# Repeat as needed
```

## Quick Airdrop Script

Create a script to get more SOL:

```bash
#!/bin/bash
# get-devnet-sol.sh

export PATH="$HOME/.avm/bin:$PATH"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

solana config set --url devnet

echo "💰 Current balance:"
solana balance --keypair ./phantom-devnet-keypair.json

echo ""
echo "💧 Requesting airdrop..."
solana airdrop 2 --keypair ./phantom-devnet-keypair.json

echo ""
echo "💰 New balance:"
solana balance --keypair ./phantom-devnet-keypair.json
```

## Cost Breakdown by Operation

| Operation                 | Estimated Cost  |
| ------------------------- | --------------- |
| Token mint creation       | ~0.00144 SOL    |
| Token account creation    | ~0.002 SOL each |
| Game initialization       | ~0.01-0.02 SOL  |
| play_game transaction     | ~0.0005 SOL     |
| finalize_play transaction | ~0.0005 SOL     |
| update_game_status        | ~0.0005 SOL     |
| replenish_prize_supply    | ~0.0005 SOL     |

## Tips

1. **Start with 1-2 SOL** - This gives you plenty of room for testing
2. **Monitor your balance** - Check before running tests
3. **Reuse accounts** - If testing multiple times, you can reuse the same game account
4. **Close accounts** - You can close token accounts to get rent back (advanced)

## Check Balance Anytime

```bash
export PATH="$HOME/.avm/bin:$PATH"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana balance --keypair ./phantom-devnet-keypair.json
```

## If You Run Out

If you run out of SOL during testing:

1. Request another airdrop: `solana airdrop 2`
2. Wait a few minutes if rate-limited
3. Use the web faucet as backup: https://faucet.solana.com/
