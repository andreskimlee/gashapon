Product Requirements Document: Solana Gachapon Platform
Version: 1.0
Last Updated: November 2, 2025
Status: Draft

1. Executive Summary
   1.1 Product Overview
   A blockchain-based gachapon (capsule toy) platform built on Solana that allows users to play prize games using SPL tokens, win prizes as NFTs, and redeem those NFTs for physical items. The platform includes an integrated marketplace for secondary trading of unredeemed prize NFTs.
   1.2 Core Value Propositions

For Users: Transparent odds, provably fair gameplay, tradeable digital collectibles, physical redemption
For Platform: Automated prize distribution, minimal PII liability, secondary market revenue, token utility

1.3 Target Users

Web3 collectors and traders
Physical collectible enthusiasts
Crypto-native users comfortable with Solana wallets
Secondary market participants seeking rare items

2. Product Goals & Success Metrics
   2.1 Business Goals

Create sustainable token utility and economy
Drive secondary market trading volume
Minimize operational overhead for prize fulfillment
Achieve GDPR/privacy compliance by design
Scale to multiple concurrent game offerings

2.2 Success Metrics

Engagement: Daily Active Users, Games Played per User
Economic: Total Value Locked (TVL), Token Burn Rate, Marketplace Volume
Retention: 7-day/30-day retention, Repeat players %
Operations: Redemption fulfillment time, Failed shipment rate
Platform Health: Gas fees paid, Transaction success rate

3. Technical Architecture
   3.1 Blockchain Layer (Solana)
   3.1.1 Smart Contracts (Anchor Programs)
   Game Program

Purpose: Manages game logic, prize distribution, and play mechanics
Key Functions:

initialize_game() - Create new game with prize pool
play_game() - Execute gameplay, consume tokens, determine prize
update_game() - Modify game parameters (admin only)
close_game() - Deactivate game, withdraw remaining funds

Prize NFT Program (Metaplex Standard)

Purpose: Mint and manage prize NFTs
Key Functions:

mint_prize_nft() - Create NFT for won prize
burn_on_redemption() - Burn NFT when physically redeemed
Custom metadata fields:

redeemable: boolean
physical_item_sku: string
prize_tier: string
game_id: u64

Marketplace Program

Purpose: Facilitate peer-to-peer NFT trading
Key Functions:

list_nft() - Create marketplace listing
delist_nft() - Cancel listing
purchase_nft() - Execute purchase with escrow
collect_fees() - Platform fee collection (2-5%)

3.1.2 Program Accounts
rust// Game Account
pub struct Game {
pub authority: Pubkey, // Admin wallet
pub game_id: u64, // Unique identifier
pub token_mint: Pubkey, // SPL token address
pub cost_per_play: u64, // Token amount per game
pub treasury_wallet: Pubkey, // Receives payments
pub prize_pool: Vec<Prize>, // Prize configuration
pub total_plays: u64, // Play counter
pub is_active: bool, // Game status
pub created_at: i64,
pub bump: u8,
}

// Prize Configuration
pub struct Prize {
pub prize_id: u64,
pub name: String,
pub metadata_uri: String, // IPFS/Arweax URI
pub physical_sku: String, // Inventory reference
pub probability_bp: u16, // Basis points (10000 = 100%)
pub supply_total: u32,
pub supply_remaining: u32,
pub tier: PrizeTier,
}

pub enum PrizeTier {
Common, // 70-80% probability
Uncommon, // 15-20%
Rare, // 5-10%
Legendary, // 1-5%
}

// NFT Metadata (Metaplex Extension)
pub struct PrizeNFTMetadata {
pub redeemable: bool,
pub physical_item_sku: String,
pub prize_tier: String,
pub game_id: u64,
pub redemption_status: RedemptionStatus,
}

pub enum RedemptionStatus {
Available,
Redeemed, // NFT burned
}
3.1.3 Verifiable Randomness
Solution: Switchboard VRF (Verifiable Random Function)
rust// Game play with VRF
pub fn play_game(ctx: Context<PlayGame>) -> Result<()> {
// 1. Verify token payment
transfer_tokens(&ctx, game.cost_per_play)?;

    // 2. Request randomness from Switchboard
    let vrf_request = request_randomness(
        &ctx.accounts.vrf_account,
        &ctx.accounts.user
    )?;

    // 3. Callback will determine prize based on random value
    // Prize selection done in separate instruction after VRF fulfillment

    emit!(GamePlayedEvent {
        user: ctx.accounts.user.key(),
        game_id: ctx.accounts.game.game_id,
        vrf_request_id: vrf_request.id,
    });

    Ok(())

}

