#!/usr/bin/env python3
"""
Grabbit - Generate All Game & Prize Images

This script generates ALL images for the Grabbit platform:
1. Prize images (2D pastel illustrations on black background)
2. Game banners (product showcase with dynamic colors)

Usage:
    # Set your API key first
    export GOOGLE_API_KEY="your-api-key"
    
    # Run the full generation
    python assets/scripts/generate-all-images.py
    
    # Run with options
    python assets/scripts/generate-all-images.py --dry-run          # Preview without generating
    python assets/scripts/generate-all-images.py --prizes-only      # Only generate prize images
    python assets/scripts/generate-all-images.py --banners-only     # Only generate game banners
    python assets/scripts/generate-all-images.py --game "Labubu"    # Only one game
    python assets/scripts/generate-all-images.py --skip-existing    # Skip already generated images
"""

import os
import sys
import csv
import argparse
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List
from collections import defaultdict

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

try:
    from google import genai
    from google.genai import types
    from PIL import Image
except ImportError:
    print("=" * 60)
    print("ERROR: Required packages not installed")
    print("=" * 60)
    print("\nRun: pip install google-genai pillow pandas")
    print("\nOr: pip install -r scripts/image-gen-requirements.txt")
    sys.exit(1)

# ============================================================================
# CONFIGURATION
# ============================================================================

# Paths - Script is in assets/scripts/, project root is two levels up
ASSETS_DIR = Path(__file__).parent.parent  # assets/
PROJECT_ROOT = ASSETS_DIR.parent            # gashapon/

CSV_PATH = ASSETS_DIR / "game-prizes-tracker.csv"
OUTPUT_DIR = ASSETS_DIR / "generated" / "prizes"
BANNERS_DIR = ASSETS_DIR / "generated" / "games"
STYLE_REFS_DIR = ASSETS_DIR / "style-references"

# Style reference images
PRIZE_STYLE_REF = STYLE_REFS_DIR / "prize-style-ref.png"
BANNER_STYLE_REF = STYLE_REFS_DIR / "game-banner-style-ref.png"

# Gemini models
MODEL_FAST = "gemini-2.5-flash-image"  # Fast model, good for batch generation
MODEL_PRO = "gemini-3-pro-image-preview"  # Pro model with Google Search grounding

# ============================================================================
# STYLE PROMPTS
# ============================================================================

PRIZE_STYLE_PROMPT = """
Style: Flat 2D pastel illustration, cute vector art style.
Rendering: Clean, smooth gradients with soft edges. No harsh lines or realistic textures.
Color palette: Soft pastels - lavender, soft pink, pale yellow, mint green accents.
Background: Cute pastel gradient background that complements the item's colors. Use soft dreamy pastels.
Lighting: Soft, even lighting with gentle 3D depth, no harsh shadows.
Perspective: Slight 3/4 angle, floating/tilted dynamically like a product showcase.
Details: Simplified but recognizable. Remove excessive details, keep iconic features.
Overall feel: Cute, desirable, collectible - like a kawaii product render for a claw machine.

Background should be a soft, dreamy pastel gradient (like soft pink to lavender, or mint to sky blue).
"""

BANNER_STYLE_PROMPT = """
Style: 2D kawaii illustration of a cute pastel claw machine arcade game.
Composition: A claw machine filled with the prizes inside the glass cabinet.
Design: The claw machine should have soft pastel colors (pink, lavender, mint, yellow).
- Include a cute striped awning on top
- Show the mechanical claw grabbing or hovering over prizes
- Fill the machine with the collectible prizes visible through the glass
- Include arcade-style buttons and joystick at the bottom
Background: Soft pastel gradient background that complements the claw machine colors.
Feel: Cute, kawaii, arcade-style, makes players excited to play and win prizes.
"""

