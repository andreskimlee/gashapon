# Supabase Setup Guide

This guide covers setting up Supabase for the Gachapon backend.

## Prerequisites

1. Create a Supabase project at https://supabase.com
2. Install Supabase CLI (optional, for type generation):
   ```bash
   npm install -g supabase
   ```

## Environment Variables

Add these to your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database Connection (from Supabase dashboard)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Finding Your Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`
4. Navigate to **Settings** → **Database**
5. Copy the connection string → `DATABASE_URL`

## Database Setup

### Option 1: Using TypeORM Migrations (Recommended)

TypeORM will automatically create tables based on your entities when `synchronize: true` (development only).

For production, use migrations:

```bash
# Generate migration
npm run typeorm migration:generate -- -n InitialSchema

# Run migrations
npm run typeorm migration:run
```

### Option 2: Using Supabase SQL Editor

Run the SQL from `prd.md` section 3.3 in the Supabase SQL Editor.

## Storage Buckets Setup

Create storage buckets in Supabase:

1. Go to **Storage** in Supabase dashboard
2. Create buckets:
   - `prize-images` (public)
   - `nft-metadata` (public)

### Storage Policies

For public buckets, add policies:

```sql
-- Allow public read access
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT
USING (bucket_id = 'prize-images' OR bucket_id = 'nft-metadata');

-- Allow authenticated uploads (for admin)
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'prize-images' OR bucket_id = 'nft-metadata'
);
```

## Realtime Setup

Realtime is enabled by default in Supabase. To use it:

1. Go to **Database** → **Replication**
2. Enable replication for tables:
   - `plays` ← for live play status updates
   - `nfts`
   - `redemptions`
   - `marketplace_listings`

Or via SQL:

```sql
-- Enable replication for realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE plays;
ALTER PUBLICATION supabase_realtime ADD TABLE nfts;
ALTER PUBLICATION supabase_realtime ADD TABLE redemptions;
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_listings;
```

## Row Level Security (RLS)

### Recommended Policies

```sql
-- Plays: users can only see their own plays (by wallet)
ALTER TABLE plays ENABLE ROW LEVEL SECURITY;

-- If you issue Supabase JWTs with a custom 'wallet' claim:
CREATE POLICY "Users can view own plays"
ON plays FOR SELECT
USING (user_wallet = (auth.jwt() ->> 'wallet'));

-- Alternatively, if you set a local parameter per request:
-- SELECT set_config('app.user_wallet', '<WALLET>', true);
-- Then use:
-- CREATE POLICY "Users can view own plays (alt)"
-- ON plays FOR SELECT
-- USING (user_wallet = current_setting('app.user_wallet', true));

-- NFTs: Users can only see their own NFTs
ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own NFTs"
ON nfts FOR SELECT
USING (current_owner = current_setting('app.user_wallet', true));

-- Redemptions: Users can only see their own redemptions
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions"
ON redemptions FOR SELECT
USING (user_wallet = current_setting('app.user_wallet', true));

-- Marketplace listings: Public read, authenticated write
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
ON marketplace_listings FOR SELECT
USING (true);

CREATE POLICY "Sellers can manage own listings"
ON marketplace_listings FOR ALL
USING (seller_wallet = current_setting('app.user_wallet', true));
```

**Note**: Since we're using wallet-based auth, RLS policies may need custom implementation. The backend uses service role key for admin operations.

## Type Generation

Generate TypeScript types from your Supabase schema:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Generate types
supabase gen types typescript --linked > src/supabase/types/database.types.ts
```

Or use the Supabase dashboard:
1. Go to **Settings** → **API**
2. Scroll to **TypeScript types**
3. Copy and paste into `src/supabase/types/database.types.ts`

## Testing Connection

Create a test script:

```typescript
// test-supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('games').select('*').limit(1);
  console.log('Test result:', { data, error });
}

test();
```

## Features Used

### 1. Database (PostgreSQL)
- TypeORM for ORM
- Direct PostgreSQL connection via `DATABASE_URL`
- Full SQL support

### 2. Realtime Subscriptions
- Live updates for NFT collections
- Redemption status updates
- Marketplace listing changes

### 3. Storage
- Prize images
- NFT metadata JSON files
- Public URLs for frontend

### 4. Row Level Security (Optional)
- Can be used for additional security
- Note: Backend uses service role key, so RLS is bypassed

## Production Considerations

1. **Connection Pooling**: Supabase provides connection pooling via `db.[project-ref].supabase.co:6543` (port 6543)
   - Update `DATABASE_URL` to use port 6543 for better performance
   - Keep port 5432 for migrations/admin

2. **Backups**: Supabase handles automatic backups
   - Daily backups included
   - Point-in-time recovery available

3. **Monitoring**: Use Supabase dashboard for:
   - Query performance
   - Database size
   - API usage

4. **Rate Limiting**: Supabase has rate limits
   - Free tier: 500 requests/second
   - Monitor usage in dashboard

## Troubleshooting

### Connection Issues

```bash
# Test connection
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### SSL Certificate Issues

If you get SSL errors, ensure your connection string includes SSL:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

### TypeORM Synchronize Warning

Never use `synchronize: true` in production. Use migrations instead.

## Next Steps

1. Set up environment variables
2. Run database migrations
3. Create storage buckets
4. Enable Realtime for desired tables
5. Test connection with test script
6. Generate TypeScript types

