# Gashapon Design System

A pastel kawaii design system for the Gashapon claw machine web application.

---

## 🎨 Design Philosophy

**Theme**: Pastel Kawaii / Cute Arcade
**Inspiration**: Japanese claw machines, arcade aesthetics, soft pastel colors, playful interactions

---

## 🏗️ Atomic Design Structure

### Atoms (Foundational Elements)

#### Colors (`tailwind.config.js`)

```
pastel-sky:        #B8E4F0  - Light sky blue (backgrounds)
pastel-skyLight:   #D4EEF7  - Lighter sky
pastel-coral:      #F7ABAD  - Coral/salmon pink (primary buttons)
pastel-coralLight: #F9B4AE  - Lighter coral (hover states)
pastel-pink:       #F5C6D6  - Soft pink (accents)
pastel-pinkLight:  #FCE4EC  - Very light pink (subtle backgrounds)
pastel-mint:       #A1E5CC  - Mint green (secondary actions)
pastel-mintLight:  #D4F0E7  - Light mint
pastel-cream:      #FFF8E7  - Cream/off-white
pastel-yellow:     #FFE5A0  - Soft yellow (currency, highlights)
pastel-peach:      #FFD4B8  - Peach
pastel-lavender:   #E0D4F7  - Soft lavender (rare items)
pastel-purple:     #D4B8E8  - Light purple
pastel-text:       #5A5A6E  - Dark gray (primary text)
pastel-textLight:  #8B8B9E  - Light gray (secondary text)
```

#### Typography

| Font | Usage | CSS Variable |
|------|-------|--------------|
| **Bungee** | Display titles, headings, game titles | `font-display` / `var(--font-display)` |
| **Poppins** | Body text, UI elements, buttons | `font-sans` / `var(--font-sans)` |

**Font Sizes**:
- `text-xs`: Small labels, badges
- `text-sm`: Secondary text, descriptions
- `text-base`: Body text
- `text-lg` - `text-2xl`: Button text, emphasis
- `text-3xl` - `text-6xl`: Headings, titles

**Title Text Effects**:
- `.text-outline-xl` - Thick black outline with 3D drop shadow (for hero/game titles)
- `.text-outline-lg` - Large outline
- `.text-outline-sm` - Subtle outline
- `.text-shadow-soft` - White text shadow for readability

#### Shadows

```css
shadow-soft:        0 4px 12px rgba(0,0,0,0.08)     /* Subtle elevation */
shadow-card:        0 8px 24px rgba(0,0,0,0.06)     /* Card elevation */
shadow-button:      0 4px 0 rgba(0,0,0,0.1)         /* Button depth */
shadow-buttonHover: 0 2px 0 rgba(0,0,0,0.1)         /* Button pressed */
shadow-pill:        0 3px 0 rgba(0,0,0,0.08)        /* Badge depth */
```

#### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-full` | 9999px | Buttons, pills, badges |
| `rounded-3xl` | 1.5rem | Cards |
| `rounded-2xl` | 1rem | Inner containers |
| `rounded-xl` | 0.75rem | Inputs, smaller elements |

---

### Molecules (Component Patterns)

#### Button (`components/ui/Button.tsx`)

Standard button for general UI actions.

**Variants**:
| Variant | Background | Text | Usage |
|---------|------------|------|-------|
| `primary` | `pastel-coral` | white | Primary actions |
| `secondary` | `pastel-mint` | `pastel-text` | Secondary actions |
| `outline` | white | `pastel-coral` | Tertiary actions |
| `ghost` | transparent | `pastel-text` | Minimal emphasis |
| `danger` | red-400 | white | Destructive actions |

**Sizes**: `sm`, `md`, `lg`

**Usage**:
```tsx
import Button from '@/components/ui/Button';

<Button variant="primary" size="md">Click Me</Button>
<Button variant="secondary" size="lg" isLoading>Loading...</Button>
```

#### CTAButton (`components/ui/CTAButton.tsx`)

Call-to-action button with gradient and 3D border effect. **Use for primary game actions**.

**Variants**:
| Variant | Gradient | Usage |
|---------|----------|-------|
| `orange` | #FFB366 → #FF8A2B | Primary CTA (Play, Enter Room) |
| `pink` | #FFB3B8 → #F07A84 | Secondary CTA (Game cards) |

**Border Style**: Thick asymmetric border (thicker on right/bottom) for 3D depth effect.

**Sizes**: `sm`, `md`, `lg`

**Usage**:
```tsx
import CTAButton from '@/components/ui/CTAButton';

<CTAButton variant="orange" size="md">🎯 PLAY NOW</CTAButton>
<CTAButton variant="pink" size="sm" href="/games/1">ENTER ROOM</CTAButton>
```

#### Badge (`components/ui/Badge.tsx`)

For displaying rarity, status, or labels.

**Variants**: `default`, `common`, `uncommon`, `rare`, `legendary`, `success`, `warning`, `error`

**Usage**:
```tsx
import Badge from '@/components/ui/Badge';

<Badge variant="legendary">LEGENDARY</Badge>
<Badge variant="success" size="sm">Active</Badge>
```

#### Card (`components/ui/Card.tsx`)

Container component for content sections with two style variants.

**Props**:
- `variant`: `"default"` | `"arcade"` - Card style
- `hover`: Enable hover lift effect
- `padding`: `"sm"` | `"md"` | `"lg"` | `"xl"` | `"none"`
- `shadowColor`: `"mint"` | `"pink"` | `"coral"` | `"purple"` | `"lavender"` | `"yellow"` (arcade variant only)

**Variants**:
| Variant | Style | Usage |
|---------|-------|-------|
| `default` | Simple white card with soft shadow | General content containers |
| `arcade` | 3D border effect with colored drop shadow | Game cards, splash screens, modals |

