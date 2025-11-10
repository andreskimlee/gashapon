# Section 1: Solana Programs - Implementation Checklist

## 1.1 Game Program

### Setup & Configuration

- [ ] Initialize Anchor project (`anchor init gachapon-game`)
- [ ] Configure `Anchor.toml` with correct network settings
- [ ] Set up program keypairs (devnet, mainnet-beta)
- [ ] Configure `declare_id!()` with program addresses
- [ ] Set up Switchboard VRF devnet account
- [ ] Document all program addresses in deployment guide

### Account Structures

- [ ] Define `Game` account structure

  - [ ] Add authority (admin wallet)
  - [ ] Add game_id (u64)
  - [ ] Add token_mint (SPL token address)
  - [ ] Add cost_usd (USD price in cents)
  - [ ] Add treasury wallet address
  - [ ] Add prize_pool (Vec<PrizeConfig>)
  - [ ] Add total_plays counter
  - [ ] Add is_active flag
  - [ ] Add bump seed
  - [ ] Calculate and set proper account size

- [ ] Define `PrizeConfig` struct

  - [ ] Add prize_id
  - [ ] Add name (String, max length)
  - [ ] Add metadata_uri (IPFS/Arweave link)
  - [ ] Add physical_sku
  - [ ] Add tier enum (Common/Uncommon/Rare/Legendary)
  - [ ] Add probability_bp (basis points, u16)
  - [ ] Add supply_total
  - [ ] Add supply_remaining

- [ ] Define `PrizeTier` enum
  - [ ] Common variant
  - [ ] Uncommon variant
  - [ ] Rare variant
  - [ ] Legendary variant

### Instructions - Core Game Logic

- [ ] **initialize_game** instruction

  - [ ] Accept game_id, cost_usd, prizes vector as params
  - [ ] Validate probabilities sum to 10000 (100%)
  - [ ] Validate all required fields present
  - [ ] Initialize Game PDA with seeds [b"game", game_id]
  - [ ] Set authority to signer
  - [ ] Store all game configuration
  - [ ] Emit GameCreated event
  - [ ] Add proper constraints and checks

- [ ] **play_game** instruction

  - [ ] Accept token_amount parameter (calculated by frontend)
  - [ ] Verify game is_active = true
  - [ ] Verify at least one prize has supply_remaining > 0
  - [ ] Transfer SPL tokens from user to treasury
  - [ ] Request randomness from Switchboard VRF
  - [ ] Store VRF request reference
  - [ ] Emit GamePlayInitiated event
  - [ ] Add rate limiting checks (optional)

- [ ] **finalize_play** instruction (VRF callback)
  - [ ] Receive random value from Switchboard
  - [ ] Validate VRF result buffer (32 bytes)
  - [ ] Implement prize selection algorithm
    - [ ] Convert random bytes to u64
    - [ ] Normalize to 0-9999 range
    - [ ] Use cumulative probability distribution
    - [ ] Skip prizes with supply_remaining = 0
    - [ ] Return selected prize
  - [ ] Decrement prize supply_remaining by 1
  - [ ] Increment game total_plays counter
  - [ ] Check if all prizes depleted, set is_active = false
  - [ ] Emit PrizeWon event with all details
  - [ ] Store random_value for transparency

### Instructions - Admin Functions

- [ ] **update_game_status** instruction

  - [ ] Verify signer is game authority
  - [ ] Accept is_active boolean
  - [ ] Update game.is_active field
  - [ ] Emit GameStatusUpdated event

- [ ] **replenish_prize_supply** instruction

  - [ ] Verify signer is game authority
  - [ ] Accept prize_id and additional_supply params
  - [ ] Find prize in prize_pool
  - [ ] Add to supply_remaining and supply_total
  - [ ] Reactivate game if was inactive
  - [ ] Emit SupplyReplenished event

- [ ] **update_prize_metadata** instruction (optional)
  - [ ] Verify signer is game authority
  - [ ] Accept prize_id and new metadata_uri
  - [ ] Update prize metadata_uri
  - [ ] Emit MetadataUpdated event

### Events

