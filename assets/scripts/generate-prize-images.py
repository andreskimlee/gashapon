#!/usr/bin/env python3
"""
Grabbit Prize Image Generator

Uses Google Gemini (Nano Banana) to generate consistent, themed prize images
for the Grabbit claw machine games.

TWO DISTINCT STYLES:
1. PRIZE IMAGES: 2D pastel illustrations on pure black background
   - Flat vector-like style with soft gradients
   - Items float/tilt dynamically
   - Reference: assets/style-references/prize-style-ref.png

2. GAME BANNERS: Product showcase photography style  
   - Multiple items arranged on colored background
   - Background color is dynamic based on game category
   - Reference: assets/style-references/game-banner-style-ref.png

Setup:
    1. Get API key: https://aistudio.google.com/app/apikey
    2. Set environment variable: export GOOGLE_API_KEY="your-key"
    3. Style references are in assets/style-references/

Usage:
    # Generate a single prize image (2D pastel on black)
    python assets/scripts/generate-prize-images.py --prize "Labubu Mini Blind Box" --game "Labubu"
    
    # Generate all prizes from CSV
    python assets/scripts/generate-prize-images.py --csv assets/game-prizes-tracker.csv
    
    # Generate game banner with dynamic colors
    python assets/scripts/generate-prize-images.py --game-banner "Labubu" --prizes "Mini,Mega,Plush"
    
    # Generate only banners from CSV
    python assets/scripts/generate-prize-images.py --csv assets/game-prizes-tracker.csv --banners-only

Requirements:
    pip install google-genai pillow pandas
"""

import os
import csv
import argparse
import base64
from datetime import datetime
from pathlib import Path
from typing import Optional, List

try:
    from google import genai
    from google.genai import types
    from PIL import Image
except ImportError:
    print("Required packages not installed. Run:")
    print("  pip install google-genai pillow pandas")
    exit(1)

# Configuration - Script is in assets/scripts/, project root is two levels up
ASSETS_DIR = Path(__file__).parent.parent  # assets/
PROJECT_ROOT = ASSETS_DIR.parent            # gashapon/

OUTPUT_DIR = ASSETS_DIR / "generated" / "prizes"
GAME_BANNERS_DIR = ASSETS_DIR / "generated" / "games"
STYLE_REFS_DIR = ASSETS_DIR / "style-references"

# Gemini models
MODEL_FAST = "gemini-2.5-flash-image"  # Fast, up to 3 reference images
MODEL_PRO = "gemini-3-pro-image-preview"  # Pro, up to 14 reference images, 4K

# Reference images for consistent styling
PRIZE_STYLE_REF = STYLE_REFS_DIR / "prize-style-ref.png"
GAME_BANNER_STYLE_REF = STYLE_REFS_DIR / "game-banner-style-ref.png"

# Style prompt for PRIZE images (2D pastel illustration style)
PRIZE_STYLE_PROMPT = """
Style: Flat 2D pastel illustration, similar to a cute vector art style.
Rendering: Clean, smooth gradients with soft edges. No harsh lines or realistic textures.
Color palette: Soft pastels - use lavender, soft pink, pale yellow, mint accents.
Background: Cute pastel gradient background that complements the item's colors. Use soft dreamy pastels.
Lighting: Soft, even lighting that gives a gentle 3D feel without harsh shadows.
Perspective: Slight 3/4 angle, floating/tilted dynamically like a product showcase.
Details: Simplified but recognizable. Remove excessive details, keep iconic features.
Overall feel: Cute, desirable, collectible - like a kawaii product render.

Background should be a soft, dreamy pastel gradient (like soft pink to lavender, or mint to sky blue).
"""

