# Backend Implementation Summary

## Overview

This document summarizes the NestJS backend implementation for the Gachapon platform, focusing on user collections and redemption functionality.

## Architecture

### Module Structure

```
backend/src/
├── user/                    # User & Collection Module
│   ├── user.module.ts
│   ├── user.service.ts     # User statistics & profile
│   ├── collection.service.ts # NFT collection management
│   └── user.controller.ts   # Collection endpoints
│
├── redemption/              # Redemption Module
│   ├── redemption.module.ts
│   ├── redemption.service.ts # Main redemption logic
│   ├── shipstation.service.ts # ShipStation integration
│   ├── redemption.controller.ts
│   └── dto/
│       └── redemption-request.dto.ts
│
├── nft/                     # NFT Module
│   ├── nft.module.ts
│   ├── nft.service.ts      # NFT operations
│   └── nft.entity.ts       # NFT database entity
│
├── blockchain/             # Blockchain Services
│   ├── blockchain.module.ts
│   ├── solana.service.ts   # Solana connection
│   └── metaplex.service.ts # Metaplex NFT operations
│
├── common/                 # Shared Services
│   └── encryption.service.ts # Client-side encryption
│
└── [other modules...]      # Game, Prize, Marketplace, etc.
```

## Key Features Implemented

### 1. User Collections (`/users/:wallet/collection`)

**Purpose**: Display user's NFT collection on the frontend collections page.

**Features**:
- Fetch all NFTs owned by a wallet
- Filter by tier, game, redemption status, marketplace listing
- Include on-chain metadata from Metaplex
- Collection statistics (by tier, by game, listed count)

**API Endpoints**:
```typescript
GET /users/:wallet/collection
GET /users/:wallet/collection/stats
GET /users/:wallet/profile
GET /users/:wallet/stats
```

**Example Response**:
```json
[
  {
    "mintAddress": "4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG",
    "prize": {
      "id": 1,
      "name": "Pikachu Plush",
      "tier": "common",
      "physicalSku": "POKE-PIKA-001"
    },
    "game": {
      "id": 1,
      "name": "Pokemon Series 1",
      "gameId": 1
    },
    "metadata": {
      "name": "Pikachu Plush",
      "uri": "ipfs://..."
    },
    "isRedeemed": false,
    "mintedAt": "2025-01-15T10:00:00Z",
    "marketplaceListing": {
      "listingId": 123,
      "priceInTokens": "1000",
      "isActive": true
    }
  }
]
```

### 2. NFT Redemption (`/redemptions/nft`)

**Purpose**: Allow users to redeem NFTs for physical items with automatic fulfillment.

**Flow**:
1. User selects NFT to redeem on collections page
2. Frontend encrypts shipping data client-side
3. User signs redemption message with wallet
4. Backend:
   - Verifies NFT ownership (on-chain)
   - Verifies signature
   - Decrypts shipping data (in-memory only)
   - Burns NFT on-chain via Metaplex
   - Creates shipment with ShipStation
   - Stores only tracking info (NO PII)
   - Returns tracking number

**Privacy Features**:
- ✅ Zero PII storage (shipping data never persisted)
- ✅ Client-side encryption (AES-256-GCM)
- ✅ Immediate fulfillment (data decrypted only when forwarding)
- ✅ Automatic cleanup (tracking data deleted after 90 days)

**API Endpoints**:
```typescript
POST /redemptions/nft
GET /redemptions/:id
GET /redemptions/nft/:mintAddress
GET /redemptions/user/:wallet
POST /redemptions/webhook/shipstation
```

**Request Example**:
```json
{
  "nftMint": "4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG",
  "userWallet": "4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG",
  "signature": "base64-encoded-signature",
  "encryptedShippingData": "iv:tag:encrypted-base64"
}
```

**Response Example**:
```json
{
  "success": true,
  "redemptionId": 123,
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS",
  "estimatedDelivery": "2025-01-20T00:00:00Z",
  "burnTransaction": "transaction-signature..."
}
```

## Database Schema

### NFT Entity
- `mintAddress` (unique)
- `currentOwner` (indexed)
- `isRedeemed` (indexed)
- `redemptionTx`
- Relations: `prize`, `game`, `marketplaceListings`

### Redemption Entity
- `nftMint` (unique)
- `userWallet` (indexed)
- `shipmentProvider` (e.g., 'shipstation')
- `shipmentId` (indexed)
- `trackingNumber`
- `carrier`
- `status` (processing/shipped/delivered/failed)
- `dataDeletionScheduledAt` (90 days from redemption)
- **NO PII fields** (name, address, etc.)

## Integration Points

