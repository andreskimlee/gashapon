# Section 2: Backend (NestJS) - Implementation Checklist

## 2.1 Project Setup

### Initial Configuration

- [ ] Initialize NestJS project (`nest new gachapon-backend`)
- [ ] Set up TypeScript configuration (strict mode)
- [ ] Configure ESLint and Prettier
- [ ] Set up environment variables (.env files)
  - [ ] DATABASE_URL
  - [ ] SOLANA_RPC_URL (Helius/QuickNode)
  - [ ] SOLANA_NETWORK (devnet/mainnet-beta)
  - [ ] HELIUS_API_KEY
  - [ ] HELIUS_WEBHOOK_SECRET
  - [ ] JWT_SECRET
  - [ ] SHIPSTATION_API_KEY
  - [ ] SHIPSTATION_API_SECRET
  - [ ] PLATFORM_WALLET_PRIVATE_KEY
  - [ ] REDIS_URL
  - [ ] AWS_REGION
  - [ ] AWS_ACCESS_KEY_ID
  - [ ] AWS_SECRET_ACCESS_KEY

### Dependencies Installation

- [ ] Install Solana dependencies
  - [ ] `@solana/web3.js`
  - [ ] `@coral-xyz/anchor`
  - [ ] `@metaplex-foundation/js`
  - [ ] `@metaplex-foundation/mpl-token-metadata`
- [ ] Install database dependencies
  - [ ] `@nestjs/typeorm`
  - [ ] `typeorm`
  - [ ] `pg` (PostgreSQL driver)
- [ ] Install caching dependencies
  - [ ] `@nestjs/cache-manager`
  - [ ] `cache-manager`
  - [ ] `cache-manager-redis-store`
- [ ] Install queue dependencies
  - [ ] `@nestjs/bull`
  - [ ] `bull`
- [ ] Install API dependencies
  - [ ] `@nestjs/swagger` (API documentation)
  - [ ] `class-validator`
  - [ ] `class-transformer`
  - [ ] `axios`
- [ ] Install crypto/security dependencies
  - [ ] `@nestjs/jwt`
  - [ ] `@nestjs/passport`
  - [ ] `passport-jwt`
  - [ ] `bcrypt`
  - [ ] `tweetnacl` (for Solana signatures)
  - [ ] `bs58`

### Project Structure Setup

- [ ] Create module structure
  - [ ] `src/game/` - Game logic module
  - [ ] `src/prize/` - Prize management module
  - [ ] `src/nft/` - NFT minting/burning module
  - [ ] `src/marketplace/` - Marketplace module
  - [ ] `src/redemption/` - Redemption/fulfillment module
  - [ ] `src/user/` - User management module
  - [ ] `src/webhook/` - Helius webhook handlers
  - [ ] `src/blockchain/` - Solana interaction services
  - [ ] `src/oracle/` - Price oracle service
  - [ ] `src/common/` - Shared utilities
- [ ] Create shared services directory
  - [ ] `src/blockchain/solana.service.ts`
  - [ ] `src/blockchain/anchor.service.ts`
  - [ ] `src/blockchain/metaplex.service.ts`
  - [ ] `src/oracle/price-oracle.service.ts`
  - [ ] `src/common/encryption.service.ts`

---

## 2.2 Database Setup

### PostgreSQL Configuration

- [ ] Install PostgreSQL locally or set up AWS RDS
- [ ] Create database (`gachapon_db`)
- [ ] Configure connection pooling
- [ ] Set up SSL for production
- [ ] Configure automatic backups
- [ ] Set up read replicas (for production)

### TypeORM Entities

#### Game Entity

- [ ] Create `game.entity.ts`
  - [ ] id (PK, auto-increment)
  - [ ] on_chain_address (unique, indexed)
  - [ ] game_id (unique)
  - [ ] name
  - [ ] description
  - [ ] image_url
  - [ ] cost_usd (Decimal)
  - [ ] is_active (boolean)
  - [ ] total_plays (integer, default 0)
  - [ ] created_at (timestamp)
  - [ ] updated_at (timestamp)
  - [ ] Relations: prizes (one-to-many)

#### Prize Entity

- [ ] Create `prize.entity.ts`
  - [ ] id (PK)
  - [ ] game_id (FK to games)
  - [ ] prize_id (on-chain ID)
  - [ ] name
  - [ ] description
  - [ ] image_url
  - [ ] physical_item_sku (indexed)
  - [ ] tier (enum: common/uncommon/rare/legendary)
  - [ ] probability_basis_points
  - [ ] supply_total
  - [ ] supply_remaining (indexed)
  - [ ] metadata_uri
  - [ ] created_at
  - [ ] Relations: game (many-to-one), plays (one-to-many)