# Dynamic color palettes for game categories
GAME_COLORS = {
    "labubu": {"bg": "#E8B4BC", "accent": "#F5E6E8"},      # Soft pink
    "skullpanda": {"bg": "#3D3D4D", "accent": "#9B59B6"},  # Dark purple
    "hacipupu": {"bg": "#98D8C8", "accent": "#F7DC6F"},    # Mint/yellow
    "crybaby": {"bg": "#AED6F1", "accent": "#F9E79F"},     # Soft blue
    "sonny angel": {"bg": "#F9E79F", "accent": "#FADBD8"}, # Soft yellow
    "smiski": {"bg": "#D5F5E3", "accent": "#A9DFBF"},      # Soft green
    "tech": {"bg": "#D6EAF8", "accent": "#E8DAEF"},        # Tech blue
    "audio": {"bg": "#E8DAEF", "accent": "#D6EAF8"},       # Lavender
    "gaming": {"bg": "#AED6F1", "accent": "#F5B7B1"},      # Gaming blue
    "pokemon": {"bg": "#F9E79F", "accent": "#AED6F1"},     # Pokemon yellow
    "one piece": {"bg": "#F5B7B1", "accent": "#F9E79F"},   # Red/gold
    "stanley": {"bg": "#A9DFBF", "accent": "#D5F5E3"},     # Stanley green
    "magic": {"bg": "#E8DAEF", "accent": "#D6EAF8"},       # MTG purple
    "jellycat": {"bg": "#FADBD8", "accent": "#F5EEF8"},    # Soft pink
    "anime": {"bg": "#AED6F1", "accent": "#F5B7B1"},       # Anime blue
    "sanrio": {"bg": "#F5B7B1", "accent": "#FADBD8"},      # Sanrio pink
    "default": {"bg": "#B8E4F0", "accent": "#A1E5CC"},     # Grabbit default (sky blue)
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def sanitize_filename(name: str) -> str:
    """Convert a name to a safe filename."""
    safe = name.lower()
    for char in [' ', '/', '\\', ':', '(', ')', '%', '&', ',', "'", '"']:
        safe = safe.replace(char, '-' if char in ' /\\' else '')
    while '--' in safe:
        safe = safe.replace('--', '-')
    return safe.strip('-')


def get_game_colors(game_name: str) -> dict:
    """Get the color palette for a game based on its name."""
    game_lower = game_name.lower()
    for key, colors in GAME_COLORS.items():
        if key in game_lower:
            return colors
    return GAME_COLORS["default"]


def parse_csv(csv_path: Path) -> Dict[str, List[dict]]:
    """
    Parse the CSV and organize prizes by game.
    
    Returns:
        Dict mapping game_name -> list of prize dicts
    """
    games = defaultdict(list)
    
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Parse game name (handle "GAME 1: Labubu" format)
            game_raw = row.get('Game', '')
            if ': ' in game_raw:
                game_name = game_raw.split(': ', 1)[-1].strip()
            else:
                game_name = game_raw.replace('GAME ', '').strip()
            
            prize_name = row.get('Prize Name', '').strip()
            
            if not game_name or not prize_name:
                continue
            
            games[game_name].append({
                'name': prize_name,
                'cost': row.get('Cost USD', ''),
                'weight': row.get('Weight (g)', ''),
                'notes': row.get('Notes', ''),
            })
    
    return dict(games)


# ============================================================================
# IMAGE GENERATION CLASS
# ============================================================================

class GrabbitImageGenerator:
    """Generate all images for Grabbit games."""
    
    def __init__(self, api_key: Optional[str] = None, use_grounding: bool = False):
        self.api_key = api_key or os.environ.get("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "API key required!\n\n"
                "Get your key at: https://aistudio.google.com/app/apikey\n"
                "Then set it: export GOOGLE_API_KEY='your-key'"
            )
        
        self.client = genai.Client(api_key=self.api_key)
        self.prize_ref: Optional[Image.Image] = None
        self.banner_ref: Optional[Image.Image] = None
        self.use_grounding = use_grounding
        
        # Ensure directories exist
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        BANNERS_DIR.mkdir(parents=True, exist_ok=True)
        STYLE_REFS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Load style references
        self._load_style_refs()
        
        if use_grounding:
            print("✓ Google Search grounding ENABLED (uses Gemini Pro)")
        else:
            print("  Google Search grounding disabled (use --grounding to enable)")
    
    def _load_style_refs(self):
        """Load style reference images if they exist."""
        if PRIZE_STYLE_REF.exists():
            self.prize_ref = Image.open(PRIZE_STYLE_REF)
            print(f"✓ Loaded prize style reference")
        else:
            print(f"⚠ Prize style reference not found: {PRIZE_STYLE_REF}")
        
        if BANNER_STYLE_REF.exists():
            self.banner_ref = Image.open(BANNER_STYLE_REF)
            print(f"✓ Loaded banner style reference")
        else:
            print(f"⚠ Banner style reference not found: {BANNER_STYLE_REF}")
    
    def generate_prize_image(
        self,
        prize_name: str,
        game_name: str,
        skip_existing: bool = True
    ) -> bool:
        """Generate a single prize image."""
        
        # Check output path
        game_dir = OUTPUT_DIR / sanitize_filename(game_name)
        game_dir.mkdir(parents=True, exist_ok=True)
        output_path = game_dir / f"{sanitize_filename(prize_name)}.png"
        
        if skip_existing and output_path.exists():
            print(f"  ⏭ Skipping (exists): {prize_name}")
            return True
        
        # Build prompt based on grounding mode
        if self.use_grounding:
            prompt = f"""
{PRIZE_STYLE_PROMPT}

FIRST: Use Google Search to look up what "{prize_name}" looks like. This is a real collectible product.
Find reference images of the actual product to understand its appearance, shape, colors, and distinctive features.

THEN: Create a 2D pastel illustration of this EXACT product "{prize_name}".
- The illustration must accurately represent the real product's appearance
- Keep all distinctive features, colors, and design elements from the real product
- Render it in a cute, simplified pastel art style
- Make it look like a desirable collectible prize

This is a prize for the "{game_name}" claw machine game.
The final image should be instantly recognizable as "{prize_name}" to someone who knows the product.

Use a cute pastel gradient background that complements the product's colors (soft pink, lavender, mint, sky blue).
"""
        else:
            prompt = f"""
{PRIZE_STYLE_PROMPT}

Create a 2D pastel illustration of: "{prize_name}"

This is a prize for the "{game_name}" claw machine game.
Make it look like a cute, desirable collectible that players would want to win.
"""
        
        # Build content with reference
        contents = [prompt]
        if self.prize_ref:
            contents.append(self.prize_ref)
        
        # Choose model and config based on grounding
        if self.use_grounding:
            model = MODEL_PRO
            config = types.GenerateContentConfig(
                response_modalities=['TEXT', 'IMAGE'],
                image_config=types.ImageConfig(aspect_ratio="3:4"),
                tools=[{"google_search": {}}]
            )
        else:
            model = MODEL_FAST
            config = types.GenerateContentConfig(
                response_modalities=['IMAGE'],
                image_config=types.ImageConfig(aspect_ratio="3:4")
            )
        
        try:
            response = self.client.models.generate_content(
                model=model,
                contents=contents,
                config=config
            )
            
            for part in response.parts:
                if part.inline_data is not None:
                    image = part.as_image()
                    image.save(output_path)
                    print(f"  ✓ Generated: {prize_name}")
                    return True
            
            print(f"  ✗ No image returned for: {prize_name}")
            return False
            
        except Exception as e:
            print(f"  ✗ Error: {prize_name} - {e}")
            return False
    
    def generate_game_banner(
        self,
        game_name: str,
        prizes: List[str],
        skip_existing: bool = True
    ) -> bool:
        """Generate a game banner image."""
        
        output_path = BANNERS_DIR / f"{sanitize_filename(game_name)}-banner.png"
        
        if skip_existing and output_path.exists():
            print(f"  ⏭ Skipping banner (exists): {game_name}")
            return True
        
        # Get dynamic colors for this game
        colors = get_game_colors(game_name)
        prize_list = ", ".join(prizes[:6])
        
        # Build prompt
        prompt = f"""
{BANNER_STYLE_PROMPT}

Game Name: "{game_name}"
Prizes to show INSIDE the claw machine: {prize_list}

Claw machine colors: Use {colors['bg']} as the main machine color, with {colors['accent']} accents.

Create a cute 2D kawaii claw machine arcade game illustration.
- The claw machine cabinet should be filled with these prizes: {prize_list}
- Show the prizes piled up inside the glass display area
- The claw should be visible, hovering or grabbing one of the prizes
- Use pastel colors for the machine frame matching the color scheme above
- Background should be a soft pastel gradient that complements the machine colors

Match the style of the reference image - a cute pastel claw machine illustration.
"""
        
        # Build content with reference
        contents = [prompt]
        if self.banner_ref:
            contents.append(self.banner_ref)
        
        try:
            response = self.client.models.generate_content(
                model=MODEL_FAST,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_modalities=['IMAGE'],
                    image_config=types.ImageConfig(aspect_ratio="3:4")
                )
            )
            
            for part in response.parts:
                if part.inline_data is not None:
                    image = part.as_image()
                    image.save(output_path)
                    print(f"  ✓ Generated banner: {game_name}")
                    return True
            
            print(f"  ✗ No banner returned for: {game_name}")
            return False
            
        except Exception as e:
            print(f"  ✗ Banner error: {game_name} - {e}")
            return False


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Generate all game and prize images for Grabbit",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('--dry-run', action='store_true',
                       help='Preview what would be generated without actually generating')
    parser.add_argument('--prizes-only', action='store_true',
                       help='Only generate prize images (skip banners)')
    parser.add_argument('--banners-only', action='store_true',
                       help='Only generate game banners (skip prizes)')
    parser.add_argument('--game', type=str,
                       help='Only generate for a specific game')
    parser.add_argument('--skip-existing', action='store_true', default=True,
                       help='Skip images that already exist (default: True)')
    parser.add_argument('--regenerate', action='store_true',
                       help='Regenerate all images even if they exist')
    parser.add_argument('--csv', type=str, default=str(CSV_PATH),
                       help=f'Path to CSV file (default: {CSV_PATH})')
    parser.add_argument('--grounding', action='store_true',
                       help='Use Google Search to look up actual product appearance (RECOMMENDED)')
    
    args = parser.parse_args()
    
    skip_existing = not args.regenerate
    
    # Parse CSV
    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"Error: CSV file not found: {csv_path}")
        return 1
    
    print("=" * 60)
    print("GRABBIT IMAGE GENERATOR")
    print("=" * 60)
    print(f"\nCSV: {csv_path}")
    print(f"Prize output: {OUTPUT_DIR}")
    print(f"Banner output: {BANNERS_DIR}")
    print(f"Skip existing: {skip_existing}")
    
    # Parse games from CSV
    games = parse_csv(csv_path)
    
    # Filter by game if specified
    if args.game:
        games = {k: v for k, v in games.items() if args.game.lower() in k.lower()}
        if not games:
            print(f"\nNo games found matching: {args.game}")
            return 1
    
    # Calculate totals
    total_prizes = sum(len(prizes) for prizes in games.values())
    total_banners = len(games)
    
    print(f"\nFound {len(games)} games with {total_prizes} total prizes")
    print("-" * 60)
    
    # Show preview
    for game_name, prizes in games.items():
        colors = get_game_colors(game_name)
        print(f"\n📦 {game_name} ({len(prizes)} prizes)")
        print(f"   Banner color: {colors['bg']}")
        for prize in prizes[:3]:
            print(f"   • {prize['name']}")
        if len(prizes) > 3:
            print(f"   • ... and {len(prizes) - 3} more")
    
    if args.dry_run:
        print("\n" + "=" * 60)
        print("DRY RUN - No images generated")
        print("=" * 60)
        print(f"\nWould generate:")
        if not args.banners_only:
            print(f"  • {total_prizes} prize images")
        if not args.prizes_only:
            print(f"  • {total_banners} game banners")
        return 0
    
    # Initialize generator
    print("\n" + "-" * 60)
    print("Initializing Gemini...")
    
    try:
        generator = GrabbitImageGenerator(use_grounding=args.grounding)
    except ValueError as e:
        print(f"\nError: {e}")
        return 1
    
    # Track stats
    stats = {
        'prizes_generated': 0,
        'prizes_skipped': 0,
        'prizes_failed': 0,
        'banners_generated': 0,
        'banners_skipped': 0,
        'banners_failed': 0,
    }
    
    start_time = datetime.now()
    
    # Generate prize images
    if not args.banners_only:
        print("\n" + "=" * 60)
        print("GENERATING PRIZE IMAGES")
        print("=" * 60)
        
        for game_name, prizes in games.items():
            print(f"\n📦 {game_name}")
            
            for prize in prizes:
                result = generator.generate_prize_image(
                    prize_name=prize['name'],
                    game_name=game_name,
                    skip_existing=skip_existing
                )
                
                if result:
                    if skip_existing:
                        # Check if it was actually generated or skipped
                        game_dir = OUTPUT_DIR / sanitize_filename(game_name)
                        output_path = game_dir / f"{sanitize_filename(prize['name'])}.png"
                        # We can't easily tell, so just count as success
                        stats['prizes_generated'] += 1
                    else:
                        stats['prizes_generated'] += 1
                else:
                    stats['prizes_failed'] += 1
    
    # Generate game banners
    if not args.prizes_only:
        print("\n" + "=" * 60)
        print("GENERATING GAME BANNERS")
        print("=" * 60)
        
        for game_name, prizes in games.items():
            prize_names = [p['name'] for p in prizes]
            
            result = generator.generate_game_banner(
                game_name=game_name,
                prizes=prize_names,
                skip_existing=skip_existing
            )
            
            if result:
                stats['banners_generated'] += 1
            else:
                stats['banners_failed'] += 1
    
    # Print summary
    elapsed = datetime.now() - start_time
    
    print("\n" + "=" * 60)
    print("GENERATION COMPLETE")
    print("=" * 60)
    print(f"\nTime elapsed: {elapsed}")
    print(f"\nPrizes:")
    print(f"  ✓ Generated/Skipped: {stats['prizes_generated']}")
    print(f"  ✗ Failed: {stats['prizes_failed']}")
    print(f"\nBanners:")
    print(f"  ✓ Generated/Skipped: {stats['banners_generated']}")
    print(f"  ✗ Failed: {stats['banners_failed']}")
    print(f"\nOutput locations:")
    print(f"  Prizes: {OUTPUT_DIR}")
    print(f"  Banners: {BANNERS_DIR}")
    
    return 0 if stats['prizes_failed'] == 0 and stats['banners_failed'] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
