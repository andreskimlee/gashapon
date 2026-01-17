import { BN } from '@coral-xyz/anchor';
import { Injectable, Logger } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';
import * as bs58 from 'bs58';
import gameIdl from '../../idl/gachapon_game.json';
type DiscriminatorMap = Record<string, number[]>;
export type EventName =
  | 'GameCreated'
  | 'PrizeAdded'
  | 'GamePlayInitiated'
  | 'PrizeWon'
  | 'PlayLost'
  | 'GameStatusUpdated'
  | 'SupplyReplenished'
  | 'TreasuryWithdrawn'
  | 'NFTListed'
  | 'NFTDelisted'
  | 'NFTSold'
  | 'PriceUpdated';

export interface ParsedEvent {
  name: EventName;
  data: EventData;
  signature: string;
  slot: number;
}

export interface GameCreatedEventData {
  game_id: BN;
  authority: string;
  timestamp: number;
}

export interface PrizeAddedEventData {
  game_id: BN;
  prize_index: number;
  prize_id: BN;
  probability_bp: number;
  supply_total: number;
  timestamp: number;
}

export interface GamePlayInitiatedEventData {
  user: string;
  game_id: BN;
  token_amount: BN;
  timestamp: number;
}

export interface PrizeWonEventData {
  user: string;
  game_id: BN;
  prize_id: BN;
  prize_index: number;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  nft_mint: string;
  random_value: number[];
  timestamp: number;
}

export interface PlayLostEventData {
  user: string;
  game_id: BN;
  random_value: number[];
  timestamp: number;
}

export interface GameStatusUpdatedEventData {
  game_id: BN;
  is_active: boolean;
  timestamp: number;
}

export interface SupplyReplenishedEventData {
  game_id: BN;
  prize_id: BN;
  prize_index: number;
  new_supply: number;
  timestamp: number;
}

export interface TreasuryWithdrawnEventData {
  game_id: BN;
  amount: BN;
  destination: string;
  timestamp: number;
}

export type EventData =
  | GameCreatedEventData
  | PrizeAddedEventData
  | GamePlayInitiatedEventData
  | PrizeWonEventData
  | PlayLostEventData
  | GameStatusUpdatedEventData
  | SupplyReplenishedEventData
  | TreasuryWithdrawnEventData;

@Injectable()
export class EventParserService {
  private readonly logger = new Logger(EventParserService.name);
  private eventDiscriminators: DiscriminatorMap = {};

  constructor() {
    this.buildEventDiscriminatorsFromIdl(gameIdl);
  }

  /**
   * Build event discriminators from bundled IDL (copied during build)
   */
  private buildEventDiscriminatorsFromIdl(idl: any): void {
    if (!idl || !Array.isArray(idl.events)) {
      throw new Error('IDL has no events array');
    }
    const updated: DiscriminatorMap = {};
    for (const evt of idl.events) {
      if (
        evt?.name &&
        Array.isArray(evt.discriminator) &&
        evt.discriminator.length === 8
      ) {
        updated[evt.name] = evt.discriminator;
      }
    }
    if (Object.keys(updated).length === 0) {
      throw new Error('No event discriminators found in IDL');
    }
    this.eventDiscriminators = updated;
    this.logger.log(
      `Loaded ${idl.events.length} event discriminators from bundled IDL`,
    );
  }