#### Play Entity

- [ ] Create `play.entity.ts`
  - [ ] id (PK)
  - [ ] game_id (FK, indexed)
  - [ ] user_wallet (indexed)
  - [ ] prize_id (FK, nullable)
  - [ ] nft_mint (nullable, indexed)
  - [ ] transaction_signature (unique, indexed)
  - [ ] random_value (bytea)
  - [ ] token_amount_paid
  - [ ] status (enum: pending/completed/failed)
  - [ ] played_at (indexed)
  - [ ] Relations: game (many-to-one), prize (many-to-one)

#### NFT Entity

- [ ] Create `nft.entity.ts`
  - [ ] id (PK)
  - [ ] mint_address (unique, indexed)
  - [ ] prize_id (FK, indexed)
  - [ ] game_id (FK, indexed)
  - [ ] current_owner (indexed)
  - [ ] is_redeemed (boolean, indexed)
  - [ ] redemption_tx (nullable)
  - [ ] minted_at
  - [ ] redeemed_at (nullable)
  - [ ] Relations: prize (many-to-one), game (many-to-one)

#### Redemption Entity

- [ ] Create `redemption.entity.ts`
  - [ ] id (PK)
  - [ ] nft_mint (unique, indexed)
  - [ ] user_wallet (indexed)
  - [ ] prize_id (FK)
  - [ ] shipment_provider (varchar)
  - [ ] shipment_id (indexed)
  - [ ] tracking_number
  - [ ] carrier
  - [ ] status (enum, indexed)
  - [ ] estimated_delivery (nullable)
  - [ ] redeemed_at (indexed)
  - [ ] shipped_at (nullable)
  - [ ] delivered_at (nullable)
  - [ ] failure_reason (nullable)
  - [ ] retry_count (default 0)
  - [ ] data_deletion_scheduled_at (indexed)
  - [ ] Relations: prize (many-to-one)

#### Marketplace Listing Entity

- [ ] Create `marketplace-listing.entity.ts`
  - [ ] id (PK)
  - [ ] nft_mint (FK to nfts, indexed)
  - [ ] on_chain_listing_address (unique)
  - [ ] seller_wallet (indexed)
  - [ ] price_in_tokens
  - [ ] is_active (boolean, indexed)
  - [ ] listed_at (indexed)
  - [ ] cancelled_at (nullable)
  - [ ] sold_at (nullable)
  - [ ] buyer_wallet (nullable)
  - [ ] sale_tx (nullable)
  - [ ] Relations: nft (many-to-one)

#### Marketplace Sale Entity

- [ ] Create `marketplace-sale.entity.ts`
  - [ ] id (PK)
  - [ ] listing_id (FK)
  - [ ] nft_mint (indexed)
  - [ ] seller_wallet (indexed)
  - [ ] buyer_wallet (indexed)
  - [ ] price_in_tokens
  - [ ] platform_fee_tokens
  - [ ] transaction_signature (unique)
  - [ ] sold_at (indexed)
  - [ ] Relations: listing (many-to-one)

#### Token Price History Entity

- [ ] Create `token-price-history.entity.ts`
  - [ ] id (PK)
  - [ ] token_price_usd (Decimal)
  - [ ] sol_price_usd (Decimal)
  - [ ] recorded_at (indexed)

### Database Migrations

- [ ] Create initial migration for all tables
- [ ] Create indexes migration
  - [ ] Index on plays.user_wallet, plays.played_at
  - [ ] Index on nfts.current_owner, nfts.is_redeemed
  - [ ] Index on marketplace_listings.is_active, price_in_tokens
  - [ ] Index on redemptions.status, redeemed_at
  - [ ] Index on marketplace_sales.sold_at
- [ ] Test migrations on local database
- [ ] Test rollback migrations
- [ ] Document migration process

---

## 2.3 Blockchain Services

### Solana Connection Service

- [ ] Create `blockchain/solana.service.ts`
  - [ ] Initialize connection with Helius RPC
  - [ ] Implement connection health check
  - [ ] Implement retry logic for failed requests
  - [ ] Add connection pool management
  - [ ] Add rate limiting
  - [ ] Implement getBalance method
  - [ ] Implement getTransaction method
  - [ ] Implement sendTransaction method
  - [ ] Add error handling and logging

### Anchor Program Service

- [ ] Create `blockchain/anchor.service.ts`
  - [ ] Load Game Program IDL
  - [ ] Load Marketplace Program IDL
  - [ ] Initialize program instances
  - [ ] Create wallet from environment variable
  - [ ] Implement program account fetching
  - [ ] Implement instruction builders
    - [ ] Build play_game instruction
    - [ ] Build initialize_game instruction
    - [ ] Build update_game_status instruction
    - [ ] Build replenish_supply instruction
  - [ ] Add transaction simulation before sending
  - [ ] Add error parsing from program errors

