# Fixing Anchor and Solana Setup Issues

This document explains how to fix the Anchor version mismatch and Rust version issues you're encountering.

## Issues Identified

1. **Anchor Version Mismatch**: Project uses Anchor 0.30.1, but CLI is trying to use 0.32.1
2. **Rust Version Too Old**: Solana 2.1.5 comes with rustc 1.79.0-dev, but indexmap@2.12.0 requires rustc 1.82+

## Solutions

### Option 1: Update Solana Tools (Recommended)

This will give you a newer rustc version that's compatible with the dependencies:

```bash
# Update Solana to the latest stable version
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add Solana to your PATH (add to ~/.zshrc)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

If you have network/SSL issues, you can:
1. Download Solana manually from: https://github.com/solana-labs/solana/releases
2. Or use a VPN/proxy

### Option 2: Fix Anchor Installation

The Anchor 0.30.1 installation is failing because the binary already exists. Try:

```bash
# Add AVM to PATH (add to ~/.zshrc)
export PATH="$HOME/.avm/bin:$PATH"

# Then try installing with force (you may need to remove the existing binary first)
rm -f ~/.avm/bin/anchor-0.30.1
avm install 0.30.1 --force

# Or use the version that's already installed (0.32.1) by updating Anchor.toml
# Change anchor_version from "0.30.1" to "0.32.1" and update Cargo.toml files
```

### Option 3: Add PATH Configuration to Shell

Add these lines to your `~/.zshrc`:

```bash
# Anchor Version Manager
export PATH="$HOME/.avm/bin:$PATH"

# Solana (if not already added)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

Then reload your shell:
```bash
source ~/.zshrc
```

## Quick Fix Script

Run the provided fix script:

```bash
npm run fix:setup
# or
bash fix-anchor-solana.sh
```

## Verify Installation

After making changes, verify:

```bash
# Check Anchor version
anchor --version

# Check Solana version  
solana --version

# Check Rust version
rustc --version

# Should show rustc 1.82+ for the project to build
```

## If All Else Fails

If you continue having issues, you can:

1. **Upgrade to Anchor 0.32.1** (matches what's installed):
   - Update `Anchor.toml`: Change `anchor_version = "0.30.1"` to `anchor_version = "0.32.1"`
   - Update `programs/*/Cargo.toml`: Change `anchor-lang = "0.30.1"` to `anchor-lang = "0.32.1"`
   - Update `package.json`: Change `"@coral-xyz/anchor": "^0.30.1"` to `"@coral-xyz/anchor": "^0.32.1"`

2. **Use Docker** for a consistent build environment

3. **Check Anchor Discord/Forums** for version-specific issues

## Next Steps

1. Update Solana tools to get rustc 1.82+
2. Ensure PATH includes `~/.avm/bin`
3. Run `npm run anchor:test` again

