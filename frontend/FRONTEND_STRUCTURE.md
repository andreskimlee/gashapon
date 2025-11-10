# Frontend Project Structure

This document outlines the frontend architecture for the Solana Gachapon Platform.

## Directory Structure

```
frontend/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Home page (with CTA to play)
│   ├── layout.tsx                # Root layout with navigation
│   ├── games/                    # Game-related pages
│   │   ├── page.tsx              # Games listing page
│   │   └── [gameId]/
│   │       └── page.tsx          # Individual game play page
│   ├── collection/               # User collection pages
│   │   ├── page.tsx              # Collection overview
│   │   └── [nftMint]/
│   │       └── page.tsx          # NFT detail & redemption page
│   └── marketplace/              # Marketplace pages
│       ├── page.tsx              # Marketplace listings (buy/sell)
│       ├── list/
│       │   └── page.tsx          # List NFT for sale page
│       └── [listingId]/
│           └── page.tsx          # Listing detail page
│
├── components/                   # React components
│   ├── layout/                   # Layout components
│   │   ├── Header.tsx            # Site header with wallet connection
│   │   ├── Navigation.tsx        # Main navigation tabs
│   │   └── Footer.tsx            # Site footer
│   ├── wallet/                   # Wallet-related components
│   │   ├── WalletButton.tsx      # Connect wallet button
│   │   ├── WalletProvider.tsx    # Wallet context provider
│   │   └── WalletBalance.tsx     # Display token balance
│   ├── game/                     # Game components
│   │   ├── GameCard.tsx          # Game card in listing
│   │   ├── GameDetail.tsx        # Game detail view
│   │   ├── PlayButton.tsx        # Play game button
│   │   ├── PrizeReveal.tsx       # Prize reveal animation
│   │   └── PrizeSelector.tsx     # Choose NFT or direct redeem
│   ├── nft/                      # NFT components
│   │   ├── NFTCard.tsx           # NFT card display
│   │   ├── NFTGrid.tsx           # Grid of NFTs
│   │   ├── NFTDetail.tsx         # NFT detail modal/page
│   │   └── RedemptionForm.tsx    # Shipping form for redemption
│   ├── marketplace/              # Marketplace components
│   │   ├── ListingCard.tsx       # Marketplace listing card
│   │   ├── ListingGrid.tsx      # Grid of listings
│   │   ├── ListingForm.tsx       # Create listing form
│   │   ├── BuyButton.tsx         # Purchase button
│   │   └── Filters.tsx           # Marketplace filters (tier, price, etc.)
│   └── ui/                       # Reusable UI components
│       ├── Button.tsx            # Button component
│       ├── Modal.tsx             # Modal component
│       ├── Loading.tsx           # Loading spinner
│       ├── Toast.tsx             # Toast notifications
│       └── Badge.tsx             # Badge/tag component
│
├── hooks/                        # Custom React hooks
│   ├── wallet/
│   │   ├── useWallet.ts          # Wallet connection hook
│   │   ├── useWalletBalance.ts   # Token balance hook
│   │   └── useWalletSignature.ts # Signature verification hook
│   ├── api/
│   │   ├── useGames.ts           # Fetch games data
│   │   ├── useCollection.ts      # Fetch user collection
│   │   ├── useMarketplace.ts     # Fetch marketplace listings
│   │   └── useRedemption.ts      # Redemption operations
│   └── game/
│       ├── usePlayGame.ts        # Play game hook
│       ├── usePrizeReveal.ts     # Prize reveal logic
│       └── useGameStats.ts      # Game statistics
│
├── services/                     # Service layer
│   ├── api/
│   │   ├── client.ts             # API client (axios/fetch wrapper)
│   │   ├── games.ts              # Games API endpoints
│   │   ├── nfts.ts               # NFTs API endpoints
│   │   ├── marketplace.ts        # Marketplace API endpoints
│   │   └── redemption.ts         # Redemption API endpoints
│   └── blockchain/
│       ├── solana.ts             # Solana connection & utilities
│       ├── wallet.ts             # Wallet operations
│       ├── transactions.ts       # Transaction building
│       ├── nft.ts                # NFT operations (mint, burn, transfer)
│       └── marketplace.ts        # Marketplace program interactions
│
├── types/                        # TypeScript type definitions
│   ├── api/
│   │   ├── games.ts              # Game API types
│   │   ├── nfts.ts               # NFT API types
│   │   ├── marketplace.ts        # Marketplace API types
│   │   └── redemption.ts         # Redemption API types
│   ├── blockchain/
│   │   ├── solana.ts             # Solana types
│   │   └── wallet.ts             # Wallet types
│   └── game/
│       ├── prize.ts              # Prize types
│       └── game.ts               # Game types
│
├── utils/                        # Utility functions
│   ├── constants.ts              # App constants
│   ├── helpers.ts                # Helper functions
│   ├── encryption.ts             # Client-side encryption (for shipping data)
│   └── formatting.ts             # Number/date formatting
│
├── contexts/                     # React contexts
│   ├── WalletContext.tsx         # Wallet state context
│   ├── GameContext.tsx           # Game state context
│   └── ToastContext.tsx          # Toast notifications context
│
└── lib/                          # Third-party library configs
    └── solana.ts                 # Solana/Anchor client setup
```

