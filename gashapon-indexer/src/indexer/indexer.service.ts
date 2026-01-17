import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HeliusService,
  HeliusWebSocketMessage,
} from '../helius/helius.service';
import { EventParserService, ParsedEvent } from './events/event-parser.service';
import { GameService } from './services/game.service';
import { MarketplaceService } from './services/marketplace.service';
import { NftService } from './services/nft.service';
import { PlayService } from './services/play.service';
import { PrizeService } from './services/prize.service';

@Injectable()
export class IndexerService implements OnModuleInit {
  private readonly logger = new Logger(IndexerService.name);
  private readonly gameProgramId: string;
  private readonly marketplaceProgramId: string;

  constructor(
    private heliusService: HeliusService,
    private eventParser: EventParserService,
    private gameService: GameService,
    private playService: PlayService,
    private prizeService: PrizeService,
    private nftService: NftService,
    private marketplaceService: MarketplaceService,
    private configService: ConfigService,
  ) {
    // This is the single program that handles all games
    // Each game is a PDA account (derived from [b"game", game_id])
    // Events include game_id to identify which specific game instance
    this.gameProgramId =
      this.configService.get<string>('GACHAPON_GAME_PROGRAM_ID') ||
      '4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG';
    this.marketplaceProgramId =
      this.configService.get<string>('GACHAPON_MARKETPLACE_PROGRAM_ID') ||
      '4zHkHBrSyBsi2L5J1ikZ5kQwNcGMcE2x3wKrG3FY7UqC';
  }

