import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NftEntity } from './nft.entity';
import { MetaplexService } from '../blockchain/metaplex.service';
import { PublicKey } from '@solana/web3.js';

@Injectable()
export class NftService {
  constructor(
    @InjectRepository(NftEntity)
    private nftRepository: Repository<NftEntity>,
    private metaplexService: MetaplexService,
  ) {}

  /**
   * Get NFTs owned by a wallet
   */
  async getNFTsByOwner(wallet: string): Promise<NftEntity[]> {
    return this.nftRepository.find({
      where: { currentOwner: wallet, isRedeemed: false },
      relations: ['prize', 'game'],
      order: { mintedAt: 'DESC' },
    });
  }

  /**
   * Get NFT by mint address
   */
  async getNFTByMint(mintAddress: string): Promise<NftEntity> {
    const nft = await this.nftRepository.findOne({
      where: { mintAddress },
      relations: ['prize', 'game'],
    });

    if (!nft) {
      throw new NotFoundException(`NFT with mint ${mintAddress} not found`);
    }

    return nft;
  }

  /**
   * Sync NFT ownership from blockchain
   * Called periodically to update database with on-chain state
   */
  async syncNFTOwnership(mintAddress: string): Promise<void> {
    const nft = await this.nftRepository.findOne({
      where: { mintAddress },
    });

    if (!nft) {
      return; // NFT not in database yet
    }

    try {
      const onChainOwner = await this.metaplexService.getNFTOwner(mintAddress);

      if (onChainOwner !== nft.currentOwner) {
        nft.currentOwner = onChainOwner;
        await this.nftRepository.save(nft);
      }
    } catch (error) {
      // NFT might be burned
      if (error.message.includes('not found') || error.message.includes('burned')) {
        nft.isRedeemed = true;
        await this.nftRepository.save(nft);
      }
    }
  }

  /**
   * Create NFT record in database
   */
  async createNft(
    mintAddress: string,
    prizeId: number,
    gameId: number,
    currentOwner: string,
  ): Promise<NftEntity> {
    const nft = this.nftRepository.create({
      mintAddress,
      prizeId,
      gameId,
      currentOwner,
      isRedeemed: false,
    });
    return this.nftRepository.save(nft);
  }

  /**
   * Mark NFT as redeemed (called after successful burn)
   */
  async markAsRedeemed(mintAddress: string, redemptionTx: string): Promise<void> {
    const nft = await this.nftRepository.findOne({
      where: { mintAddress },
    });

    if (!nft) {
      throw new NotFoundException(`NFT with mint ${mintAddress} not found`);
    }

    nft.isRedeemed = true;
    nft.redemptionTx = redemptionTx;
    nft.redeemedAt = new Date();
    await this.nftRepository.save(nft);
  }
}

