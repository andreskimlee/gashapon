import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { PrizeAddedEventData, SupplyReplenishedEventData } from '../events/event-parser.service';
import { GameService } from './game.service';

const TIER_MAP: Record<number, string> = {
  0: 'common',
  1: 'uncommon',
  2: 'rare',
  3: 'legendary',
};

@Injectable()
export class PrizeService {
  private readonly logger = new Logger(PrizeService.name);

  constructor(
    private databaseService: DatabaseService,
    private gameService: GameService,
  ) {}

  /**
   * Find prize by gameId and prizeId
   */
  async findPrizeByPrizeId(
    gameId: number,
    prizeId: string | number,
  ): Promise<{ id: number } | null> {
    const prizeIdStr = prizeId.toString();
    const result = await this.databaseService.queryOne<{ id: number }>(
      'SELECT id FROM prizes WHERE "gameId" = $1 AND "prizeId" = $2',
      [gameId, prizeIdStr],
    );
    return result;
  }

  /**
   * Find prize by gameId and prize index
   */
  async findPrizeByIndex(
    gameId: number,
    prizeIndex: number,
  ): Promise<{ id: number; prizeId: string } | null> {
    const result = await this.databaseService.queryOne<{ id: number; prizeId: string }>(
      'SELECT id, "prizeId" FROM prizes WHERE "gameId" = $1 AND "prizeIndex" = $2',
      [gameId, prizeIndex],
    );
    return result;
  }

  /**
   * Handle PrizeAdded event - creates a prize in the database
   * Note: This creates a minimal prize record. Full prize details should be
   * added via admin API or fetched from the on-chain Prize account.
   */
  async handlePrizeAdded(eventData: PrizeAddedEventData): Promise<void> {
    // First, find the game by game_id
    const game = await this.databaseService.queryOne<{ id: number }>(
      'SELECT id FROM games WHERE "gameId" = $1',
      [eventData.game_id.toString()],
    );

    if (!game) {
      this.logger.warn(
        `Game not found for PrizeAdded event: game_id=${eventData.game_id.toString()}`,
      );
      return;
    }

    const gameId = Number(eventData.game_id);
    const gamePda = this.gameService.getGamePda(gameId);

    const [onChainPrize, onChainGame] = await Promise.all([
      this.gameService.fetchPrizeFromChain(gamePda, eventData.prize_index),
      this.gameService.fetchGameFromChain(gameId),
    ]);

    // Check if prize already exists
    const existingPrize = await this.findPrizeByPrizeId(
      game.id,
      eventData.prize_id.toString(),
    );

    if (existingPrize) {
      this.logger.log(
        `Prize already exists: prize_id=${eventData.prize_id.toString()}, updating supply`,
      );
      // Update the supply if prize already exists
      await this.databaseService.execute(
        `UPDATE prizes SET 
          "supplyTotal" = $1,
          "supplyRemaining" = $1,
          "probabilityBasisPoints" = $2,
          "prizeIndex" = $3,
          "name" = COALESCE($4, "name"),
          "description" = COALESCE($5, "description"),
          "imageUrl" = COALESCE($6, "imageUrl"),
          "metadataUri" = COALESCE($7, "metadataUri"),
          "physicalSku" = COALESCE($8, "physicalSku"),
          "tier" = COALESCE($9, "tier"),
          "costInUsd" = COALESCE($10, "costInUsd"),
          "weightGrams" = COALESCE($11, "weightGrams"),
          "updatedAt" = NOW()
        WHERE id = $12`,
        [
          onChainPrize?.supplyTotal ?? eventData.supply_total,
          onChainPrize?.probabilityBp ?? eventData.probability_bp,
          onChainPrize?.prizeIndex ?? eventData.prize_index,
          onChainPrize?.name || null,
          onChainPrize?.description || null,
          onChainPrize?.imageUrl || null,
          onChainPrize?.metadataUri || null,
          onChainPrize?.physicalSku || null,
          onChainPrize ? TIER_MAP[onChainPrize.tier] || 'common' : null,
          onChainPrize ? Number(onChainPrize.costUsd) / 100 : null,
          onChainPrize?.weightGrams ?? null,
          existingPrize.id,
        ],
      );

      if (onChainGame) {
        await this.databaseService.execute(
          'UPDATE games SET "isActive" = $1, "totalPlays" = $2, "updatedAt" = NOW() WHERE "gameId" = $3',
          [
            onChainGame.isActive,
            Number(onChainGame.totalPlays),
            gameId.toString(),
          ],
        );
      }
      return;
    }

    // Create a new prize with on-chain details (fallback to placeholders)
    await this.databaseService.execute(
      `INSERT INTO prizes (
        "gameId", "prizeId", "prizeIndex", "name", "description", 
        "imageUrl", "metadataUri", "physicalSku", "tier", 
        "probabilityBasisPoints", "costInUsd", "weightGrams", "supplyTotal", "supplyRemaining"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        game.id,
        eventData.prize_id.toString(),
        onChainPrize?.prizeIndex ?? eventData.prize_index,
        onChainPrize?.name || `Prize ${eventData.prize_index + 1}`,
        onChainPrize?.description || '',
        onChainPrize?.imageUrl || '',
        onChainPrize?.metadataUri || '',
        onChainPrize?.physicalSku || '',
        onChainPrize ? TIER_MAP[onChainPrize.tier] || 'common' : 'common',
        onChainPrize?.probabilityBp ?? eventData.probability_bp,
        onChainPrize ? Number(onChainPrize.costUsd) / 100 : 0,
        onChainPrize?.weightGrams ?? null,
        onChainPrize?.supplyTotal ?? eventData.supply_total,
        onChainPrize?.supplyRemaining ?? eventData.supply_total,
      ],
    );

    if (onChainGame) {
      await this.databaseService.execute(
        'UPDATE games SET "isActive" = $1, "totalPlays" = $2, "updatedAt" = NOW() WHERE "gameId" = $3',
        [
          onChainGame.isActive,
          Number(onChainGame.totalPlays),
          gameId.toString(),
        ],
      );
    }

    this.logger.log(
      `Prize created from on-chain event: game_id=${eventData.game_id.toString()}, prize_id=${eventData.prize_id.toString()}, prize_index=${eventData.prize_index}`,
    );
  }

  /**
   * Update prize supply
   */
  async updatePrizeSupply(
    gameId: number,
    prizeId: string | number,
    newSupply: number,
  ): Promise<void> {
    const prizeIdStr = prizeId.toString();
    await this.databaseService.execute(
      'UPDATE prizes SET "supplyRemaining" = $1 WHERE "gameId" = $2 AND "prizeId" = $3',
      [newSupply, gameId, prizeIdStr],
    );

    this.logger.log(
      `Prize supply replenished: prize_id=${prizeIdStr}, new_supply=${newSupply}`,
    );
  }

  /**
   * Handle SupplyReplenished event
   */
  async handleSupplyReplenished(
    eventData: SupplyReplenishedEventData,
    gameId: number,
  ): Promise<void> {
    await this.updatePrizeSupply(
      gameId,
      eventData.prize_id.toString(),
      eventData.new_supply,
    );
  }
}