# Style prompt for GAME BANNER images (claw machine style)
GAME_BANNER_STYLE_PROMPT = """
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

# Color palettes for different game categories
GAME_COLOR_PALETTES = {
    "labubu": {"primary": "#E8B4BC", "secondary": "#F5E6E8", "accent": "#D4A5A5"},  # Soft pink
    "skullpanda": {"primary": "#2D2D2D", "secondary": "#4A4A4A", "accent": "#9B59B6"},  # Dark purple
    "hacipupu": {"primary": "#98D8C8", "secondary": "#F7DC6F", "accent": "#F5B7B1"},  # Mint/yellow
    "crybaby": {"primary": "#AED6F1", "secondary": "#D5DBDB", "accent": "#F9E79F"},  # Soft blue
    "sonny angel": {"primary": "#F9E79F", "secondary": "#FADBD8", "accent": "#D5F5E3"},  # Soft yellow
    "smiski": {"primary": "#D5F5E3", "secondary": "#A9DFBF", "accent": "#F9E79F"},  # Soft green
    "tech": {"primary": "#D6EAF8", "secondary": "#E8DAEF", "accent": "#FCF3CF"},  # Tech blue/purple
    "pokemon": {"primary": "#F9E79F", "secondary": "#AED6F1", "accent": "#F5B7B1"},  # Pokemon yellow
    "one piece": {"primary": "#F5B7B1", "secondary": "#F9E79F", "accent": "#AED6F1"},  # Red/gold
    "stanley": {"primary": "#A9DFBF", "secondary": "#D5F5E3", "accent": "#F9E79F"},  # Stanley green
    "magic": {"primary": "#E8DAEF", "secondary": "#D6EAF8", "accent": "#F5B7B1"},  # MTG purple
    "jellycat": {"primary": "#FADBD8", "secondary": "#F5EEF8", "accent": "#D5F5E3"},  # Soft pink
    "anime": {"primary": "#AED6F1", "secondary": "#F5B7B1", "accent": "#F9E79F"},  # Anime blue
    "sanrio": {"primary": "#F5B7B1", "secondary": "#FADBD8", "accent": "#F9E79F"},  # Sanrio pink
    "default": {"primary": "#B8E4F0", "secondary": "#A1E5CC", "accent": "#F7ABAD"},  # Grabbit default
}

class GrabbitImageGenerator:
    """Generate themed prize images for Grabbit games."""
    
    def __init__(self, api_key: Optional[str] = None, model: str = MODEL_FAST):
        """
        Initialize the generator.
        
        Args:
            api_key: Google AI API key. If None, uses GOOGLE_API_KEY env var.
            model: Gemini model to use (MODEL_FAST or MODEL_PRO)
        """
        self.api_key = api_key or os.environ.get("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "API key required. Set GOOGLE_API_KEY env var or pass api_key parameter.\n"
                "Get your key at: https://aistudio.google.com/app/apikey"
            )
        
        self.client = genai.Client(api_key=self.api_key)
        self.model = model
        self.prize_style_ref: Optional[Image.Image] = None
        self.game_banner_style_ref: Optional[Image.Image] = None
        self.custom_style_refs: List[Image.Image] = []
        self.chat = None  # For multi-turn conversations
        
        # Ensure output directories exist
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        GAME_BANNERS_DIR.mkdir(parents=True, exist_ok=True)
        STYLE_REFS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Load default style references if they exist
        self._load_default_style_refs()
    
    def _load_default_style_refs(self) -> None:
        """Load the default style reference images if they exist."""
        if PRIZE_STYLE_REF.exists():
            self.prize_style_ref = Image.open(PRIZE_STYLE_REF)
            print(f"✓ Loaded prize style reference: {PRIZE_STYLE_REF}")
        else:
            print(f"  Note: Prize style reference not found at {PRIZE_STYLE_REF}")
            print(f"        Place your reference image there for consistent prize styling.")
        
        if GAME_BANNER_STYLE_REF.exists():
            self.game_banner_style_ref = Image.open(GAME_BANNER_STYLE_REF)
            print(f"✓ Loaded game banner style reference: {GAME_BANNER_STYLE_REF}")
        else:
            print(f"  Note: Game banner style reference not found at {GAME_BANNER_STYLE_REF}")
            print(f"        Place your reference image there for consistent banner styling.")
    
    def set_prize_style_reference(self, image_path: str) -> None:
        """
        Set the style reference for prize images.
        
        Args:
            image_path: Path to the reference image (2D pastel style)
        """
        self.prize_style_ref = Image.open(image_path)
        print(f"✓ Set prize style reference: {image_path}")
    
    def set_game_banner_style_reference(self, image_path: str) -> None:
        """
        Set the style reference for game banner images.
        
        Args:
            image_path: Path to the reference image (product showcase style)
        """
        self.game_banner_style_ref = Image.open(image_path)
        print(f"✓ Set game banner style reference: {image_path}")
    
    def add_custom_style_reference(self, image_path: str) -> None:
        """
        Add an additional custom style reference.
        
        Args:
            image_path: Path to the reference image
        """
        img = Image.open(image_path)
        self.custom_style_refs.append(img)
        print(f"✓ Added custom style reference: {image_path}")
    
    def clear_custom_style_references(self) -> None:
        """Clear all custom style references."""
        self.custom_style_refs = []
        print("✓ Cleared custom style references")
    
    def _get_game_color_palette(self, game_name: str) -> dict:
        """Get the color palette for a game based on its name."""
        game_lower = game_name.lower()
        for key, palette in GAME_COLOR_PALETTES.items():
            if key in game_lower:
                return palette
        return GAME_COLOR_PALETTES["default"]
    
    def _build_prize_prompt(self, prize_name: str, description: str = "", use_grounding: bool = False) -> str:
        """Build the prompt for generating a prize image."""
        parts = [PRIZE_STYLE_PROMPT]
        
        if use_grounding:
            # With Google Search grounding - ask to look up the actual product
            subject = f"""
