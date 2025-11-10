# Gachapon Monorepo

This repository contains the on-chain programs for the Solana-based Gachapon platform described in `prd.md`.

Structure:

- `Anchor.toml` and top-level `Cargo.toml` define a multi-program Anchor workspace.
- `programs/`: On-chain Anchor programs
  - `programs/gachapon-game`: Core game logic program (initialize, play, finalize, admin ops).
  - `programs/gachapon-marketplace`: Marketplace program for listing and trading prize NFTs.
- `backend/`: API, indexer, services (future)
- `frontend/`: Web app (future)

Next steps:

- Set real program IDs in `Anchor.toml` after keypair generation.
- Implement account layouts and instruction logic per `solana.checklist.md`.
- Add tests under `tests/` and migrations as needed.