- [ ] Define `GameCreated` event (game_id, authority, timestamp)
- [ ] Define `GamePlayInitiated` event (user, game_id, token_amount, timestamp)
- [ ] Define `PrizeWon` event (user, game_id, prize_id, tier, random_value, timestamp)
- [ ] Define `GameStatusUpdated` event (game_id, is_active, timestamp)
- [ ] Define `SupplyReplenished` event (game_id, prize_id, new_supply, timestamp)

### Error Codes

- [ ] Define custom error enum
  - [ ] InvalidProbabilities (must sum to 10000)
  - [ ] GameInactive
  - [ ] OutOfStock
  - [ ] InvalidVRF
  - [ ] Unauthorized
  - [ ] PrizeNotFound
  - [ ] InsufficientFunds
  - [ ] InvalidTokenAmount

### Context Structs

- [ ] Define `InitializeGame` context

  - [ ] Game PDA account (init)
  - [ ] Authority signer (mut, payer)
  - [ ] Token mint account
  - [ ] Treasury account (unchecked)
  - [ ] System program

- [ ] Define `PlayGame` context

  - [ ] Game account (mut)
  - [ ] User signer (mut)
  - [ ] User token account (mut)
  - [ ] Treasury token account (mut)
  - [ ] VRF account (mut)
  - [ ] Oracle queue account
  - [ ] Queue authority
  - [ ] Data buffer
  - [ ] Permission account
  - [ ] Escrow account (mut)
  - [ ] Switchboard program
  - [ ] Token program
  - [ ] System program

- [ ] Define `FinalizePlay` context

  - [ ] Game account (mut)
  - [ ] User account (signer)
  - [ ] VRF account (unchecked, has result)

- [ ] Define `UpdateGame` context
  - [ ] Game account (mut)
  - [ ] Authority signer
  - [ ] Verify authority constraint

### Testing

- [ ] Write unit tests for prize selection algorithm

  - [ ] Test with even distribution
  - [ ] Test with skewed probabilities
  - [ ] Test with out-of-stock prizes
  - [ ] Test edge cases (all sold out)

- [ ] Write integration tests

  - [ ] Test initialize_game with valid data
  - [ ] Test initialize_game with invalid probabilities
  - [ ] Test play_game flow end-to-end
  - [ ] Test play_game when inactive
  - [ ] Test play_game when out of stock
  - [ ] Test finalize_play with VRF result
  - [ ] Test supply depletion
  - [ ] Test admin functions (update status, replenish)
  - [ ] Test unauthorized access attempts

- [ ] Test on devnet
  - [ ] Deploy program to devnet
  - [ ] Create test game with real VRF
  - [ ] Execute 50+ plays to verify randomness distribution
  - [ ] Test all admin functions
  - [ ] Verify events are emitted correctly

### Switchboard VRF Integration

- [ ] Research Switchboard VRF documentation
- [ ] Create VRF account on devnet
- [ ] Fund VRF account with devnet tokens
- [ ] Configure callback to finalize_play
- [ ] Test VRF request and fulfillment
- [ ] Implement error handling for VRF failures
- [ ] Set up monitoring for VRF account balance
- [ ] Document VRF setup process for mainnet

### Security & Auditing