### Metaplex Service

- [ ] Create `blockchain/metaplex.service.ts`
  - [ ] Initialize Metaplex instance
  - [ ] Implement NFT collection creation
  - [ ] Implement mint NFT function
    - [ ] Accept prize metadata
    - [ ] Upload metadata to Arweave
    - [ ] Mint NFT with collection
    - [ ] Set creators and royalties
    - [ ] Return mint address
  - [ ] Implement burn NFT function
    - [ ] Verify ownership
    - [ ] Execute burn instruction
    - [ ] Return transaction signature
  - [ ] Implement fetch NFT metadata function
  - [ ] Implement update NFT metadata function (if needed)
  - [ ] Add error handling

### Transaction Builder Service

- [ ] Create `blockchain/transaction-builder.service.ts`
  - [ ] Build unsigned transactions for frontend
  - [ ] Add priority fees calculation
  - [ ] Implement transaction serialization
  - [ ] Add recent blockhash fetching
  - [ ] Implement transaction signing (backend signer)
  - [ ] Add transaction simulation
  - [ ] Implement send and confirm transaction
  - [ ] Add retry logic for failed transactions

---

## 2.4 Price Oracle Service

### Price Oracle Implementation

- [ ] Create `oracle/price-oracle.service.ts`
  - [ ] Implement SOL/USD price fetching (Pyth Network)
    - [ ] Set up Pyth connection
    - [ ] Fetch SOL/USD price feed
    - [ ] Parse price data
    - [ ] Handle confidence intervals
  - [ ] Implement TOKEN/SOL price fetching (Jupiter)
    - [ ] Set up Jupiter API client
    - [ ] Fetch quote for TOKEN to SOL
    - [ ] Calculate price ratio
  - [ ] Implement USD to TOKEN conversion
    - [ ] Accept USD amount
    - [ ] Calculate TOKEN amount needed
    - [ ] Add slippage tolerance (1-2%)
    - [ ] Return token amount with decimals
  - [ ] Implement caching (60 second TTL)
  - [ ] Add price update scheduler (cron job every 30 seconds)
  - [ ] Add price change alerts (>5% deviation)
  - [ ] Store historical prices in database

### Price Calculation Endpoints

- [ ] Create `oracle/price-oracle.controller.ts`
  - [ ] GET /prices/token-usd - Current token price
  - [ ] GET /prices/sol-usd - Current SOL price
  - [ ] GET /prices/calculate - Convert USD to tokens
  - [ ] GET /prices/history - Historical price data

---

## 2.5 Game Module

### Game Service

- [ ] Create `game/game.service.ts`
  - [ ] Implement getActiveGames()
    - [ ] Fetch from database
    - [ ] Include prize information
    - [ ] Calculate current token cost
    - [ ] Return formatted response
  - [ ] Implement getGameById(gameId)
    - [ ] Fetch game details
    - [ ] Include all prizes with odds
    - [ ] Show remaining supply
    - [ ] Calculate expected cost
  - [ ] Implement createGame() (admin)
    - [ ] Validate prize probabilities sum to 10000
    - [ ] Upload prize metadata to Arweave
    - [ ] Call on-chain initialize_game
    - [ ] Store in database
    - [ ] Return game details
  - [ ] Implement updateGameStatus() (admin)
    - [ ] Verify admin signature
    - [ ] Call on-chain instruction
    - [ ] Update database
  - [ ] Implement replenishPrizeSupply() (admin)
    - [ ] Verify admin signature
    - [ ] Call on-chain instruction
    - [ ] Update database
  - [ ] Implement syncGameFromChain()
    - [ ] Fetch on-chain game account
    - [ ] Update database with latest data
    - [ ] Handle discrepancies

### Game Controller

- [ ] Create `game/game.controller.ts`
  - [ ] GET /games - List active games
  - [ ] GET /games/:id - Game details
  - [ ] POST /games (admin) - Create new game
  - [ ] PATCH /games/:id/status (admin) - Update status
  - [ ] POST /games/:id/replenish (admin) - Add supply
  - [ ] Add Swagger documentation
  - [ ] Add request validation (DTOs)
  - [ ] Add authentication guards

### Play Service