// Callback after VRF fulfillment
pub fn finalize_play(ctx: Context<FinalizePlay>, random_value: [u8; 32]) -> Result<()> {
// Determine prize based on random value and odds
let prize = select_prize_from_random(
&ctx.accounts.game.prize_pool,
random_value
)?;

    emit!(PrizeWonEvent {
        user: ctx.accounts.user.key(),
        prize_id: prize.prize_id,
        random_value,
    });

    Ok(())

}

```

### 3.2 Backend Services

#### 3.2.1 Service Architecture
```

┌─────────────────┐
│ API Gateway │ (Express/NestJS)
└────────┬────────┘
│
┌────┴────┐
│ │
┌───▼──┐ ┌──▼───┐
│Index-│ │Price │
│ er │ │Oracle│
└───┬──┘ └──────┘
│
┌───▼──────────┐
│ PostgreSQL │
└──────────────┘
│
┌────┴────┐
│ │
┌───▼──┐ ┌──▼────────┐
│Redis │ │Fulfillment│
│Cache │ │ Service │
└──────┘ └───────────┘
3.2.2 Indexer Service
Technology: Helius Webhooks or Geyser Plugin
Purpose: Monitor blockchain events and sync to database
Indexed Events:

GamePlayedEvent → Record play attempt
PrizeWonEvent → Record prize win
NFTMintedEvent → Track NFT creation
NFTBurnedEvent → Record redemption
MarketplaceSaleEvent → Track secondary sales