FIRST: Use Google Search to look up what "{prize_name}" looks like. This is a real collectible product.
Find reference images of the actual product to understand its appearance, shape, colors, and distinctive features.

THEN: Create a 2D pastel illustration of this EXACT product "{prize_name}".
- The illustration must accurately represent the real product's appearance
- Keep all distinctive features, colors, and design elements from the real product
- Render it in a cute, simplified pastel art style
- Make it look like a desirable collectible prize

The final image should be instantly recognizable as "{prize_name}" to someone who knows the product.
"""
        else:
            subject = f"""
Subject: Create a 2D pastel illustration of "{prize_name}".
The item should be rendered in a cute, simplified pastel art style.
It should look like a collectible prize you'd win from a claw machine.
Make it look desirable and fun to collect.
"""
        parts.append(subject)
        
        if description:
            parts.append(f"Additional details: {description}")
        
        parts.append("Use a cute pastel gradient background that complements the product's colors (soft pink, lavender, mint, sky blue).")
        
        return "\n\n".join(parts)
    
    def _build_game_banner_prompt(
        self,
        game_name: str,
        prizes: List[str],
        color_palette: dict
    ) -> str:
        """Build the prompt for generating a game banner."""
        parts = [GAME_BANNER_STYLE_PROMPT]
        
        prize_list = ", ".join(prizes[:6]) if prizes else "various collectible items"
        
        subject = f"""
Game Name: "{game_name}"
Prizes to show INSIDE the claw machine: {prize_list}

Claw machine colors: Use {color_palette['primary']} as the main machine color, with {color_palette['secondary']} accents.

Create a cute 2D kawaii claw machine arcade game illustration.
- The claw machine cabinet should be filled with these prizes: {prize_list}
- Show the prizes piled up inside the glass display area
- The claw should be visible, hovering or grabbing one of the prizes
- Use pastel colors for the machine frame matching the color scheme above
- Background should be a soft pastel gradient that complements the machine colors