- [ ] Create `game/play.service.ts`
  - [ ] Implement initiatePlay()
    - [ ] Verify game is active
    - [ ] Verify supply available
    - [ ] Calculate token cost from USD price
    - [ ] Build unsigned play_game transaction
    - [ ] Create pending play record in DB
    - [ ] Return transaction for user to sign
  - [ ] Implement handlePlayCompleted() (webhook)
    - [ ] Parse PrizeWon event from blockchain
    - [ ] Update play record with prize
    - [ ] Update prize supply in database
    - [ ] Emit notification to user
  - [ ] Implement getUserPlays(wallet)
    - [ ] Fetch play history from database
    - [ ] Include prize information
    - [ ] Paginate results
    - [ ] Return formatted response

### Play Controller

- [ ] Create `game/play.controller.ts`
  - [ ] POST /games/:gameId/play - Initiate play
  - [ ] GET /plays/:playId - Get play status
  - [ ] GET /users/:wallet/plays - User play history
  - [ ] Add rate limiting (10 plays per minute per wallet)
  - [ ] Add wallet signature verification

---

## 2.6 NFT Module

### NFT Service

- [ ] Create `nft/nft.service.ts`
  - [ ] Implement mintPrizeNFT()
    - [ ] Accept playId and userWallet
    - [ ] Fetch prize details from play
    - [ ] Fetch metadata URI
    - [ ] Call Metaplex service to mint
    - [ ] Store NFT in database
    - [ ] Update play record with nft_mint
    - [ ] Return NFT details
  - [ ] Implement burnNFT()
    - [ ] Accept nftMint and userWallet
    - [ ] Verify ownership
    - [ ] Call Metaplex service to burn
    - [ ] Update NFT record (is_redeemed = true)
    - [ ] Return transaction signature
  - [ ] Implement getNFTsByOwner(wallet)
    - [ ] Fetch from database
    - [ ] Filter is_redeemed = false
    - [ ] Include prize details
    - [ ] Include game information
    - [ ] Return formatted response
  - [ ] Implement getNFTDetails(mintAddress)
    - [ ] Fetch from database
    - [ ] Include on-chain metadata
    - [ ] Include redemption status
    - [ ] Include marketplace listing (if any)
    - [ ] Return complete NFT info
  - [ ] Implement syncNFTOwnership()
    - [ ] Fetch on-chain owner
    - [ ] Update database if changed
    - [ ] Handle burned NFTs

### NFT Controller

- [ ] Create `nft/nft.controller.ts`
  - [ ] POST /nfts/mint - Mint NFT from play
  - [ ] GET /nfts/:mintAddress - NFT details
  - [ ] GET /users/:wallet/nfts - User's NFT collection
  - [ ] DELETE /nfts/:mintAddress/burn - Burn NFT (for redemption)
  - [ ] Add wallet signature verification
  - [ ] Add request validation

---

## 2.7 Marketplace Module

### Marketplace Service

- [ ] Create `marketplace/marketplace.service.ts`
  - [ ] Implement listNFT()
    - [ ] Verify NFT ownership
    - [ ] Verify NFT not redeemed
    - [ ] Build list_nft transaction
    - [ ] Create listing record in DB
    - [ ] Return unsigned transaction
  - [ ] Implement cancelListing()
    - [ ] Verify seller ownership
    - [ ] Build cancel_listing transaction
    - [ ] Update listing in DB
    - [ ] Return unsigned transaction
  - [ ] Implement buyNFT()
    - [ ] Verify listing is active
    - [ ] Calculate platform fee
    - [ ] Build buy_nft transaction
    - [ ] Return unsigned transaction
  - [ ] Implement getActiveListings()
    - [ ] Fetch from database
    - [ ] Filter is_active = true
    - [ ] Include NFT details
    - [ ] Include seller info
    - [ ] Support pagination
    - [ ] Support filtering (tier, price range)
    - [ ] Support sorting (price, date)
  - [ ] Implement getSalesHistory()
    - [ ] Fetch from marketplace_sales
    - [ ] Include NFT details
    - [ ] Calculate floor prices by tier
    - [ ] Return formatted data
  - [ ] Implement getUserListings(wallet)
  - [ ] Implement getNFTSalesHistory(mintAddress)
    - [ ] Return all historical sales for an NFT
    - [ ] Include price trends

### Marketplace Controller

- [ ] Create `marketplace/marketplace.controller.ts`
  - [ ] GET /marketplace/listings - Active listings
  - [ ] GET /marketplace/listings/:id - Listing details
  - [ ] POST /marketplace/list - Create listing
  - [ ] DELETE /marketplace/listings/:id - Cancel listing
  - [ ] POST /marketplace/buy - Purchase NFT
  - [ ] GET /marketplace/sales - Sales history
  - [ ] GET /marketplace/nfts/:mint/history - NFT price history
  - [ ] GET /marketplace/users/:wallet/listings - User listings
  - [ ] Add filters and pagination
  - [ ] Add Swagger documentation