Implementation:
typescript// Helius webhook handler
async function handleBlockchainEvent(event: HeliusEvent) {
switch(event.type) {
case 'PRIZE_WON':
await db.plays.create({
user_wallet: event.user,
game_id: event.gameId,
prize_id: event.prizeId,
transaction_signature: event.signature,
played_at: event.timestamp,
});
break;

    case 'NFT_MINTED':
      await db.nfts.create({
        mint_address: event.mint,
        prize_id: event.prizeId,
        current_owner: event.owner,
        is_redeemed: false,
        minted_at: event.timestamp,
      });
      break;

    case 'NFT_BURNED':
      await db.nfts.update(
        { mint_address: event.mint },
        { is_redeemed: true, redeemed_at: event.timestamp }
      );
      break;

}
}
3.2.3 Price Oracle Service
Purpose: Dynamic token pricing based on SOL/USD
Integration: Jupiter API or Pyth Network
typescriptclass PriceOracleService {
private readonly GAME_COST_USD = 5.00; // $5 per play

async getTokenCostForGame(gameId: number): Promise<number> {
// 1. Fetch SOL/USD price from Pyth
const solPriceUSD = await this.getSolPrice();

    // 2. Fetch TOKEN/SOL price from Jupiter
    const tokenPriceInSol = await this.getTokenPrice();

    // 3. Calculate tokens needed
    const tokenPriceUSD = tokenPriceInSol * solPriceUSD;
    const tokensNeeded = this.GAME_COST_USD / tokenPriceUSD;

    // 4. Cache for 60 seconds
    await this.cache.set(
      `game:${gameId}:cost`,
      tokensNeeded,
      { ttl: 60 }
    );

    return tokensNeeded;

}

private async getSolPrice(): Promise<number> {
const response = await fetch(
'https://hermes.pyth.network/api/latest_price_feeds?ids[]=SOL/USD'
);
return response.data.price;
}

private async getTokenPrice(): Promise<number> {
// Jupiter quote API
const quote = await fetch(
`https://quote-api.jup.ag/v6/quote?inputMint=${TOKEN_MINT}&outputMint=So11111111111111111111111111111111111111112&amount=1000000`
);
return quote.data.outAmount / quote.data.inAmount;
}
}
3.2.4 Redemption & Fulfillment Service
Architecture: Zero PII Storage Model
typescriptclass RedemptionService {
/\*\*

- One-time redemption flow with immediate fulfillment
- No shipping data persisted
  \*/
  async redeemNFT(params: {
  nftMint: string;
  userWallet: string;
  signature: string;
  encryptedShippingData: string; // Encrypted client-side
  }): Promise<RedemptionResult> {


    // 1. Verify signature and NFT ownership
    const isValid = await this.verifyRedemption(
      params.nftMint,
      params.userWallet,
      params.signature
    );

    if (!isValid) {
      throw new Error('Invalid redemption signature');
    }

    // 2. Decrypt shipping data (in-memory only, never persisted)
    const shippingData = this.decryptShippingData(
      params.encryptedShippingData
    );

    // 3. Burn NFT on-chain
    await this.burnNFT(params.nftMint);

    // 4. Create shipment with fulfillment partner
    const shipment = await this.createShipment({
      name: shippingData.name,
      address: shippingData.address,
      city: shippingData.city,
      state: shippingData.state,
      zip: shippingData.zip,
      country: shippingData.country,
      sku: await this.getPrizeSKU(params.nftMint),
      order_id: `GACHA-${params.nftMint.slice(0, 8)}`,
    });

    // shippingData goes out of scope here (GC'd, never stored)

    // 5. Store only tracking reference
    await db.redemptions.create({
      nft_mint: params.nftMint,
      user_wallet: params.userWallet,
      shipment_provider: 'shipstation',
      shipment_id: shipment.id,
      tracking_number: shipment.trackingNumber,
      carrier: shipment.carrier,
      status: 'processing',
      redeemed_at: new Date(),
    });

    // 6. Notify user
    await this.sendRedemptionEmail(
      params.userWallet,
      shipment.trackingNumber
    );

    return {
      success: true,
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      estimatedDelivery: shipment.estimatedDelivery,
    };

}

/\*\*

- Integration with ShipStation API
  \*/
  private async createShipment(data: ShippingData): Promise<Shipment> {
  const response = await fetch('https://ssapi.shipstation.com/orders', {
  method: 'POST',
  headers: {
  'Authorization': `Basic ${SHIPSTATION_API_KEY}`,
  'Content-Type': 'application/json',
  },
  body: JSON.stringify({
  orderNumber: data.order_id,
  orderDate: new Date().toISOString(),
  orderStatus: 'awaiting_shipment',
  shipTo: {
  name: data.name,
  street1: data.address,
  city: data.city,
  state: data.state,
  postalCode: data.zip,
  country: data.country,
  },
  items: [{
  sku: data.sku,
  name: await this.getPrizeName(data.sku),
  quantity: 1,
  }],
  }),
  });


    return response.json();

}

/\*\*

- Webhook handler for shipment updates
  \*/
  async handleShipmentUpdate(webhook: ShipStationWebhook) {
  await db.redemptions.update(
  { shipment_id: webhook.shipmentId },
  {
  status: webhook.status,
  tracking_number: webhook.trackingNumber,
  shipped_at: webhook.shippedAt,
  delivered_at: webhook.deliveredAt,
  }
  );


    // Notify user of status change
    if (webhook.status === 'delivered') {
      await this.notifyDelivery(webhook.shipmentId);

      // Schedule cleanup (delete tracking data after 90 days)
      await this.scheduleDataCleanup(webhook.shipmentId, 90);
    }

}
}
3.3 Database Schema
sql-- Games Configuration
CREATE TABLE games (
id SERIAL PRIMARY KEY,
on_chain_address VARCHAR(44) UNIQUE NOT NULL,
name VARCHAR(255) NOT NULL,
description TEXT,
image_url TEXT,
cost_in_tokens BIGINT NOT NULL,
cost_in_usd DECIMAL(10,2),
is_active BOOLEAN DEFAULT true,
total_plays INTEGER DEFAULT 0,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_active_games (is_active, created_at)

);

-- Prize Definitions
CREATE TABLE prizes (
id SERIAL PRIMARY KEY,
game_id INTEGER REFERENCES games(id),
prize_id BIGINT NOT NULL,
name VARCHAR(255) NOT NULL,
description TEXT,
image_url TEXT,
physical_item_sku VARCHAR(100) NOT NULL,
tier VARCHAR(20) NOT NULL, -- common, uncommon, rare, legendary
probability_basis_points INTEGER NOT NULL, -- 10000 = 100%
supply_total INTEGER NOT NULL,
supply_remaining INTEGER NOT NULL,
metadata_uri TEXT,
created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(game_id, prize_id),
    INDEX idx_game_prizes (game_id, tier)

);

