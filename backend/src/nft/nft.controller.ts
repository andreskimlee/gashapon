import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { NftService } from './nft.service';
import { MetaplexService } from '../blockchain/metaplex.service';
import { PublicKey } from '@solana/web3.js';
import { WalletAuthGuard } from '../auth/wallet-auth.guard';
import { CurrentWallet } from '../auth/current-wallet.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrizeEntity } from '../prize/prize.entity';
import { PlayEntity } from '../play/play.entity';

class MintNftRequestDto {
  playSignature: string; // Transaction signature of the play that won the prize
}

@ApiTags('nfts')
@Controller('nfts')
export class NftController {
  constructor(
    private readonly nftService: NftService,
    private readonly metaplexService: MetaplexService,
    @InjectRepository(PrizeEntity)
    private prizeRepository: Repository<PrizeEntity>,
    @InjectRepository(PlayEntity)
    private playRepository: Repository<PlayEntity>,
  ) {}

  @Post('mint')
  @UseGuards(WalletAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mint NFT for a won prize' })
  @ApiBody({ type: MintNftRequestDto })
  @ApiResponse({
    status: 200,
    description: 'NFT minted successfully',
  })
  async mintNft(
    @Body() request: MintNftRequestDto,
    @CurrentWallet() wallet: string,
  ) {
    // Find the play record to get prize information
    const play = await this.playRepository.findOne({
      where: { transactionSignature: request.playSignature },
      relations: ['prize', 'prize.game'],
    });

    if (!play) {
      throw new NotFoundException(
        `Play not found for signature: ${request.playSignature}`,
      );
    }

    if (!play.prize) {
      throw new BadRequestException(
        'Play does not have an associated prize. Make sure finalizePlay was called.',
      );
    }

    if (play.status !== 'completed') {
      throw new BadRequestException(
        'Play is not completed. Cannot mint NFT for pending play.',
      );
    }

    // Verify wallet matches
    if (play.userWallet !== wallet) {
      throw new BadRequestException('Wallet does not match play owner');
    }

    const prize = play.prize;

    // Mint NFT using Metaplex
    const result = await this.metaplexService.mintPrizeNFT({
      metadataUri: prize.metadataUri || `ipfs://prize-${prize.id}`,
      name: prize.name,
      symbol: 'PRIZE',
      recipient: new PublicKey(wallet),
      attributes: [
        { trait_type: 'Tier', value: prize.tier },
        { trait_type: 'Game', value: prize.game.name },
        { trait_type: 'Prize ID', value: prize.prizeId.toString() },
      ],
    });

    // Create NFT record in database
    const nft = await this.nftService.createNft(
      result.mintAddress,
      prize.id,
      prize.gameId,
      wallet,
    );

    // Update play record with NFT mint address
    play.nftMint = result.mintAddress;
    await this.playRepository.save(play);

    return {
      success: true,
      mintAddress: result.mintAddress,
      signature: result.signature,
      nft: {
        id: nft.id,
        mintAddress: nft.mintAddress,
        prize: {
          id: prize.id,
          name: prize.name,
          tier: prize.tier,
        },
      },
    };
  }
}

