import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GameEntity } from './game.entity';
import { PrizeEntity } from '../prize/prize.entity';

export interface CreatePrizeDto {
  name: string;
  description?: string;
  imageUrl?: string;
  physicalSku: string;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  probabilityBasisPoints: number;
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

@Injectable()
export class GameAdminService {
  constructor(
    @InjectRepository(GameEntity)
    private readonly gameRepository: Repository<GameEntity>,
    @InjectRepository(PrizeEntity)
    private readonly prizeRepository: Repository<PrizeEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new game with prizes
   * Game is created as inactive until deployed on-chain
   */
  async createGame(dto: CreateGameDto): Promise<GameEntity & { prizes: PrizeEntity[] }> {
    // Validate probabilities sum to <= 10000
    const totalProbability = dto.prizes.reduce((sum, p) => sum + p.probabilityBasisPoints, 0);
    if (totalProbability > 10000) {
      throw new BadRequestException(
        `Total probability (${totalProbability}) exceeds 10000 basis points`,
      );
    }

    // Validate all prizes have supply
    if (dto.prizes.some(p => p.supplyTotal <= 0)) {
      throw new BadRequestException('All prizes must have supply > 0');
    }

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get next game ID
      const maxGameIdResult = await queryRunner.manager
        .createQueryBuilder(GameEntity, 'game')
        .select('MAX(game.gameId)', 'maxId')
        .getRawOne();
      const nextGameId = (maxGameIdResult?.maxId || 0) + 1;

      // Create game with temporary on-chain address
      const game = queryRunner.manager.create(GameEntity, {
        name: dto.name,
        description: dto.description || null,
        imageUrl: dto.imageUrl || null,
        costInTokens: dto.costInTokens,
        costInUsd: dto.costInUsd || null,
        gameId: nextGameId,
        onChainAddress: `pending_${nextGameId}_${Date.now()}`,
        isActive: false,
        totalPlays: 0,
      });

      const savedGame = await queryRunner.manager.save(GameEntity, game);

      // Create prizes
      const prizes = dto.prizes.map((prizeDto, index) =>
        queryRunner.manager.create(PrizeEntity, {
          gameId: savedGame.id,
          prizeId: index + 1,
          name: prizeDto.name,
          description: prizeDto.description || null,
          imageUrl: prizeDto.imageUrl || null,
          physicalSku: prizeDto.physicalSku,
          tier: prizeDto.tier,
          probabilityBasisPoints: prizeDto.probabilityBasisPoints,
          supplyTotal: prizeDto.supplyTotal,
          supplyRemaining: prizeDto.supplyTotal,
          metadataUri: prizeDto.metadataUri || null,
        }),
      );

      const savedPrizes = await queryRunner.manager.save(PrizeEntity, prizes);

      await queryRunner.commitTransaction();

      return { ...savedGame, prizes: savedPrizes };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update game with on-chain address after deployment
   */
  async updateOnChainAddress(
    id: number,
    dto: UpdateGameOnChainDto,
  ): Promise<GameEntity> {
    const game = await this.gameRepository.findOne({ where: { id } });
    if (!game) {
      throw new NotFoundException(`Game ${id} not found`);
    }

    // Validate the on-chain address format (Solana base58)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(dto.onChainAddress)) {
      throw new BadRequestException('Invalid Solana address format');
    }

    game.onChainAddress = dto.onChainAddress;
    game.gameId = dto.gameId;

    return this.gameRepository.save(game);
  }

  /**
   * Activate a game (must have valid on-chain address)
   */
  async activateGame(id: number): Promise<GameEntity> {
    const game = await this.gameRepository.findOne({ where: { id } });
    if (!game) {
      throw new NotFoundException(`Game ${id} not found`);
    }

    // Check if game has been deployed on-chain
    if (game.onChainAddress.startsWith('pending_')) {
      throw new BadRequestException(
        'Game must be deployed on-chain before activation. Update on-chain address first.',
      );
    }

    game.isActive = true;
    return this.gameRepository.save(game);
  }

  /**
   * Deactivate a game
   */
  async deactivateGame(id: number): Promise<GameEntity> {
    const game = await this.gameRepository.findOne({ where: { id } });
    if (!game) {
      throw new NotFoundException(`Game ${id} not found`);
    }

    game.isActive = false;
    return this.gameRepository.save(game);
  }
}

