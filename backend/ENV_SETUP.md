# Environment Configuration Guide

## Where Environment Variables Are Defined

Environment variables are loaded by NestJS `ConfigModule` in `src/app.module.ts`:

```typescript
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: ['.env.local', '.env'],  // Loads .env.local first, then .env
})
```

## File Locations

The app looks for environment files in this order (first found wins):
1. `backend/.env.local` (recommended for local development, gitignored)
2. `backend/.env` (fallback, can be gitignored)

## Setup Instructions

### 1. Create Environment File

```bash
cd backend
cp .env.example .env.local
```

### 2. Fill in Required Values

**Minimum Required for Development:**
```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/gachapon_db
```

**For Full Functionality:**
- Supabase credentials (for database)
- Solana RPC URL (defaults to devnet if not set)
- ShipStation API (optional, only needed for redemption)

### 3. Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output to `ENCRYPTION_KEY` in your `.env.local` file.

## Environment Variables Reference

### Required (Production)
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `SOLANA_RPC_URL` - Solana RPC endpoint
- `PLATFORM_WALLET_PRIVATE_KEY` - Platform wallet private key (base58)
- `SHIPSTATION_API_KEY` - ShipStation API key
- `SHIPSTATION_API_SECRET` - ShipStation API secret
- `ENCRYPTION_KEY` - 32-byte base64 encryption key

### Optional (Development)
- `NODE_ENV` - Set to `development` (defaults to development)
- `PORT` - Server port (defaults to 3001)
- `FRONTEND_URL` - Frontend URL for CORS (defaults to http://localhost:3000)
- `REDIS_URL` - Redis connection string (optional)

## Getting Credentials

### Supabase
1. Go to https://supabase.com
2. Create/select your project
3. Go to **Settings** → **API**
4. Copy:
   - Project URL → `SUPABASE_URL`
   - anon public key → `SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
5. Go to **Settings** → **Database**
6. Copy connection string → `DATABASE_URL`

### Solana
- **Devnet**: `https://api.devnet.solana.com` (default)
- **Mainnet**: Use Helius, QuickNode, or other RPC provider
- **Wallet**: Generate with `solana-keygen new` or use existing

### ShipStation
1. Go to https://shipstation.com
2. Sign up/login
3. Go to **Settings** → **API Settings**
4. Generate API credentials
5. Copy to `SHIPSTATION_API_KEY` and `SHIPSTATION_API_SECRET`

## Gitignore

Make sure `.env.local` and `.env` are in `.gitignore`:

```gitignore
# Environment variables
.env
.env.local
.env.*.local
```

## Verification

After setting up, verify your config:

```bash
cd backend
npm run start:dev
```

You should see:
- ✅ All modules loading successfully
- ⚠️ Warnings for optional services (ShipStation, etc.) if not configured
- ❌ Errors only if required services (Database) are missing

## Troubleshooting

**Database Connection Error:**
- Check `DATABASE_URL` format
- Verify database is accessible
- Check SSL settings for Supabase

**Supabase Errors:**
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
- Check that Supabase project is active

**Solana Errors:**
- Verify `SOLANA_RPC_URL` is accessible
- Check `PLATFORM_WALLET_PRIVATE_KEY` is base58 encoded

