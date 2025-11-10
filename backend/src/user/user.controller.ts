import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseBoolPipe,
  Optional,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CollectionService } from './collection.service';
import { RedemptionService } from '../redemption/redemption.service';
import { WalletAuthGuard } from '../auth/wallet-auth.guard';
import { CurrentWallet } from '../auth/current-wallet.decorator';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly collectionService: CollectionService,
    private readonly redemptionService: RedemptionService,
  ) {}

  @Get(':wallet/profile')
  @ApiOperation({ summary: 'Get user profile and statistics' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getUserProfile(@Param('wallet') wallet: string) {
    return this.userService.getUserProfile(wallet);
  }

  @Get(':wallet/stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  async getUserStats(@Param('wallet') wallet: string) {
    return this.userService.getUserStats(wallet);
  }

  @Get(':wallet/collection')
  @ApiOperation({ summary: "Get user's NFT collection" })
  @ApiResponse({ status: 200, description: 'Collection retrieved successfully' })
  @ApiQuery({ name: 'tier', required: false, enum: ['common', 'uncommon', 'rare', 'legendary'] })
  @ApiQuery({ name: 'gameId', required: false, type: Number })
  @ApiQuery({ name: 'isRedeemed', required: false, type: Boolean })
  @ApiQuery({ name: 'hasListing', required: false, type: Boolean })
  async getUserCollection(
    @Param('wallet') wallet: string,
    @Query('tier') tier?: 'common' | 'uncommon' | 'rare' | 'legendary',
    @Query('gameId') gameId?: number,
    @Query('isRedeemed') isRedeemed?: boolean,
    @Query('hasListing') hasListing?: boolean,
  ) {
    const filters = {
      ...(tier && { tier }),
      ...(gameId && { gameId: Number(gameId) }),
      ...(isRedeemed !== undefined && { isRedeemed }),
      ...(hasListing !== undefined && { hasListing }),
    };

    return this.collectionService.getUserCollection(wallet, filters);
  }

  @Get(':wallet/collection/stats')
  @ApiOperation({ summary: 'Get collection statistics' })
  @ApiResponse({ status: 200, description: 'Collection statistics retrieved successfully' })
  async getCollectionStats(@Param('wallet') wallet: string) {
    return this.collectionService.getCollectionStats(wallet);
  }

  @Get(':wallet/plays')
  @ApiOperation({ summary: 'Get user play history' })
  @ApiResponse({ status: 200, description: 'Play history retrieved successfully' })
  async getUserPlays(@Param('wallet') wallet: string) {
    return this.userService.getUserPlays(wallet);
  }

  @Get(':wallet/redemptions')
  @ApiOperation({ summary: 'Get user redemption history' })
  @ApiResponse({ status: 200, description: 'Redemption history retrieved successfully' })
  async getUserRedemptions(@Param('wallet') wallet: string) {
    return this.redemptionService.getUserRedemptions(wallet);
  }
}

