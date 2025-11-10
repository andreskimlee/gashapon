import { Injectable } from '@nestjs/common';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { ConfigService } from '@nestjs/config';
import * as bs58 from 'bs58';

@Injectable()
export class SolanaService {
  private connection: Connection;
  private payer: Keypair;

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL') || 'https://api.devnet.solana.com';
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';

    // Only require RPC URL in production
    if (nodeEnv === 'production' && !this.configService.get<string>('SOLANA_RPC_URL')) {
      throw new Error('SOLANA_RPC_URL must be configured in production');
    }

    this.connection = new Connection(rpcUrl, 'confirmed');

    // Initialize payer keypair from environment
    const privateKey = this.configService.get<string>('PLATFORM_WALLET_PRIVATE_KEY');
    if (privateKey) {
      const secretKey = bs58.decode(privateKey);
      this.payer = Keypair.fromSecretKey(secretKey);
    } else if (nodeEnv === 'production') {
      throw new Error('PLATFORM_WALLET_PRIVATE_KEY must be configured in production');
    } else {
      // Generate a dummy keypair for development (won't work for real transactions)
      this.payer = Keypair.generate();
      console.warn('⚠️  PLATFORM_WALLET_PRIVATE_KEY not configured - using dummy keypair. Set PLATFORM_WALLET_PRIVATE_KEY for real transactions.');
    }
  }

  getConnection(): Connection {
    return this.connection;
  }

  getPayer(): Keypair {
    return this.payer;
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
}

