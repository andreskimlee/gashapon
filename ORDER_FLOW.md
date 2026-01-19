# Gashapon Order Flow & Fulfillment

This document outlines the order flow from prize redemption to physical delivery.

## Order Flow Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User Wins     │────▶│  NFT Minted     │────▶│  User Redeems   │
│   Prize         │     │  (On-chain)     │     │  Prize          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                        ┌───────────────────────────────┘
                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Shipping Label │◀────│  Backend        │◀────│  Encrypted      │
│  Generated      │     │  Processing     │     │  Shipping Data  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Admin Prints   │────▶│  Package        │────▶│  User Receives  │
│  Label          │     │  Shipped        │     │  Prize          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Detailed Steps

### 1. Prize Redemption (Frontend)

1. User wins a prize and receives an NFT
2. User navigates to "Redeem Prize" screen
3. User enters shipping information:
   - Full Name
   - Address (with Google Places Autocomplete for validation)
   - City, State, ZIP, Country
   - Phone Number (required by carriers)
   - Email (optional, for tracking notifications)

### 2. Data Encryption (Frontend → API Route)

1. Frontend sends shipping data to `/api/encrypt-shipping` (Next.js API route)
2. Server-side encryption using AES-256-GCM
3. Encrypted payload returned to frontend
4. No plaintext shipping data stored in browser

### 3. Redemption Submission (Frontend → Backend)

Frontend sends to `POST /redemptions/nft`:

```json
{
  "nftMint": "NFT mint address",
  "userWallet": "User's wallet address",
  "signature": "Base58-encoded ed25519 signature",
  "message": "The signed message (for server verification)",
  "timestamp": 1705678901234,
  "encryptedShippingData": "Base64 encrypted shipping data"
}
```

The `signature` is created by the user's wallet signing this exact message:

```
Gashapon Prize Redemption

NFT: {nftMint}
Wallet: {userWallet}
Timestamp: {timestamp}

By signing this message, you confirm that you own this NFT and authorize its redemption for physical delivery.
```

### 4. Backend Processing

1. **Verify NFT ownership** - Check user owns the NFT
2. **Check redemption eligibility** - Ensure NFT not already redeemed
3. **Decrypt shipping data** - Server-side decryption
4. **Create shipping label** via ShipEngine API:
   - Package dimensions and weight
   - Ship-from address (configured in env)
   - Ship-to address (from encrypted data)
   - Carrier and service selection
5. **Store redemption record** (NO PII stored):
   - NFT mint address
   - User wallet
   - Shipment ID
   - Tracking number
   - Label download URLs
6. **Return success** with tracking info

### 5. Label Generation (ShipEngine)

ShipEngine returns:

```json
{
  "label_id": "se-12345",
  "tracking_number": "1Z999AA10123456784",
  "carrier_code": "ups",
  "label_download": {
    "pdf": "https://...",
    "png": "https://...",
    "zpl": "https://..."
  }
}
```

### 6. Admin Fulfillment

1. Admin accesses `/admin/orders`
2. Views orders with status: processing, shipped, delivered, failed
3. Downloads shipping labels (PDF)
4. Prints labels and applies to packages
5. Hands off to carrier

### 7. Shipment Tracking

- Tracking URLs generated for major carriers:
  - **UPS**: `https://www.ups.com/track?tracknum={tracking}`
  - **USPS**: `https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}`
  - **FedEx**: `https://www.fedex.com/fedextrack/?trknbr={tracking}`
  - **DHL**: `https://www.dhl.com/en/express/tracking.html?AWB={tracking}`

---

## Database Schema (Redemptions)