### Marketplace Analytics Service

- [ ] Create `marketplace/analytics.service.ts`
  - [ ] Calculate floor price by tier
  - [ ] Calculate average sale price by tier
  - [ ] Calculate total marketplace volume
  - [ ] Calculate marketplace velocity (sales per day)
  - [ ] Generate price trend charts
  - [ ] Calculate rarity scores
  - [ ] Track most active traders

---

## 2.8 Redemption Module

### Encryption Service

- [ ] Create `common/encryption.service.ts`
  - [ ] Implement client-side encryption validation
  - [ ] Implement server-side decryption (in-memory only)
  - [ ] Use RSA or ECIES for encryption
  - [ ] Generate and manage encryption keys (AWS KMS)
  - [ ] Implement key rotation
  - [ ] Add encryption/decryption logging (no PII)

### ShipStation Integration Service

- [ ] Create `redemption/shipstation.service.ts`
  - [ ] Initialize ShipStation API client
  - [ ] Implement createShipment()
    - [ ] Accept shipping details
    - [ ] Accept prize SKU
    - [ ] Create order in ShipStation
    - [ ] Return shipment ID and tracking
  - [ ] Implement getShipmentStatus()
    - [ ] Query by shipment ID
    - [ ] Return current status
  - [ ] Implement cancelShipment() (if needed)
  - [ ] Implement webhook handler for status updates
    - [ ] Parse webhook payload
    - [ ] Verify webhook signature
    - [ ] Update redemption status in DB
  - [ ] Add error handling and retries
  - [ ] Add rate limiting

### Redemption Service

- [ ] Create `redemption/redemption.service.ts`
  - [ ] Implement redeemNFT()
    - [ ] Accept nftMint, userWallet, signature, encryptedShippingData
    - [ ] Verify NFT ownership
    - [ ] Verify signature
    - [ ] Decrypt shipping data (in-memory only, ephemeral)
    - [ ] Call burnNFT service
    - [ ] Immediately send to ShipStation
    - [ ] Create redemption record (NO PII stored)
    - [ ] Return tracking information
    - [ ] Clear shipping data from memory
  - [ ] Implement directRedemption() (no NFT minting)
    - [ ] Similar flow but skip NFT mint/burn
    - [ ] Still immediate fulfillment
  - [ ] Implement getRedemptionStatus()
    - [ ] Fetch by nftMint or redemptionId
    - [ ] Return tracking info
  - [ ] Implement retryFailedRedemption()
    - [ ] For failed shipments
    - [ ] Increment retry_count
    - [ ] Re-attempt fulfillment
  - [ ] Implement scheduleDataCleanup()
    - [ ] Set data_deletion_scheduled_at (90 days)
    - [ ] Create cleanup job

### Redemption Controller

- [ ] Create `redemption/redemption.controller.ts`
  - [ ] POST /redemptions/nft - Redeem existing NFT
  - [ ] POST /redemptions/direct - Direct redemption (no NFT)
  - [ ] GET /redemptions/:id - Redemption status
  - [ ] GET /redemptions/nft/:mint - Status by NFT
  - [ ] GET /users/:wallet/redemptions - User redemptions
  - [ ] POST /redemptions/:id/retry - Retry failed redemption (admin)
  - [ ] Add wallet signature verification
  - [ ] Add request encryption validation
  - [ ] Add rate limiting

### Cleanup Job

- [ ] Create `redemption/cleanup.job.ts`
  - [ ] Query redemptions where data_deletion_scheduled_at < now
  - [ ] Delete tracking data older than 90 days
  - [ ] Log cleanup actions
  - [ ] Run daily via cron

---

## 2.9 Webhook Module (Helius Integration)

### Webhook Setup

- [ ] Set up Helius webhook for Game Program events
  - [ ] Configure webhook URL: `/webhooks/helius/game`
  - [ ] Subscribe to program address
  - [ ] Set transaction types (all)
  - [ ] Configure authentication
- [ ] Set up Helius webhook for Marketplace Program events
  - [ ] Configure webhook URL: `/webhooks/helius/marketplace`
  - [ ] Subscribe to program address
  - [ ] Set transaction types (all)
  - [ ] Configure authentication

### Webhook Service

- [ ] Create `webhook/helius-webhook.service.ts`
  - [ ] Implement webhook signature verification
  - [ ] Implement event parsing
    - [ ] Parse GamePlayInitiated event
    - [ ] Parse PrizeWon event
    - [ ] Parse NFTListed event
    - [ ] Parse NFTSold event
    - [ ] Parse NFTDelisted event
  - [ ] Implement event routing to appropriate services
  - [ ] Add idempotency (prevent duplicate processing)
  - [ ] Add error handling and retries
  - [ ] Log all webhook events

