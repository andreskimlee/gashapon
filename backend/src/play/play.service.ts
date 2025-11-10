import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayEntity, PlayStatus } from './play.entity';
import { GameEntity } from '../game/game.entity';
import { PrizeEntity } from '../prize/prize.entity';

function generateFakeSignature(): string {
  // Not a real signature - just a unique-looking dev token for simulate flow
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `SIM_${Buffer.from(bytes).toString('hex')}`;
}

// Use node crypto fallback if needed
const crypto = globalThis.crypto ?? require('crypto').webcrypto;

@Injectable()
export class PlayService {
  constructor(
    @InjectRepository(PlayEntity)
    private readonly playRepository: Repository<PlayEntity>,
    @InjectRepository(GameEntity)
    private readonly gameRepository: Repository<GameEntity>,
    @InjectRepository(PrizeEntity)
    private readonly prizeRepository: Repository<PrizeEntity>,
  ) {}

  async getPlayBySignature(signature: string) {
    const play = await this.playRepository.findOne({
      where: { transactionSignature: signature },
      relations: ['prize', 'game'],
    });
    if (!play) {
      throw new NotFoundException('Play not found');
    }
    // Determine status:
    // - pending: if play status is pending OR very recent without result
    // - win: has prizeId
    // - lose: completed without prizeId
    let status: 'pending' | 'win' | 'lose' = 'lose';
    const now = new Date().getTime();
    const playedAtMs = play.playedAt ? new Date(play.playedAt).getTime() : now;
    const isRecent = now - playedAtMs < 60_000; // 60s grace
    // Prioritize a definitive win over recency
    if (play.prizeId) {
      status = 'win';
    } else if (play.status === PlayStatus.PENDING || isRecent) {
      status = 'pending';
    } else {
      status = 'lose';
    }
    return {
      status,
      playSignature: play.transactionSignature,
      prize: play.prize
        ? {
            id: play.prize.id,
            prizeId: play.prize.prizeId,
            name: play.prize.name,
            tier: play.prize.tier,
          }
        : undefined,
      tokenAmountPaid: play.tokenAmountPaid ?? undefined,
      playedAt: play.playedAt,
      game: {
        id: play.game.id,
        gameId: play.game.gameId,
        name: play.game.name,
      },
    };
  }

  /**
   * DEV-ONLY: Simulate a play result off-chain for end-to-end testing.
   * Returns win/lose and creates a PlayEntity with a fake signature.
   */
  async simulatePlay(gameDbId: number, userWallet: string) {
    const game = await this.gameRepository.findOne({ where: { id: gameDbId }, relations: ['prizes'] });
    if (!game) throw new NotFoundException(`Game ${gameDbId} not found`);
    if (!game.isActive) throw new BadRequestException('Game is not active');

    const tokenAmount = Number(game.costInTokens || 0);

    // Weighted random pick based on probabilityBasisPoints (0-10000)
    const prizes = await this.prizeRepository.find({ where: { gameId: game.id } });
    const totalBp = prizes.reduce((sum, p) => sum + (p.probabilityBasisPoints || 0), 0);
    const roll = Math.floor(Math.random() * 10000);

    let selectedPrize: PrizeEntity | null = null;
    if (totalBp > 0) {
      let acc = 0;
      for (const p of prizes) {
        acc += p.probabilityBasisPoints || 0;
        if (roll < acc) {
          selectedPrize = p;
          break;
        }
      }
    }

    const transactionSignature = generateFakeSignature();

    const play = this.playRepository.create({
      gameId: game.id,
      userWallet,
      prizeId: selectedPrize ? selectedPrize.id : null,
      nftMint: null,
      transactionSignature,
      randomValue: crypto.getRandomValues(new Uint8Array(32)) as unknown as Buffer,
      tokenAmountPaid: tokenAmount,
      status: PlayStatus.COMPLETED,
      game,
      prize: selectedPrize || null,
    });
    const saved = await this.playRepository.save(play);

    return {
      success: true,
      status: selectedPrize ? 'win' : 'lose',
      playSignature: saved.transactionSignature,
      prize: selectedPrize
        ? {
            id: selectedPrize.id,
            prizeId: selectedPrize.prizeId,
            name: selectedPrize.name,
            tier: selectedPrize.tier,
          }
        : undefined,
      tokenAmountPaid: tokenAmount,
    };
  }
}


