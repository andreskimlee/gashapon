import { BN } from '@coral-xyz/anchor';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey } from '@solana/web3.js';
import { DatabaseService } from '../../database/database.service';
import {
  GameStatusUpdatedEventData,
  GameCreatedEventData,
} from '../events/event-parser.service';

// Program ID for the gachapon game
const PROGRAM_ID = new PublicKey('4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG');

// Max prizes constant (must match on-chain)
const MAX_PRIZES = 16;

// Prize tier mapping from on-chain to DB
const TIER_MAP: Record<number, string> = {
  0: 'common',
  1: 'uncommon',
  2: 'rare',
  3: 'legendary',
};

interface OnChainPrize {
  prizeIndex: number;
  prizeId: number;
  name: string;
  description: string;
  imageUrl: string;
  metadataUri: string;
  physicalSku: string;
  tier: number;
  probabilityBp: number;
  costUsd: bigint;
  weightGrams: number;
  supplyTotal: number;
  supplyRemaining: number;
}

interface OnChainGame {
  authority: PublicKey;
  gameId: bigint;
  name: string;
  description: string;
  imageUrl: string;
  tokenMint: PublicKey;
  costUsd: bigint;
  treasury: PublicKey;
  prizeCount: number;
  prizeProbabilities: number[];
  totalSupplyRemaining: number;
  totalPlays: bigint;
  isActive: boolean;
}

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private connection: Connection;

  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService,
  ) {
    const rpcUrl =
      this.configService.get<string>('SOLANA_RPC_URL') ||
      'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Get the game PDA address
   */
  getGamePda(gameId: number | bigint): PublicKey {
    const gameIdBn = new BN(gameId.toString());
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('game'), gameIdBn.toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID,
    );
    return pda;
  }

  /**
   * Get the prize PDA address
   */
  private getPrizePda(gamePda: PublicKey, prizeIndex: number): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('prize'), gamePda.toBuffer(), Buffer.from([prizeIndex])],
      PROGRAM_ID,
    );
    return pda;
  }

  /**
   * Helper to read a Borsh string from buffer
   */
  private readString(
    data: Buffer,
    offset: number,
  ): { value: string; newOffset: number } {
    const len = data.readUInt32LE(offset);
    offset += 4;
    const value = data.slice(offset, offset + len).toString('utf8');
    return { value, newOffset: offset + len };
  }

  /**
   * Fetch game data from on-chain (NEW structure)
   */
  async fetchGameFromChain(
    gameId: number | bigint,
  ): Promise<OnChainGame | null> {
    try {
      const gamePda = this.getGamePda(gameId);
      const accountInfo = await this.connection.getAccountInfo(gamePda);

      if (!accountInfo) {
        this.logger.warn(`Game PDA not found for game_id=${gameId}`);
        return null;
      }

      const data = accountInfo.data;

      // Parse NEW Game account structure:
      // [0..8]     - discriminator
      // [8..40]    - authority (32)
      // [40..48]   - game_id (8)
      // Then strings: name, description, image_url
      // Then: token_mint (32), cost_usd (8), treasury (32)
      // Then: prize_count (1), prize_probabilities (16*2=32), total_supply_remaining (4)
      //       total_plays (8), is_active (1), last_random_value (32), bump (1)

      let offset = 8; // Skip discriminator

      // authority (32 bytes)
      const authority = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // game_id (u64 - 8 bytes)
      const gameIdValue = data.readBigUInt64LE(offset);
      offset += 8;

      // name (String)
      const nameResult = this.readString(data, offset);
      const name = nameResult.value;
      offset = nameResult.newOffset;

      // description (String)
      const descResult = this.readString(data, offset);
      const description = descResult.value;
      offset = descResult.newOffset;

      // image_url (String)
      const imageResult = this.readString(data, offset);
      const imageUrl = imageResult.value;
      offset = imageResult.newOffset;

      // token_mint (32 bytes)
      const tokenMint = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // cost_usd (u64 - 8 bytes)
      const costUsd = data.readBigUInt64LE(offset);
      offset += 8;

      // treasury (32 bytes)
      const treasury = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // prize_count (u8 - 1 byte)
      const prizeCount = data.readUInt8(offset);
      offset += 1;

      // prize_probabilities ([u16; 16] - 32 bytes)
      const prizeProbabilities: number[] = [];
      for (let i = 0; i < MAX_PRIZES; i++) {
        prizeProbabilities.push(data.readUInt16LE(offset + i * 2));
      }
      offset += MAX_PRIZES * 2;

      // total_supply_remaining (u32 - 4 bytes)
      const totalSupplyRemaining = data.readUInt32LE(offset);
      offset += 4;

      // total_plays (u64 - 8 bytes)
      const totalPlays = data.readBigUInt64LE(offset);
      offset += 8;

      // is_active (bool - 1 byte)
      const isActive = data.readUInt8(offset) === 1;

      return {
        authority,
        gameId: gameIdValue,
        name,
        description,
        imageUrl,
        tokenMint,
        costUsd,
        treasury,
        prizeCount,
        prizeProbabilities,
        totalSupplyRemaining,
        totalPlays,
        isActive,
      };
    } catch (error) {
      this.logger.error(`Error fetching game from chain: ${error}`);
      return null;
    }
  }

  /**
   * Fetch a single prize from on-chain
   */
  async fetchPrizeFromChain(
    gamePda: PublicKey,
    prizeIndex: number,
  ): Promise<OnChainPrize | null> {
    try {
      const prizePda = this.getPrizePda(gamePda, prizeIndex);
      const accountInfo = await this.connection.getAccountInfo(prizePda);

      if (!accountInfo) {
        this.logger.warn(
          `Prize PDA not found for game=${gamePda.toString()}, index=${prizeIndex}`,
        );
        return null;
      }

      const data = accountInfo.data;

      // Parse Prize account structure:
      // [0..8]   - discriminator
      // [8..40]  - game (32)
      // [40]     - prize_index (1)
      // [41..49] - prize_id (8)
      // Then strings: name, description, image_url, metadata_uri, physical_sku
      // Then: tier (1), probability_bp (2), cost_usd (8), supply_total (4), supply_remaining (4), bump (1)

      let offset = 8; // Skip discriminator

      // game (32 bytes) - skip, we know it
      offset += 32;

      // prize_index (u8)
      const prizeIdx = data.readUInt8(offset);
      offset += 1;

      // prize_id (u64)
      const prizeId = Number(data.readBigUInt64LE(offset));
      offset += 8;

      // name (String)
      const nameResult = this.readString(data, offset);
      const name = nameResult.value;
      offset = nameResult.newOffset;

      // description (String)
      const descResult = this.readString(data, offset);
      const description = descResult.value;
      offset = descResult.newOffset;

      // image_url (String)
      const imageResult = this.readString(data, offset);
      const imageUrl = imageResult.value;
      offset = imageResult.newOffset;

      // metadata_uri (String)
      const metadataResult = this.readString(data, offset);
      const metadataUri = metadataResult.value;
      offset = metadataResult.newOffset;

      // physical_sku (String)
      const skuResult = this.readString(data, offset);
      const physicalSku = skuResult.value;
      offset = skuResult.newOffset;

      // tier (enum - 1 byte)
      const tier = data.readUInt8(offset);
      offset += 1;

      // probability_bp (u16)
      const probabilityBp = data.readUInt16LE(offset);
      offset += 2;

      // cost_usd (u64)
      const costUsd = data.readBigUInt64LE(offset);
      offset += 8;

      // weight_grams (u32)
      const weightGrams = data.readUInt32LE(offset);
      offset += 4;

      // supply_total (u32)
      const supplyTotal = data.readUInt32LE(offset);
      offset += 4;

      // supply_remaining (u32)
      const supplyRemaining = data.readUInt32LE(offset);
      offset += 4;

      return {
        prizeIndex: prizeIdx,
        prizeId,
        name,
        description,
        imageUrl,
        metadataUri,
        physicalSku,
        tier,
        probabilityBp,
        costUsd,
        weightGrams,
        supplyTotal,
        supplyRemaining,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching prize from chain: ${error}`,
      );
      return null;
    }
  }

  /**
   * Find game by on-chain game_id
   */
  async findGameByGameId(gameId: string | BN): Promise<{ id: number } | null> {
    const gameIdStr = gameId.toString();
    const result = await this.databaseService.queryOne<{ id: number }>(
      'SELECT id FROM games WHERE "gameId" = $1',
      [gameIdStr],
    );
    return result;
  }

  /**
   * Create a new game from on-chain data
   */
  async createGameFromChain(
    gameId: number | bigint,
    onChainAddress: string,
  ): Promise<number | null> {
    try {
      // Fetch game data from chain
      const gameData = await this.fetchGameFromChain(gameId);
      if (!gameData) {
        this.logger.error(
          `Could not fetch game data from chain for game_id=${gameId}`,
        );
        return null;
      }

      const gameName = gameData.name || `Game #${gameId}`;
      const gameDescription =
        gameData.description ||
        `On-chain game deployed by ${gameData.authority.toString().slice(0, 8)}...`;
      const gameImageUrl = gameData.imageUrl || null;

      // Insert game into database (including token mint address for price lookups)
      const tokenMintAddress = gameData.tokenMint?.toString() || null;
      
      const gameResult = await this.databaseService.queryOne<{ id: number }>(
        `INSERT INTO games ("gameId", "name", "description", "imageUrl", "costInTokens", "costInUsd", "currencyTokenMintAddress", "onChainAddress", "isActive", "totalPlays", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         ON CONFLICT ("gameId") DO UPDATE SET 
           "name" = EXCLUDED."name",
           "description" = EXCLUDED."description",
           "imageUrl" = EXCLUDED."imageUrl",
           "currencyTokenMintAddress" = EXCLUDED."currencyTokenMintAddress",
           "onChainAddress" = EXCLUDED."onChainAddress",
           "isActive" = EXCLUDED."isActive",
           "updatedAt" = NOW()
         RETURNING id`,
        [
          gameId.toString(),
          gameName,
          gameDescription,
          gameImageUrl,
          Number(gameData.costUsd), // Tokens = cents for simplicity
          Number(gameData.costUsd) / 100, // Convert cents to USD
          tokenMintAddress,
          onChainAddress,
          gameData.isActive,
          Number(gameData.totalPlays),
        ],
      );

      if (!gameResult) {
        this.logger.error(`Failed to insert game into database`);
        return null;
      }

      const dbGameId = gameResult.id;
      this.logger.log(
        `Created game in DB: id=${dbGameId}, gameId=${gameId}, name="${gameName}"`,
      );

      // Fetch and insert prizes from separate Prize PDAs
      const gamePda = this.getGamePda(gameId);
      for (let i = 0; i < gameData.prizeCount; i++) {
        const prize = await this.fetchPrizeFromChain(gamePda, i);
        if (!prize) {
          this.logger.warn(`Could not fetch prize ${i} for game ${gameId}`);
          continue;
        }

        await this.databaseService.execute(
          `INSERT INTO prizes ("gameId", "prizeId", "prizeIndex", "name", "description", "imageUrl", "metadataUri", "physicalSku", "tier", "probabilityBasisPoints", "costInUsd", "weightGrams", "supplyTotal", "supplyRemaining", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
           ON CONFLICT ("gameId", "prizeId") DO UPDATE SET 
             "name" = EXCLUDED."name",
             "description" = EXCLUDED."description",
             "imageUrl" = EXCLUDED."imageUrl",
             "metadataUri" = EXCLUDED."metadataUri",
             "prizeIndex" = EXCLUDED."prizeIndex",
             "probabilityBasisPoints" = EXCLUDED."probabilityBasisPoints",
             "costInUsd" = EXCLUDED."costInUsd",
             "weightGrams" = EXCLUDED."weightGrams",
             "supplyTotal" = EXCLUDED."supplyTotal",
             "supplyRemaining" = EXCLUDED."supplyRemaining",
             "updatedAt" = NOW()`,
          [
            dbGameId,
            prize.prizeId,
            prize.prizeIndex,
            prize.name,
            prize.description || null,
            prize.imageUrl || null,
            prize.metadataUri || null,
            prize.physicalSku,
            TIER_MAP[prize.tier] || 'common',
            prize.probabilityBp,
            Number(prize.costUsd) / 100, // Convert cents to USD
            prize.weightGrams,
            prize.supplyTotal,
            prize.supplyRemaining,
          ],
        );
        this.logger.log(
          `Created/updated prize: index=${prize.prizeIndex}, prizeId=${prize.prizeId}, name="${prize.name}", odds=${prize.probabilityBp}bp`,
        );
      }

      return dbGameId;
    } catch (error) {
      this.logger.error(`Error creating game from chain: ${error}`);
      return null;
    }
  }

  /**
   * Handle GameCreated event - create game in database
   */
  async handleGameCreated(eventData: GameCreatedEventData): Promise<void> {
    const gameId = Number(eventData.game_id);
    const onChainAddress = this.getGamePda(gameId).toString();

    this.logger.log(
      `GameCreated event: game_id=${gameId}, authority=${eventData.authority}`,
    );

    // Check if game already exists
    const existing = await this.findGameByGameId(gameId.toString());
    if (existing) {
      this.logger.log(`Game already exists in DB: game_id=${gameId}`);
      return;
    }

    // Create game from on-chain data
    const dbId = await this.createGameFromChain(gameId, onChainAddress);
    if (dbId) {
      this.logger.log(
        `✅ Successfully created game from chain: game_id=${gameId}, db_id=${dbId}`,
      );
    } else {
      this.logger.error(`❌ Failed to create game from chain: game_id=${gameId}`);
    }
  }

  /**
   * Update game status
   */
  async updateGameStatus(
    gameId: string | BN,
    isActive: boolean,
    timestamp: number,
  ): Promise<void> {
    const gameIdStr = gameId.toString();
    const updatedAt = new Date(timestamp * 1000).toISOString();

    await this.databaseService.execute(
      'UPDATE games SET "isActive" = $1, "updatedAt" = $2 WHERE "gameId" = $3',
      [isActive, updatedAt, gameIdStr],
    );

    this.logger.log(
      `Game status updated: game_id=${gameIdStr}, is_active=${isActive}`,
    );
  }

  /**
   * Handle GameStatusUpdated event
   */
  async handleGameStatusUpdated(
    eventData: GameStatusUpdatedEventData,
  ): Promise<void> {
    await this.updateGameStatus(
      eventData.game_id,
      eventData.is_active,
      eventData.timestamp,
    );
  }

  /**
   * Log GameCreated event (legacy - now we create games)
   */
  logGameCreated(gameId: string | BN, authority: string): void {
    this.logger.log(`GameCreated: game_id=${gameId}, authority=${authority}`);
  }
}
