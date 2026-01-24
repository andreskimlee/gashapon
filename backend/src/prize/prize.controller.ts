import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrizeEntity } from './prize.entity';

@Controller('metadata')
export class PrizeMetadataController {
  constructor(
    @InjectRepository(PrizeEntity)
    private readonly prizeRepository: Repository<PrizeEntity>,
  ) {}

  /**
   * Serve Metaplex-compatible JSON metadata for a prize
   * This endpoint is used as the NFT's metadata URI
   * 
   * Example: https://api.yourdomain.com/metadata/game/1/prize/2
   */
  @Get('game/:gameId/prize/:prizeId')
  async getPrizeMetadata(
    @Param('gameId') gameId: string,
    @Param('prizeId') prizeId: string,
  ) {
    const prize = await this.prizeRepository.findOne({
      where: { 
        prizeId: parseInt(prizeId, 10),
        game: { gameId: parseInt(gameId, 10) },
      },
      relations: ['game'],
    });

    if (!prize) {
      throw new NotFoundException(`Prize ${prizeId} not found for game ${gameId}`);
    }

    // Return Metaplex-compatible metadata JSON
    return {
      name: prize.name,
      symbol: 'PRIZE',
      description: prize.description || `A prize from ${prize.game?.name || 'Gashapon'}`,
      image: prize.imageUrl, // Your Cloudinary URL
      external_url: `https://gashapon.fun/games/${gameId}`,
      attributes: [
        {
          trait_type: 'Tier',
          value: prize.tier.charAt(0).toUpperCase() + prize.tier.slice(1),
        },
        {
          trait_type: 'Game',
          value: prize.game?.name || 'Unknown',
        },
        {
          trait_type: 'Rarity',
          value: `${(prize.probabilityBasisPoints / 100).toFixed(2)}%`,
        },
      ],
      properties: {
        files: [
          {
            uri: prize.imageUrl,
            type: 'image/png', // Adjust based on your image types
          },
        ],
        category: 'image',
        creators: [],
      },
    };
  }
}