  /**
   * Parse Anchor events from transaction logs
   */
  parseEvents(logs: string[], signature: string, slot: number): ParsedEvent[] {
    const events: ParsedEvent[] = [];

    for (const log of logs) {
      // Anchor events appear inside logs as "... Program data: <base64>"
      if (log.includes('Program data: ')) {
        const idx = log.indexOf('Program data: ');
        const eventData = log.slice(idx + 'Program data: '.length).trim();

        // Skip empty data
        if (!eventData) {
          continue;
        }

        // Anchor events in logs are base64 encoded
        let eventBytes: Uint8Array;
        try {
          // Try base64 first (standard for Anchor events in Solana logs)
          eventBytes = Buffer.from(eventData, 'base64');

          // Validate we got valid bytes
          if (eventBytes.length < 8) {
            this.logger.debug(
              `Event data too short (${eventBytes.length} bytes), skipping`,
            );
            continue;
          }
        } catch (error) {
          // If base64 fails, try base58 as fallback
          try {
            eventBytes = bs58.decode(eventData);
            if (eventBytes.length < 8) {
              this.logger.debug(
                `Event data too short (${eventBytes.length} bytes), skipping`,
              );
              continue;
            }
          } catch (base58Error) {
            this.logger.debug(
              `Failed to decode event data: ${eventData.substring(0, 50)}... (base64 error: ${error instanceof Error ? error.message : String(error)})`,
            );
            continue;
          }
        }

        // Check event discriminator (first 8 bytes)
        const discriminator = Array.from(eventBytes.slice(0, 8)) as number[];

        // Match discriminator to event type
        for (const [eventName, expectedDiscriminator] of Object.entries(
          this.eventDiscriminators,
        )) {
          if (this.arraysEqual(discriminator, expectedDiscriminator)) {
            try {
              const parsedData = this.parseEventData(
                eventName as EventName,
                eventBytes.slice(8),
              );
              events.push({
                name: eventName as EventName,
                data: parsedData,
                signature,
                slot,
              });
            } catch (error) {
              this.logger.error(
                `Error parsing event ${eventName}: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
            break;
          }
        }
      }
    }

    return events;
  }

  /**
   * Parse event data based on event type
   */
  private parseEventData(eventName: EventName, data: Uint8Array): EventData {
    switch (eventName) {
      case 'GameCreated':
        return this.parseGameCreated(data);

      case 'PrizeAdded':
        return this.parsePrizeAdded(data);

      case 'GamePlayInitiated':
        return this.parseGamePlayInitiated(data);

      case 'PrizeWon':
        return this.parsePrizeWon(data);

      case 'PlayLost':
        return this.parsePlayLost(data);

      case 'GameStatusUpdated':
        return this.parseGameStatusUpdated(data);

      case 'SupplyReplenished':
        return this.parseSupplyReplenished(data);

      case 'TreasuryWithdrawn':
        return this.parseTreasuryWithdrawn(data);

      default:
        throw new Error(`Unknown event type: ${eventName}`);
    }
  }

  private parseGameCreated(data: Uint8Array): GameCreatedEventData {
    return {
      game_id: this.readU64(data, 0),
      authority: new PublicKey(data.slice(8, 40)).toBase58(),
      timestamp: this.readI64(data, 40),
    };
  }

  private parsePrizeAdded(data: Uint8Array): PrizeAddedEventData {
    // PrizeAdded: game_id (8), prize_index (1), prize_id (8), probability_bp (2), supply_total (4), timestamp (8)
    return {
      game_id: this.readU64(data, 0),
      prize_index: data[8],
      prize_id: this.readU64(data, 9),
      probability_bp: this.readU16(data, 17),
      supply_total: this.readU32(data, 19),
      timestamp: this.readI64(data, 23),
    };
  }

  private parseGamePlayInitiated(data: Uint8Array): GamePlayInitiatedEventData {
    return {
      user: new PublicKey(data.slice(0, 32)).toBase58(),
      game_id: this.readU64(data, 32),
      token_amount: this.readU64(data, 40),
      timestamp: this.readI64(data, 48),
    };
  }

  private parsePrizeWon(data: Uint8Array): PrizeWonEventData {
    // PrizeWon structure: user (32), game_id (8), prize_id (8), prize_index (1), tier (1), nft_mint (32), random_value (32), timestamp (8)
    const userPubkey = new PublicKey(data.slice(0, 32)).toBase58();
    const gameId = this.readU64(data, 32);
    const prizeId = this.readU64(data, 40);
    const prizeIndex = data[48]; // prize_index is 1 byte
    const tierValue = data[49]; // Tier enum is 1 byte
    const tierMap: Array<'common' | 'uncommon' | 'rare' | 'legendary'> = [
      'common',
      'uncommon',
      'rare',
      'legendary',
    ];
    const tier = tierMap[tierValue] || 'common';
    const nftMint = new PublicKey(data.slice(50, 82)).toBase58(); // 32 bytes after tier
    const randomValue = Array.from(data.slice(82, 114)); // 32 bytes after nft_mint
    const timestamp = this.readI64(data, 114); // 8 bytes after random_value

    return {
      user: userPubkey,
      game_id: gameId,
      prize_id: prizeId,
      prize_index: prizeIndex,
      tier,
      nft_mint: nftMint,
      random_value: randomValue,
      timestamp,
    };
  }

  private parsePlayLost(data: Uint8Array): PlayLostEventData {
    // PlayLost structure: user (32), game_id (8), random_value (32), timestamp (8)
    const userPubkey = new PublicKey(data.slice(0, 32)).toBase58();
    const gameId = this.readU64(data, 32);
    const randomValue = Array.from(data.slice(40, 72)); // 32 bytes after game_id
    const timestamp = this.readI64(data, 72);

    return {
      user: userPubkey,
      game_id: gameId,
      random_value: randomValue,
      timestamp,
    };
  }

  private parseGameStatusUpdated(data: Uint8Array): GameStatusUpdatedEventData {
    return {
      game_id: this.readU64(data, 0),
      is_active: data[8] === 1,
      timestamp: this.readI64(data, 9),
    };
  }

  private parseSupplyReplenished(data: Uint8Array): SupplyReplenishedEventData {
    // SupplyReplenished: game_id (8), prize_id (8), prize_index (1), new_supply (4), timestamp (8)
    return {
      game_id: this.readU64(data, 0),
      prize_id: this.readU64(data, 8),
      prize_index: data[16],
      new_supply: this.readU32(data, 17),
      timestamp: this.readI64(data, 21),
    };
  }

  private parseTreasuryWithdrawn(data: Uint8Array): TreasuryWithdrawnEventData {
    return {
      game_id: this.readU64(data, 0),
      amount: this.readU64(data, 8),
      destination: new PublicKey(data.slice(16, 48)).toBase58(),
      timestamp: this.readI64(data, 48),
    };
  }

  // Helper methods for reading binary data
  private readU64(data: Uint8Array, offset: number): BN {
    const bytes = data.slice(offset, offset + 8);
    return new BN(bytes, 'le');
  }

  private readU16(data: Uint8Array, offset: number): number {
    const bytes = data.slice(offset, offset + 2);
    return new BN(bytes, 'le').toNumber();
  }

  private readU32(data: Uint8Array, offset: number): number {
    const bytes = data.slice(offset, offset + 4);
    return new BN(bytes, 'le').toNumber();
  }

  private readI64(data: Uint8Array, offset: number): number {
    const bytes = data.slice(offset, offset + 8);
    const bn = new BN(bytes, 'le');
    // Convert to signed integer
    const maxSigned = new BN('9223372036854775807');
    const maxUnsigned = new BN('18446744073709551616');
    if (bn.gt(maxSigned)) {
      return bn.sub(maxUnsigned).toNumber();
    }
    return bn.toNumber();
  }

  private arraysEqual(
    a: number[] | readonly number[],
    b: number[] | readonly number[],
  ): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}
