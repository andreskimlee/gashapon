import { Injectable, Logger } from '@nestjs/common';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { ConfigService } from '@nestjs/config';
import * as bs58 from 'bs58';
import BN from 'bn.js';

// Program ID for the gachapon game
const PROGRAM_ID = new PublicKey('4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG');

// Instruction discriminators from IDL
const INITIALIZE_GAME_DISCRIMINATOR = Buffer.from([44, 62, 102, 247, 126, 208, 130, 215]);
const ADD_PRIZE_DISCRIMINATOR = Buffer.from([72, 182, 203, 140, 3, 163, 192, 98]);

// Tier enum values
const TIER_VALUES: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  legendary: 3,
};

export interface DeployGameParams {
  gameId: number;
  name: string;
  description: string;
  imageUrl: string;
  costUsd: number; // in cents
  tokenMint: string;
  treasuryWallet: string;
}

export interface DeployPrizeParams {
  prizeIndex: number;
  prizeId: number;
  name: string;
  description: string;
  imageUrl: string;
  metadataUri: string;
  physicalSku: string;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  probabilityBp: number;
  costUsd: number; // in cents
  weightGrams: number;
  supplyTotal: number;
}

@Injectable()
export class SolanaService {
  private readonly logger = new Logger(SolanaService.name);
  private connection: Connection;
  private payer: Keypair;

  constructor(private configService: ConfigService) {
    const rpcUrl =
      this.configService.get<string>('SOLANA_RPC_URL') ||
      'https://api.devnet.solana.com';
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';

    if (
      nodeEnv === 'production' &&
      !this.configService.get<string>('SOLANA_RPC_URL')
    ) {
      throw new Error('SOLANA_RPC_URL must be configured in production');
    }

    this.connection = new Connection(rpcUrl, 'confirmed');

    // Initialize payer keypair from environment
    const privateKey = this.configService.get<string>(
      'PLATFORM_WALLET_PRIVATE_KEY',
    );
    if (privateKey) {
      const secretKey = bs58.decode(privateKey);
      this.payer = Keypair.fromSecretKey(secretKey);
    } else if (nodeEnv === 'production') {
      throw new Error(
        'PLATFORM_WALLET_PRIVATE_KEY must be configured in production',
      );
    } else {
      // Generate a dummy keypair for development
      this.payer = Keypair.generate();
      console.warn(
        '⚠️  PLATFORM_WALLET_PRIVATE_KEY not configured - using dummy keypair.',
      );
    }
  }

  getConnection(): Connection {
    return this.connection;
  }

  getPayer(): Keypair {
    return this.payer;
  }

