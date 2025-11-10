# Setting Up Phantom Wallet for CLI Deployment

This guide will help you export your Phantom wallet and use it with Solana CLI for deploying your Anchor programs.

## ⚠️ Security Warning

**NEVER share your private key or seed phrase with anyone!** Keep it secure and never commit it to version control.

## Method 1: Export Private Key from Phantom (Recommended)

### Step 1: Export Private Key from Phantom

1. **Open Phantom Wallet** in your browser
2. Click the **Settings** icon (gear icon) in the bottom right
3. Go to **Security & Privacy**
4. Click **Export Private Key**
5. Enter your **Phantom password** to confirm
6. **Copy the private key** - it will be a long string of characters

### Step 2: Convert Private Key to Keypair JSON

The Solana CLI needs the keypair in JSON format. You can convert it using Node.js or Python:

#### Option A: Using Node.js (Quick Method)

Create a temporary script to convert your private key:

```bash
# Create a conversion script
cat > convert-phantom-key.js << 'EOF'
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stderr
});

rl.question('Paste your Phantom private key (base58 string): ', (privateKey) => {
  try {
    // Import the bs58 library (you may need to install it: npm install bs58)
    const bs58 = require('bs58');
    const secretKey = bs58.decode(privateKey);

    // Solana keypair format is [secretKey, publicKey]
    // We need to extract just the secret key part (first 64 bytes)
    const keypair = {
      publicKey: bs58.encode(secretKey.slice(32)),
      secretKey: Array.from(secretKey.slice(0, 64))
    };

    // Save to file
    const outputPath = './phantom-devnet-keypair.json';
    fs.writeFileSync(outputPath, JSON.stringify(keypair.secretKey));

    console.log('\n✅ Keypair saved to:', outputPath);
    console.log('Public Key:', keypair.publicKey);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  rl.close();
});
EOF

# Run the script (you'll need bs58: npm install bs58)
node convert-phantom-key.js
```

**Note:** You'll need to install `bs58` first: `npm install bs58`

#### Option B: Using Solana CLI (Easier Method)

If you have Solana CLI installed, you can use it directly:

```bash
# Create a keypair file from the private key
# Replace YOUR_PRIVATE_KEY with the actual private key from Phantom
echo "YOUR_PRIVATE_KEY" | solana-keygen recover 'prompt://?full-path=0/0' --outfile ./phantom-devnet-keypair.json
```

Actually, a simpler approach is to use a Python script or online tool, but the safest is:

#### Option C: Manual Conversion Script

Save this as `convert-phantom.js`:

```javascript
const bs58 = require("bs58");
const fs = require("fs");

// Get private key from command line argument
const privateKey = process.argv[2];

if (!privateKey) {
  console.error("Usage: node convert-phantom.js <private_key>");
  process.exit(1);
}

try {
  // Decode the base58 private key
  const secretKey = bs58.decode(privateKey);

  // Solana keypair JSON format is just the secret key array
  const keypairArray = Array.from(secretKey);

  // Save to file
  const outputPath = "./phantom-devnet-keypair.json";
  fs.writeFileSync(outputPath, JSON.stringify(keypairArray));

  // Get public key (last 32 bytes of decoded key)
  const publicKeyBytes = secretKey.slice(-32);
  const publicKey = bs58.encode(publicKeyBytes);

  console.log("✅ Keypair saved to:", outputPath);
  console.log("Public Key:", publicKey);
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
```

Then run:

```bash
npm install bs58  # if not already installed
node convert-phantom.js YOUR_PRIVATE_KEY_HERE
```

### Step 3: Configure Solana CLI

Once you have the keypair JSON file:

```bash
# Set Solana to use devnet
solana config set --url devnet

# Set your Phantom wallet as the default keypair
solana config set --keypair ./phantom-devnet-keypair.json

# Verify the configuration
solana config get

# Check your balance (should show your 2 SOL)
solana balance

# Verify the public key matches your Phantom wallet
solana address
```

### Step 4: Update Anchor.toml (Optional)

You can also specify the wallet directly in `Anchor.toml` or use command-line flags:

```bash
# Deploy using the Phantom wallet
anchor deploy --provider.cluster devnet --provider.wallet ./phantom-devnet-keypair.json
```

## Method 2: Using Phantom's Export Feature

Some versions of Phantom allow exporting the keypair directly:

1. Open Phantom Settings
2. Go to **Security & Privacy**
3. Look for **Export Keypair** or **Backup Wallet**
4. Export and save the JSON file
5. Use that file directly with Solana CLI

## Method 3: Using Phantom CLI (If Available)

If Phantom has a CLI tool, you can use it directly. Check Phantom's documentation for CLI support.

## Security Best Practices

1. **Never commit keypair files to git** - Add to `.gitignore`:

   ```
   phantom-devnet-keypair.json
   *.json
   !package*.json
   !tsconfig.json
   ```

2. **Use environment variables** for production:

   ```bash
   export SOLANA_KEYPAIR_PATH=./phantom-devnet-keypair.json
   ```

3. **Store keypairs securely** - Consider using a password manager or encrypted storage

4. **Use separate wallets** - Consider using a separate wallet for deployment (not your main Phantom wallet)

## Troubleshooting

### Error: "Invalid keypair format"

- Make sure the JSON file contains an array of numbers (not a string)
- The array should have 64 elements (secret key) or 128 elements (secret + public)

### Error: "Keypair file not found"

- Check the file path is correct
- Use absolute path if relative path doesn't work: `solana config set --keypair /full/path/to/phantom-devnet-keypair.json`

### Error: "Insufficient funds"

- Make sure you're on devnet: `solana config set --url devnet`
- Check balance: `solana balance`
- Verify the wallet address matches: `solana address`

### Public Key Doesn't Match

- The public key derived from the private key should match your Phantom wallet address
- If it doesn't match, you may have exported the wrong key or there's a conversion issue

## Quick Setup Script

Here's a helper script to set up your Phantom wallet:

```bash
#!/bin/bash
# setup-phantom-wallet.sh

echo "🔐 Setting up Phantom wallet for Solana CLI..."

# Check if keypair file exists
if [ ! -f "./phantom-devnet-keypair.json" ]; then
    echo "❌ Keypair file not found!"
    echo "   Please export your private key from Phantom and convert it first."
    echo "   See PHANTOM_WALLET_SETUP.md for instructions."
    exit 1
fi

# Set to devnet
solana config set --url devnet

# Set the keypair
solana config set --keypair ./phantom-devnet-keypair.json

# Verify
echo ""
echo "✅ Configuration:"
solana config get

echo ""
echo "💰 Balance:"
solana balance

echo ""
echo "📍 Wallet Address:"
solana address

echo ""
echo "✅ Setup complete! You can now deploy with:"
echo "   anchor deploy --provider.cluster devnet"
```

## Next Steps

Once your wallet is configured:

1. **Test the connection:**

   ```bash
   solana balance
   solana address
   ```

2. **Deploy your program:**

   ```bash
   ./deploy-devnet.sh
   # or
   anchor deploy --provider.cluster devnet
   ```

3. **Verify deployment:**
   ```bash
   solana program show 4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG
   ```
