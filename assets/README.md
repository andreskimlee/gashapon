# Grabbit Assets

This folder contains all asset generation tools, deployment scripts, and source files for the Grabbit platform.

## Structure

```
assets/
├── README.md                    # This file
├── game-prizes-tracker.csv      # Master CSV of all games and prizes
├── generated/                   # AI-generated images
│   ├── prizes/                  # Prize images by game
│   └── games/                   # Game banner images
├── style-references/            # Style reference images for AI generation
│   ├── prize-style-ref.png      # 2D pastel style
│   └── game-banner-style-ref.png # Claw machine style
└── scripts/                     # Generation and deployment scripts
    ├── generate-all-images.py   # AI image generation
    ├── generate-prize-images.py # Advanced image generation
    ├── deploy-all-games.ts      # Blockchain deployment script
    └── image-gen-requirements.txt # Python dependencies
```

## Quick Start

### 1. Set up API Key

Get your Google AI API key at: https://aistudio.google.com/app/apikey

```bash
export GOOGLE_API_KEY="your-api-key"
```

### 2. Install Dependencies

```bash
pip install -r assets/scripts/image-gen-requirements.txt
```

### 3. Generate All Images

```bash
# Preview what will be generated (no actual generation)
python assets/scripts/generate-all-images.py --dry-run

# Generate everything
python assets/scripts/generate-all-images.py
```

## Image Styles

### Prize Images
- **Style**: Flat 2D pastel illustration on pure black background
- **Reference**: `style-references/prize-style-ref.png`
- **Aspect Ratio**: 3:4 (portrait)
- **Output**: `frontend/public/images/prizes/{game}/{prize}.png`

### Game Banners
- **Style**: Product showcase photography with dynamic background colors
- **Reference**: `style-references/game-banner-style-ref.png`
- **Aspect Ratio**: 16:9 (landscape)
- **Output**: `frontend/public/images/games/{game}-banner.png`

### Dynamic Colors by Game

| Game | Background Color |
|------|-----------------|
| Labubu | Soft Pink (#E8B4BC) |
| Skullpanda | Dark Purple (#3D3D4D) |
| Sonny Angel | Soft Yellow (#F9E79F) |
| Smiski | Soft Green (#D5F5E3) |
| Pokemon | Pokemon Yellow (#F9E79F) |
| Tech/Audio | Lavender (#E8DAEF) |
| Default | Sky Blue (#B8E4F0) |

## Script Options

### generate-all-images.py

```bash
# Preview without generating
python assets/scripts/generate-all-images.py --dry-run

# Generate only prize images
python assets/scripts/generate-all-images.py --prizes-only

# Generate only banners
python assets/scripts/generate-all-images.py --banners-only

# Generate for one game only
python assets/scripts/generate-all-images.py --game "Labubu"

# Regenerate all (don't skip existing)
python assets/scripts/generate-all-images.py --regenerate
```

### generate-prize-images.py (Advanced)

```bash
# Single prize
python assets/scripts/generate-prize-images.py --prize "Labubu Mini" --game "Labubu"

# Single banner
python assets/scripts/generate-prize-images.py --game-banner "Pokemon TCG" --prizes "Booster,ETB"

# Use PRO model for higher quality
python assets/scripts/generate-prize-images.py --prize "AirPods Max" --game "Tech" \
    --model gemini-3-pro-image-preview --resolution 2K
```

## CSV Format

The `game-prizes-tracker.csv` contains all prize data:

| Column | Description |
|--------|-------------|
| Game | Game name (e.g., "GAME 1: Labubu") |
| Prize Name | Individual prize name |
| Cost USD | Wholesale cost |
| Weight (g) | Weight in grams |
| Length/Width/Height (in) | Dimensions in inches |
| Supply | Number of units |
| SKU | Stock keeping unit |
| Suggested Play Cost | Recommended play price |
| Image Ready | ✓ when image is generated |
| Sourced | ✓ when item is sourced |
| Notes | Additional notes |

## Adding New Games/Prizes

1. Add entries to `game-prizes-tracker.csv`
2. Run generation for that game:
   ```bash
   python assets/scripts/generate-all-images.py --game "NewGame"
   ```
3. Mark "Image Ready" in CSV when done

---

## Blockchain Deployment

After generating images, deploy games to Solana blockchain.

### Prerequisites

1. Authority wallet keypair file (JSON format)
2. Environment variables set in `frontend/.env.local`:
   - `NEXT_PUBLIC_SOLANA_RPC_URL`
   - `NEXT_PUBLIC_GAME_PROGRAM_ID`
   - `NEXT_PUBLIC_TOKEN_MINT`
3. Cloudinary credentials (optional, for image hosting):
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

### Install TypeScript Dependencies

```bash
npm install -g ts-node typescript
npm install csv-parse cloudinary dotenv @coral-xyz/anchor @solana/web3.js
```

### Deploy Commands

```bash
# Preview deployment (no actual changes)
npx ts-node assets/scripts/deploy-all-games.ts --dry-run

# Deploy all games
npx ts-node assets/scripts/deploy-all-games.ts --keypair=/path/to/authority.json

# Deploy specific game only
npx ts-node assets/scripts/deploy-all-games.ts --keypair=/path/to/authority.json --game=1
```

### What the Deployment Script Does

1. **Parses CSV** - Reads all games and prizes from `game-prizes-tracker.csv`
2. **Uploads Images** - Uploads generated images to Cloudinary (if configured)
3. **Calculates Odds** - Auto-calculates prize probabilities for 80% profit margin
4. **Deploys On-Chain** - Creates game and adds prizes to Solana blockchain
5. **Indexes Automatically** - The backend indexer picks up new games

### Deployment Flow

```
CSV Data → Upload Images → Calculate Odds → Deploy to Solana → Indexer → Database → Frontend
```
