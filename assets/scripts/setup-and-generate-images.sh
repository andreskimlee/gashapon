#!/bin/bash
# ============================================================================
# Grabbit - Setup and Generate All Images
# ============================================================================
#
# This script:
# 1. Installs required Python packages
# 2. Sets up style reference images
# 3. Generates all prize and banner images
#
# Usage:
#   # First, set your API key
#   export GOOGLE_API_KEY="your-api-key"
#
#   # Then run this script
#   ./assets/scripts/setup-and-generate-images.sh
#
#   # Or with options
#   ./assets/scripts/setup-and-generate-images.sh --dry-run
#   ./assets/scripts/setup-and-generate-images.sh --game "Labubu"
#
# ============================================================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$ASSETS_DIR")"

echo "============================================================"
echo "GRABBIT IMAGE GENERATION SETUP"
echo "============================================================"

# Check for API key
if [ -z "$GOOGLE_API_KEY" ]; then
    echo ""
    echo "ERROR: GOOGLE_API_KEY not set!"
    echo ""
    echo "Get your API key at: https://aistudio.google.com/app/apikey"
    echo ""
    echo "Then run:"
    echo "  export GOOGLE_API_KEY='your-api-key'"
    echo "  ./assets/scripts/setup-and-generate-images.sh"
    exit 1
fi

echo "✓ API key found"

# Install dependencies
echo ""
echo "Installing Python dependencies..."
pip install -q google-genai pillow pandas
echo "✓ Dependencies installed"

# Setup style references directory
STYLE_DIR="$ASSETS_DIR/style-references"
mkdir -p "$STYLE_DIR"

# Check for style references
echo ""
echo "Checking style references..."

PRIZE_REF="$STYLE_DIR/prize-style-ref.png"
BANNER_REF="$STYLE_DIR/game-banner-style-ref.png"

if [ ! -f "$PRIZE_REF" ]; then
    echo "⚠ Prize style reference not found at: $PRIZE_REF"
    echo "  The script will still work, but results may be less consistent."
    echo ""
    echo "  To add it, copy your reference image:"
    echo "    cp your-prize-style.png $PRIZE_REF"
else
    echo "✓ Prize style reference found"
fi

if [ ! -f "$BANNER_REF" ]; then
    echo "⚠ Banner style reference not found at: $BANNER_REF"
    echo "  The script will still work, but results may be less consistent."
    echo ""
    echo "  To add it, copy your reference image:"
    echo "    cp your-banner-style.png $BANNER_REF"
else
    echo "✓ Banner style reference found"
fi

# Create output directories
mkdir -p "$PROJECT_ROOT/frontend/public/images/prizes"
mkdir -p "$PROJECT_ROOT/frontend/public/images/games"
echo "✓ Output directories ready"

# Run the generator
echo ""
echo "============================================================"
echo "Starting image generation..."
echo "============================================================"
echo ""

python "$SCRIPT_DIR/generate-all-images.py" "$@"

echo ""
echo "============================================================"
echo "DONE!"
echo "============================================================"
