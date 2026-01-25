import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection } from '@solana/web3.js';
import WebSocket from 'ws';

export interface HeliusWebSocketMessage {
  type?: string;
  account?: {
    account: string[];
    executable: boolean;
    lamports: number;
    owner: string;
    rentEpoch?: number;
    data: string[];
  };
  transaction?: {
    transaction: {
      message: {
        accountKeys: string[];
        instructions: Array<{
          programId: string;
          accounts: string[];
          data: string;
        }>;
        recentBlockhash: string;
      };
      signatures: string[];
    };
    meta: {
      err: any;
      fee: number;
      innerInstructions: any[];
      logMessages: string[];
      postBalances: number[];
      postTokenBalances: any[];
      preBalances: number[];
      preTokenBalances: any[];
    };
  };
  slot?: number;
}

@Injectable()
export class HeliusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HeliusService.name);
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000; // 5 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private messageHandlers: Map<
    string,
    (message: HeliusWebSocketMessage) => void
  > = new Map();

  private readonly heliusApiKey: string;
  private readonly network: string;
  private readonly gameProgramId: string;
  private readonly marketplaceProgramId: string;
  private readonly connection: Connection;

  constructor(private configService: ConfigService) {
    this.heliusApiKey = this.configService.get<string>('HELIUS_API_KEY') || '';
    this.network = this.configService.get<string>('SOLANA_NETWORK') || 'devnet';
    this.gameProgramId =
      this.configService.get<string>('GACHAPON_GAME_PROGRAM_ID') ||
      'EKzLHZyU6WVfhYVXcE6R4hRE4YuWrva8NeLGMYB7ZDU6';
    this.marketplaceProgramId =
      this.configService.get<string>('GACHAPON_MARKETPLACE_PROGRAM_ID') ||
      '4zHkHBrSyBsi2L5J1ikZ5kQwNcGMcE2x3wKrG3FY7UqC';

    if (!this.heliusApiKey) {
      throw new Error('HELIUS_API_KEY must be configured');
    }

    // Create RPC connection to fetch full transaction details
    const rpcUrl =
      this.network === 'mainnet-beta'
        ? `https://mainnet.helius-rpc.com/?api-key=${this.heliusApiKey}`
        : `https://devnet.helius-rpc.com/?api-key=${this.heliusApiKey}`;
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  onModuleInit() {
    this.connect();
  }

  onModuleDestroy() {
    this.disconnect();
  }

  /**
   * Register a message handler for a specific event type
   */
  onMessage(type: string, handler: (message: HeliusWebSocketMessage) => void) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Connect to Helius WebSocket
   */
  private connect() {
    try {
      const wsUrl = this.getWebSocketUrl();
      this.logger.log(`Connecting to Helius WebSocket: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        this.logger.log('✅ Connected to Helius WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.subscribe();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const parsed = JSON.parse(data.toString());

          // Handle subscription confirmation
          if (parsed.id && parsed.result) {
            this.logger.log(
              `✅ Subscription confirmed (ID: ${parsed.id}): ${parsed.result}`,
            );
            return;
          }

          // Handle subscription errors
          if (parsed.error) {
            this.logger.error(
              `❌ Subscription error (ID: ${parsed.id}): ${JSON.stringify(parsed.error)}`,
            );
            // Don't return - might be a non-fatal error for one subscription
            return;
          }

          // Handle log notifications (from logsSubscribe)
          if (parsed.method === 'logsNotification' && parsed.params) {
            const result = parsed.params.result;
            if (result && result.value) {
              const signature = result.value.signature;
              const logs = result.value.logs || [];
              this.logger.log(`📋 Received logs for transaction: ${signature}`);

              // Fetch full transaction details
              this.fetchAndProcessTransaction(signature, logs).catch(
                (error) => {
                  this.logger.error(
                    `Error fetching transaction ${signature}: ${error instanceof Error ? error.message : String(error)}`,
                  );
                },
              );
            }
            return;
          }

          // Handle transaction notifications
          if (parsed.params && parsed.params.result) {
            const message = parsed.params.result as HeliusWebSocketMessage;
            this.logger.debug(
              `Received transaction notification: ${message.transaction?.transaction?.signatures?.[0] || 'unknown'}`,
            );
            this.handleMessage(message);
          } else if (parsed.transaction || parsed.account) {
            // Direct message format
            const message = parsed as HeliusWebSocketMessage;
            this.logger.debug(
              `Received direct message: ${message.transaction?.transaction?.signatures?.[0] || 'unknown'}`,
            );
            this.handleMessage(message);
          } else {
            this.logger.debug(
              `Received unhandled message format: ${JSON.stringify(parsed).substring(0, 200)}`,
            );
          }
        } catch (error) {
          this.logger.error(`Error parsing WebSocket message: ${error}`);
        }
      });

      this.ws.on('error', (error) => {
        this.logger.error(`WebSocket error: ${error.message}`);
        this.isConnected = false;
      });

      this.ws.on('close', () => {
        this.logger.warn('WebSocket connection closed');
        this.isConnected = false;
        this.scheduleReconnect();
      });
    } catch (error) {
      this.logger.error(`Error connecting to Helius: ${error}`);
      this.scheduleReconnect();
    }
  }

  /**
   * Get WebSocket URL for Helius
   */
  private getWebSocketUrl(): string {
    const baseUrl =
      this.network === 'mainnet-beta'
        ? 'wss://mainnet.helius-rpc.com'
        : 'wss://devnet.helius-rpc.com';

    return `${baseUrl}/?api-key=${this.heliusApiKey}`;
  }

  /**
   * Subscribe to program logs and transactions
   * Using logsSubscribe to monitor all logs from our programs
   * This will capture all transactions that invoke our programs
   */
  private subscribe() {
    if (!this.ws || !this.isConnected) {
      return;
    }

    // Subscribe to logs for both programs
    // logsSubscribe monitors all log messages from specified addresses
    const subscribeGameLogs = {
      jsonrpc: '2.0',
      id: 1,
      method: 'logsSubscribe',
      params: [
        {
          mentions: [this.gameProgramId],
        },
        {
          commitment: 'confirmed',
        },
      ],
    };

    const subscribeMarketplaceLogs = {
      jsonrpc: '2.0',
      id: 2,
      method: 'logsSubscribe',
      params: [
        {
          mentions: [this.marketplaceProgramId],
        },
        {
          commitment: 'confirmed',
        },
      ],
    };

    // Send subscriptions
    this.ws.send(JSON.stringify(subscribeGameLogs));
    this.logger.log(
      `Subscribed to logs for game program: ${this.gameProgramId}`,
    );

    this.ws.send(JSON.stringify(subscribeMarketplaceLogs));
    this.logger.log(
      `Subscribed to logs for marketplace program: ${this.marketplaceProgramId}`,
    );
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: HeliusWebSocketMessage) {
    // Handle transaction messages
    if (message.transaction) {
      this.processTransaction(message);

      // Also call registered handlers
      for (const [type, handler] of this.messageHandlers.entries()) {
        handler(message);
      }
    }
  }

  /**
   * Get message handlers (for indexer service to register)
   */
  getMessageHandlers(): Map<string, (message: HeliusWebSocketMessage) => void> {
    return this.messageHandlers;
  }

  /**
   * Process transaction to extract Anchor events
   * Helius enhanced transactions include parsed events in meta.events
   */
  private processTransaction(message: HeliusWebSocketMessage) {
    if (!message.transaction) {
      return;
    }

    const txData = message.transaction;
    const { transaction: tx, meta } = txData;

    // Check if transaction failed
    if (meta.err) {
      const signature = tx?.signatures?.[0] || 'unknown';
      this.logger.warn(`❌ Transaction failed: ${signature}`);
      this.logger.warn(`   Error: ${JSON.stringify(meta.err)}`);
      // Log program logs for debugging
      if (meta.logMessages && meta.logMessages.length > 0) {
        this.logger.warn(`   Logs:`);
        meta.logMessages.forEach((log, idx) => {
          this.logger.warn(`     [${idx}] ${log}`);
        });
      }
      return;
    }

    // Log transaction signature for debugging
    if (tx && tx.signatures && tx.signatures.length > 0) {
      const signature = tx.signatures[0];
      if (signature) {
        this.logger.log(`📥 Received transaction: ${signature}`);

        // Check if transaction involves our programs
        const accountKeys = tx.message?.accountKeys || [];
        const involvesGameProgram = accountKeys.includes(this.gameProgramId);
        const involvesMarketplaceProgram = accountKeys.includes(
          this.marketplaceProgramId,
        );

        if (involvesGameProgram || involvesMarketplaceProgram) {
          this.logger.log(
            `✅ Transaction involves ${involvesGameProgram ? 'game' : ''}${involvesGameProgram && involvesMarketplaceProgram ? ' and ' : ''}${involvesMarketplaceProgram ? 'marketplace' : ''} program`,
          );
        }
      }
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(
        'Max reconnection attempts reached. Stopping reconnection.',
      );
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    this.logger.log(
      `Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.logger.log(`Reconnection attempt ${this.reconnectAttempts}`);
      this.connect();
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  private disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
  }

  /**
   * Check if WebSocket is connected
   */
  isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Fetch full transaction details and process it
   */
  private async fetchAndProcessTransaction(
    signature: string,
    logs: string[],
  ): Promise<void> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        this.logger.warn(`Transaction not found: ${signature}`);
        return;
      }

      if (!tx.meta) {
        this.logger.warn(`Transaction missing meta: ${signature}`);
        return;
      }

      if (tx.meta.err) {
        this.logger.warn(`Transaction failed: ${signature}`);
        this.logger.warn(`Error details: ${JSON.stringify(tx.meta.err)}`);
        // Also log the program logs for debugging
        if (tx.meta.logMessages && tx.meta.logMessages.length > 0) {
          this.logger.warn(`Transaction logs:`);
          tx.meta.logMessages.forEach((log, idx) => {
            this.logger.warn(`  [${idx}] ${log}`);
          });
        }
        return;
      }

      // Handle both legacy and versioned transactions
      const accountKeys = tx.transaction.message.getAccountKeys();
      const accountKeysStrings = accountKeys.staticAccountKeys.map((key) =>
        key.toString(),
      );

      // Extract instructions - handle both legacy and versioned
      let instructions: Array<{
        programId: string;
        accounts: string[];
        data: string;
      }> = [];

      // Check if it's a legacy transaction (has instructions property)
      const txMessage = tx.transaction.message as any;
      if (txMessage.instructions && Array.isArray(txMessage.instructions)) {
        // Legacy transaction
        instructions = txMessage.instructions.map((ix: any) => ({
          programId: accountKeysStrings[ix.programIdIndex],
          accounts: (ix.accountKeyIndexes || []).map(
            (idx: number) => accountKeysStrings[idx],
          ),
          data: ix.data || '',
        }));
      } else if (
        txMessage.compiledInstructions &&
        Array.isArray(txMessage.compiledInstructions)
      ) {
        // Versioned transaction - extract from compiled instructions
        const compiledInstructions = txMessage.compiledInstructions;
        instructions = compiledInstructions.map((ix: any) => {
          const programIdIndex = ix.programIdIndex;
          const programId =
            programIdIndex < accountKeysStrings.length
              ? accountKeysStrings[programIdIndex]
              : accountKeysStrings[programIdIndex - accountKeysStrings.length];
          return {
            programId,
            accounts: (ix.accountKeyIndexes || []).map(
              (idx: number) => accountKeysStrings[idx],
            ),
            data: Buffer.from(ix.data || []).toString('base64'),
          };
        });
      }

      // Convert to HeliusWebSocketMessage format
      const message: HeliusWebSocketMessage = {
        transaction: {
          transaction: {
            message: {
              accountKeys: accountKeysStrings,
              instructions,
              recentBlockhash: tx.transaction.message.recentBlockhash || '',
            },
            signatures: tx.transaction.signatures.map((sig) => sig.toString()),
          },
          meta: {
            err: tx.meta.err,
            fee: tx.meta.fee,
            innerInstructions: tx.meta.innerInstructions || [],
            logMessages: tx.meta.logMessages || logs,
            postBalances: tx.meta.postBalances,
            postTokenBalances: tx.meta.postTokenBalances || [],
            preBalances: tx.meta.preBalances,
            preTokenBalances: tx.meta.preTokenBalances || [],
          },
        },
        slot: tx.slot,
      };

      // Process the transaction
      this.handleMessage(message);
    } catch (error) {
      this.logger.error(
        `Error fetching transaction ${signature}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