### Webhook Controller

- [ ] Create `webhook/webhook.controller.ts`
  - [ ] POST /webhooks/helius/game - Game events
  - [ ] POST /webhooks/helius/marketplace - Marketplace events
  - [ ] POST /webhooks/shipstation - ShipStation updates
  - [ ] Add signature verification middleware
  - [ ] Add request logging
  - [ ] Return 200 OK immediately (async processing)

### Event Handlers

- [ ] Create `webhook/handlers/game-event.handler.ts`

  - [ ] Handle GamePlayInitiated
    - [ ] Update play status to 'pending'
  - [ ] Handle PrizeWon
    - [ ] Update play with prize_id
    - [ ] Update prize supply_remaining
    - [ ] Check if game should be deactivated
    - [ ] Trigger notification
  - [ ] Handle GameStatusUpdated
    - [ ] Update game in database

- [ ] Create `webhook/handlers/marketplace-event.handler.ts`
  - [ ] Handle NFTListed
    - [ ] Create listing record
  - [ ] Handle NFTSold
    - [ ] Update listing (sold)
    - [ ] Create sale record
    - [ ] Update NFT owner
  - [ ] Handle NFTDelisted
    - [ ] Update listing (cancelled)

---

## 2.10 User Module

### User Service (Optional - if implementing user profiles)

- [ ] Create `user/user.service.ts`
  - [ ] Implement getUserProfile(wallet)
  - [ ] Implement getUserStats(wallet)
    - [ ] Total plays
    - [ ] Total wins by tier
    - [ ] NFTs owned
    - [ ] NFTs redeemed
    - [ ] Marketplace activity
  - [ ] Implement updateUserPreferences()
  - [ ] Implement getUserNotifications()

### User Controller

- [ ] Create `user/user.controller.ts`
  - [ ] GET /users/:wallet/profile - User profile
  - [ ] GET /users/:wallet/stats - User statistics
  - [ ] GET /users/:wallet/collection - User's NFTs
  - [ ] GET /users/:wallet/plays - Play history
  - [ ] GET /users/:wallet/redemptions - Redemptions
  - [ ] GET /users/:wallet/listings - Marketplace listings

---

## 2.11 Authentication & Security

### Wallet Authentication

- [ ] Create `auth/auth.service.ts`
  - [ ] Implement wallet signature verification
    - [ ] Generate nonce for user
    - [ ] Verify signed message
    - [ ] Validate wallet ownership
  - [ ] Implement JWT token generation
  - [ ] Implement token refresh
  - [ ] Add session management

### Auth Guards

- [ ] Create `auth/wallet-auth.guard.ts`
  - [ ] Verify JWT token
  - [ ] Extract wallet address
  - [ ] Attach to request context
- [ ] Create `auth/admin.guard.ts`
  - [ ] Verify admin wallet addresses
  - [ ] Check against whitelist

### Rate Limiting

- [ ] Install `@nestjs/throttler`
- [ ] Configure global rate limits
- [ ] Add stricter limits for:
  - [ ] Play game endpoint (10/min per wallet)
  - [ ] Mint NFT endpoint (5/min per wallet)
  - [ ] Redemption endpoint (3/min per wallet)

### Security Middleware

- [ ] Add Helmet.js for HTTP headers
- [ ] Add CORS configuration
- [ ] Add request size limits
- [ ] Add request logging
- [ ] Add IP-based rate limiting
- [ ] Implement API key validation for admin endpoints

---

## 2.12 Queue Processing (BullMQ)

### Queue Setup

- [ ] Install and configure BullMQ with Redis
- [ ] Create queue for async tasks

### Job Processors

- [ ] Create `jobs/nft-mint.processor.ts`
  - [ ] Process NFT minting jobs
  - [ ] Handle retries on failure
  - [ ] Log success/failure
- [ ] Create `jobs/redemption.processor.ts`
  - [ ] Process redemption fulfillment
  - [ ] Handle ShipStation errors
  - [ ] Implement retry logic
- [ ] Create `jobs/price-update.processor.ts`
  - [ ] Update token prices on schedule
  - [ ] Cache results
- [ ] Create `jobs/blockchain-sync.processor.ts`
  - [ ] Sync game data from chain
  - [ ] Sync NFT ownership
  - [ ] Sync marketplace listings
- [ ] Create `jobs/cleanup.processor.ts`
  - [ ] Clean up old redemption data
  - [ ] Archive old play records

### Queue Dashboard

