import { BN } from '@coral-xyz/anchor';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { PriceService } from '../../price/price.service';
import { SupabaseService } from '../../supabase/supabase.service';
import {
  GamePlayInitiatedEventData,
  PlayLostEventData,
  PrizeWonEventData,
  PlayResolvedEventData,
  PrizeClaimedEventData,
} from '../events/event-parser.service';
import { GameService } from './game.service';
import { PrizeService } from './prize.service';
import { NftService } from './nft.service';

@Injectable()
export class PlayService {
  private readonly logger = new Logger(PlayService.name);

  constructor(
    private databaseService: DatabaseService,
    private gameService: GameService,
    private prizeService: PrizeService,
    private nftService: NftService,
    private supabaseService: SupabaseService,
    private priceService: PriceService,
  ) {}

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
   * Verifies payment amount against current token price using pump.fun API
   */
  async handleGamePlayInitiated(
    eventData: GamePlayInitiatedEventData,
    signature: string,
  ): Promise<void> {
    const gameIdStr = eventData.game_id.toString();
    const tokenAmount = BigInt(eventData.token_amount.toString());

    // Fetch game data from chain to get costUsd and tokenMint
    const gameData = await this.gameService.fetchGameFromChain(
      Number(gameIdStr),
    );

    if (!gameData) {
      this.logger.error(
        `Cannot verify payment - game not found on chain: game_id=${gameIdStr}`,
      );
      // Still record the play as pending (will be updated by finalize events)
      await this.createPlayWithStatus(
        eventData.game_id,
        eventData.user,
        signature,
        eventData.token_amount,
        eventData.timestamp,
        'pending',
      );
      return;
    }

    // Verify payment using pump.fun price oracle
    const costUsdCents = Number(gameData.costUsd);
    const tokenMint = gameData.tokenMint.toString();

    this.logger.log(
      `Verifying payment: game_id=${gameIdStr}, cost=$${(costUsdCents / 100).toFixed(2)}, ` +
        `token_amount=${tokenAmount}, token_mint=${tokenMint.slice(0, 8)}...`,
    );

    const verification = await this.priceService.verifyPayment(
      tokenAmount,
      costUsdCents,
      tokenMint,
      6, // Token decimals (pump.fun tokens typically have 6)
      eventData.timestamp, // Pass tx timestamp for staleness check
    );

    // Log flags for monitoring
    if (verification.flags) {
      if (verification.flags.isManipulated) {
        this.logger.warn(
          `⚠️ Price manipulation detected for play: ${signature}`,
        );
      }
      if (verification.flags.usedTwap) {
        this.logger.log(`Used TWAP price for verification: ${signature}`);
      }
    }

    if (verification.isValid) {
      this.logger.log(`✅ Payment verified: ${verification.message}`);
      await this.createPlayWithStatus(
        eventData.game_id,
        eventData.user,
        signature,
        eventData.token_amount,
        eventData.timestamp,
        'pending', // Verified, waiting for finalize
      );

      // Broadcast payment verification success - frontend can start game animation
      await this.broadcastPaymentVerification(signature, {
        transactionSignature: signature,
        status: 'verified',
        message: verification.message,
        actualUsdValue: verification.actualUsdValue,
      });
    } else {
      this.logger.warn(`❌ Insufficient payment: ${verification.message}`);
      // Use 'failed' status (valid DB enum value) instead of 'rejected'
      await this.createPlayWithStatus(
        eventData.game_id,
        eventData.user,
        signature,
        eventData.token_amount,
        eventData.timestamp,
        'failed', // Payment was insufficient
      );

      // Broadcast payment rejection - frontend should show error
      await this.broadcastPaymentVerification(signature, {
        transactionSignature: signature,
        status: 'rejected',
        message: verification.message,
        actualUsdValue: verification.actualUsdValue,
      });

      // Also broadcast finalize as failed for backwards compatibility
      await this.broadcastFinalize(signature, {
        transactionSignature: signature,
        status: 'failed',
        prizeId: null,
        nftMint: null,
      });
    }
  }