## Key Features Implementation

### 1. Home Page (`app/page.tsx`)

- Hero section with CTA to play
- Featured games carousel
- How it works section
- Recent wins showcase (anonymous)
- Connect wallet prompt

### 2. Games Tab (`app/games/page.tsx`)

- Grid/list view of all active games
- Filter by status, price range
- Each game shows:
  - Name, description, image
  - Cost in tokens (dynamic pricing)
  - Prize tiers and odds
  - Supply remaining
  - Total plays

### 3. Collection Tab (`app/collection/page.tsx`)

- User's NFT collection (requires wallet connection)
- Filter by:
  - Redeemed/Unredeemed
  - Prize tier
  - Game origin
- Actions per NFT:
  - View details
  - Redeem for physical item
  - List on marketplace

### 4. Marketplace Tab (`app/marketplace/page.tsx`)

- Browse all active listings
- Filters:
  - Prize tier (common, uncommon, rare, legendary)
  - Price range
  - Game origin
  - Sort by price, date, rarity
- List your NFT:
  - Select NFT from collection
  - Set price in tokens
  - Preview listing with fees
  - Sign transaction to list
- Buy NFT:
  - View listing details
  - Confirm purchase
  - Sign transaction

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Wallet**: @solana/wallet-adapter-react, @solana/wallet-adapter-react-ui
- **Blockchain**: @solana/web3.js, @coral-xyz/anchor
- **NFTs**: @metaplex-foundation/js
- **State Management**: React Context API
- **API Client**: Axios or native fetch
- **Forms**: React Hook Form (if needed)
- **Animations**: Framer Motion (for prize reveals)

## Key User Flows

### Play Game Flow

1. User browses games → Selects game
2. Views game details → Clicks "Play"
3. Wallet connection check → Approve token spending
4. Sign transaction → Wait for VRF (~3-5s)
5. Prize reveal animation → Choose NFT or direct redeem

### Collection Management Flow

1. User connects wallet → View collection
2. Select NFT → View details
3. Choose action:
   - Redeem → Enter shipping → Sign burn transaction
   - List → Set price → Sign listing transaction

### Marketplace Flow

1. Browse listings → Filter/search
2. View listing → Check details
3. Buy → Confirm → Sign purchase transaction
4. NFT transferred → Appears in collection

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_GAME_PROGRAM_ID=<program_id>
NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID=<program_id>
NEXT_PUBLIC_TOKEN_MINT=<token_mint_address>
```

## Next Steps

1. Install required dependencies
2. Set up wallet adapter
3. Create API service layer
4. Build core components
5. Implement pages
6. Add animations and polish
