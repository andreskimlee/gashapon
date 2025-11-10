# Gashapon Indexer Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   cd gashapon-indexer
   pnpm install
   ```

2. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key from Supabase dashboard
   - `HELIUS_API_KEY`: Your Helius API key (get from https://helius.dev)
   - `SOLANA_NETWORK`: `devnet` or `mainnet-beta`

3. **Verify Database Tables**
   
   Ensure your Supabase database has all required tables. Run migrations from the backend:
   ```bash
   cd ../backend
   pnpm run migration:run
   ```

4. **Start the Indexer**
   ```bash
   cd ../gashapon-indexer
   pnpm run start:dev
   ```

## Database Tables Required

The indexer expects these tables (created by backend migrations):

- `games` - Game configurations
- `prizes` - Prize configurations  
- `plays` - Game play records
- `nfts` - NFT mint records
- `marketplace_listings` - Marketplace listings
- `redemptions` - Redemption records

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for admin operations |
| `HELIUS_API_KEY` | Yes | Helius API key for WebSocket access |
| `SOLANA_NETWORK` | No | `devnet` or `mainnet-beta` (default: `devnet`) |
| `GACHAPON_GAME_PROGRAM_ID` | No | Game program ID (default provided) |
| `GACHAPON_MARKETPLACE_PROGRAM_ID` | No | Marketplace program ID (default provided) |
| `PORT` | No | Server port (default: `3002`) |
| `NODE_ENV` | No | `development` or `production` (default: `development`) |

## Getting Helius API Key

1. Go to https://helius.dev
2. Sign up or log in
3. Navigate to Dashboard
4. Create a new API key
5. Copy the API key to your `.env` file

## Getting Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the Project URL to `SUPABASE_URL`
4. Copy the `service_role` key to `SUPABASE_SERVICE_ROLE_KEY`
   - ⚠️ **Warning**: Service role key bypasses RLS. Keep it secret!

## Verifying Setup

Once the indexer is running, you should see:

```
✅ Supabase client initialized
✅ Indexer service initialized
Game Program ID: 4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG
Marketplace Program ID: 4zHkHBrSyBsi2L5J1ikZ5kQwNcGMcE2x3wKrG3FY7UqC
Connecting to Helius WebSocket: wss://atlas-devnet.helius-rpc.com?api-key=...
✅ Connected to Helius WebSocket
Subscribed to transactions for programs: ...
```

## Testing

To test the indexer:

1. Make a transaction on-chain (e.g., play a game)
2. Check the indexer logs for event processing
3. Verify the database was updated correctly

## Troubleshooting

### WebSocket Connection Fails

- Verify `HELIUS_API_KEY` is correct
- Check network connectivity
- Ensure Helius service is operational

### Database Errors

- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Ensure database tables exist (run migrations)
- Check Supabase project is active

### Events Not Parsing

- Verify program IDs match deployed programs
- Check transaction logs in Helius dashboard
- Review indexer logs for parsing errors

## Production Deployment

For production:

1. Set `NODE_ENV=production`
2. Use a process manager like PM2:
   ```bash
   pm2 start dist/main.js --name gashapon-indexer
   ```
3. Set up monitoring and alerting
4. Configure log rotation
5. Set up health checks

## Architecture Notes

- The indexer processes transactions in real-time via WebSocket
- Events are parsed from transaction logs using Anchor event discriminators
- Database updates are performed synchronously (consider batching for high throughput)
- WebSocket reconnection is handled automatically with exponential backoff

