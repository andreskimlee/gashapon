import { BN } from '@coral-xyz/anchor';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  GamePlayInitiatedEventData,
  PrizeWonEventData,
  PlayLostEventData,
} from '../events/event-parser.service';
import { GameService } from './game.service';
import { PrizeService } from './prize.service';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class PlayService {
  private readonly logger = new Logger(PlayService.name);

  constructor(
    private databaseService: DatabaseService,
    private gameService: GameService,
    private prizeService: PrizeService,
    private supabaseService: SupabaseService,
  ) {}

  /**
   * Create a new play record
   */
  async createPlay(
    gameId: string | BN,
    userWallet: string,
    transactionSignature: string,
    tokenAmountPaid: string | BN,
    timestamp: number,
  ): Promise<void> {
    const gameIdStr = gameId.toString();

    // Find game by game_id
    const game = await this.gameService.findGameByGameId(gameIdStr);

    if (!game) {
      this.logger.warn(`Game not found: game_id=${gameIdStr}`);
      return;
    }

    // Insert play record
    const playedAt = new Date(timestamp * 1000).toISOString();
    await this.databaseService.execute(
      `INSERT INTO plays ("gameId", "userWallet", "transactionSignature", "tokenAmountPaid", "status", "playedAt")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        game.id,
        userWallet,
        transactionSignature,
        tokenAmountPaid.toString(),
        'pending',
        playedAt,
      ],
    );

    this.logger.log(`Play recorded: ${transactionSignature}`);
  }

  /**
   * Update play record with prize information and NFT mint
   */
  async updatePlayWithPrize(
    transactionSignature: string,
    prizeId: number,
    randomValue: number[],
    nftMint: string,
  ): Promise<void> {
    // Find play by transaction signature
    const play = await this.databaseService.queryOne<{ id: number }>(
      'SELECT id FROM plays WHERE "transactionSignature" = $1',
      [transactionSignature],
    );

    if (!play) {
      this.logger.warn(`Play not found: ${transactionSignature}`);
      return;
    }

    // Update play record with prize, NFT mint, and status
    const randomValueBase64 = Buffer.from(randomValue).toString('base64');
    await this.databaseService.execute(
      'UPDATE plays SET "prizeId" = $1, "status" = $2, "randomValue" = $3, "nftMint" = $4 WHERE id = $5',
      [prizeId, 'completed', randomValueBase64, nftMint, play.id],
    );

    this.logger.log(
      `Play updated with prize and NFT: ${transactionSignature}, nft_mint=${nftMint}`,
    );

    // Broadcast finalize event to the specific play channel
    await this.broadcastFinalize(transactionSignature, {
      transactionSignature,
      status: 'completed',
      prizeId,
      nftMint,
    });
  }

  /**
   * Handle GamePlayInitiated event
   */
  async handleGamePlayInitiated(
    eventData: GamePlayInitiatedEventData,
    signature: string,
  ): Promise<void> {
    await this.createPlay(
      eventData.game_id,
      eventData.user,
      signature,
      eventData.token_amount,
      eventData.timestamp,
    );
  }

  /**
   * Handle PrizeWon event (updates existing play record)
   */
  async handlePrizeWon(
    eventData: PrizeWonEventData,
    signature: string,
  ): Promise<void> {
    const gameIdStr = eventData.game_id.toString();
    const prizeIdStr = eventData.prize_id.toString();

    // Find game
    const game = await this.gameService.findGameByGameId(gameIdStr);
    if (!game) {
      this.logger.warn(`Game not found: game_id=${gameIdStr}`);
      return;
    }

    // Find prize
    const prize = await this.prizeService.findPrizeByPrizeId(
      game.id,
      prizeIdStr,
    );
    if (!prize) {
      this.logger.warn(`Prize not found: prize_id=${prizeIdStr}`);
      return;
    }

    // Update play record with prize and NFT mint
    await this.updatePlayWithPrize(
      signature,
      prize.id,
      eventData.random_value,
      eventData.nft_mint,
    );

    this.logger.log(
      `Prize won: prize_id=${prizeIdStr}, nft_mint=${eventData.nft_mint}, user=${eventData.user}, signature=${signature}`,
    );
  }

  /**
   * Handle PlayLost event (updates existing play record to failed status)
   */
  async handlePlayLost(
    eventData: PlayLostEventData,
    signature: string,
  ): Promise<void> {
    // Find play by transaction signature
    const play = await this.databaseService.queryOne<{ id: number }>(
      'SELECT id FROM plays WHERE "transactionSignature" = $1',
      [signature],
    );

    if (!play) {
      this.logger.warn(`Play not found: ${signature}`);
      return;
    }

    // Update play record to failed status
    const randomValueBase64 = Buffer.from(eventData.random_value).toString('base64');
    await this.databaseService.execute(
      'UPDATE plays SET "status" = $1, "randomValue" = $2 WHERE id = $3',
      ['failed', randomValueBase64, play.id],
    );

    this.logger.log(
      `Play lost: user=${eventData.user}, signature=${signature}`,
    );

    // Broadcast failed finalize event
    await this.broadcastFinalize(signature, {
      transactionSignature: signature,
      status: 'failed',
      prizeId: null,
      nftMint: null,
    });
  }

  /**
   * Broadcast a one-shot finalize message over Supabase Realtime Broadcast.
   * Uses a per-play channel: plays:<transactionSignature>
   */
  private async broadcastFinalize(
    transactionSignature: string,
    payload: {
      transactionSignature: string;
      status: 'completed' | 'failed';
      prizeId: number | null;
      nftMint: string | null;
    },
  ): Promise<void> {
    try {
      const client = this.supabaseService.getClient();
      const channelName = `plays:${transactionSignature}`;
      const channel = client.channel(channelName);
      await new Promise<void>((resolve) => {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve();
        });
      });
      await channel.send({
        type: 'broadcast',
        event: 'finalized',
        payload,
      });
      await client.removeChannel(channel);
      this.logger.debug(`Broadcasted finalize on ${channelName}`);
    } catch (err) {
      this.logger.warn(`Failed to broadcast finalize: ${transactionSignature} - ${(err as Error).message}`);
    }
  }
}