| Column            | Type         | Description                            |
| ----------------- | ------------ | -------------------------------------- |
| id                | int          | Primary key                            |
| nftMint           | varchar(44)  | NFT mint address                       |
| userWallet        | varchar(44)  | User's wallet                          |
| prizeId           | int          | FK to prizes table                     |
| shipmentProvider  | varchar(50)  | e.g., "shipstation"                    |
| shipmentId        | varchar(100) | Provider's shipment ID                 |
| trackingNumber    | varchar(100) | Carrier tracking number                |
| carrier           | varchar(50)  | Carrier name                           |
| carrierCode       | varchar(50)  | Carrier code                           |
| labelPdfUrl       | text         | PDF label download URL                 |
| labelPngUrl       | text         | PNG label download URL                 |
| trackingUrl       | text         | Carrier tracking URL                   |
| status            | enum         | processing, shipped, delivered, failed |
| estimatedDelivery | date         | Estimated delivery date                |
| redeemedAt        | timestamp    | When redeemed                          |
| shippedAt         | timestamp    | When shipped                           |
| deliveredAt       | timestamp    | When delivered                         |

---

## Environment Variables Required

### Frontend

```env
ENCRYPTION_KEY=<32-byte base64 key>  # Server-side only
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-key>  # For address autocomplete
```

### Backend

```env
# Encryption
ENCRYPTION_KEY=<same 32-byte base64 key as frontend>

# ShipEngine
SHIPENGINE_API_KEY=<your-api-key>
SHIPENGINE_CARRIER_ID=<carrier-id>
SHIPENGINE_SERVICE_CODE=<service-code>

# Ship-From Address
SHIPSTATION_SHIP_FROM_NAME=Your Company Name
SHIPSTATION_SHIP_FROM_PHONE=+15551234567
SHIPSTATION_SHIP_FROM_STREET1=123 Warehouse St
SHIPSTATION_SHIP_FROM_STREET2=Suite 100
SHIPSTATION_SHIP_FROM_CITY=Los Angeles
SHIPSTATION_SHIP_FROM_STATE=CA
SHIPSTATION_SHIP_FROM_POSTAL_CODE=90001
SHIPSTATION_SHIP_FROM_COUNTRY=US

# Package Defaults (optional)
SHIPENGINE_PACKAGE_WEIGHT=1
SHIPENGINE_PACKAGE_LENGTH=8
SHIPENGINE_PACKAGE_WIDTH=6
SHIPENGINE_PACKAGE_HEIGHT=4
SHIPENGINE_PACKAGE_WEIGHT_UNIT=pound
SHIPENGINE_PACKAGE_DIMENSION_UNIT=inch
```

---

## FAQ

### Does the label generation need to account for dimensions?

**Yes**, ShipEngine uses both weight and dimensions for rate calculation.

**Current Implementation:**

- Weight is pulled from prize `weightGrams` field
- Dimensions use defaults from environment variables

**Recommendations:**

1. **For uniform products** (e.g., all prizes ship in same box):
   - Set default dimensions in env variables
   - Only track weight per prize

2. **For variable products** (different box sizes):
   - Add dimension fields to prize entity:

     ```typescript
     @Column({ type: 'decimal', nullable: true })
     lengthInches: number | null;

     @Column({ type: 'decimal', nullable: true })
     widthInches: number | null;

     @Column({ type: 'decimal', nullable: true })
     heightInches: number | null;
     ```

   - Update admin form to collect dimensions
   - Pass dimensions to ShipEngine when creating label

3. **For bulky/oddly-shaped items**:
   - Use dimensional weight (DIM weight) pricing
   - Formula: `(L × W × H) / DIM Factor`
   - Carriers use the greater of actual weight or DIM weight

### How to handle international shipping?

1. Add country-specific carrier services
2. Handle customs forms (ShipEngine supports this)
3. Consider duties/taxes implications
4. Update ship-to validation for international addresses

### How to handle returns?

1. Create return label via ShipEngine
2. Track return shipment
3. Update NFT state when returned
4. Re-mint or destroy NFT based on prize condition

### How to batch print labels?

1. ShipEngine supports batch label creation
2. Modify admin page to select multiple orders
3. Call batch endpoint to generate combined PDF
4. Single download for multiple labels

---

## Carrier Selection

### Recommended Carriers by Use Case

| Use Case      | Carrier | Service       | Notes              |
| ------------- | ------- | ------------- | ------------------ |
| Standard US   | UPS     | Ground        | 3-5 business days  |
| Fast US       | UPS     | Next Day Air  | Expensive          |
| Low Cost US   | USPS    | Priority Mail | Good for <1lb      |
| International | DHL     | Express       | Fast but expensive |

