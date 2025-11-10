import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SupplyReplenishedEventData } from '../events/event-parser.service';

@Injectable()
export class PrizeService {
  private readonly logger = new Logger(PrizeService.name);

  constructor(private databaseService: DatabaseService) {}

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
