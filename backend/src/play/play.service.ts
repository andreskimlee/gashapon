import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayEntity, PlayStatus } from './play.entity';
import { GameEntity } from '../game/game.entity';
import { PrizeEntity } from '../prize/prize.entity';
import { SolanaService } from '../blockchain/solana.service';

function generateFakeSignature(): string {
  // Not a real signature - just a unique-looking dev token for simulate flow
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `SIM_${Buffer.from(bytes).toString('hex')}`;
}

// Use node crypto fallback if needed
const crypto = globalThis.crypto ?? require('crypto').webcrypto;

@Injectable()
export class PlayService {
  private readonly logger = new Logger(PlayService.name);

  constructor(
    @InjectRepository(PlayEntity)
    private readonly playRepository: Repository<PlayEntity>,
    @InjectRepository(GameEntity)
    private readonly gameRepository: Repository<GameEntity>,
    @InjectRepository(PrizeEntity)
    private readonly prizeRepository: Repository<PrizeEntity>,
    private readonly solanaService: SolanaService,
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

  /**
   * Finalize a play session with backend-generated randomness
   * This is the secure endpoint that determines play outcomes
   * 
   * Flow:
   * 1. User calls play_game on-chain (creates session, pays tokens)
   * 2. User calls this endpoint with session PDA
   * 3. Backend generates random value, determines winner, calls finalize_play on-chain
   * 4. Returns result to user
   */
  async finalizePlay(params: {
    sessionPda: string;
    gamePda: string;
    gameDbId: number;
    userWallet: string;
  }) {
    this.logger.log(`Finalizing play session ${params.sessionPda} for game ${params.gamePda}`);

    // Fetch game probabilities from on-chain
    const { prizeCount, probabilities } = await this.solanaService.fetchGameProbabilities(params.gamePda);

    // Generate random value and determine winner
    const randomValue = require('crypto').randomBytes(32);
    const winningPrizeIndex = this.solanaService.selectPrizeIndex(probabilities, prizeCount, randomValue);

    this.logger.log(`Random draw result: prizeIndex=${winningPrizeIndex}, isWin=${winningPrizeIndex !== null}`);

    // Call finalize_play on-chain with backend signature
    // IMPORTANT: Pass the SAME randomValue to ensure on-chain agrees with our selection
    // The contract will auto-mint NFT on win, backend pays for account creation
    const result = await this.solanaService.finalizePlay({
      sessionPda: params.sessionPda,
      gamePda: params.gamePda,
      winningPrizeIndex,
      randomValue,  // Pass the random value we used for selection
      userWallet: params.userWallet,  // Needed for NFT minting on win
    });

    // Find the prize in database if won
    let prize: PrizeEntity | null = null;
    if (winningPrizeIndex !== null) {
      prize = await this.prizeRepository.findOne({
        where: { gameId: params.gameDbId, prizeIndex: winningPrizeIndex },
      });
    }

    // Create play record in database
    const play = this.playRepository.create({
      gameId: params.gameDbId,
      userWallet: params.userWallet,
      prizeId: prize?.id || null,
      nftMint: result.nftMint,  // Store the auto-minted NFT address
      transactionSignature: result.signature,
      randomValue: randomValue,
      status: PlayStatus.COMPLETED,
      prize: prize,
    });
    await this.playRepository.save(play);

    return {
      success: true,
      signature: result.signature,
      status: winningPrizeIndex !== null ? 'win' : 'lose',
      prizeIndex: winningPrizeIndex,
      nftMint: result.nftMint,  // Return NFT mint address
      prize: prize
        ? {
            id: prize.id,
            prizeId: prize.prizeId,
            name: prize.name,
            tier: prize.tier,
          }
        : undefined,
    };
  }

  /**
   * Get play session status by checking on-chain data
   */
  async getSessionStatus(sessionPda: string) {
    const connection = this.solanaService.getConnection();
    const { PublicKey } = require('@solana/web3.js');
    
    const sessionPubkey = new PublicKey(sessionPda);
    const accountInfo = await connection.getAccountInfo(sessionPubkey);
    
    if (!accountInfo) {
      return { exists: false };
    }

    const data = accountInfo.data;
    
    // Parse PlaySession account
    // Skip discriminator (8)
    let offset = 8;
    
    // user (32)
    offset += 32;
    // game (32)
    offset += 32;
    // amount_paid (8)
    offset += 8;
    // created_slot (8)
    offset += 8;
    
    // is_fulfilled (1)
    const isFulfilled = data[offset] === 1;
    offset += 1;
    
    // random_value (32)
    offset += 32;
    
    // prize_index Option<u8>
    const hasPrize = data[offset] === 1;
    const prizeIndex = hasPrize ? data[offset + 1] : null;
    offset += 2;
    
    // is_claimed (1)
    const isClaimed = data[offset] === 1;
    
    return {
      exists: true,
      isFulfilled,
      prizeIndex,
      isClaimed,
      isWin: hasPrize,
    };
  }
}