  /**
   * Create a play record with a specific status
   * Note: DB enum only supports 'pending', 'completed', 'failed'
   */
  private async createPlayWithStatus(
    gameId: string | BN,
    userWallet: string,
    transactionSignature: string,
    tokenAmountPaid: string | BN,
    timestamp: number,
    status: 'pending' | 'failed',
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
        status,
        playedAt,
      ],
    );

    this.logger.log(`Play recorded: ${transactionSignature}, status=${status}`);
  }

  /**
   * Handle PrizeWon event (updates existing play record)
   * IMPORTANT: Checks if payment was verified before awarding prize
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

    // SECURITY CHECK: Verify the play wasn't marked as failed due to insufficient payment
    const existingPlay = await this.databaseService.queryOne<{ id: number; status: string }>(
      'SELECT id, status FROM plays WHERE "transactionSignature" = $1',
      [signature],
    );

    if (existingPlay?.status === 'failed') {
      this.logger.warn(
        `⚠️ REJECTING prize award - play was marked as failed (insufficient payment): ${signature}`,
      );
      // Don't award the prize, but still broadcast the rejection
      await this.broadcastFinalize(signature, {
        transactionSignature: signature,
        status: 'failed',
        prizeId: null,
        nftMint: null,
      });
      return;
    }

    // Update play record with prize and NFT mint
    await this.updatePlayWithPrize(
      signature,
      prize.id,
      eventData.random_value,
      eventData.nft_mint,
    );

    // Decrement prize supply (matches on-chain supply decrement)
    await this.databaseService.execute(
      `UPDATE prizes SET "supplyRemaining" = GREATEST(0, "supplyRemaining" - 1), "updatedAt" = NOW() WHERE id = $1`,
      [prize.id],
    );
    this.logger.log(`Decremented supplyRemaining for prize id=${prize.id}`);

    // Increment totalPlays count on the game (matches on-chain finalize_play)
    await this.databaseService.execute(
      `UPDATE games SET "totalPlays" = COALESCE("totalPlays", 0) + 1, "updatedAt" = NOW() WHERE id = $1`,
      [game.id],
    );
    this.logger.log(`Incremented totalPlays for game id=${game.id} (PrizeWon)`);

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
    const gameIdStr = eventData.game_id.toString();

    // Find game to increment totalPlays
    const game = await this.gameService.findGameByGameId(gameIdStr);

    // Find play by transaction signature
    const play = await this.databaseService.queryOne<{ id: number }>(
      'SELECT id FROM plays WHERE "transactionSignature" = $1',
      [signature],
    );

    if (!play) {
      this.logger.warn(`Play not found: ${signature}`);
      // Even if play record doesn't exist, we should still increment totalPlays
      // since the on-chain finalize_play did increment it
    } else {
      // Update play record to failed status
      const randomValueBase64 = Buffer.from(eventData.random_value).toString(
        'base64',
      );
      await this.databaseService.execute(
        'UPDATE plays SET "status" = $1, "randomValue" = $2 WHERE id = $3',
        ['failed', randomValueBase64, play.id],
      );
    }

    // Increment totalPlays count on the game (matches on-chain finalize_play)
    if (game) {
      await this.databaseService.execute(
        `UPDATE games SET "totalPlays" = COALESCE("totalPlays", 0) + 1, "updatedAt" = NOW() WHERE id = $1`,
        [game.id],
      );
      this.logger.log(
        `Incremented totalPlays for game id=${game.id} (PlayLost)`,
      );
    } else {
      this.logger.warn(`Game not found for PlayLost: game_id=${gameIdStr}`);
    }

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
   * Handle PlayResolved event - new secure event from finalize_play
   * This replaces PrizeWon/PlayLost events
   */
  async handlePlayResolved(
    eventData: PlayResolvedEventData,
    signature: string,
  ): Promise<void> {
    const gameIdStr = eventData.game_id.toString();

    // Find game
    const game = await this.gameService.findGameByGameId(gameIdStr);
    if (!game) {
      this.logger.warn(`Game not found: game_id=${gameIdStr}`);
      return;
    }

    // Find or create play record by session (not signature, since session is unique)
    let play = await this.databaseService.queryOne<{ id: number; status: string }>(
      'SELECT id, status FROM plays WHERE "transactionSignature" = $1',
      [signature],
    );

    if (!play) {
      // Create play record if it doesn't exist (idempotent)
      await this.databaseService.execute(
        `INSERT INTO plays ("gameId", "userWallet", "transactionSignature", "status", "playedAt")
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT ("transactionSignature") DO NOTHING`,
        [game.id, eventData.user, signature, 'pending'],
      );
      // Re-fetch the play record
      play = await this.databaseService.queryOne<{ id: number; status: string }>(
        'SELECT id, status FROM plays WHERE "transactionSignature" = $1',
        [signature],
      );
      if (!play) {
        this.logger.warn(`Failed to create/find play record for signature=${signature}`);
        return;
      }
    }

    // Update play record with result
    const randomValueBase64 = Buffer.from(eventData.random_value).toString('base64');
    
    if (eventData.is_win && eventData.prize_id) {
      // Find prize
      const prizeIdStr = eventData.prize_id.toString();
      const prize = await this.prizeService.findPrizeByPrizeId(game.id, prizeIdStr);
      
      if (prize) {
        await this.databaseService.execute(
          'UPDATE plays SET "prizeId" = $1, "status" = $2, "randomValue" = $3 WHERE "transactionSignature" = $4',
          [prize.id, 'completed', randomValueBase64, signature],
        );
        
        // Decrement prize supply
        await this.databaseService.execute(
          `UPDATE prizes SET "supplyRemaining" = GREATEST(0, "supplyRemaining" - 1), "updatedAt" = NOW() WHERE id = $1`,
          [prize.id],
        );
        
        // NOTE: NFT is auto-minted by finalize_play on-chain now
        // The PrizeClaimed event (emitted in same tx) will handle NFT record creation
        // with the actual mint address
        
        this.logger.log(`Play resolved (WIN): session=${eventData.session}, prize_id=${prizeIdStr}, NFT will be created by PrizeClaimed event`);
        
        // Broadcast win
        await this.broadcastFinalize(signature, {
          transactionSignature: signature,
          status: 'completed',
          prizeId: prize.id,
          nftMint: null, // Will be set by PrizeClaimed handler
        });
      }
    } else {
      // User lost
      await this.databaseService.execute(
        'UPDATE plays SET "status" = $1, "randomValue" = $2 WHERE "transactionSignature" = $3',
        ['failed', randomValueBase64, signature],
      );
      
      this.logger.log(`Play resolved (LOSE): session=${eventData.session}`);
      
      // Broadcast loss
      await this.broadcastFinalize(signature, {
        transactionSignature: signature,
        status: 'failed',
        prizeId: null,
        nftMint: null,
      });
    }

    // Increment totalPlays count on the game
    await this.databaseService.execute(
      `UPDATE games SET "totalPlays" = COALESCE("totalPlays", 0) + 1, "updatedAt" = NOW() WHERE id = $1`,
      [game.id],
    );
  }

  /**
   * Handle PrizeClaimed event - user claimed their prize and minted NFT
   * Updates the placeholder NFT record with the real on-chain mint address
   */
  async handlePrizeClaimed(
    eventData: PrizeClaimedEventData,
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
    const prize = await this.prizeService.findPrizeByPrizeId(game.id, prizeIdStr);
    if (!prize) {
      this.logger.warn(`Prize not found: prize_id=${prizeIdStr}`);
      return;
    }

    // Update play record with NFT mint (use subquery for ORDER BY/LIMIT)
    await this.databaseService.execute(
      `UPDATE plays SET "nftMint" = $1, "status" = 'completed' 
       WHERE id = (
         SELECT id FROM plays 
         WHERE "gameId" = $2 AND "userWallet" = $3 AND "prizeId" = $4 
           AND ("nftMint" IS NULL OR "nftMint" LIKE 'pending:%')
         ORDER BY "playedAt" DESC LIMIT 1
       )`,
      [eventData.nft_mint, game.id, eventData.user, prize.id],
    );

    // Since NFTs are now auto-minted, always create the NFT record directly
    // (No more placeholder system - the real mint address is available immediately)
    await this.nftService.createNft(
      eventData.nft_mint,
      prize.id,
      game.id,
      eventData.user,
    );
    this.logger.log(`Prize claimed: session=${eventData.session}, nft_mint=${eventData.nft_mint}, created NFT record`);

    // Broadcast updated finalize event with NFT mint
    await this.broadcastFinalize(signature, {
      transactionSignature: signature,
      status: 'completed',
      prizeId: prize.id,
      nftMint: eventData.nft_mint,
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
      this.logger.warn(
        `Failed to broadcast finalize: ${transactionSignature} - ${(err as Error).message}`,
      );
    }
  }

  /**
   * Broadcast payment verification status over Supabase Realtime.
   * Frontend should wait for this before starting game animation.
   * Uses the same channel: plays:<transactionSignature>
   */
  private async broadcastPaymentVerification(
    transactionSignature: string,
    payload: {
      transactionSignature: string;
      status: 'verified' | 'rejected';
      message: string;
      actualUsdValue: number | null;
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
        event: 'payment_verified',
        payload,
      });
      await client.removeChannel(channel);
      this.logger.debug(
        `Broadcasted payment verification (${payload.status}) on ${channelName}`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to broadcast payment verification: ${transactionSignature} - ${(err as Error).message}`,
      );
    }
  }
}
