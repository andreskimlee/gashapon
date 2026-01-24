import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NftEntity } from '../nft/nft.entity';
import { PrizeEntity } from '../prize/prize.entity';
import { GameEntity } from '../game/game.entity';
import { MarketplaceListingEntity } from '../marketplace/marketplace-listing.entity';
import { MetaplexService } from '../blockchain/metaplex.service';

export interface CollectionItem {
  mintAddress: string;
  prize: {
    id: number;
    name: string;
    description: string;
    imageUrl: string;
    tier: string;
    physicalSku: string;
  };
  game: {
    id: number;
    name: string;
    gameId: number;
  };
  metadata: {
    name: string;
    symbol: string;
    uri: string;
    onChainMetadata?: any;
  };
  isRedeemed: boolean;
  mintedAt: Date;
  marketplaceListing?: {
    listingId: number;
    priceInTokens: string;
    isActive: boolean;
  };
  // Pending status - true if prize won but NFT not yet minted on-chain
  isPending: boolean;
  // Session PDA for claiming (only present when isPending is true)
  sessionPda?: string;
}

export interface CollectionFilters {
  tier?: 'common' | 'uncommon' | 'rare' | 'legendary';
  gameId?: number;
  isRedeemed?: boolean;
  hasListing?: boolean;
}

@Injectable()
export class CollectionService {
  constructor(
    @InjectRepository(NftEntity)
    private nftRepository: Repository<NftEntity>,
    @InjectRepository(PrizeEntity)
    private prizeRepository: Repository<PrizeEntity>,
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(MarketplaceListingEntity)
    private listingRepository: Repository<MarketplaceListingEntity>,
    private metaplexService: MetaplexService,
  ) {}

  /**
   * Get user's NFT collection
   */
  async getUserCollection(
    wallet: string,
    filters?: CollectionFilters,
  ): Promise<CollectionItem[]> {
    const query = this.nftRepository
      .createQueryBuilder('nft')
      .leftJoinAndSelect('nft.prize', 'prize')
      .leftJoinAndSelect('nft.game', 'game')
      .leftJoinAndSelect('nft.marketplaceListings', 'listing', 'listing.isActive = :isActive', {
        isActive: true,
      })
      .where('nft.currentOwner = :wallet', { wallet })
      .orderBy('nft.mintedAt', 'DESC');

    // Apply filters
    if (filters?.isRedeemed !== undefined) {
      query.andWhere('nft.isRedeemed = :isRedeemed', { isRedeemed: filters.isRedeemed });
    } else {
      // Default: only show unredeemed NFTs
      query.andWhere('nft.isRedeemed = :isRedeemed', { isRedeemed: false });
    }

    if (filters?.tier) {
      query.andWhere('prize.tier = :tier', { tier: filters.tier });
    }

    if (filters?.gameId) {
      query.andWhere('game.id = :gameId', { gameId: filters.gameId });
    }

    if (filters?.hasListing === true) {
      query.andWhere('listing.id IS NOT NULL');
    } else if (filters?.hasListing === false) {
      query.andWhere('listing.id IS NULL');
    }

    const nfts = await query.getMany();

    // Fetch on-chain metadata for each NFT
    const collectionItems: CollectionItem[] = await Promise.all(
      nfts.map(async (nft) => {
        let onChainMetadata = null;
        
        // Try to fetch on-chain metadata
        try {
          onChainMetadata = await this.metaplexService.getNFTMetadata(nft.mintAddress);
        } catch (error) {
          // If NFT is burned or doesn't exist on-chain - skip metadata
          console.warn(`Failed to fetch metadata for ${nft.mintAddress}:`, error.message);
        }
        
        // NFTs are now auto-minted on win, so there are no pending NFTs
        const isPending = false;

        const listing = nft.marketplaceListings?.find((l) => l.isActive);
        
        // For pending NFTs, the mintAddress IS the sessionPda
        const sessionPda = isPending ? nft.mintAddress : undefined;

        return {
          mintAddress: nft.mintAddress,
          prize: {
            id: nft.prize.id,
            name: nft.prize.name,
            description: nft.prize.description || '',
            imageUrl: nft.prize.imageUrl || '',
            tier: nft.prize.tier,
            physicalSku: nft.prize.physicalSku,
          },
          game: {
            id: nft.game.id,
            name: nft.game.name,
            gameId: nft.game.gameId,
          },
          metadata: {
            name: onChainMetadata?.name || nft.prize.name,
            symbol: onChainMetadata?.symbol || 'GACHA',
            uri: onChainMetadata?.uri || nft.prize.metadataUri,
            onChainMetadata,
          },
          isRedeemed: nft.isRedeemed,
          mintedAt: nft.mintedAt,
          marketplaceListing: listing
            ? {
                listingId: listing.id,
                priceInTokens: listing.priceInTokens.toString(),
                isActive: listing.isActive,
              }
            : undefined,
          isPending,
          sessionPda,
        };
      }),
    );

    return collectionItems;
  }

  /**
   * Get single NFT details
   */
  async getNFTDetails(mintAddress: string, wallet?: string): Promise<CollectionItem> {
    const nft = await this.nftRepository.findOne({
      where: { mintAddress },
      relations: ['prize', 'game', 'marketplaceListings'],
    });

    if (!nft) {
      throw new NotFoundException(`NFT with mint address ${mintAddress} not found`);
    }

    // Verify ownership if wallet is provided
    if (wallet && nft.currentOwner !== wallet) {
      throw new NotFoundException('NFT not owned by this wallet');
    }

    const onChainMetadata = await this.metaplexService.getNFTMetadata(mintAddress).catch(() => null);
    // NFTs are now auto-minted on win, so there are no pending NFTs
    const isPending = false;
    const activeListing = nft.marketplaceListings?.find((l) => l.isActive);
    const sessionPda = undefined;

    return {
      mintAddress: nft.mintAddress,
      prize: {
        id: nft.prize.id,
        name: nft.prize.name,
        description: nft.prize.description || '',
        imageUrl: nft.prize.imageUrl || '',
        tier: nft.prize.tier,
        physicalSku: nft.prize.physicalSku,
      },
      game: {
        id: nft.game.id,
        name: nft.game.name,
        gameId: nft.game.gameId,
      },
      metadata: {
        name: onChainMetadata?.name || nft.prize.name,
        symbol: onChainMetadata?.symbol || 'GACHA',
        uri: onChainMetadata?.uri || nft.prize.metadataUri,
        onChainMetadata,
      },
      isRedeemed: nft.isRedeemed,
      mintedAt: nft.mintedAt,
      marketplaceListing: activeListing
        ? {
            listingId: activeListing.id,
            priceInTokens: activeListing.priceInTokens.toString(),
            isActive: activeListing.isActive,
          }
        : undefined,
      isPending,
      sessionPda,
    };
  }

  /**
   * Get collection statistics for a user
   */
  async getCollectionStats(wallet: string) {
    const collection = await this.getUserCollection(wallet, { isRedeemed: false });

    const stats = {
      total: collection.length,
      byTier: {
        common: 0,
        uncommon: 0,
        rare: 0,
        legendary: 0,
      },
      byGame: {} as Record<number, number>,
      listed: 0,
    };

    collection.forEach((item) => {
      const tier = item.prize.tier.toLowerCase() as keyof typeof stats.byTier;
      if (tier in stats.byTier) {
        stats.byTier[tier]++;
      }

      const gameId = item.game.gameId;
      stats.byGame[gameId] = (stats.byGame[gameId] || 0) + 1;

      if (item.marketplaceListing) {
        stats.listed++;
      }
    });

    return stats;
  }
}

