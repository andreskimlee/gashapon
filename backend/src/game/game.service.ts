import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameEntity } from './game.entity';
import { PrizeEntity } from '../prize/prize.entity';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(GameEntity)
    private readonly gameRepository: Repository<GameEntity>,
    @InjectRepository(PrizeEntity)
    private readonly prizeRepository: Repository<PrizeEntity>,
  ) {}

  /**
   * List games, optionally filtering to only active ones.
   */
  async listGames(params?: { active?: boolean }): Promise<GameEntity[]> {
    const where =
      params && typeof params.active === 'boolean'
        ? { isActive: params.active }
        : {};
    return this.gameRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single game with prizes.
   */
  async getGameById(id: number): Promise<GameEntity & { prizes: PrizeEntity[] }> {
    const game = await this.gameRepository.findOne({
      where: { id },
      relations: ['prizes'],
    });
    if (!game) {
      throw new NotFoundException(`Game ${id} not found`);
    }
    return game as GameEntity & { prizes: PrizeEntity[] };
  }
}


