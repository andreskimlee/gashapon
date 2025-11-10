# Multi-Game Architecture Guide

## 🎯 Current Architecture Analysis

**Good News:** Your current program **already supports multiple games** in a single program!

Each game is isolated via:

- Unique `game_id` (u64)
- Separate PDA account: `[b"game", game_id]`
- Independent prize pools, treasuries, and state

## 📊 Architecture Options

### Option 1: Single Program, Multiple Game Instances (✅ RECOMMENDED)

**How it works:**

- One program (`gachapon-game`)
- Multiple `Game` accounts, each with unique `game_id`
- Each game has its own prize pool, treasury, and state

**Pros:**

- ✅ **Lower costs** - Deploy once, create unlimited games
- ✅ **Easier management** - One program to upgrade/maintain
- ✅ **Shared codebase** - Fix bugs once, affects all games
- ✅ **Simpler frontend** - One program ID, multiple game IDs
- ✅ **Already implemented** - Your code supports this!

**Cons:**

- ⚠️ All games share same upgrade authority (can be mitigated)
- ⚠️ Program size limits (8192 bytes per game account)

**When to use:** Default choice for most cases

---

### Option 2: Multiple Programs (One Per Prize Set)

**How it works:**

- Separate Anchor program for each prize set
- Each program deployed independently
- Each has its own program ID

**Pros:**

- ✅ **Independent upgrades** - Upgrade one game without affecting others
- ✅ **Separate authorities** - Different admins per game
- ✅ **Code isolation** - Custom logic per game type
- ✅ **Program size** - No shared account limits

**Cons:**

- ❌ **Higher costs** - Deploy cost per program (~2-3 SOL)
- ❌ **More complex** - Multiple program IDs to manage
- ❌ **Code duplication** - Same logic in multiple programs
- ❌ **Harder maintenance** - Fix bugs in multiple places

**When to use:**

- Different game mechanics per prize set
- Need separate upgrade authorities
- Very different prize structures requiring custom logic

---

## 🏗️ Recommended Architecture: Single Program + Factory Pattern

### Structure

```
programs/
├── gachapon-game/          # Single program (current)
│   └── src/lib.rs          # Handles ALL games
│
programs/
└── gachapon-marketplace/   # Marketplace (separate)
```

**Backend Admin Tool:**

```typescript
// Admin creates new games easily
class GameManager {
  async createGame(config: GameConfig) {
    // 1. Generate unique game_id
    const gameId = await this.getNextGameId();

    // 2. Initialize on-chain
    await this.program.methods
      .initializeGame(
        gameId,
        config.costUsd,
        config.tokenMint,
        config.prizePool
      )
      .accounts({
        authority: adminWallet,
        game: this.getGamePda(gameId),
        treasury: config.treasury,
      })
      .rpc();

    // 3. Store in database
    await db.games.create({
      gameId,
      name: config.name,
      prizeSet: config.prizeSet,
      // ... other metadata
    });
  }
}
```

---

## 📝 Implementation: Game Management System

### 1. Add Game Registry (Optional but Recommended)

Create a registry to track all games:

```rust
// In gachapon-game program
#[account]
pub struct GameRegistry {
  pub authority: Pubkey,
  pub total_games: u64,
  pub active_games: u64,
  pub bump: u8,
}

pub fn register_game(
  ctx: Context<RegisterGame>,
  game_id: u64,
) -> Result<()> {
  let registry = &mut ctx.accounts.registry;
  registry.total_games = registry.total_games.checked_add(1).unwrap();
  // ... update active count if needed
  Ok(())
}
```

### 2. Game Metadata Management

Store game metadata off-chain (database) but reference on-chain:

**Database Schema:**

```sql
games:
  - game_id (u64, unique)
  - name (string)
  - description (string)
  - prize_set_id (string) -- e.g., "pokemon-series-1"
  - category (string) -- e.g., "anime", "gaming", "collectibles"
  - created_at (timestamp)
  - on_chain_game_pda (pubkey)
  - status (active/inactive/archived)
```

### 3. Admin Dashboard Structure

```typescript
// Admin can:
1. Create New Game
   - Choose prize set (predefined sets)
   - Set pricing
   - Configure odds
   - Deploy on-chain

2. Manage Existing Games
   - View all games
   - Update status
   - Replenish supply
   - View analytics

3. Prize Set Management
   - Create prize sets (templates)
   - Reuse across games
   - Version control
```

---

## 🎮 Recommended Approach: Hybrid

### Single Program for Standard Games

**Use your current program for:**

- Standard gachapon mechanics
- Common prize structures
- Games that share same logic

**Example:**

- Game ID 1: Pokemon Series 1
- Game ID 2: Pokemon Series 2
- Game ID 3: Anime Collection
- Game ID 4: Gaming Accessories

All use same program, different `game_id`.

### Separate Programs Only When Needed

**Create new program for:**

