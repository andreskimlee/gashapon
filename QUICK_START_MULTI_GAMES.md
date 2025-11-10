# Quick Start: Creating Multiple Games

## ✅ Your Current Architecture Already Supports This!

You can create **unlimited games** with your current single program. Each game is isolated via `game_id`.

## 🚀 How to Create Multiple Games

### Step 1: Create Game Instances (No Deployment Needed!)

```typescript
// Using your existing program
import { Program, BN } from "@coral-xyz/anchor";

const gameProgram = anchor.workspace.GachaponGame;

// Game 1: Pokemon Series
const gameId1 = new BN(1);
const [gamePda1] = PublicKey.findProgramAddressSync(
  [Buffer.from("game"), Buffer.from(gameId1.toArray("le", 8))],
  gameProgram.programId
);

await gameProgram.methods
  .initializeGame(gameId1, new BN(500), tokenMint, pokemonPrizePool)
  .accounts({
    authority: adminWallet,
    game: gamePda1,
    treasury: treasury1,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Game 2: Anime Collection (different ID, same program!)
const gameId2 = new BN(2);
const [gamePda2] = PublicKey.findProgramAddressSync(
  [Buffer.from("game"), Buffer.from(gameId2.toArray("le", 8))],
  gameProgram.programId
);

await gameProgram.methods
  .initializeGame(gameId2, new BN(300), tokenMint, animePrizePool)
  .accounts({
    authority: adminWallet,
    game: gamePda2,
    treasury: treasury2,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Step 2: Track Games in Database

```typescript
// Store game metadata
await db.games.create({
  gameId: 1,
  name: "Pokemon Series 1",
  prizeSetId: "pokemon-series-1",
  gamePda: gamePda1.toString(),
  treasury: treasury1.toString(),
  status: "active"
});

await db.games.create({
  gameId: 2,
  name: "Anime Collection",
  prizeSetId: "anime-collection",
  gamePda: gamePda2.toString(),
  treasury: treasury2.toString(),
  status: "active"
});
```

### Step 3: Frontend Display

```typescript
// List all active games
const games = await fetch("/api/games");

games.forEach(game => {
  // Each game has unique game_id
  // Same program, different game PDA
  const gamePda = deriveGamePda(game.gameId);
  // Display game UI
});
```

## 📊 Management Structure

### Backend API

```
GET  /api/games              # List all games
GET  /api/games/:id          # Get specific game
POST /api/games               # Create new game (admin)
PATCH /api/games/:id/status   # Activate/deactivate
POST /api/games/:id/replenish # Add prize supply
```

### Database Schema

```sql
games:
  - game_id (u64, primary key)
  - name (string)
  - prize_set_id (string)
  - game_pda (pubkey)
  - treasury (pubkey)
  - status (enum)
  - created_at (timestamp)

prize_sets:
  - id (string, primary key)
  - name (string)
  - prizes (json) -- Template
```

## 🎯 Best Practice: Game ID Strategy

### Option A: Sequential IDs (Simple)
```typescript
let nextGameId = 1; // Increment for each game
```

### Option B: Category-Based IDs
```typescript
// Pokemon games: 1000-1999
// Anime games: 2000-2999
// Gaming: 3000-3999
const gameId = categoryBase + sequence;
```

### Option C: Timestamp-Based
```typescript
const gameId = Date.now() % (2**32); // Use timestamp
```

## ✅ Recommendation Summary

**Use Single Program** (what you have):
- ✅ Deploy once
- ✅ Create unlimited games
- ✅ Each game isolated via `game_id`
- ✅ Lower costs
- ✅ Easier management

**Management Layer:**
- Backend API for game CRUD
- Database for metadata
- Admin dashboard for creation
- Prize set templates for reuse

Your architecture is perfect for scaling! 🚀