-- Game Plays History
CREATE TABLE plays (
id SERIAL PRIMARY KEY,
game_id INTEGER REFERENCES games(id),
user_wallet VARCHAR(44) NOT NULL,
prize_id INTEGER REFERENCES prizes(id),
nft_mint VARCHAR(44), -- nullable if direct redemption
transaction_signature VARCHAR(88) NOT NULL UNIQUE,
random_value BYTEA, -- VRF result
played_at TIMESTAMP NOT NULL,

    INDEX idx_user_plays (user_wallet, played_at DESC),
    INDEX idx_game_plays (game_id, played_at DESC)

);

-- NFT Registry
CREATE TABLE nfts (
id SERIAL PRIMARY KEY,
mint_address VARCHAR(44) UNIQUE NOT NULL,
prize_id INTEGER REFERENCES prizes(id),
game_id INTEGER REFERENCES games(id),
current_owner VARCHAR(44) NOT NULL,
is_redeemed BOOLEAN DEFAULT false,
redemption_tx VARCHAR(88),
minted_at TIMESTAMP NOT NULL,
redeemed_at TIMESTAMP,

    INDEX idx_owner_nfts (current_owner, is_redeemed),
    INDEX idx_unredeemed_nfts (is_redeemed, mint_address)

);

-- Redemptions (NO PII)
CREATE TABLE redemptions (
id SERIAL PRIMARY KEY,
nft_mint VARCHAR(44) UNIQUE NOT NULL,
user_wallet VARCHAR(44) NOT NULL,
prize_id INTEGER REFERENCES prizes(id),

    -- Fulfillment provider references only
    shipment_provider VARCHAR(50) NOT NULL, -- 'shipstation', 'easypost', etc.
    shipment_id VARCHAR(100) NOT NULL,
    tracking_number VARCHAR(100),
    carrier VARCHAR(50),

    -- Status tracking
    status VARCHAR(50) NOT NULL, -- processing, shipped, delivered, failed
    estimated_delivery DATE,

    -- Timestamps
    redeemed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,

    -- Failure handling
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Data cleanup
    data_deletion_scheduled_at TIMESTAMP, -- redeemed_at + 90 days

    INDEX idx_user_redemptions (user_wallet, redeemed_at DESC),
    INDEX idx_pending_shipments (status, redeemed_at),
    INDEX idx_cleanup_schedule (data_deletion_scheduled_at)

);

-- Marketplace Listings
CREATE TABLE marketplace_listings (
id SERIAL PRIMARY KEY,
nft_mint VARCHAR(44) REFERENCES nfts(mint_address),
seller_wallet VARCHAR(44) NOT NULL,
price_in_tokens BIGINT NOT NULL,
price_in_sol BIGINT, -- optional, for cross-listing
is_active BOOLEAN DEFAULT true,
on_chain_listing_address VARCHAR(44),
listed_at TIMESTAMP DEFAULT NOW(),
cancelled_at TIMESTAMP,
sold_at TIMESTAMP,
buyer_wallet VARCHAR(44),
sale_tx VARCHAR(88),

    INDEX idx_active_listings (is_active, price_in_tokens),
    INDEX idx_seller_listings (seller_wallet, is_active),
    INDEX idx_nft_listing (nft_mint, is_active)

);

-- Marketplace Sales History
CREATE TABLE marketplace_sales (
id SERIAL PRIMARY KEY,
listing_id INTEGER REFERENCES marketplace_listings(id),
nft_mint VARCHAR(44) NOT NULL,
seller_wallet VARCHAR(44) NOT NULL,
buyer_wallet VARCHAR(44) NOT NULL,
price_in_tokens BIGINT NOT NULL,
platform_fee_tokens BIGINT NOT NULL,
transaction_signature VARCHAR(88) NOT NULL UNIQUE,
sold_at TIMESTAMP NOT NULL,

    INDEX idx_nft_sales_history (nft_mint, sold_at DESC),
    INDEX idx_user_purchases (buyer_wallet, sold_at DESC),
    INDEX idx_user_sales (seller_wallet, sold_at DESC)

);

