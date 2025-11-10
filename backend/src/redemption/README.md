# Redemption Module

This module handles NFT redemption for physical items, including NFT burning and fulfillment integration.

## Features

### Redemption Flow
1. **Verify Ownership**: Checks on-chain NFT ownership
2. **Decrypt Shipping Data**: Decrypts client-side encrypted shipping information (in-memory only)
3. **Burn NFT**: Burns NFT on-chain using Metaplex
4. **Create Shipment**: Immediately creates shipment with ShipStation
5. **Store Tracking**: Stores only tracking information (NO PII)

### Privacy-First Design
- **Zero PII Storage**: Shipping data is never persisted
- **Client-Side Encryption**: Shipping data encrypted before transmission
- **Immediate Fulfillment**: Data decrypted only when forwarding to ShipStation
- **Automatic Cleanup**: Tracking data scheduled for deletion after 90 days

## API Endpoints

### Redemption
```
POST /redemptions/nft
Body: {
  nftMint: string;
  userWallet: string;
  signature: string;
  encryptedShippingData: string;
}

GET /redemptions/:id
GET /redemptions/nft/:mintAddress
GET /redemptions/user/:wallet
```

### Webhooks
```
POST /redemptions/webhook/shipstation
```

## Redemption Request Flow

```typescript
// 1. User encrypts shipping data client-side
const encryptedData = encryptShippingData({
  name: 'John Doe',
  address: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  zip: '94102',
  country: 'US',
  email: 'john@example.com'
});

// 2. User signs redemption message
const signature = await wallet.signMessage(
  `Redeem NFT: ${nftMint}`
);

// 3. Submit redemption request
const result = await redemptionService.redeemNFT({
  nftMint,
  userWallet,
  signature,
  encryptedShippingData: encryptedData
});

// Returns:
// {
//   success: true,
//   redemptionId: 123,
//   trackingNumber: '1Z999AA10123456784',
//   carrier: 'UPS',
//   estimatedDelivery: Date,
//   burnTransaction: 'signature...'
// }
```

## ShipStation Integration

The module integrates with ShipStation for fulfillment:
- Creates orders automatically
- Generates shipping labels
- Tracks shipments via webhooks
- Updates redemption status automatically

### Environment Variables
```
SHIPSTATION_API_KEY=your_api_key
SHIPSTATION_API_SECRET=your_api_secret
```

## Encryption

Shipping data is encrypted using AES-256-GCM:
- Encryption key stored in `ENCRYPTION_KEY` environment variable
- Key should be base64-encoded 32-byte key
- Generate new key: `EncryptionService.generateEncryptionKey()`

## Error Handling

- **NFT Not Found**: Returns 404
- **Already Redeemed**: Returns 400
- **Ownership Mismatch**: Returns 400
- **Invalid Signature**: Returns 400
- **ShipStation Failure**: Returns 500 (NFT still burned, manual intervention needed)

## Data Retention

- Tracking numbers stored for 90 days
- `dataDeletionScheduledAt` field tracks cleanup schedule
- Cleanup job should run daily to delete expired records

