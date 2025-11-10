# User & Collection Module

This module handles user collections, NFT management, and redemption flows.

## Features

### Collection Service
- **Get User Collection**: Fetch all NFTs owned by a wallet with filtering options
- **Get NFT Details**: Get detailed information about a specific NFT
- **Collection Statistics**: Get statistics about a user's collection (by tier, by game, etc.)

### User Service
- **User Profile**: Get user profile with statistics
- **User Stats**: Get detailed statistics (plays, wins, NFTs owned/redeemed, marketplace activity)

## API Endpoints

### Collections
```
GET /users/:wallet/collection
Query params:
  - tier: 'common' | 'uncommon' | 'rare' | 'legendary'
  - gameId: number
  - isRedeemed: boolean
  - hasListing: boolean

GET /users/:wallet/collection/stats
```

### User Profile
```
GET /users/:wallet/profile
GET /users/:wallet/stats
```

## Usage Example

```typescript
// Get user's collection
const collection = await collectionService.getUserCollection(
  '4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG',
  { tier: 'rare', isRedeemed: false }
);

// Get collection statistics
const stats = await collectionService.getCollectionStats(wallet);
```

## Integration with Redemption

The collection service works closely with the redemption module:
- NFTs marked as `isRedeemed: true` are filtered out by default
- Collection items include redemption status
- After redemption, NFTs are automatically excluded from collection queries