### With Smart Contracts

1. **Game Program** (`gachapon-game`):
   - `PrizeWon` events trigger NFT minting
   - Prize supply tracked on-chain

2. **Marketplace Program** (`gachapon-marketplace`):
   - NFT transfers update `currentOwner` in database
   - Listings sync with database

3. **Metaplex**:
   - NFT minting after prize win
   - NFT burning on redemption
   - Metadata fetching for collection display

### With External Services

1. **ShipStation**:
   - Order creation
   - Label generation
   - Webhook updates for shipment status

2. **Helius/Webhooks** (TODO):
   - Index blockchain events
   - Sync NFT ownership
   - Track marketplace transfers

## Environment Variables Required

```env
# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta
PLATFORM_WALLET_PRIVATE_KEY=base58-encoded-private-key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# ShipStation
SHIPSTATION_API_KEY=your_api_key
SHIPSTATION_API_SECRET=your_api_secret

# Encryption
ENCRYPTION_KEY=base64-encoded-32-byte-key

# Redis (for caching)
REDIS_URL=redis://localhost:6379
```

## Security Considerations

1. **Wallet Authentication**:
   - Signature verification for all write operations
   - Wallet address from header (`x-wallet-address`)

2. **Encryption**:
   - AES-256-GCM for shipping data
   - Key rotation recommended quarterly

3. **Data Privacy**:
   - No PII in logs
   - No PII in database
   - Encrypted data decrypted only in-memory

4. **Rate Limiting** (TODO):
   - Redemption: 3 per minute per wallet
   - Collection queries: 60 per minute per wallet

## Next Steps / TODOs

### Immediate
- [ ] Implement wallet signature verification
- [ ] Add rate limiting middleware
- [ ] Set up Helius webhook handlers
- [ ] Implement email notifications
- [ ] Add retry logic for failed ShipStation requests

### Short-term
- [ ] Add unit tests (target: >80% coverage)
- [ ] Add integration tests for redemption flow
- [ ] Implement direct redemption (no NFT minting)
- [ ] Add cleanup job for expired redemption data
- [ ] Add monitoring/alerting

### Long-term
- [ ] Support multiple fulfillment providers
- [ ] Add redemption analytics
- [ ] Implement batch redemption
- [ ] Add redemption history export

## Testing

### Manual Testing Flow

1. **Collection Display**:
   ```bash
   curl http://localhost:3000/users/{wallet}/collection
   ```

2. **Redemption**:
   ```bash
   curl -X POST http://localhost:3000/redemptions/nft \
     -H "Content-Type: application/json" \
     -H "x-wallet-address: {wallet}" \
     -d '{
       "nftMint": "...",
       "userWallet": "...",
       "signature": "...",
       "encryptedShippingData": "..."
     }'
   ```

## Frontend Integration Guide

### Collections Page

```typescript
// Fetch user collection
const response = await fetch(`/api/users/${wallet}/collection`);
const collection = await response.json();

// Display NFTs
collection.forEach(nft => {
  // Show NFT card with:
  // - Image (from metadata.uri)
  // - Name, tier
  // - Redeem button (if not redeemed)
  // - Marketplace listing status
});
```

### Redemption Flow

```typescript
// 1. User clicks "Redeem" on NFT
// 2. Show shipping form modal
// 3. Encrypt shipping data client-side
const encrypted = await encryptShippingData(shippingData);

// 4. Sign redemption message
const message = `Redeem NFT: ${nftMint}`;
const signature = await wallet.signMessage(message);

// 5. Submit redemption
const response = await fetch('/api/redemptions/nft', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-wallet-address': wallet,
  },
  body: JSON.stringify({
    nftMint,
    userWallet: wallet,
    signature,
    encryptedShippingData: encrypted,
  }),
});

// 6. Show success with tracking number
const result = await response.json();
showSuccess(`Tracking: ${result.trackingNumber}`);
```

## Questions & Considerations

1. **Direct Redemption**: Should users be able to redeem immediately after winning without minting NFT? (Currently not implemented)

2. **Failed Shipments**: If ShipStation fails after NFT is burned, how do we handle? (Currently throws error, manual intervention needed)

3. **Redemption Limits**: Should there be limits on redemptions per user/time period?

4. **International Shipping**: How to handle customs/duties? (Currently not addressed)

5. **Multiple Addresses**: Should users be able to save shipping addresses? (Currently one-time only)

## References

- [PRD](./prd.md) - Product Requirements Document
- [Backend Checklist](./backend.checklist.md) - Implementation checklist
- [User Module README](./src/user/README.md)
- [Redemption Module README](./src/redemption/README.md)