-- Price History (for analytics)
CREATE TABLE token_price_history (
id SERIAL PRIMARY KEY,
token_price_usd DECIMAL(18, 8) NOT NULL,
sol_price_usd DECIMAL(10, 2) NOT NULL,
recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),

    INDEX idx_price_timeline (recorded_at DESC)

);

-- Admin Event Logs
CREATE TABLE admin_events (
id SERIAL PRIMARY KEY,
event_type VARCHAR(50) NOT NULL,
admin_wallet VARCHAR(44) NOT NULL,
game_id INTEGER REFERENCES games(id),
details JSONB,
created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_admin_actions (admin_wallet, created_at DESC)

);

```

---

## 4. API Specifications

### 4.1 REST API Endpoints

**Base URL**: `https://api.gachapon.example/v1`

#### 4.1.1 Game Endpoints
```

GET /games
Response: List of active games with current pricing

GET /games/:gameId
Response: Detailed game info including prize odds and supply

POST /games/:gameId/play
Request: { userWallet: string, signature: string }
Response: { transaction: UnsignedTransaction }
Description: Returns unsigned transaction for user to sign

POST /games/:gameId/finalize
Request: {
playId: string,
prizeChoice: 'nft' | 'direct_redeem',
encryptedShippingData?: string // if direct_redeem
}
Response: {
prizeId: number,
nftMint?: string,
redemptionId?: string
}

```

#### 4.1.2 Prize & NFT Endpoints
```

GET /prizes/:prizeId
Response: Prize details

POST /prizes/:prizeId/mint-nft
Request: { userWallet: string, playId: string }
Response: { nftMint: string, transaction: UnsignedTransaction }

GET /nfts/:mintAddress
Response: NFT metadata and current status

POST /nfts/:mintAddress/redeem
Request: {
userWallet: string,
signature: string,
encryptedShippingData: string
}
Response: {
redemptionId: string,
trackingNumber: string,
carrier: string,
estimatedDelivery: string
}

```

#### 4.1.3 User Collection Endpoints
```

GET /users/:wallet/collection
Response: User's NFT collection with redemption status

GET /users/:wallet/plays
Response: Play history with prizes won

GET /users/:wallet/redemptions
Response: Redemption tracking information

```

#### 4.1.4 Marketplace Endpoints
```

GET /marketplace/listings
Query params: ?tier=rare&minPrice=100&maxPrice=1000
Response: Active marketplace listings

POST /marketplace/list
Request: {
nftMint: string,
priceInTokens: number,
sellerWallet: string,
signature: string
}
Response: { listingId: string, transaction: UnsignedTransaction }

POST /marketplace/buy
Request: {
listingId: string,
buyerWallet: string,
signature: string
}
Response: { transaction: UnsignedTransaction }

DELETE /marketplace/listings/:listingId
Request: { sellerWallet: string, signature: string }
Response: { success: boolean }

GET /marketplace/sales-history
Response: Recent sales with pricing data

```

#### 4.1.5 Admin Endpoints (Protected)
```

POST /admin/games
Request: Game configuration
Response: { gameId: string, onChainAddress: string }

PATCH /admin/games/:gameId
Request: Updated game parameters
Response: { success: boolean }

POST /admin/prizes
Request: Prize configuration
Response: { prizeId: number }

GET /admin/analytics
Query params: ?startDate=...&endDate=...
Response: Platform metrics and stats
4.2 WebSocket Events
Connection: wss://api.gachapon.example/ws
typescript// Client subscribes to events
{
type: 'subscribe',
channels: ['game.123', 'marketplace', 'user.ABC123']
}

// Server events
{
type: 'GAME_PLAYED',
gameId: 123,
prizeWon: 'Legendary Item',
anonymous: true
}

{
type: 'NFT_LISTED',
nftMint: 'ABC...',
prizeId: 456,
price: 1000,
tier: 'rare'
}

{
type: 'NFT_SOLD',
nftMint: 'ABC...',
salePrice: 1000,
tier: 'legendary'
}

{
type: 'REDEMPTION_UPDATE',
userWallet: 'DEF...',
status: 'shipped',
trackingNumber: '1Z999AA10123456784'
}

```