- [ ] Set up Bull Board for monitoring
- [ ] Configure authentication for dashboard
- [ ] Monitor job success/failure rates

---

## 2.13 Caching (Redis)

### Cache Configuration

- [ ] Set up Redis connection
- [ ] Configure cache TTLs
- [ ] Implement cache key strategies

### Cached Data

- [ ] Cache active games (TTL: 60s)
- [ ] Cache prize information (TTL: 60s)
- [ ] Cache token prices (TTL: 30s)
- [ ] Cache user collections (TTL: 30s)
- [ ] Cache marketplace listings (TTL: 30s)
- [ ] Cache NFT metadata (TTL: 5 min)

### Cache Invalidation

- [ ] Implement cache invalidation on game updates
- [ ] Invalidate on new plays
- [ ] Invalidate on NFT transfers
- [ ] Invalidate on listing changes
- [ ] Implement cache warming strategies

---

## 2.14 API Documentation

### Swagger Setup

- [ ] Configure Swagger module
- [ ] Set up API versioning
- [ ] Document all endpoints
  - [ ] Add descriptions
  - [ ] Add request examples
  - [ ] Add response examples
  - [ ] Add error responses
  - [ ] Add authentication requirements

### API Documentation Pages

- [ ] Document authentication flow
- [ ] Document wallet signature format
- [ ] Document error codes
- [ ] Provide Postman collection
- [ ] Create quick start guide
- [ ] Add code examples (TypeScript, Python)

---

## 2.15 Monitoring & Logging

### Logging Setup

- [ ] Configure Winston or Pino logger
- [ ] Set up log levels (dev vs prod)
- [ ] Configure log rotation
- [ ] Set up centralized logging (CloudWatch, DataDog)
- [ ] Log all API requests
- [ ] Log all blockchain transactions
- [ ] Log all errors with stack traces
- [ ] NEVER log PII (shipping addresses, etc.)

### Monitoring Setup

- [ ] Set up health check endpoint (`/health`)
- [ ] Monitor database connection
- [ ] Monitor Redis connection
- [ ] Monitor Solana RPC connection
- [ ] Monitor ShipStation API status
- [ ] Track API response times
- [ ] Track error rates
- [ ] Set up alerting (PagerDuty, Slack)

### Metrics to Track

- [ ] Total plays per day
- [ ] NFTs minted per day
- [ ] Redemptions per day
- [ ] Marketplace volume
- [ ] Token price changes
- [ ] Failed transactions
- [ ] API latency (p50, p95, p99)
- [ ] Queue job processing times
- [ ] Database query performance

---

## 2.16 Testing

### Unit Tests

- [ ] Test game service methods
- [ ] Test prize service methods
- [ ] Test NFT service methods
- [ ] Test marketplace service methods
- [ ] Test redemption service methods
- [ ] Test price oracle calculations
- [ ] Test encryption/decryption
- [ ] Test webhook event parsing
- [ ] Target: >80% code coverage

### Integration Tests

- [ ] Test complete play flow
- [ ] Test NFT minting flow
- [ ] Test redemption flow
- [ ] Test marketplace listing flow
- [ ] Test marketplace purchase flow
- [ ] Test webhook processing
- [ ] Test database transactions
- [ ] Test cache behavior

### E2E Tests

- [ ] Test full user journey (play → mint → list → sell)
- [ ] Test admin operations
- [ ] Test error scenarios
- [ ] Test rate limiting
- [ ] Test authentication

### Load Testing

- [ ] Simulate 100 concurrent plays
- [ ] Test database under load
- [ ] Test Redis under load
- [ ] Test API rate limits
- [ ] Identify bottlenecks

---

## 2.17 Deployment (AWS ECS)

### Docker Setup

- [ ] Create `Dockerfile`
  - [ ] Multi-stage build
  - [ ] Optimize image size
  - [ ] Use non-root user
- [ ] Create `docker-compose.yml` (for local dev)
- [ ] Create `.dockerignore`
- [ ] Test Docker build locally

### AWS Infrastructure Setup

- [ ] Set up VPC and subnets
- [ ] Set up RDS PostgreSQL instance
  - [ ] Configure security groups
  - [ ] Enable automated backups
  - [ ] Set up read replicas
- [ ] Set up ElastiCache Redis cluster
- [ ] Set up ECS cluster
- [ ] Create ECR repository for Docker images
- [ ] Set up Application Load Balancer
- [ ] Configure SSL certificate (ACM)
- [ ] Set up CloudWatch log groups

### ECS Task Definition

- [ ] Create task definition
- [ ] Configure container settings
  - [ ] Memory and CPU limits
  - [ ] Environment variables (from Parameter Store)
  - [ ] Health check configuration
  - [ ] Logging configuration