- [ ] Add proper access control (authority checks)
- [ ] Implement reentrancy guards (use Anchor's automatic protection)
- [ ] Validate all user inputs
- [ ] Check for integer overflow/underflow
- [ ] Ensure PDA derivation is secure
- [ ] Review token transfer logic
- [ ] Add rate limiting considerations
- [ ] Code review with team
- [ ] Consider formal audit (OtterSec, Neodyme, etc.)
- [ ] Set up bug bounty program

### Deployment

- [ ] Verify all tests pass
- [ ] Build optimized program (`anchor build --verifiable`)
- [ ] Deploy to devnet for final testing
- [ ] Create deployment checklist
- [ ] Deploy to mainnet-beta
- [ ] Verify deployed program matches source
- [ ] Create multisig for upgrade authority (Squads)
- [ ] Transfer upgrade authority to multisig
- [ ] Document all program addresses

---

## 1.2 NFT Minting (Metaplex Integration)

### Setup

- [ ] Install Metaplex SDK dependencies
  - [ ] `@metaplex-foundation/js`
  - [ ] `@metaplex-foundation/mpl-token-metadata`
- [ ] Set up Metaplex client in backend
- [ ] Create NFT collection master edition
- [ ] Configure collection metadata
- [ ] Upload collection image to Arweave/IPFS

### NFT Metadata Standards

- [ ] Define JSON metadata schema for prizes

  - [ ] name
  - [ ] symbol (e.g., "GACHA")
  - [ ] description
  - [ ] image (Arweave/IPFS URL)
  - [ ] attributes array
    - [ ] Redeemable (trait_type, value: "True")
    - [ ] Tier (Common/Uncommon/Rare/Legendary)
    - [ ] Physical Item SKU
    - [ ] Game Name
    - [ ] Game ID
    - [ ] Won At (timestamp)
  - [ ] properties.files array
  - [ ] properties.category

- [ ] Create metadata upload script
- [ ] Upload all prize metadata to Arweave
- [ ] Store metadata URIs in database
- [ ] Verify all metadata is accessible

### Minting Logic (Backend)

- [ ] Create `mintPrizeNFT` function

  - [ ] Accept prize_id and winner wallet
  - [ ] Fetch prize metadata URI from DB
  - [ ] Use Metaplex SDK to mint NFT
  - [ ] Set collection address
  - [ ] Set creators array (platform wallet, verified: true)
  - [ ] Set seller_fee_basis_points (royalty, e.g., 500 = 5%)
  - [ ] Assign to winner's wallet
  - [ ] Return mint address

- [ ] Create `burnNFT` function for redemptions
  - [ ] Accept NFT mint address
  - [ ] Verify current owner is signer
  - [ ] Burn NFT using Metaplex SDK
  - [ ] Emit burn event
  - [ ] Return transaction signature

### Testing

- [ ] Test minting on devnet
- [ ] Verify metadata displays correctly in wallets
- [ ] Test collection verification
- [ ] Test burning NFTs
- [ ] Verify burned NFTs are no longer transferable

---

## 1.3 Marketplace Program

### Setup & Configuration

- [ ] Initialize Anchor project (`anchor init gachapon-marketplace`)
- [ ] Configure `Anchor.toml`
- [ ] Set up program keypairs
- [ ] Configure `declare_id!()`

### Account Structures

- [ ] Define `Listing` account

  - [ ] seller (Pubkey)
  - [ ] nft_mint (Pubkey)
  - [ ] price_in_tokens (u64)
  - [ ] is_active (bool)
  - [ ] listed_at (i64)
  - [ ] cancelled_at (Option<i64>)
  - [ ] sold_at (Option<i64>)
  - [ ] buyer (Option<Pubkey>)
  - [ ] bump (u8)
  - [ ] Calculate account size

- [ ] Define marketplace escrow PDA seeds
  - [ ] [b"escrow", nft_mint]

### Instructions

- [ ] **list_nft** instruction

  - [ ] Accept price_in_tokens parameter
  - [ ] Verify NFT is owned by seller
  - [ ] Verify NFT is not already redeemed (check metadata)
  - [ ] Create Listing PDA [b"listing", nft_mint]
  - [ ] Transfer NFT to marketplace escrow PDA
  - [ ] Set listing details
  - [ ] Emit NFTListed event

- [ ] **cancel_listing** instruction

  - [ ] Verify signer is seller
  - [ ] Verify listing is_active = true
  - [ ] Transfer NFT back to seller
  - [ ] Set is_active = false
  - [ ] Set cancelled_at timestamp
  - [ ] Emit NFTDelisted event

- [ ] **buy_nft** instruction

  - [ ] Verify listing is_active = true
  - [ ] Transfer tokens from buyer to seller
  - [ ] Calculate platform fee (2%)
  - [ ] Transfer fee to platform treasury
  - [ ] Transfer NFT from escrow to buyer
  - [ ] Update listing (is_active = false, sold_at, buyer)
  - [ ] Emit NFTSold event

- [ ] **update_listing_price** instruction (optional)
  - [ ] Verify signer is seller
  - [ ] Verify listing is active
  - [ ] Update price_in_tokens
  - [ ] Emit PriceUpdated event

### Events

- [ ] Define `NFTListed` event (seller, nft_mint, price, timestamp)
- [ ] Define `NFTDelisted` event (seller, nft_mint, timestamp)
- [ ] Define `NFTSold` event (seller, buyer, nft_mint, price, fee, timestamp)
- [ ] Define `PriceUpdated` event (nft_mint, old_price, new_price, timestamp)

### Error Codes

- [ ] Define custom errors
  - [ ] Unauthorized
  - [ ] ListingInactive
  - [ ] NFTNotRedeemable
  - [ ] InsufficientFunds
  - [ ] InvalidPrice
  - [ ] AlreadyListed

### Context Structs

- [ ] Define `ListNFT` context

  - [ ] Listing PDA (init)
  - [ ] Seller (mut, signer)
  - [ ] NFT mint
  - [ ] NFT token account (mut)
  - [ ] Marketplace escrow token account (mut, PDA)
  - [ ] NFT metadata account
  - [ ] Token program
  - [ ] System program

- [ ] Define `CancelListing` context

  - [ ] Listing account (mut)
  - [ ] Seller (mut, signer)
  - [ ] NFT token account (mut)
  - [ ] Marketplace escrow token account (mut)
  - [ ] Token program

- [ ] Define `BuyNFT` context
  - [ ] Listing account (mut)
  - [ ] Buyer (mut, signer)
  - [ ] Seller (mut, receives tokens)
  - [ ] Platform treasury (mut, receives fee)
  - [ ] Buyer token account (mut)
  - [ ] Seller token account (mut)
  - [ ] Platform treasury token account (mut)
  - [ ] Buyer NFT token account (mut)
  - [ ] Marketplace escrow NFT token account (mut)
  - [ ] Token program
  - [ ] System program

### Testing

- [ ] Write unit tests

  - [ ] Test listing creation
  - [ ] Test price validation
  - [ ] Test unauthorized access
  - [ ] Test token transfers

- [ ] Write integration tests

  - [ ] Test full listing flow
  - [ ] Test cancellation flow
  - [ ] Test purchase flow
  - [ ] Test fee calculation
  - [ ] Test with redeemed NFTs (should fail)
  - [ ] Test concurrent listings

- [ ] Test on devnet
  - [ ] Deploy to devnet
  - [ ] Create test listings
  - [ ] Execute test purchases
  - [ ] Verify token and NFT transfers
  - [ ] Verify fees collected correctly

### Security

- [ ] Verify NFT ownership before listing
- [ ] Validate price is non-zero
- [ ] Check for reentrancy issues
- [ ] Ensure escrow PDA security
- [ ] Validate all token transfers
- [ ] Add constraints on all accounts
- [ ] Code review
- [ ] Consider audit

### Deployment

- [ ] Test all functionality on devnet
- [ ] Deploy to mainnet-beta
- [ ] Verify deployed program
- [ ] Set up multisig upgrade authority
- [ ] Document program address

---

## 1.4 Cross-Program Integration

### Integration Points

- [ ] Game Program → Emit events for backend indexer
- [ ] Backend → Metaplex for NFT minting
- [ ] Backend → Marketplace for listing management
- [ ] Marketplace → Backend indexer for sale history

### Event Monitoring

- [ ] Set up Helius webhook for Game Program events
- [ ] Set up Helius webhook for Marketplace events
- [ ] Configure webhook endpoints in backend
- [ ] Test event delivery

---

## 1.5 Documentation

- [ ] Write program deployment guide
- [ ] Document all instruction parameters
- [ ] Create admin operation runbook
- [ ] Document PDA seed derivations
- [ ] Create architecture diagram
- [ ] Write security best practices doc
- [ ] Create troubleshooting guide
- [ ] Document Switchboard VRF setup

---

## 1.6 Mainnet Preparation

- [ ] All tests passing on devnet
- [ ] Security audit completed (if applicable)
- [ ] Multisig wallet created (Squads)
- [ ] Treasury wallet secured (hardware wallet recommended)
- [ ] Monitoring and alerting set up
- [ ] Emergency procedures documented
- [ ] Upgrade plan documented
- [ ] Rollback plan documented
- [ ] Team trained on admin operations

---

**Estimated Timeline: 4-6 weeks**

- Week 1-2: Game Program development & testing
- Week 2-3: Marketplace Program development & testing
- Week 3-4: Integration testing & devnet deployment
- Week 4-5: Security review & fixes
- Week 5-6: Mainnet deployment & monitoring