---

## 5. User Flows

### 5.1 Play Game Flow
```

1. User lands on game page
2. Wallet connection required
3. View game details:
   - Current cost in tokens (dynamic based on SOL price)
   - Prize tiers and odds
   - Supply remaining
4. Click "Play Game"
5. Approve token spending (if first time)
6. Sign transaction to play
7. Wait for VRF confirmation (~3-5 seconds)
8. Prize reveal animation
9. Choose outcome:
   a) Mint as NFT → Collect in wallet
   b) Redeem immediately → Enter shipping info

```

### 5.2 NFT Minting Flow
```

1. After winning, select "Mint as NFT"
2. Sign minting transaction
3. NFT appears in wallet + platform collection
4. NFT metadata includes:
   - Prize image and details
   - Redeemable status
   - Game origin
   - Tier/rarity
5. User can:
   - Hold in collection
   - List on marketplace
   - Redeem for physical item later

```

### 5.3 Direct Redemption Flow (No NFT)
```

1. After winning, select "Redeem Now"
2. Modal appears: Enter shipping information
3. Client-side encryption of shipping data
4. User signs redemption transaction
5. NFT burned immediately (never minted to user)
6. Backend decrypts and sends to fulfillment
7. User receives:
   - Confirmation email
   - Tracking number
   - Delivery estimate
8. Shipping data deleted from all systems

```

### 5.4 NFT Redemption Flow (Already Owned)
```

1. User views their collection
2. Click "Redeem" on NFT
3. Confirmation modal:
   - "This will burn your NFT permanently"
   - "Physical item will be shipped"
4. Enter shipping information
5. Client-side encryption
6. Sign burn transaction
7. NFT burned on-chain
8. Shipping initiated immediately
9. User receives tracking info
10. NFT removed from collection view

```

### 5.5 Marketplace Listing Flow
```

1. User views their collection
2. Select unredeemed NFT
3. Click "List for Sale"
4. Enter price in platform tokens
5. Preview listing (fees shown)
6. Sign listing transaction
7. NFT escrowed in marketplace program
8. Listing appears in marketplace
9. Seller can cancel anytime (re-sign transaction)

```

### 5.6 Marketplace Purchase Flow
```

1. Browse marketplace listings
2. Filter by tier, price, game
3. View NFT details (full metadata)
4. Click "Buy Now"
5. Confirmation modal:
   - Price breakdown
   - Platform fee (2%)
   - Total cost
6. Approve token spending (if needed)
7. Sign purchase transaction
8. NFT transferred to buyer wallet
9. Tokens transferred to seller (minus fee)
10. NFT appears in buyer's collection
11. Buyer can now:
    - Hold
    - Relist
    - Redeem for physical item

```

---

## 6. Security & Privacy

### 6.1 Smart Contract Security

**Measures**:
- Anchor framework with built-in security patterns
- Multi-sig admin authority (Squads Protocol)
- Time-locked upgrades (48-hour delay)
- Emergency pause functionality
- Rate limiting on plays per wallet
- Maximum bet limits per transaction

**Audits**:
- Pre-launch audit by reputable firm (OtterSec, Neodyme)
- Bug bounty program on Immunefi
- Continuous monitoring with Forta

### 6.2 Backend Security

**Authentication**:
- Wallet signature verification for all write operations
- JWT tokens for session management
- Rate limiting (Redis-based)
- CAPTCHA/Turnstile for bot prevention

**Infrastructure**:
- TLS 1.3 for all connections
- Secrets management (AWS Secrets Manager)
- Environment isolation (dev/staging/prod)
- DDoS protection (Cloudflare)

**Data Protection**:
- Encryption at rest for all DB data (AES-256)
- Encryption in transit (TLS)
- No plaintext PII ever stored
- Secure enclave for ephemeral decryption (AWS Nitro)

### 6.3 Privacy Compliance

**GDPR Compliance**:
- Data minimization: Only collect necessary data
- Purpose limitation: Shipping data used only for fulfillment
- Storage limitation: Tracking data deleted after 90 days
- Data portability: Users can export their data
- Right to erasure: Automated deletion schedules

