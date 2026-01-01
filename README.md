## Gachapon Monorepo

Solana-based Gachapon platform (game + NFTs + marketplace + redemption). For the product vision and architecture, see the PRD:

- PRD: `prd.md`

## Quick Links

- Frontend app (Next.js): `frontend/README.md`
- Backend API (NestJS): `backend/README.md`
- Indexer service (NestJS): `gashapon-indexer/README.md`
- Anchor programs:
  - Game program: `programs/gachapon-game/`
  - Marketplace program: `programs/gachapon-marketplace/`
- Tests: `tests/`
- Scripts: `scripts/`
- Devnet deployment guide: `DEPLOY_DEVNET.md`

## Monorepo Structure

- `frontend/`: Next.js web app (wallet connect, play flow, collection, marketplace UI)
- `backend/`: NestJS API (auth, game, NFT, redemption, marketplace, Supabase integration)
- `gashapon-indexer/`: NestJS indexer (Helius/RPC listeners -> DB sync, websockets)
- `programs/`: Anchor workspace with on-chain programs
  - `gachapon-game/`: Core gameplay, prize selection, VRF integration
  - `gachapon-marketplace/`: Listing, escrow and trades for prize NFTs
- `tests/`: Mocha/ts-node tests for on-chain programs and flows
- `scripts/`: Utilities (IDL copy, deploy/reinit helpers, treasury checks, etc.)
- `target/`, `test-ledger/`: Anchor build artifacts and local validator data

## Prerequisites

- Node.js 18+ and pnpm
- Rust toolchain
- Solana CLI
- Anchor CLI (via avm)
- (Optional) Supabase project for backend persistence

## Setup

1. Install dependencies at repo root:

```bash
pnpm -w install
```

2. Build Anchor programs and copy IDLs to consumers:

```bash
pnpm run anchor:build
pnpm run copy:idl
```

3. Configure each service (env, DB, etc.) following module READMEs:

- Frontend: `frontend/README.md`
- Backend: `backend/README.md` (+ `backend/SUPABASE_SETUP.md` if applicable)
- Indexer: `gashapon-indexer/README.md`

## Local Development

Run packages individually with pnpm filters:

```bash
# Backend API (NestJS)
pnpm -F gachapon-backend start:dev

# Frontend (Next.js)
pnpm -F frontend dev

# Indexer (NestJS)
pnpm -F gashapon-indexer start:dev
```

Program build and tests:

```bash
# Build Anchor programs and refresh IDLs
pnpm run anchor:build

# Run tests against a local validator via helper script
pnpm run test:with-validator

# Run all ts-mocha tests (expects a running validator at 127.0.0.1:8899)
pnpm run test:all

# Devnet test (uses phantom-devnet-keypair.json)
pnpm run test:devnet
```

Helpful top-level scripts (see `package.json`):

- `anchor:build`: Build programs and copy IDLs to consumers
- `test`, `test:all`, `test:with-validator`: Program tests (Mocha)
- `test:devnet*`: Devnet tests and queries
- `copy:idl`: Only copy IDLs without building

## Scripts Overview

- `scripts/copy-idl.js`: Copy generated IDLs from `target/idl` to app services
- `scripts/reinitialize-game.ts`: Reinitialize game on-chain for local/devnet
- `scripts/create-treasury.sh`: Create and setup game treasury
- `scripts/check-game-treasury.ts`: Check balances and accounts
- `scripts/test-devnet.ts`: Quick devnet checks
- `deploy-devnet.sh`: End-to-end devnet deployment helper

(Some scripts may have `.example` variants; check inline docs in each.)

## Where Things Live

- Gameplay logic (on-chain): `programs/gachapon-game/`
- Marketplace logic (on-chain): `programs/gachapon-marketplace/`
- API endpoints and business logic: `backend/src/`
- Web app pages and components: `frontend/app/`, `frontend/components/`
- Indexer listeners and handlers: `gashapon-indexer/src/indexer/`
- Shared types and helpers (frontend): `frontend/types/`, `frontend/utils/`

## High-Level Architecture

- Smart contracts (Anchor): game + marketplace
- Backend API (NestJS): auth, plays, NFT mint/redeem, marketplace, Supabase
- Indexer (NestJS): chain events -> DB sync + websocket notifications
- Frontend (Next.js): wallet connect, play UI, collection, marketplace

For detailed product scope, flows, and APIs see `prd.md`.

## Next Steps for Contributors

- Read per-module READMEs:
  - `frontend/README.md`
  - `backend/README.md`
  - `gashapon-indexer/README.md`
- Build programs and run tests locally:
  - `pnpm run anchor:build`
  - `pnpm run test:with-validator`
- Deploy and verify on devnet:
  - `./deploy-devnet.sh` (review and export env beforehand)

## Notes

- Program IDs: ensure correct program IDs are set before deploying beyond local
- IDLs: refresh via `pnpm run anchor:build` whenever programs change
- Environment: see module READMEs for required variables and services
