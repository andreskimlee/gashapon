import { BN } from '@coral-xyz/anchor';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { GameStatusUpdatedEventData } from '../events/event-parser.service';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(private databaseService: DatabaseService) {}

  /**
   * Find game by on-chain game_id
   */
  async findGameByGameId(gameId: string | BN): Promise<{ id: number } | null> {
    const gameIdStr = gameId.toString();
    // Column name is camelCase (gameId) in the database
    const result = await this.databaseService.queryOne<{ id: number }>(
      'SELECT id FROM games WHERE "gameId" = $1',
      [gameIdStr],
    );
    return result;
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

    // Column names are camelCase in the database
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
   * Log GameCreated event (games are created via admin API, not from events)
   */
  logGameCreated(gameId: string | BN, authority: string): void {
    this.logger.log(`GameCreated: game_id=${gameId}, authority=${authority}`);
  }
}
