# Frontend Integration Guide

Quick reference for integrating the collections page and redemption flow.

## Collections Page Integration

### Fetch User Collection

```typescript
async function getUserCollection(wallet: string, filters?: {
  tier?: 'common' | 'uncommon' | 'rare' | 'legendary';
  gameId?: number;
  isRedeemed?: boolean;
  hasListing?: boolean;
}) {
  const params = new URLSearchParams();
  if (filters?.tier) params.append('tier', filters.tier);
  if (filters?.gameId) params.append('gameId', filters.gameId.toString());
  if (filters?.isRedeemed !== undefined) params.append('isRedeemed', filters.isRedeemed.toString());
  if (filters?.hasListing !== undefined) params.append('hasListing', filters.hasListing.toString());

  const response = await fetch(
    `/api/users/${wallet}/collection?${params.toString()}`,
    {
      headers: {
        'x-wallet-address': wallet,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch collection');
  }

  return response.json();
}
```

### Display Collection

```typescript
interface CollectionItem {
  mintAddress: string;
  prize: {
    id: number;
    name: string;
    description: string;
    imageUrl: string;
    tier: string;
    physicalSku: string;
  };
  game: {
    id: number;
    name: string;
    gameId: number;
  };
  metadata: {
    name: string;
    symbol: string;
    uri: string;
  };
  isRedeemed: boolean;
  mintedAt: string;
  marketplaceListing?: {
    listingId: number;
    priceInTokens: string;
    isActive: boolean;
  };
}

function CollectionPage({ wallet }: { wallet: string }) {
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserCollection(wallet)
      .then(setCollection)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [wallet]);

  if (loading) return <Loading />;

  return (
    <div className="collection-grid">
      {collection.map((nft) => (
        <NFTCard
          key={nft.mintAddress}
          nft={nft}
          onRedeem={() => handleRedemption(nft)}
        />
      ))}
    </div>
  );
}
```

## Redemption Flow

### Client-Side Encryption

```typescript
import { encrypt } from 'crypto-js';

interface ShippingData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  email?: string;
}

async function encryptShippingData(data: ShippingData): Promise<string> {
  // Get public encryption key from backend (or use hardcoded public key)
  const publicKey = await fetch('/api/encryption/public-key').then(r => r.text());
  
  // Encrypt using AES-256-GCM (or use Web Crypto API)
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: crypto.getRandomValues(new Uint8Array(12)),
      tagLength: 128,
    },
    publicKey, // This should be a CryptoKey object
    new TextEncoder().encode(JSON.stringify(data))
  );

  // Format: iv:tag:encrypted (all base64)
  const iv = btoa(String.fromCharCode(...new Uint8Array(encrypted.slice(0, 12))));
  const tag = btoa(String.fromCharCode(...new Uint8Array(encrypted.slice(-16))));
  const ciphertext = btoa(String.fromCharCode(...new Uint8Array(encrypted.slice(12, -16))));
  
  return `${iv}:${tag}:${ciphertext}`;
}
```

### Redemption Request

```typescript
async function redeemNFT(
  wallet: PublicKey,
  nftMint: string,
  shippingData: ShippingData
): Promise<RedemptionResult> {
  // 1. Encrypt shipping data
  const encryptedShippingData = await encryptShippingData(shippingData);

  // 2. Sign redemption message
  const message = `Redeem NFT: ${nftMint}\nTimestamp: ${Date.now()}`;
  const signature = await wallet.signMessage(new TextEncoder().encode(message));
  const signatureBase64 = btoa(String.fromCharCode(...signature));

  // 3. Submit redemption request
  const response = await fetch('/api/redemptions/nft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wallet-address': wallet.toBase58(),
    },
    body: JSON.stringify({
      nftMint,
      userWallet: wallet.toBase58(),
      signature: signatureBase64,
      encryptedShippingData,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Redemption failed');
  }

  return response.json();
}
```

### Redemption Component

