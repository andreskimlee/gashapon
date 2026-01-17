import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SolanaService,
  DeployPrizeParams,
} from '../blockchain/solana.service';

export interface CreatePrizeDto {
  name: string;
  description?: string;
  imageUrl?: string;
  physicalSku: string;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  probabilityBasisPoints: number;
  weightGrams?: number;
  supplyTotal: number;
  metadataUri?: string;
}

export interface CreateGameDto {
  name: string;
  description?: string;
  imageUrl?: string;
  costInTokens: number;
  costInUsd?: number;
  prizes: CreatePrizeDto[];
}

export interface UpdateGameOnChainDto {
  onChainAddress: string;
  gameId: number;
}

export interface DeployedGame {
  gameId: number;
  onChainAddress: string;
  deploySignature: string;
  prizeSignatures: string[];
}

@Injectable()
export class GameAdminService {
  private readonly logger = new Logger(GameAdminService.name);

  constructor(
    private readonly solanaService: SolanaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new game by deploying it on-chain
   * The indexer will pick up the events and create the database records
   */
  async createGame(dto: CreateGameDto): Promise<DeployedGame> {
    // Validate probabilities sum to <= 10000
    const totalProbability = dto.prizes.reduce(
      (sum, p) => sum + p.probabilityBasisPoints,
      0,
    );
    if (totalProbability > 10000) {
      throw new BadRequestException(
        `Total probability (${totalProbability}) exceeds 10000 basis points`,
      );
    }

    // Validate all prizes have supply
    if (dto.prizes.some((p) => p.supplyTotal <= 0)) {
      throw new BadRequestException('All prizes must have supply > 0');
    }

    // Validate max prizes
    if (dto.prizes.length > 16) {
      throw new BadRequestException('Maximum 16 prizes per game');
    }

    // Get required config
    const tokenMint = this.configService.get<string>('TOKEN_MINT');
    const treasuryWallet = this.configService.get<string>('TREASURY_WALLET');

    if (!tokenMint) {
      throw new BadRequestException(
        'TOKEN_MINT not configured in environment',
      );
    }
    if (!treasuryWallet) {
      throw new BadRequestException(
        'TREASURY_WALLET not configured in environment',
      );
    }

    // Get next available game ID
    const gameId = await this.solanaService.getNextGameId();
    this.logger.log(`Deploying new game with ID: ${gameId}`);

    try {
      // Step 1: Deploy the game on-chain
      const deploySignature = await this.solanaService.deployGame({
        gameId,
        name: dto.name,
        description: dto.description || '',
        imageUrl: dto.imageUrl || '',
        costUsd: Math.round((dto.costInUsd || dto.costInTokens / 100) * 100), // Convert to cents
        tokenMint,
        treasuryWallet,
      });

      this.logger.log(`Game deployed: ${deploySignature}`);

      // Step 2: Add prizes one by one
      const prizeSignatures: string[] = [];
      for (let i = 0; i < dto.prizes.length; i++) {
        const prize = dto.prizes[i];
        const prizeParams: DeployPrizeParams = {
          prizeIndex: i,
          prizeId: i + 1, // 1-indexed prize IDs
          name: prize.name,
          description: prize.description || '',
          imageUrl: prize.imageUrl || '',
          metadataUri: prize.metadataUri || '',
          physicalSku: prize.physicalSku,
          tier: prize.tier,
          probabilityBp: prize.probabilityBasisPoints,
          costUsd: 0, // Prize cost in cents (can be 0)
          weightGrams: prize.weightGrams || 0,
          supplyTotal: prize.supplyTotal,
        };

        const sig = await this.solanaService.addPrize(gameId, prizeParams);
        prizeSignatures.push(sig);
        this.logger.log(`Prize ${i} added: ${sig}`);
      }

      const onChainAddress = this.solanaService.getGamePda(gameId).toString();

      this.logger.log(`✅ Game fully deployed!`);
      this.logger.log(`   Game ID: ${gameId}`);
      this.logger.log(`   On-chain address: ${onChainAddress}`);
      this.logger.log(`   Prizes: ${dto.prizes.length}`);

      return {
        gameId,
        onChainAddress,
        deploySignature,
        prizeSignatures,
      };
    } catch (error) {
      this.logger.error(`Failed to deploy game: ${error}`);
      throw new BadRequestException(
        `Failed to deploy game on-chain: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * @deprecated - Games are now deployed on-chain and synced by indexer
   * This method is kept for backward compatibility but should not be used
   */
  async updateOnChainAddress(
    id: number,
    dto: UpdateGameOnChainDto,
  ): Promise<{ message: string }> {
    this.logger.warn(
      'updateOnChainAddress is deprecated - games are now deployed on-chain directly',
    );
    return {
      message:
        'This endpoint is deprecated. Games are now deployed on-chain during creation.',
    };
  }

  /**
   * @deprecated - Games are activated on-chain during deployment
   */
  async activateGame(id: number): Promise<{ message: string }> {
    this.logger.warn(
      'activateGame is deprecated - games are activated on-chain during deployment',
    );
    return {
      message:
        'This endpoint is deprecated. Games are activated on-chain during deployment.',
    };
  }

  /**
   * @deprecated - Use on-chain update_game_status instruction
   */
  async deactivateGame(id: number): Promise<{ message: string }> {
    this.logger.warn('deactivateGame is deprecated - use on-chain instruction');
    return {
      message:
        'This endpoint is deprecated. Use on-chain update_game_status instruction.',
    };
  }
}