**Privacy Policy Highlights**:
```

WHAT WE COLLECT:

- Wallet address (public blockchain data)
- Shipping information (one-time, encrypted, never stored)
- Tracking numbers (stored 90 days, then deleted)

WHAT WE DON'T COLLECT:

- Email addresses (optional, for notifications only)
- Phone numbers
- Payment information (on-chain only)
- Browsing history
- Device fingerprints

HOW WE PROTECT YOUR DATA:

- Zero PII storage architecture
- Client-side encryption
- Immediate fulfillment pass-through
- Automated data deletion
- No third-party data sharing (except fulfillment partner)

```

**Fulfillment Partner Agreement**:
- Data Processing Agreement (DPA) required
- GDPR compliance certification
- Limited data retention (30 days post-delivery)
- No data sharing with other parties
- Secure API integration only

### 6.4 Anti-Fraud Measures

**Bot Prevention**:
- Cloudflare Turnstile on play actions
- Rate limiting: 10 plays per wallet per hour
- Wallet age verification (minimum 7 days old)
- Minimum token holding requirement

**Sybil Resistance**:
- Progressive gas fees for high-frequency players
- Cooldown periods between plays
- Anomaly detection on play patterns

**Marketplace Protection**:
- Escrow-based trading (no direct transfers)
- Dispute resolution mechanism
- Blacklist for fraudulent actors

---

## 7. Token Economics

### 7.1 Token Utility

**Primary Use Cases**:
1. **Game plays**: Only accepted currency
2. **Marketplace trades**: Required for buying/selling
3. **Platform fees**: All fees collected in token
4. **Governance**: Future DAO voting rights

