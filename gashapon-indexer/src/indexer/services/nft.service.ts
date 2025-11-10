import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class NftService {
  private readonly logger = new Logger(NftService.name);

  constructor(private databaseService: DatabaseService) {}

  /**
   * Create NFT record (idempotent by mintAddress)
   */
  async createNft(
    mintAddress: string,
    prizeId: number,
    gameId: number,
    currentOwner: string,
  ): Promise<void> {
    const mintedAt = new Date().toISOString();
    // Upsert on unique mintAddress
    await this.databaseService.execute(
      `INSERT INTO nfts ("mintAddress", "prizeId", "gameId", "currentOwner", "isRedeemed", "mintedAt")
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT ("mintAddress")
       DO UPDATE SET "currentOwner" = EXCLUDED."currentOwner"`,
      [mintAddress, prizeId, gameId, currentOwner, false, mintedAt],
    );

    this.logger.log(`NFT created: ${mintAddress}`);
  }

  /**
   * Update NFT owner
   */
  async updateNftOwner(
    mintAddress: string,
    newOwner: string,
  ): Promise<void> {
    await this.databaseService.execute(
      'UPDATE nfts SET "currentOwner" = $1 WHERE "mintAddress" = $2',
      [newOwner, mintAddress],
    );

    this.logger.log(`NFT owner updated: ${mintAddress} -> ${newOwner}`);
  }

  /**
   * Upsert ownership record (mint, owner, amount)
   */
  async upsertOwnership(
    mintAddress: string,
    owner: string,
    amount: number,
  ): Promise<void> {
    await this.databaseService.execute(
      `INSERT INTO nft_ownerships ("mintAddress", "owner", "amount")
       VALUES ($1, $2, $3)
       ON CONFLICT ("mintAddress", "owner")
       DO UPDATE SET "amount" = EXCLUDED."amount"`,
      [mintAddress, owner, amount],
    );
    this.logger.log(
      `NFT ownership upserted: mint=${mintAddress}, owner=${owner}, amount=${amount}`,
    );
  }

  /**
   * Mark NFT as redeemed
   */
  async markNftAsRedeemed(
    mintAddress: string,
    redemptionTx: string,
  ): Promise<void> {
    const redeemedAt = new Date().toISOString();
    await this.databaseService.execute(
      'UPDATE nfts SET "isRedeemed" = $1, "redemptionTx" = $2, "redeemedAt" = $3 WHERE "mintAddress" = $4',
      [true, redemptionTx, redeemedAt, mintAddress],
    );

    this.logger.log(`NFT marked as redeemed: ${mintAddress}`);
  }

  /**
   * Extract NFT mint address from transaction token account changes
   * TODO: Implement this by parsing meta.postTokenBalances
   */
  extractMintAddressFromTransaction(_transaction: unknown): string | null {
    // TODO: Parse transaction metadata to find newly created token accounts
    // This would require analyzing meta.postTokenBalances vs meta.preTokenBalances
    return null;
  }
}