### Setting Up Carriers in ShipEngine

1. Go to ShipEngine dashboard
2. Navigate to Carriers
3. Connect your carrier accounts
4. Get the `carrier_id` for each
5. Test label generation in sandbox mode

---

## Security Considerations

### NFT Ownership Verification ✅ FULLY IMPLEMENTED

The redemption flow uses **three layers of security** to prevent unauthorized access:

#### 1. On-chain Ownership Verification ✅

```typescript
// Backend: metaplex.service.ts
const onChainOwner = await this.metaplexService.getNFTOwner(nftMint);
if (onChainOwner !== request.userWallet) {
  throw new BadRequestException("NFT is not owned by this wallet");
}
```

- Queries Solana blockchain for current NFT owner
- Compares on-chain owner with request's wallet address
- **Cannot be spoofed** - blockchain is source of truth

#### 2. Cryptographic Signature Verification ✅

**Frontend (`RedeemPrizeScreen.tsx`):**

```typescript
// Create deterministic message
const message = `Gashapon Prize Redemption\n\nNFT: ${prizeMint}\nWallet: ${userWallet}\nTimestamp: ${timestamp}\n\nBy signing this message, you confirm that you own this NFT and authorize its redemption for physical delivery.`;

// Sign with wallet (ed25519)
const signatureBytes = await signMessage(new TextEncoder().encode(message));
const signatureBase58 = bs58.encode(signatureBytes);
```

**Backend (`redemption.service.ts`):**

```typescript
// Verify ed25519 signature using tweetnacl
const signature = bs58.decode(signatureBase58);
const publicKey = bs58.decode(wallet);
const messageBytes = new TextEncoder().encode(message);
const isValid = nacl.sign.detached.verify(messageBytes, signature, publicKey);
```

- Proves the REQUEST came from the wallet owner
- Only the holder of the private key can produce a valid signature
- Message format is validated server-side

#### 3. Replay Protection ✅

```typescript
// Backend: Check timestamp within 5 minutes
const FIVE_MINUTES_MS = 5 * 60 * 1000;
if (Date.now() - timestamp > FIVE_MINUTES_MS) {
  return false; // Signature too old
}
if (timestamp > Date.now() + 30000) {
  return false; // Future timestamp (clock skew check)
}
```

- Prevents reuse of captured signatures
- 5-minute window balances security with UX
- 30-second future tolerance for clock skew

### Complete Security Flow

```
User Request                    Backend Validation
─────────────                   ──────────────────
nftMint: "ABC..."               ✓ Valid Solana address (regex)
userWallet: "XYZ..."            ✓ Valid Solana address (regex)
timestamp: 1705678901234        ✓ Within 5 minutes (replay protection) ✅
message: "Gashapon..."          ✓ Format matches expected structure    ✅
signature: "5Tx8F..."           ✓ ed25519 verify(message, sig, pubkey) ✅
                                ✓ On-chain owner(ABC...) == XYZ...     ✅
```

### Why This Cannot Be Spoofed

1. **Attacker sees someone else's NFT** → Can't produce valid signature without private key
2. **Attacker intercepts a valid signature** → Timestamp expires in 5 minutes
3. **Attacker replays old signature** → Timestamp check rejects it
4. **Attacker modifies the message** → Signature verification fails

### Shipping Data Protection

1. **No PII in database** - Only encrypted data transmitted, decrypted in memory
2. **90-day data retention** - Scheduled deletion after delivery
3. **Server-side encryption** - Keys never exposed to browser
4. **Address validation** - Google Places ensures accurate addresses

### Admin Access Control

1. Wallet-based authentication
2. Only authorized wallets can access admin
3. Consider adding role-based access for multi-admin scenarios

---

## Monitoring & Alerts

### Recommended Alerts

1. **High failure rate** - If >5% of labels fail to generate
2. **Stuck orders** - Processing >24 hours without label
3. **Delivery exceptions** - Carrier reports delivery issue
4. **Low label inventory** - If using prepaid labels

### Metrics to Track

- Orders per day
- Average fulfillment time (order → shipped)
- Delivery success rate
- Average shipping cost per order
- Returns rate
