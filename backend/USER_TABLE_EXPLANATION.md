# Users Table - Optional

## Current Architecture: No Users Table Required

Your platform uses a **wallet-based identity system** where:
- Users are identified by their Solana wallet address (44 characters, base58)
- No accounts need to be created
- No PII (Personally Identifiable Information) is stored
- User data is aggregated from activity tables

### How User Data Works Without a Users Table

User information is derived from:
- **`plays`** table → `userWallet` column
- **`nfts`** table → `currentOwner` column  
- **`redemptions`** table → `userWallet` column
- **`marketplace_listings`** table → `sellerWallet`/`buyerWallet` columns

Example queries:
```typescript
// Get user's plays
const plays = await playRepository.find({ 
  where: { userWallet: 'ABC123...' } 
});

// Get user's NFTs
const nfts = await nftRepository.find({ 
  where: { currentOwner: 'ABC123...' } 
});

// Get user stats (aggregated)
const stats = await userService.getUserStats('ABC123...');
```

## When You Might Want a Users Table

A `users` table is **optional** but can be useful for:

### 1. Performance Optimization
Cache frequently accessed statistics instead of aggregating every time:
```typescript
// Instead of counting plays every time:
const totalPlays = await playRepository.count({ 
  where: { userWallet } 
});

// Cache it:
const user = await userRepository.findOne({ where: { wallet } });
return user.cachedTotalPlays; // Updated periodically
```

### 2. User Preferences
Store user settings/preferences:
```typescript
{
  wallet: 'ABC123...',
  preferences: {
    notifications: true,
    theme: 'dark',
    defaultCurrency: 'SOL'
  }
}
```

### 3. Profile Data
Store on-chain profile information:
```typescript
{
  wallet: 'ABC123...',
  snsDomain: 'user.sol', // Solana Name Service
  avatarUrl: 'https://...'
}
```

### 4. Activity Tracking
Track when users were last active:
```typescript
{
  wallet: 'ABC123...',
  lastSeenAt: '2025-11-08T...'
}
```

## Implementation

I've created an optional `UserEntity` at `src/user/user.entity.ts`. 

### To Use It:

1. **Generate migration:**
   ```bash
   npm run migration:generate -- migrations/AddUsersTable
   ```

2. **Run migration:**
   ```bash
   npm run migration:run
   ```

3. **Update UserService** to optionally use the users table for caching

### To Remove It:

If you don't need it:
1. Delete `src/user/user.entity.ts`
2. Remove `UserEntity` from `UserModule` imports
3. Regenerate migrations

## Recommendation

**For MVP/Launch:** You don't need a users table. The current wallet-based system works perfectly.

**For Scale:** Consider adding it later if:
- User stats queries become slow
- You want to add user preferences
- You want to cache profile data

The architecture is designed to work perfectly without it! 🎯