  onModuleInit() {
    // Register message handler with HeliusService
    this.heliusService.onMessage('transaction', (message) => {
      this.processTransaction(message).catch((error) => {
        this.logger.error(
          `Error processing transaction: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
    });

    this.logger.log('✅ Indexer service initialized');
    this.logger.log(`Game Program ID: ${this.gameProgramId}`);
    this.logger.log(`Marketplace Program ID: ${this.marketplaceProgramId}`);
  }

  /**
   * Process transaction from Helius WebSocket
   * This is called by the HeliusService when a transaction is received
   */
  async processTransaction(message: HeliusWebSocketMessage): Promise<void> {
    if (!message.transaction) {
      return;
    }

    const txData = message.transaction;
    const { transaction: tx, meta } = txData;
    const slot = message.slot || 0;

    // Check if transaction failed
    if (meta.err) {
      this.logger.debug(
        `Transaction failed, skipping: ${JSON.stringify(meta.err)}`,
      );
      return;
    }

    // Extract transaction signature
    const signature = tx?.signatures?.[0];
    if (!signature) {
      this.logger.warn('Transaction missing signature');
      return;
    }

    this.logger.log(`🔍 Processing transaction: ${signature}`);

    // Parse logs for Anchor events
    const logs = meta.logMessages || [];
    this.logger.debug(`Found ${logs.length} log messages`);

    const events = this.eventParser.parseEvents(logs, signature, slot);
    this.logger.log(
      `📊 Parsed ${events.length} events from transaction ${signature}`,
    );

    if (events.length === 0) {
      this.logger.debug(
        `No events found in transaction ${signature}. Logs: ${logs.slice(0, 3).join('; ')}`,
      );
    }

    // Process each event
    for (const event of events) {
      try {
        this.logger.log(
          `🎯 Handling event: ${event.name} from transaction ${signature}`,
        );
        await this.handleEvent(event);
        this.logger.log(`✅ Successfully processed event: ${event.name}`);
      } catch (error) {
        this.logger.error(
          `❌ Error handling event ${event.name}: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  /**
   * Handle parsed event and delegate to appropriate service
   */
  private async handleEvent(event: ParsedEvent): Promise<void> {
    this.logger.log(`Processing event: ${event.name}`);

    switch (event.name) {
      case 'GameCreated':
        await this.handleGameCreated(event);
        break;

      case 'PrizeAdded':
        await this.handlePrizeAdded(event);
        break;

      case 'GamePlayInitiated':
        await this.handleGamePlayInitiated(event);
        break;

      case 'PrizeWon':
        await this.handlePrizeWon(event);
        break;

      case 'PlayLost':
        await this.handlePlayLost(event);
        break;

      case 'GameStatusUpdated':
        await this.handleGameStatusUpdated(event);
        break;

      case 'SupplyReplenished':
        await this.handleSupplyReplenished(event);
        break;

      case 'TreasuryWithdrawn':
        await this.handleTreasuryWithdrawn(event);
        break;

      case 'NFTListed':
      case 'NFTDelisted':
      case 'NFTSold':
      case 'PriceUpdated':
        // Marketplace events - TODO: Implement when marketplace IDL is available
        this.logger.warn(`Marketplace event ${event.name} not yet implemented`);
        break;

      default:
        this.logger.warn(`Unhandled event type: ${event.name}`);
    }
  }

  /**
   * Handle GameCreated event - create game in database from on-chain data
   */
  private async handleGameCreated(event: ParsedEvent): Promise<void> {
    if (event.name !== 'GameCreated') return;

    const data =
      event.data as import('./events/event-parser.service').GameCreatedEventData;

    // Create game in database from on-chain data
    await this.gameService.handleGameCreated(data);
  }

  /**
   * Handle PrizeAdded event - add prize to game in database
   */
  private async handlePrizeAdded(event: ParsedEvent): Promise<void> {
    if (event.name !== 'PrizeAdded') return;

    const data =
      event.data as import('./events/event-parser.service').PrizeAddedEventData;

    // Add prize to game in database
    await this.prizeService.handlePrizeAdded(data);
  }

  /**
   * Handle GamePlayInitiated event
   */
  private async handleGamePlayInitiated(event: ParsedEvent): Promise<void> {
    if (event.name !== 'GamePlayInitiated') return;

    const data =
      event.data as import('./events/event-parser.service').GamePlayInitiatedEventData;
    await this.playService.handleGamePlayInitiated(data, event.signature);
  }

  /**
   * Handle PrizeWon event
   */
  private async handlePrizeWon(event: ParsedEvent): Promise<void> {
    if (event.name !== 'PrizeWon') return;

    const data =
      event.data as import('./events/event-parser.service').PrizeWonEventData;
    await this.playService.handlePrizeWon(data, event.signature);

    // Persist NFT record and ownership
    try {
      const game = await this.gameService.findGameByGameId(
        data.game_id.toString(),
      );
      if (!game) {
        this.logger.warn(
          `Game not found while creating NFT: game_id=${data.game_id.toString()}`,
        );
        return;
      }
      const prize = await this.prizeService.findPrizeByPrizeId(
        game.id,
        data.prize_id.toString(),
      );
      if (!prize) {
        this.logger.warn(
          `Prize not found while creating NFT: prize_id=${data.prize_id.toString()}`,
        );
        return;
      }

      const mintAddress = data.nft_mint;
      await this.nftService.createNft(
        mintAddress,
        prize.id,
        game.id,
        data.user,
      );
      await this.nftService.upsertOwnership(mintAddress, data.user, 1);
      this.logger.log(
        `NFT persisted: mint=${mintAddress}, owner=${data.user}, game_id=${game.id}, prize_id=${prize.id}`,
      );
    } catch (e) {
      this.logger.error(
        `Error persisting NFT for PrizeWon: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  /**
   * Handle PlayLost event
   */
  private async handlePlayLost(event: ParsedEvent): Promise<void> {
    if (event.name !== 'PlayLost') return;

    const data =
      event.data as import('./events/event-parser.service').PlayLostEventData;
    await this.playService.handlePlayLost(data, event.signature);
  }

  /**
   * Handle GameStatusUpdated event
   */
  private async handleGameStatusUpdated(event: ParsedEvent): Promise<void> {
    if (event.name !== 'GameStatusUpdated') return;

    const data =
      event.data as import('./events/event-parser.service').GameStatusUpdatedEventData;
    await this.gameService.handleGameStatusUpdated(data);
  }

  /**
   * Handle SupplyReplenished event
   */
  private async handleSupplyReplenished(event: ParsedEvent): Promise<void> {
    if (event.name !== 'SupplyReplenished') return;

    const data =
      event.data as import('./events/event-parser.service').SupplyReplenishedEventData;
    const game = await this.gameService.findGameByGameId(data.game_id);

    if (!game) {
      this.logger.warn(`Game not found: game_id=${data.game_id.toString()}`);
      return;
    }

    await this.prizeService.handleSupplyReplenished(data, game.id);
  }

  /**
   * Handle TreasuryWithdrawn event
   */
  private async handleTreasuryWithdrawn(event: ParsedEvent): Promise<void> {
    if (event.name !== 'TreasuryWithdrawn') return;

    const data =
      event.data as import('./events/event-parser.service').TreasuryWithdrawnEventData;
    this.logger.log(
      `Treasury withdrawn: game_id=${data.game_id.toString()}, amount=${data.amount.toString()}`,
    );
    // This is informational - no database update needed
  }
}