- Different game mechanics (e.g., battle royale gachapon)
- Special features (e.g., time-limited events)
- Partnership/exclusive games with custom logic

---

## 🔧 Implementation: Game Factory Service

Create a backend service to manage game creation:

```typescript
// backend/src/game/game-factory.service.ts

export class GameFactoryService {
  // Create a new game instance
  async createGame(config: CreateGameConfig): Promise<GameInstance> {
    // 1. Get next available game_id
    const gameId = await this.getNextGameId();

    // 2. Derive game PDA
    const [gamePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("game"), Buffer.from(gameId.toArray("le", 8))],
      this.gameProgram.programId
    );

    // 3. Initialize on-chain
    const tx = await this.gameProgram.methods
      .initializeGame(
        gameId,
        new BN(config.costUsdCents),
        config.tokenMint,
        config.prizePool
      )
      .accounts({
        authority: this.adminWallet.publicKey,
        game: gamePda,
        treasury: config.treasuryWallet,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // 4. Store metadata in database
    const gameRecord = await this.db.games.create({
      gameId: gameId.toNumber(),
      name: config.name,
      description: config.description,
      prizeSetId: config.prizeSetId,
      category: config.category,
      gamePda: gamePda.toString(),
      treasury: config.treasuryWallet.toString(),
      status: "active",
      createdAt: new Date(),
    });

    return {
      gameId: gameId.toNumber(),
      gamePda: gamePda.toString(),
      transaction: tx,
      ...gameRecord,
    };
  }

  // List all games
  async listGames(filters?: GameFilters): Promise<GameInstance[]> {
    return this.db.games.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
    });
  }

  // Get game by ID
  async getGame(gameId: number): Promise<GameInstance> {
    const dbGame = await this.db.games.findUnique({
      where: { gameId },
    });

    // Fetch on-chain state
    const onChainGame = await this.gameProgram.account.game.fetch(
      this.getGamePda(gameId)
    );

    return {
      ...dbGame,
      onChain: {
        totalPlays: onChainGame.totalPlays,
        isActive: onChainGame.isActive,
        // ... other on-chain data
      },
    };
  }
}
```

---

## 📋 Best Practices

### 1. Game ID Management

```typescript
// Use sequential IDs
let nextGameId = 1;

// Or use UUID-based IDs (converted to u64)
function generateGameId(): u64 {
  // Use first 8 bytes of UUID hash
  // Or use timestamp-based: Date.now() % 2^64
}
```

### 2. Prize Set Templates

```typescript
// Define reusable prize sets
const PRIZE_SETS = {
  "pokemon-series-1": {
    prizes: [
      { id: 1, name: "Pikachu", tier: "common", prob: 6000, cost: 1.0 },
      { id: 2, name: "Charizard", tier: "rare", prob: 500, cost: 15.0 },
      // ...
    ],
  },
  "anime-collection": {
    // Different prize set
  },
};

// Create game from template
await gameFactory.createGame({
  name: "Pokemon Series 1",
  prizeSetId: "pokemon-series-1",
  costUsdCents: 500, // $5
  // ... other config
});
```

### 3. Treasury Management

```typescript
// Option A: Shared treasury (simpler)
const sharedTreasury = treasuryWallet.publicKey;
// All games → same treasury

// Option B: Per-game treasury (better tracking)
const gameTreasury = deriveTreasuryPDA(gameId);
// Each game → separate treasury
// Easier to track revenue per game
```

### 4. Upgrade Strategy

```rust
// Add versioning to Game account
#[account]
pub struct Game {
  // ... existing fields
  pub version: u8, // Track game version
}

// Allows gradual migration if needed
```

---

## 🚀 Deployment Strategy

### Development

```bash
# Single program on devnet
anchor deploy --provider.cluster devnet
```

### Production

```bash
# Deploy once
anchor deploy --provider.cluster mainnet-beta

# Create games via admin tool
npm run admin:create-game -- --prize-set pokemon-1 --price 500
```

---

## 📊 Management Dashboard Example

```typescript
// Admin Dashboard Features:

1. Game Creation Wizard
   - Select prize set template
   - Configure pricing
   - Set treasury
   - Preview odds
   - Deploy

2. Game List View
   - All games with status
   - Revenue per game
   - Plays per game
   - Quick actions (activate/deactivate)

3. Game Detail View
   - On-chain state
   - Prize pool status
   - Treasury balance
   - Analytics
   - Management actions
```

---

## ✅ Recommendation

**Use Single Program Approach** because:

1. ✅ Your code already supports it (`game_id` isolation)
2. ✅ Lower costs (deploy once)
3. ✅ Easier maintenance
4. ✅ Faster game creation (no deployment needed)
5. ✅ Better UX (one program ID for frontend)

**Only create separate programs if:**

- Game mechanics are fundamentally different
- Need separate upgrade authorities
- Code changes wouldn't apply to all games

Your current architecture is already optimal for scaling! 🎉