**Shadow Colors** (arcade variant):
- `mint` (#8ECCC1) - Default, used for game listing cards
- `pink` (#F5C6D6) - Intro/loading screens
- `coral` (#F7ABAD) - Win screens
- `purple` (#D4B8E8) - Lose screens
- `lavender` (#E0D4F7) - Info cards
- `yellow` (#FFE5A0) - Highlight cards

**Usage**:
```tsx
import Card from '@/components/ui/Card';

// Default card
<Card hover padding="lg">
  <h3>Card Title</h3>
  <p>Card content...</p>
</Card>

// Arcade style card (game card)
<Card variant="arcade" shadowColor="mint" hover padding="none">
  <div>Game card content...</div>
</Card>

// Arcade style card (splash screen)
<Card variant="arcade" shadowColor="pink" padding="xl" className="text-center">
  <h2>GASHAPON</h2>
  <button>PLAY NOW</button>
</Card>
```

#### Currency Badge (Inline Pattern)

For displaying token amounts (matches wallet balance styling).

```tsx
<div className="inline-flex items-center gap-2 bg-pastel-yellow rounded-full px-4 py-2 border-2 border-yellow-400/50">
  <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-yellow-500">
    <span className="text-yellow-700 text-xs font-bold">$</span>
  </div>
  <span className="text-sm font-bold text-pastel-text">
    {amount}
  </span>
</div>
```

---

### Organisms (Complex Components)

#### Game Card (`components/home/GameCard.tsx`)

Uses the `Card` component with arcade variant:
- `Card variant="arcade" shadowColor="mint"` for 3D effect
- Left image panel (mint background)
- Right content column with prize preview and CTA

```tsx
<Card variant="arcade" shadowColor="mint" hover padding="none">
  <div className="flex">
    {/* Left image panel */}
    {/* Right content */}
  </div>
</Card>
```

#### Screen Overlays (Game Flow)

**IntroScreen**: Pastel sky gradient, floating clouds, sparkles, centered card with logo + CTA button

**LoadingScreen**: Same background, animated progress bar, cute messaging

**WinScreen / LoseScreen**: Kawaii themed with confetti/sad animations, pastel colors

---

## 📐 Layout Patterns

### Backgrounds

```css
/* Pastel sky gradient */
.bg-gradient-to-b.from-sky-200.via-sky-100.to-pink-100

/* Cloud tile background */
.bg-cloud-tile /* Uses /images/cloud.png */

/* Sky with cloud radials */
.bg-sky-clouds
```

### Floating Elements

```css
/* Clouds */
animation: float-cloud 8s ease-in-out infinite;

/* Sparkles */
animation: sparkle 1.5s ease-in-out infinite;

/* Gentle bounce (logos, icons) */
animation: bounce-gentle 2s ease-in-out infinite;
```

---

## 🎮 Game-Specific Components

### Claw Machine 3D (`components/game/ClawMachine3D.tsx`)

Three.js/React Three Fiber component with:
- ACES Filmic tone mapping
- City environment preset
- Balanced lighting (ambient: 0.5, directional: 1.0)
- Pastel sky background in Canvas

### Prize Spheres

- Rainbow glow effect on WIN (pulsing HSL emissive)
- Golden glow on grab
- Rapier physics for realistic ball behavior

---

## ✅ Do's and Don'ts

### ✅ DO

- Use `font-display` (Bungee) for all game titles and headings
- Use `CTAButton` for primary game actions (Play, Enter Room)
- Use `Button` for secondary UI actions
- Apply `text-outline-xl` to game titles for the kawaii bubble effect
- Use the currency badge pattern for all token displays
- Keep backgrounds soft (pastel gradients, not harsh colors)
- Add playful elements sparingly (sparkles ✨, stars ⭐) in decorative areas only

### ❌ DON'T

- Don't use harsh/saturated colors
- Don't use generic sans-serif for titles
- Don't mix CTAButton and Button styles inconsistently
- Don't create custom button styles - use existing components
- Don't add "COINS" text after currency amounts (already implied by icon)
- Don't use dark mode colors in the main game UI
- Don't use emojis in buttons - they cheapen the professional look

---

## 📁 File Structure

```
components/
├── ui/                    # Atoms & Molecules
│   ├── Button.tsx         # Standard button
│   ├── CTAButton.tsx      # Call-to-action button (gradient)
│   ├── Badge.tsx          # Status/rarity badges
│   ├── Card.tsx           # Container card
│   ├── Modal.tsx          # Modal dialog
│   └── Loading.tsx        # Loading spinner
├── game/                  # Game organisms
│   ├── ClawMachine3D.tsx  # Main 3D game + screens
│   ├── GameCard.tsx       # Game listing card
│   └── claw-machine/      # 3D internals
├── home/                  # Homepage components
│   ├── GameCard.tsx       # Home game card
│   └── HeroSection.tsx    # Hero section
├── wallet/                # Wallet components
│   ├── WalletBalance.tsx  # Token balance display
│   └── WalletButton.tsx   # Connect button
└── layout/                # Layout components
    ├── Header.tsx         # App header
    └── Navigation.tsx     # Navigation
```

---

## 🔧 Tailwind Config Reference

Key extensions in `tailwind.config.js`:
- `colors.pastel.*` - Full pastel palette
- `fontFamily.display` - Bungee font
- `boxShadow.*` - Card and button shadows
- `animation.*` - Button bounce, cloud drift, shimmer

Key utilities in `globals.css`:
- `.text-outline-*` - Title text effects
- `.bg-sky-clouds` - Sky background with clouds
- `.btn-*` - Button CSS classes
- `.card-*` - Card CSS classes
- `.pill-*` - Badge/pill CSS classes
