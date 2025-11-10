import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(private databaseService: DatabaseService) {}

  /**
   * Create marketplace listing
   */
  async createListing(
    nftMint: string,
    sellerWallet: string,
    priceInTokens: string | number,
    onChainListingAddress?: string,
  ): Promise<void> {
    const listedAt = new Date().toISOString();
    await this.databaseService.execute(
      `INSERT INTO marketplace_listings 
       (nft_mint, seller_wallet, price_in_tokens, on_chain_listing_address, is_active, listed_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        nftMint,
        sellerWallet,
        Number(priceInTokens),
        onChainListingAddress || null,
        true,
        listedAt,
      ],
    );

    this.logger.log(`Listing created: ${nftMint}`);
  }

  /**
   * Cancel marketplace listing
   */
  async cancelListing(nftMint: string): Promise<void> {
    const cancelledAt = new Date().toISOString();
    await this.databaseService.execute(
      'UPDATE marketplace_listings SET is_active = $1, cancelled_at = $2 WHERE nft_mint = $3 AND is_active = $4',
      [false, cancelledAt, nftMint, true],
    );

    this.logger.log(`Listing cancelled: ${nftMint}`);
  }

  /**
   * Mark listing as sold
   */
  async markListingAsSold(
    nftMint: string,
    buyerWallet: string,
    saleTx: string,
  ): Promise<void> {
    const soldAt = new Date().toISOString();
    await this.databaseService.execute(
      `UPDATE marketplace_listings 
       SET is_active = $1, sold_at = $2, buyer_wallet = $3, sale_tx = $4 
       WHERE nft_mint = $5 AND is_active = $6`,
      [false, soldAt, buyerWallet, saleTx, nftMint, true],
    );

    this.logger.log(`Listing marked as sold: ${nftMint}`);
  }

  /**
   * Update listing price
   */
  async updateListingPrice(
    nftMint: string,
    newPriceInTokens: string | number,
  ): Promise<void> {
    await this.databaseService.execute(
      'UPDATE marketplace_listings SET price_in_tokens = $1 WHERE nft_mint = $2 AND is_active = $3',
      [Number(newPriceInTokens), nftMint, true],
    );

    this.logger.log(`Listing price updated: ${nftMint}`);
  }
}

