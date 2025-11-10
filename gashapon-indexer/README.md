# Gashapon Indexer

A NestJS-based blockchain indexer that listens to Helius WebSocket streams and writes Solana program events to Supabase database.

## Overview

This indexer monitors transactions from the Gachapon Game and Marketplace programs on Solana, parses Anchor events, and updates the Supabase database in real-time.

## Features

- 🔌 **Helius WebSocket Integration**: Connects to Helius enhanced WebSocket API for real-time transaction monitoring
- 📊 **Event Parsing**: Parses Anchor program events from transaction logs
- 💾 **Database Updates**: Automatically updates Supabase tables (plays, nfts, games, prizes, marketplace_listings)
- 🔄 **Auto-Reconnection**: Handles WebSocket disconnections with exponential backoff
- 🛡️ **Error Handling**: Comprehensive error handling and logging

## Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)
- Supabase project with database tables set up
- Helius API key

## Setup

1. **Install Dependencies**

```bash
pnpm install
```

2. **Configure Environment Variables**

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for admin operations)
- `HELIUS_API_KEY`: Your Helius API key
- `SOLANA_NETWORK`: `devnet` or `mainnet-beta`

3. **Ensure Database Tables Exist**

The indexer expects the following tables to exist in Supabase:
- `games`
- `prizes`
- `plays`
- `nfts`
- `marketplace_listings`
- `redemptions`

These should be created via the backend migrations. See `/backend/migrations/` for the schema.

## Running

### Development

```bash
pnpm run start:dev
```

### Production

```bash
pnpm run build
pnpm run start:prod
```

## How It Works

1. **WebSocket Connection**: Connects to Helius WebSocket API and subscribes to transactions for the game and marketplace programs
2. **Transaction Processing**: When a transaction is received, the indexer:
   - Checks if the transaction succeeded
   - Parses transaction logs for Anchor events
   - Extracts event data using event discriminators
   - Updates the appropriate Supabase tables

## Events Indexed

### Game Program Events

- **GameCreated**: When a new game is initialized (note: game data should be created via admin API)
- **GamePlayInitiated**: Creates a `plays` record with status `pending`
- **PrizeWon**: Updates the `plays` record with prize information and marks as `completed`
- **GameStatusUpdated**: Updates game `is_active` status
- **SupplyReplenished**: Updates prize `supply_remaining`
- **TreasuryWithdrawn**: Logged for informational purposes

### Marketplace Program Events

- **NFTListed**: Creates a `marketplace_listings` record
- **NFTDelisted**: Updates listing `is_active` to false and sets `cancelled_at`
- **NFTSold**: Updates listing with buyer info and sets `sold_at`
- **PriceUpdated**: Updates listing price

## Database Schema

The indexer writes to the following tables:

- **plays**: Game play records with transaction signatures
- **nfts**: NFT mint records (when NFTs are minted)
- **games**: Game configuration (updated on status changes)
- **prizes**: Prize configuration (updated on supply changes)
- **marketplace_listings**: NFT marketplace listings

## Troubleshooting

### WebSocket Connection Issues

- Check your Helius API key is valid
- Verify network connectivity
- Check Helius service status

### Event Parsing Errors

- Verify program IDs match your deployed programs
- Check that event discriminators match the IDL
- Review transaction logs for parsing issues

### Database Errors

- Ensure Supabase credentials are correct
- Verify database tables exist and have correct schema
- Check Row Level Security (RLS) policies allow service role operations

## Architecture

```
┌─────────────────┐
│  Helius WS API  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ HeliusService   │
│ (WebSocket)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ IndexerService  │
│ (Event Parser)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ SupabaseService │
│ (Database)      │
└─────────────────┘
```

## Development

### Project Structure

```
src/
├── config/          # Configuration module
├── helius/          # Helius WebSocket service
├── indexer/          # Event parsing and database updates
├── supabase/         # Supabase client and types
└── main.ts           # Application entry point
```

## License

MIT