Match the style of the reference image - a cute pastel claw machine illustration.
"""
        parts.append(subject)
        
        return "\n\n".join(parts)
    
    def generate_prize_image(
        self,
        prize_name: str,
        game_name: str,
        description: str = "",
        aspect_ratio: str = "3:4",
        resolution: str = "1K",
        save: bool = True,
        use_grounding: bool = False
    ) -> Optional[Image.Image]:
        """
        Generate a 2D pastel illustration for a prize.
        
        Style: Flat 2D pastel art on pure black background (like the Switch reference).
        
        Args:
            prize_name: Name of the prize (e.g., "Labubu Mini Blind Box")
            game_name: Name of the game/category (e.g., "Labubu")
            description: Additional description for the prize
            aspect_ratio: Output aspect ratio (default 3:4 for prize cards)
            resolution: Output resolution (1K, 2K, 4K - 4K only for PRO model)
            save: Whether to save the image to disk
            use_grounding: Use Google Search to look up the actual product appearance
            
        Returns:
            Generated PIL Image or None if failed
        """
        # Build the prompt for prize style
        prompt = self._build_prize_prompt(prize_name, description, use_grounding=use_grounding)
        
        # Build content list - prompt first, then reference images
        contents = [prompt]
        
        # Add prize style reference if available
        if self.prize_style_ref:
            contents.append(self.prize_style_ref)
            print(f"  Using prize style reference")
        
        # Add any custom references
        if self.custom_style_refs:
            contents.extend(self.custom_style_refs)
            print(f"  Using {len(self.custom_style_refs)} additional reference(s)")
        
        # Determine which model to use
        model_to_use = MODEL_PRO if use_grounding else self.model
        
        # Configure generation
        if use_grounding:
            print(f"  Using Gemini Pro with Google Search grounding...")
            config = types.GenerateContentConfig(
                response_modalities=['TEXT', 'IMAGE'],
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                ),
                tools=[{"google_search": {}}]
            )
        else:
            config = types.GenerateContentConfig(
                response_modalities=['IMAGE'],
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                )
            )
            # Add resolution for PRO model
            if self.model == MODEL_PRO:
                config.image_config.image_size = resolution
        
        try:
            print(f"  Generating prize image: {prize_name}...")
            response = self.client.models.generate_content(
                model=model_to_use,
                contents=contents,
                config=config
            )
            
            # Extract the image from response
            for part in response.parts:
                if part.text is not None and use_grounding:
                    print(f"  Model response: {part.text[:200]}..." if len(part.text) > 200 else f"  Model response: {part.text}")
                if part.inline_data is not None:
                    image = part.as_image()
                    
                    if save:
                        # Create game subdirectory
                        game_dir = OUTPUT_DIR / self._sanitize_filename(game_name)
                        game_dir.mkdir(parents=True, exist_ok=True)
                        
                        # Save image
                        filename = f"{self._sanitize_filename(prize_name)}.png"
                        filepath = game_dir / filename
                        image.save(filepath)
                        print(f"  ✓ Saved: {filepath}")
                    
                    return image
            
            print(f"  ✗ No image generated for: {prize_name}")
            return None
            
        except Exception as e:
            print(f"  ✗ Error generating {prize_name}: {e}")
            return None
    
    def generate_game_banner(
        self,
        game_name: str,
        prizes: List[str] = None,
        aspect_ratio: str = "3:4",
        resolution: str = "2K"
    ) -> Optional[Image.Image]:
        """
        Generate a banner image for a game (claw machine style).
        
        Style: 2D kawaii claw machine filled with prizes.
        The claw machine color is dynamically chosen based on the game category.
        
        Args:
            game_name: Name of the game (e.g., "Labubu")
            prizes: List of prize names to feature (optional)
            aspect_ratio: Output aspect ratio
            resolution: Output resolution
            
        Returns:
            Generated PIL Image or None if failed
        """
        # Get color palette for this game
        color_palette = self._get_game_color_palette(game_name)
        print(f"  Using color palette: {color_palette['primary']} (primary)")
        
        # Build banner prompt with dynamic colors
        prizes = prizes or []
        prompt = self._build_game_banner_prompt(game_name, prizes, color_palette)
        
        # Build content list
        contents = [prompt]
        
        # Add game banner style reference if available
        if self.game_banner_style_ref:
            contents.append(self.game_banner_style_ref)
            print(f"  Using game banner style reference")
        
        # Add any custom references
        if self.custom_style_refs:
            contents.extend(self.custom_style_refs)
        
        config = types.GenerateContentConfig(
            response_modalities=['IMAGE'],
            image_config=types.ImageConfig(
                aspect_ratio=aspect_ratio,
            )
        )
        
        if self.model == MODEL_PRO:
            config.image_config.image_size = resolution
        
        try:
            print(f"  Generating banner for: {game_name}...")
            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=config
            )
            
            for part in response.parts:
                if part.inline_data is not None:
                    image = part.as_image()
                    
                    # Save banner
                    filename = f"{self._sanitize_filename(game_name)}-banner.png"
                    filepath = GAME_BANNERS_DIR / filename
                    image.save(filepath)
                    print(f"  ✓ Saved banner: {filepath}")
                    
                    return image
            
            print(f"  ✗ No banner generated for: {game_name}")
            return None
            
        except Exception as e:
            print(f"  ✗ Error generating banner for {game_name}: {e}")
            return None
    
    def generate_from_csv(
        self,
        csv_path: str,
        game_filter: Optional[str] = None,
        skip_existing: bool = True,
        generate_banners: bool = False
    ) -> dict:
        """
        Generate images for all prizes in a CSV file.
        
        Args:
            csv_path: Path to the prizes CSV file
            game_filter: Only generate for this game (optional)
            skip_existing: Skip if image already exists
            generate_banners: Also generate game banners
            
        Returns:
            Dict with generation stats
        """
        stats = {"generated": 0, "skipped": 0, "failed": 0, "banners": 0}
        games_prizes = {}  # Track prizes per game for banner generation
        
        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                # Parse game name (handle "GAME 1: Labubu" format)
                game_raw = row.get('Game', '')
                if ': ' in game_raw:
                    game_name = game_raw.split(': ', 1)[-1]
                else:
                    game_name = game_raw.replace('GAME ', '')
                
                prize_name = row.get('Prize Name', '')
                
                if not game_name or not prize_name:
                    continue
                
                # Apply game filter if specified
                if game_filter and game_filter.lower() not in game_name.lower():
                    continue
                
                # Track prizes for banner generation
                if game_name not in games_prizes:
                    games_prizes[game_name] = []
                games_prizes[game_name].append(prize_name)
                
                # Check if image exists
                game_dir = OUTPUT_DIR / self._sanitize_filename(game_name)
                filepath = game_dir / f"{self._sanitize_filename(prize_name)}.png"
                
                if skip_existing and filepath.exists():
                    print(f"  → Skipping (exists): {prize_name}")
                    stats["skipped"] += 1
                    continue
                
                # Generate image
                result = self.generate_prize_image(
                    prize_name=prize_name,
                    game_name=game_name,
                    description=row.get('Notes', '')
                )
                
                if result:
                    stats["generated"] += 1
                else:
                    stats["failed"] += 1
        
        # Generate banners if requested
        if generate_banners:
            print("\n--- Generating Game Banners ---")
            for game_name, prizes in games_prizes.items():
                result = self.generate_game_banner(
                    game_name=game_name,
                    prizes=prizes
                )
                if result:
                    stats["banners"] += 1
        
        print(f"\n✓ Generation complete: {stats['generated']} prizes generated, "
              f"{stats['skipped']} skipped, {stats['failed']} failed")
        if generate_banners:
            print(f"  {stats['banners']} banners generated")
        
        return stats
    
    def generate_banners_from_csv(
        self,
        csv_path: str,
        game_filter: Optional[str] = None
    ) -> dict:
        """
        Generate only game banners from a CSV file.
        
        Reads the CSV to get prize names for each game, then generates
        banners with dynamically colored backgrounds.
        
        Args:
            csv_path: Path to the prizes CSV file
            game_filter: Only generate for this game (optional)
            
        Returns:
            Dict with generation stats
        """
        stats = {"banners": 0, "failed": 0}
        games_prizes = {}
        
        # First pass: collect prizes per game
        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                # Parse game name
                game_raw = row.get('Game', '')
                if ': ' in game_raw:
                    game_name = game_raw.split(': ', 1)[-1]
                else:
                    game_name = game_raw.replace('GAME ', '')
                
                prize_name = row.get('Prize Name', '')
                
                if not game_name or not prize_name:
                    continue
                
                if game_filter and game_filter.lower() not in game_name.lower():
                    continue
                
                if game_name not in games_prizes:
                    games_prizes[game_name] = []
                games_prizes[game_name].append(prize_name)
        
        # Generate banner for each game
        print(f"Generating banners for {len(games_prizes)} games...")
        for game_name, prizes in games_prizes.items():
            result = self.generate_game_banner(
                game_name=game_name,
                prizes=prizes
            )
            if result:
                stats["banners"] += 1
            else:
                stats["failed"] += 1
        
        print(f"\n✓ Banner generation complete: {stats['banners']} generated, "
              f"{stats['failed']} failed")
        
        return stats
    
    def start_refinement_session(self, game_name: str) -> None:
        """
        Start a multi-turn chat session for iterative image refinement.
        
        Args:
            game_name: Name of the game for context
        """
        self.chat = self.client.chats.create(
            model=self.model,
            config=types.GenerateContentConfig(
                response_modalities=['TEXT', 'IMAGE']
            )
        )
        
        # Set up the style context
        setup_message = f"""
        I'm creating prize images for a kawaii-themed claw machine game called "{game_name}".
        
        {DEFAULT_STYLE_PROMPT}
        
        I'll be asking you to generate and refine images. Please maintain consistent style 
        throughout our conversation.
        """
        
        self.chat.send_message(setup_message)
        print(f"✓ Started refinement session for: {game_name}")
    
    def refine_image(self, instruction: str, save_as: Optional[str] = None) -> Optional[Image.Image]:
        """
        Send a refinement instruction in the current chat session.
        
        Args:
            instruction: What to change or generate
            save_as: Filename to save as (optional)
            
        Returns:
            Generated/refined PIL Image or None
        """
        if not self.chat:
            print("✗ No active refinement session. Call start_refinement_session() first.")
            return None
        
        try:
            response = self.chat.send_message(instruction)
            
            for part in response.parts:
                if part.text is not None:
                    print(f"  Model: {part.text}")
                elif part.inline_data is not None:
                    image = part.as_image()
                    
                    if save_as:
                        filepath = OUTPUT_DIR / save_as
                        filepath.parent.mkdir(parents=True, exist_ok=True)
                        image.save(filepath)
                        print(f"  ✓ Saved: {filepath}")
                    
                    return image
            
            return None
            
        except Exception as e:
            print(f"  ✗ Refinement error: {e}")
            return None
    
    @staticmethod
    def _sanitize_filename(name: str) -> str:
        """Convert a name to a safe filename."""
        # Remove/replace problematic characters
        safe = name.lower()
        safe = safe.replace(' ', '-')
        safe = safe.replace('/', '-')
        safe = safe.replace('\\', '-')
        safe = safe.replace(':', '-')
        safe = safe.replace('(', '')
        safe = safe.replace(')', '')
        safe = safe.replace('%', 'pct')
        safe = safe.replace('&', 'and')
        # Remove any remaining non-alphanumeric chars except dash and underscore
        safe = ''.join(c for c in safe if c.isalnum() or c in '-_')
        # Remove multiple consecutive dashes
        while '--' in safe:
            safe = safe.replace('--', '-')
        return safe.strip('-')


def main():
    parser = argparse.ArgumentParser(
        description="Generate themed prize images for Grabbit games using Gemini",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # First, set up your style references:
  mkdir -p scripts/style-references
  cp your_prize_style.png scripts/style-references/prize-style-ref.png
  cp your_banner_style.png scripts/style-references/game-banner-style-ref.png

  # Generate single prize image (2D pastel style on black background)
  python generate-prize-images.py --prize "Labubu Mini Blind Box" --game "Labubu"

  # Generate all prizes from CSV
  python generate-prize-images.py --csv game-prizes-tracker.csv

  # Generate only prizes for one game
  python generate-prize-images.py --csv game-prizes-tracker.csv --game-filter "Labubu"

  # Generate game banner (product showcase style with dynamic colors)
  python generate-prize-images.py --game-banner "Labubu" --prizes "Labubu Mini,Labubu Mega"

  # Use custom style references
  python generate-prize-images.py --prize "AirPods" --game "Tech" --prize-ref my_style.png

  # Use PRO model for higher quality
  python generate-prize-images.py --prize "AirPods Max" --game "Tech" --model gemini-3-pro-image-preview
"""
    )
    
    # Generation modes
    parser.add_argument('--prize', help='Generate image for a single prize')
    parser.add_argument('--game', help='Game name for the prize')
    parser.add_argument('--game-banner', help='Generate a banner for a game')
    parser.add_argument('--prizes', help='Comma-separated list of prizes to feature in banner')
    parser.add_argument('--csv', help='Generate from CSV file')
    parser.add_argument('--game-filter', help='Only generate for this game (with --csv)')
    parser.add_argument('--banners-only', action='store_true', help='Only generate banners from CSV')
    
    # Style reference options
    parser.add_argument('--prize-ref', help='Custom style reference for prize images')
    parser.add_argument('--banner-ref', help='Custom style reference for game banners')
    parser.add_argument('--extra-ref', action='append', help='Additional reference image(s)')
    
    # Output options
    parser.add_argument('--aspect-ratio', help='Output aspect ratio (default: 3:4 for prizes, 16:9 for banners)')
    parser.add_argument('--resolution', default='1K', help='Output resolution: 1K, 2K, 4K (default: 1K)')
    parser.add_argument('--model', default=MODEL_FAST, choices=[MODEL_FAST, MODEL_PRO],
                       help=f'Gemini model (default: {MODEL_FAST})')
    parser.add_argument('--no-skip', action='store_true', help='Regenerate existing images')
    parser.add_argument('--grounding', action='store_true', 
                       help='Use Google Search to look up actual product appearance (uses Gemini Pro)')
    
    args = parser.parse_args()
    
    # Initialize generator
    try:
        generator = GrabbitImageGenerator(model=args.model)
    except ValueError as e:
        print(f"Error: {e}")
        return 1
    
    # Load custom style references if provided
    if args.prize_ref and os.path.exists(args.prize_ref):
        generator.set_prize_style_reference(args.prize_ref)
    
    if args.banner_ref and os.path.exists(args.banner_ref):
        generator.set_game_banner_style_reference(args.banner_ref)
    
    if args.extra_ref:
        for ref_path in args.extra_ref:
            if os.path.exists(ref_path):
                generator.add_custom_style_reference(ref_path)
            else:
                print(f"Warning: Extra reference not found: {ref_path}")
    
    # Execute requested mode
    if args.csv:
        if args.banners_only:
            # Generate banners for each unique game in CSV
            generator.generate_banners_from_csv(
                csv_path=args.csv,
                game_filter=args.game_filter
            )
        else:
            # Batch generation from CSV
            generator.generate_from_csv(
                csv_path=args.csv,
                game_filter=args.game_filter,
                skip_existing=not args.no_skip
            )
    
    elif args.prize and args.game:
        # Single prize generation
        aspect = args.aspect_ratio or "3:4"
        generator.generate_prize_image(
            prize_name=args.prize,
            game_name=args.game,
            aspect_ratio=aspect,
            resolution=args.resolution,
            use_grounding=args.grounding
        )
    
    elif args.game_banner:
        # Game banner generation
        aspect = args.aspect_ratio or "3:4"
        prizes = args.prizes.split(',') if args.prizes else []
        generator.generate_game_banner(
            game_name=args.game_banner,
            prizes=prizes,
            aspect_ratio=aspect,
            resolution=args.resolution
        )
    
    else:
        parser.print_help()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