### 7.2 Token Flow
```

User buys tokens → Plays games → Tokens to treasury
↓
Some tokens burned
↓
Some tokens for buyback
↓
Some tokens for rewards
7.3 Fee Structure
Game Plays:

$5 USD equivalent per play (dynamic pricing)
70% to treasury (prize fulfillment, operations)
20% burned (deflationary mechanism)
10% to rewards pool (future incentives)

Marketplace Fees:

2% platform fee on all sales
50% burned
50% to treasury

Token Distribution (from launchpad):

40% Public sale
20% Treasury (game operations)
15% Team (4-year vest)
15% Ecosystem incentives
10% Liquidity provision

8. Admin Tools & Operations
   8.1 Admin Dashboard
   Game Management:

Create new games
Update prize pools and odds
Adjust pricing formulas
Monitor play statistics
Pause/unpause games

Prize Management:

Add new prizes
Update inventory/supply
Modify redemption SKUs
Track fulfillment status

Analytics:

Daily Active Users (DAU)
Total plays per game
Win distribution by tier
Marketplace volume
Token burn rate
Revenue metrics

Operations:

Redemption queue monitoring
Failed shipment alerts
Low inventory warnings
Wallet balance monitoring

8.2 Monitoring & Alerts
Critical Alerts:

Smart contract failures
Treasury wallet low balance
Fulfillment API errors
Database connection issues
Unusual play patterns (potential bot)

Metrics Dashboard (Grafana):

RPC response times
Transaction success rates
API latency (p50, p95, p99)
Database query performance
Cache hit rates

9. Launch Plan
   9.1 Phase 1: MVP (Weeks 1-8)
   Deliverables:

Single game implementation
Basic NFT minting
Direct redemption flow
Simple collection view
No marketplace yet

Success Criteria:

100 successful plays
50 NFT mints
25 physical redemptions shipped
<1% transaction failure rate
<5 minute fulfillment processing time

9.2 Phase 2: Marketplace (Weeks 9-12)
Deliverables:

Marketplace smart contract
Listing/buying UI
Sales history
Price discovery tools

Success Criteria:

50+ active listings
25+ successful trades
$1000+ marketplace volume
<2% failed trades

9.3 Phase 3: Scale (Weeks 13-16)
Deliverables:

Multiple concurrent games
Advanced filtering/search
User profiles
Social features (share wins)
Mobile responsive design

Success Criteria:

500 DAU
3+ active games
$10,000+ monthly volume
85%+ user retention (7-day)

9.4 Phase 4: Optimization (Ongoing)
Focus Areas:

Gas optimization
UI/UX improvements
Additional prize types
Partnership integrations
Marketing campaigns

10. Risk Mitigation
    10.1 Technical Risks
    RiskImpactProbabilityMitigationSmart contract exploitCriticalLowAudit + bug bounty + insuranceRPC provider downtimeHighMediumMulti-provider failoverDatabase failureHighLowAutomated backups + replicaFulfillment API failureMediumMediumRetry logic + alertsToken price volatilityMediumHighDynamic pricing + hedging
    10.2 Business Risks
    RiskImpactProbabilityMitigationLow user adoptionCriticalMediumMarketing + partnershipsPrize fulfillment costsHighMediumBulk purchasing + marginsRegulatory changesHighLowLegal counsel + complianceCompetitor launchMediumHighUnique IP + network effects
    10.3 Compliance Risks
    RiskImpactProbabilityMitigationGambling regulationsCriticalMediumLegal structure + T&CsData breachCriticalLowZero PII architectureTax implicationsMediumHighClear user guidelinesInternational shippingMediumHighGeo-restrictions initially

11. Success Metrics & KPIs
    11.1 North Star Metrics

Weekly Active Players: Target 1,000 by Month 3
Token Burn Rate: Target $10,000/month by Month 3
Marketplace GMV: Target $50,000/month by Month 6

11.2 Product Metrics
Engagement:

Average plays per user per week: Target 3+
Collection view rate: Target 60%+
Repeat player rate: Target 50%+ (30-day)

Economic:

Average revenue per user: Target $50+
Token holder retention: Target 70%+ (30-day)
Marketplace take rate: 2% (fixed)

Operations:

Average fulfillment time: Target <5 business days
Successful delivery rate: Target 98%+
Support ticket volume: Target <5% of redemptions

11.3 Health Metrics
Technical:

Transaction success rate: Target >99%
API uptime: Target 99.9%
Page load time: Target <2 seconds

User Experience:

Net Promoter Score (NPS): Target 50+
Support satisfaction: Target 4.5/5+
Churn rate: Target <10% monthly

12. Open Questions & Future Considerations
    12.1 Outstanding Decisions

Token Launch:

Which launchpad? (Jupiter, Meteora, Raydium)
Initial token supply?
Liquidity strategy?

Prize Sourcing:

Manufacture own items vs. dropship?
International shipping partners?
Customs/duties handling?

Marketplace Economics:

Royalty structure for creators?
Dynamic fee tiers based on volume?
Cross-platform listing support?

12.2 Future Features
V2 Enhancements:

Crafting system (combine NFTs for rarer prizes)
Staking for bonus plays
Referral program
Guild/team competitions
Limited-time events
Gacha bundles (multi-play discounts)

Long-term Vision:

Mobile app (React Native)
Physical retail integration
Brand partnerships
Cross-chain expansion
DAO governance

13. Appendix
    13.1 Tech Stack Summary
    LayerTechnologyBlockchainSolana (Anchor Framework)Smart ContractsRust (Anchor)Backend APINode.js (TypeScript, NestJS)DatabasePostgreSQL 15CachingRedis 7QueueBullMQIndexerHelius WebhooksStorageIPFS/Arweave (metadata)HostingAWS/GCP (multi-region)CDNCloudflareMonitoringGrafana + PrometheusError TrackingSentry
    13.2 Third-Party Integrations
    ServicePurposeSwitchboardVerifiable randomness (VRF)Pyth NetworkPrice oracles (SOL/USD)JupiterToken swaps & pricingShipStationFulfillment & shippingHeliusRPC & webhooksMetaplexNFT standardsSquadsMulti-sig wallets
    13.3 Glossary

Gachapon: Japanese capsule toy vending machine; randomized prize system
SPL Token: Solana Program Library token standard
VRF: Verifiable Random Function for provably fair randomness
Basis Points: 1/100th of a percent (e.g., 500 bp = 5%)
Burn: Permanently destroy tokens/NFTs
Escrow: Locked funds held by smart contract
GMV: Gross Merchandise Value (total marketplace sales)

Document Status: Ready for Technical Review
Next Steps:

Engineering team estimation
Design mockups for key flows
Smart contract architecture review
Token economics modeling
Legal review of compliance approach