  /**
   * Get the config PDA
   */
  getConfigPda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      PROGRAM_ID,
    );
    return pda;
  }

  /**
   * Get the game PDA for a given game ID
   */
  getGamePda(gameId: number): PublicKey {
    const gameIdBn = new BN(gameId);
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('game'), gameIdBn.toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID,
    );
    return pda;
  }

  /**
   * Get the prize PDA for a given game and prize index
   */
  getPrizePda(gamePda: PublicKey, prizeIndex: number): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('prize'), gamePda.toBuffer(), Buffer.from([prizeIndex])],
      PROGRAM_ID,
    );
    return pda;
  }

  /**
   * Encode a Borsh string (4-byte length prefix + UTF-8 bytes)
   */
  private encodeString(str: string): Buffer {
    const bytes = Buffer.from(str, 'utf8');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32LE(bytes.length, 0);
    return Buffer.concat([lenBuf, bytes]);
  }

  /**
   * Deploy a game on-chain (initialize_game instruction)
   */
  async deployGame(params: DeployGameParams): Promise<string> {
    const gamePda = this.getGamePda(params.gameId);
    const configPda = this.getConfigPda();
    const treasury = new PublicKey(params.treasuryWallet);
    const tokenMint = new PublicKey(params.tokenMint);

    this.logger.log(`Deploying game ${params.gameId} to ${gamePda.toString()}`);

    // Build instruction data:
    // discriminator (8) + game_id (8) + name (4+len) + description (4+len) + 
    // image_url (4+len) + cost_usd (8) + token_mint (32)
    const gameIdBuf = Buffer.alloc(8);
    new BN(params.gameId).toArrayLike(Buffer, 'le', 8).copy(gameIdBuf);

    const nameBuf = this.encodeString(params.name);
    const descBuf = this.encodeString(params.description);
    const imageBuf = this.encodeString(params.imageUrl);

    const costBuf = Buffer.alloc(8);
    new BN(params.costUsd).toArrayLike(Buffer, 'le', 8).copy(costBuf);

    const data = Buffer.concat([
      INITIALIZE_GAME_DISCRIMINATOR,
      gameIdBuf,
      nameBuf,
      descBuf,
      imageBuf,
      costBuf,
      tokenMint.toBuffer(),
    ]);

    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: this.payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: false },
        { pubkey: gamePda, isSigner: false, isWritable: true },
        { pubkey: treasury, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(instruction);
    
    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.payer],
      { commitment: 'confirmed' },
    );

    this.logger.log(`✅ Game deployed: ${signature}`);
    return signature;
  }

  /**
   * Add a prize to a game on-chain (add_prize instruction)
   */
  async addPrize(gameId: number, params: DeployPrizeParams): Promise<string> {
    const gamePda = this.getGamePda(gameId);
    const prizePda = this.getPrizePda(gamePda, params.prizeIndex);

    this.logger.log(
      `Adding prize ${params.prizeIndex} to game ${gameId}: ${params.name}`,
    );

    // Build instruction data:
    // discriminator (8) + prize_index (1) + prize_id (8) + name (4+len) + 
    // description (4+len) + image_url (4+len) + metadata_uri (4+len) + 
    // physical_sku (4+len) + tier (1) + probability_bp (2) + cost_usd (8) + weight_grams (4) + supply_total (4)
    const prizeIdBuf = Buffer.alloc(8);
    new BN(params.prizeId).toArrayLike(Buffer, 'le', 8).copy(prizeIdBuf);

    const nameBuf = this.encodeString(params.name);
    const descBuf = this.encodeString(params.description);
    const imageBuf = this.encodeString(params.imageUrl);
    const metadataBuf = this.encodeString(params.metadataUri);
    const skuBuf = this.encodeString(params.physicalSku);

    const tierBuf = Buffer.from([TIER_VALUES[params.tier] || 0]);

    const probBuf = Buffer.alloc(2);
    probBuf.writeUInt16LE(params.probabilityBp, 0);

    const costBuf = Buffer.alloc(8);
    new BN(params.costUsd).toArrayLike(Buffer, 'le', 8).copy(costBuf);

    const weightBuf = Buffer.alloc(4);
    weightBuf.writeUInt32LE(params.weightGrams || 0, 0);

    const supplyBuf = Buffer.alloc(4);
    supplyBuf.writeUInt32LE(params.supplyTotal, 0);

    const data = Buffer.concat([
      ADD_PRIZE_DISCRIMINATOR,
      Buffer.from([params.prizeIndex]),
      prizeIdBuf,
      nameBuf,
      descBuf,
      imageBuf,
      metadataBuf,
      skuBuf,
      tierBuf,
      probBuf,
      costBuf,
      weightBuf,
      supplyBuf,
    ]);

    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: this.payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: gamePda, isSigner: false, isWritable: true },
        { pubkey: prizePda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(instruction);

    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.payer],
      { commitment: 'confirmed' },
    );

    this.logger.log(`✅ Prize added: ${signature}`);
    return signature;
  }

  /**
   * Get balance for an address
   */
  async getBalance(address: string): Promise<number> {
    const pubkey = new PublicKey(address);
    const balance = await this.connection.getBalance(pubkey);
    return balance;
  }

  /**
   * Get transaction
   */
  async getTransaction(signature: string) {
    return this.connection.getTransaction(signature);
  }

  /**
   * Get next available game ID by checking on-chain accounts
   */
  async getNextGameId(): Promise<number> {
    // Start from 1 and find the first available ID
    for (let id = 1; id <= 1000; id++) {
      const gamePda = this.getGamePda(id);
      const account = await this.connection.getAccountInfo(gamePda);
      if (!account) {
        return id;
      }
    }
    throw new Error('No available game ID found');
  }
}