- [ ] Set up IAM roles
  - [ ] Task execution role
  - [ ] Task role (for AWS services access)

### ECS Service

- [ ] Create ECS service
- [ ] Configure auto-scaling
  - [ ] CPU-based scaling
  - [ ] Request count-based scaling
- [ ] Configure load balancer
- [ ] Set up health checks
- [ ] Configure deployment strategy (rolling update)

### CI/CD Pipeline

- [ ] Set up GitHub Actions or AWS CodePipeline
- [ ] Create deployment workflow
  - [ ] Run tests
  - [ ] Build Docker image
  - [ ] Push to ECR
  - [ ] Deploy to ECS
- [ ] Set up staging environment
- [ ] Set up production environment
- [ ] Configure deployment approval gates

### Secrets Management

- [ ] Store secrets in AWS Parameter Store or Secrets Manager
  - [ ] Database credentials
  - [ ] Solana wallet private key
  - [ ] API keys (Helius, ShipStation)
  - [ ] JWT secret
- [ ] Configure ECS to load secrets at runtime
- [ ] Implement secret rotation

---

## 2.18 Environment Configuration

### Development Environment

- [ ] Configure `.env.development`
- [ ] Use devnet Solana network
- [ ] Use local PostgreSQL
- [ ] Use local Redis
- [ ] Enable debug logging
- [ ] Disable rate limiting

### Staging Environment

- [ ] Configure `.env.staging`
- [ ] Use devnet Solana network
- [ ] Use AWS RDS (staging instance)
- [ ] Use AWS ElastiCache
- [ ] Enable moderate logging
- [ ] Enable rate limiting

### Production Environment

- [ ] Configure `.env.production`
- [ ] Use mainnet-beta Solana network
- [ ] Use AWS RDS (production instance)
- [ ] Use AWS ElastiCache
- [ ] Enable error logging only
- [ ] Enable strict rate limiting
- [ ] Enable all security features

---

## 2.19 Performance Optimization

### Database Optimization

- [ ] Add appropriate indexes
- [ ] Optimize slow queries
- [ ] Implement connection pooling
- [ ] Use database read replicas for read-heavy operations
- [ ] Implement query result caching
- [ ] Monitor query performance

### API Optimization

- [ ] Implement response compression
- [ ] Enable HTTP/2
- [ ] Optimize payload sizes
- [ ] Implement pagination for large datasets
- [ ] Use efficient serialization
- [ ] Minimize database queries per request

### Caching Strategy

- [ ] Cache expensive computations
- [ ] Cache blockchain data
- [ ] Implement cache-aside pattern
- [ ] Use Redis for session storage
- [ ] Implement cache warming

---

## 2.20 Documentation

### Technical Documentation

- [ ] Write API integration guide
- [ ] Document architecture decisions
- [ ] Create database schema documentation
- [ ] Document environment setup
- [ ] Write deployment runbook
- [ ] Create troubleshooting guide

### Operational Documentation

- [ ] Write admin user guide
- [ ] Document monitoring procedures
- [ ] Create incident response plan
- [ ] Document backup and recovery procedures
- [ ] Write scaling guide

---

## 2.21 Pre-Launch Checklist

### Security Review

- [ ] Review all authentication mechanisms
- [ ] Review all authorization checks
- [ ] Verify no PII is logged or stored
- [ ] Verify encryption is implemented correctly
- [ ] Check for SQL injection vulnerabilities
- [ ] Check for XSS vulnerabilities
- [ ] Review rate limiting configuration
- [ ] Penetration testing (if budget allows)

### Performance Review

- [ ] Load test all critical endpoints
- [ ] Verify database performance under load
- [ ] Check cache hit rates
- [ ] Verify queue processing times
- [ ] Check API response times

### Functionality Review

- [ ] Test all happy paths
- [ ] Test all error paths
- [ ] Verify webhook processing
- [ ] Verify blockchain integration
- [ ] Test redemption fulfillment
- [ ] Test marketplace functionality

### Monitoring & Alerting

- [ ] Verify all alerts are configured
- [ ] Test alert notifications
- [ ] Verify logging is working
- [ ] Check dashboard access
- [ ] Set up on-call rotation

---

**Estimated Timeline: 6-8 weeks**

- Week 1-2: Core blockchain services, database setup
- Week 3-4: Game, NFT, marketplace modules
- Week 4-5: Redemption, webhooks, queue processing
- Week 5-6: Testing, optimization, security review
- Week 6-7: AWS deployment, monitoring setup
- Week 7-8: Final testing, documentation, launch prep
