import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NftEntity } from '../nft/nft.entity';
import { RedemptionEntity } from '../redemption/redemption.entity';
import { PlayEntity } from '../play/play.entity';

export interface UserStats {
  totalPlays: number;
  totalWins: number;
  nftsOwned: number;
  nftsRedeemed: number;
  winsByTier: {
    common: number;
    uncommon: number;
    rare: number;
    legendary: number;
  };
  marketplaceActivity: {
    listings: number;
    purchases: number;
    sales: number;
  };
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(NftEntity)
    private nftRepository: Repository<NftEntity>,
    @InjectRepository(RedemptionEntity)
    private redemptionRepository: Repository<RedemptionEntity>,
    @InjectRepository(PlayEntity)
    private playRepository: Repository<PlayEntity>,
  ) {}

  /**
   * Get user statistics
   */
  async getUserStats(wallet: string): Promise<UserStats> {
    const [totalPlays, nftsOwned, nftsRedeemed, redemptions, plays] = await Promise.all([
      this.playRepository.count({ where: { userWallet: wallet } }),
      this.nftRepository.count({
        where: { currentOwner: wallet, isRedeemed: false },
      }),
      this.nftRepository.count({
        where: { currentOwner: wallet, isRedeemed: true },
      }),
      this.redemptionRepository.find({
        where: { userWallet: wallet },
        relations: ['prize'],
      }),
      this.playRepository.find({
        where: { userWallet: wallet },
        relations: ['prize'],
      }),
    ]);

    const winsByTier = {
      common: 0,
      uncommon: 0,
      rare: 0,
      legendary: 0,
    };

    plays.forEach((play) => {
      if (play.prize) {
        const tier = play.prize.tier.toLowerCase();
        if (tier in winsByTier) {
          winsByTier[tier as keyof typeof winsByTier]++;
        }
      }
    });

    // TODO: Add marketplace activity queries when marketplace module is ready
    const marketplaceActivity = {
      listings: 0,
      purchases: 0,
      sales: 0,
    };

    return {
      totalPlays,
      totalWins: plays.filter((p) => p.prizeId !== null).length,
      nftsOwned,
      nftsRedeemed,
      winsByTier,
      marketplaceActivity,
    };
  }

  /**
   * Get user profile summary
   */
  async getUserProfile(wallet: string) {
    const stats = await this.getUserStats(wallet);
    return {
      wallet,
      stats,
      joinedAt: await this.getFirstPlayDate(wallet),
    };
  }

  /**
   * Get date of first play
   */
  private async getFirstPlayDate(wallet: string): Promise<Date | null> {
    const firstPlay = await this.playRepository.findOne({
      where: { userWallet: wallet },
      order: { playedAt: 'ASC' },
    });
    return firstPlay?.playedAt || null;
  }

  /**
   * Get user play history
   */
  async getUserPlays(wallet: string) {
    const plays = await this.playRepository.find({
      where: { userWallet: wallet },
      relations: ['prize', 'game'],
      order: { playedAt: 'DESC' },
    });

    return plays.map((play) => ({
      id: play.id,
      gameId: play.gameId,
      game: play.game ? {
        id: play.game.id,
        name: play.game.name,
        gameId: play.game.gameId,
      } : null,
      prizeId: play.prizeId,
      prize: play.prize ? {
        id: play.prize.id,
        name: play.prize.name,
        tier: play.prize.tier,
      } : null,
      nftMint: play.nftMint,
      transactionSignature: play.transactionSignature,
      status: play.status,
      playedAt: play.playedAt,
    }));
  }
}