```typescript
function RedemptionModal({ nft, onClose }: { nft: CollectionItem; onClose: () => void }) {
  const [shippingData, setShippingData] = useState<ShippingData>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const wallet = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await redeemNFT(wallet.publicKey!, nft.mintAddress, shippingData);
      
      // Show success with tracking number
      alert(`Redemption successful! Tracking: ${result.trackingNumber}`);
      onClose();
      
      // Refresh collection
      window.location.reload();
    } catch (error) {
      alert(`Redemption failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2>Redeem {nft.prize.name}</h2>
      <p>This will permanently burn your NFT and ship the physical item.</p>
      
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Full Name"
          value={shippingData.name}
          onChange={(e) => setShippingData({ ...shippingData, name: e.target.value })}
          required
        />
        <input
          placeholder="Street Address"
          value={shippingData.address}
          onChange={(e) => setShippingData({ ...shippingData, address: e.target.value })}
          required
        />
        <input
          placeholder="City"
          value={shippingData.city}
          onChange={(e) => setShippingData({ ...shippingData, city: e.target.value })}
          required
        />
        <input
          placeholder="State"
          value={shippingData.state}
          onChange={(e) => setShippingData({ ...shippingData, state: e.target.value })}
          required
        />
        <input
          placeholder="ZIP Code"
          value={shippingData.zip}
          onChange={(e) => setShippingData({ ...shippingData, zip: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="Email (optional, for tracking updates)"
          value={shippingData.email}
          onChange={(e) => setShippingData({ ...shippingData, email: e.target.value })}
        />
        
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Redeem NFT'}
        </button>
      </form>
    </Modal>
  );
}
```

## Collection Statistics

```typescript
async function getCollectionStats(wallet: string) {
  const response = await fetch(`/api/users/${wallet}/collection/stats`, {
    headers: {
      'x-wallet-address': wallet,
    },
  });

  return response.json();
}

// Usage
const stats = await getCollectionStats(wallet);
console.log(`Total NFTs: ${stats.total}`);
console.log(`Rare items: ${stats.byTier.rare}`);
console.log(`Listed: ${stats.listed}`);
```

## Redemption Status

```typescript
async function getRedemptionStatus(nftMint: string) {
  const response = await fetch(`/api/redemptions/nft/${nftMint}`);
  return response.json();
}

// Usage
const redemption = await getRedemptionStatus(nftMint);
console.log(`Status: ${redemption.status}`);
console.log(`Tracking: ${redemption.trackingNumber}`);
console.log(`Carrier: ${redemption.carrier}`);
```

## Error Handling

```typescript
try {
  const result = await redeemNFT(wallet, nftMint, shippingData);
  // Success
} catch (error) {
  if (error.message.includes('already been redeemed')) {
    // Show error: NFT already redeemed
  } else if (error.message.includes('not owned')) {
    // Show error: NFT not owned by wallet
  } else if (error.message.includes('Invalid signature')) {
    // Show error: Signature verification failed
  } else {
    // Generic error
  }
}
```

## Filtering Examples

```typescript
// Get only rare NFTs
const rareNFTs = await getUserCollection(wallet, { tier: 'rare' });

// Get NFTs from specific game
const gameNFTs = await getUserCollection(wallet, { gameId: 1 });

// Get NFTs that are listed on marketplace
const listedNFTs = await getUserCollection(wallet, { hasListing: true });

// Get all NFTs (including redeemed)
const allNFTs = await getUserCollection(wallet, { isRedeemed: undefined });
```

## TypeScript Types

```typescript
// Copy these types to your frontend codebase

export interface CollectionItem {
  mintAddress: string;
  prize: {
    id: number;
    name: string;
    description: string;
    imageUrl: string;
    tier: 'common' | 'uncommon' | 'rare' | 'legendary';
    physicalSku: string;
  };
  game: {
    id: number;
    name: string;
    gameId: number;
  };
  metadata: {
    name: string;
    symbol: string;
    uri: string;
    onChainMetadata?: any;
  };
  isRedeemed: boolean;
  mintedAt: string;
  marketplaceListing?: {
    listingId: number;
    priceInTokens: string;
    isActive: boolean;
  };
}

export interface RedemptionResult {
  success: boolean;
  redemptionId: number;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  burnTransaction?: string;
}

export interface CollectionStats {
  total: number;
  byTier: {
    common: number;
    uncommon: number;
    rare: number;
    legendary: number;
  };
  byGame: Record<number, number>;
  listed: number;
}
```

