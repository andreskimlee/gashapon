import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection } from '@solana/web3.js';
import { AppService } from './app.service';
import { EventParserService } from './indexer/events/event-parser.service';
import { GameService } from './indexer/services/game.service';

interface BackfillRequest {
  signature: string;
}

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  private connection: Connection;

  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
    private readonly eventParser: EventParserService,
    private readonly gameService: GameService,
  ) {
    const heliusApiKey = this.configService.get<string>('HELIUS_API_KEY') || '';
    const network =
      this.configService.get<string>('SOLANA_NETWORK') || 'devnet';
    const rpcUrl =
      network === 'mainnet-beta'
        ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
        : `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`;
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('backfill')
  async backfillTransaction(
    @Body() body: BackfillRequest,
  ): Promise<{ success: boolean; message: string; events?: any[] }> {
    const { signature } = body;

    if (!signature) {
      return { success: false, message: 'Missing signature' };
    }

    this.logger.log(`🔄 Backfilling transaction: ${signature}`);

    try {
      // Fetch transaction from Solana
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return { success: false, message: 'Transaction not found' };
      }

      if (!tx.meta) {
        return { success: false, message: 'Transaction missing meta' };
      }

      if (tx.meta.err) {
        return {
          success: false,
          message: `Transaction failed: ${JSON.stringify(tx.meta.err)}`,
        };
      }

      const logs = tx.meta.logMessages || [];
      this.logger.log(`📋 Found ${logs.length} log messages`);

      // Log each log message for debugging
      logs.forEach((log, i) => {
        this.logger.debug(`Log ${i}: ${log}`);
      });

      // Parse events from logs
      const events = this.eventParser.parseEvents(logs, signature, tx.slot);
      this.logger.log(`📊 Parsed ${events.length} events`);

      if (events.length === 0) {
        return {
          success: false,
          message: 'No events found in transaction logs',
          events: [],
        };
      }

      // Process each event
      for (const event of events) {
        this.logger.log(`🎯 Processing event: ${event.name}`);

        if (event.name === 'GameCreated') {
          const data = event.data as { game_id: any; authority: string };
          await this.gameService.handleGameCreated(data as any);
        }
        // Add other event handlers as needed
      }

      return {
        success: true,
        message: `Successfully processed ${events.length} events`,
        events: events.map((e) => ({ name: e.name, data: e.data })),
      };
    } catch (error) {
      this.logger.error(`Error backfilling: ${error}`);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
