import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RedemptionService, RedemptionRequest } from './redemption.service';
import { WalletAuthGuard } from '../auth/wallet-auth.guard';
import { CurrentWallet } from '../auth/current-wallet.decorator';
import { RedemptionRequestDto } from './dto/redemption-request.dto';

@ApiTags('redemptions')
@Controller('redemptions')
export class RedemptionController {
  constructor(private readonly redemptionService: RedemptionService) {}

  @Post('nft')
  @UseGuards(WalletAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem an NFT for physical item' })
  @ApiBody({ type: RedemptionRequestDto })
  @ApiResponse({
    status: 200,
    description: 'NFT redeemed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request or NFT already redeemed' })
  @ApiResponse({ status: 404, description: 'NFT not found' })
  async redeemNFT(
    @Body() request: RedemptionRequestDto,
    @CurrentWallet() wallet: string,
  ) {
    // Ensure wallet matches request
    if (request.userWallet !== wallet) {
      throw new Error('Wallet mismatch');
    }

    return this.redemptionService.redeemNFT({
      nftMint: request.nftMint,
      userWallet: request.userWallet,
      signature: request.signature,
      encryptedShippingData: request.encryptedShippingData,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get redemption status by ID' })
  @ApiResponse({ status: 200, description: 'Redemption status retrieved' })
  @ApiResponse({ status: 404, description: 'Redemption not found' })
  async getRedemptionStatus(@Param('id') id: string) {
    // Can be queried by redemption ID or NFT mint
    if (id.startsWith('GACHA-') || id.length === 44) {
      // NFT mint address
      return this.redemptionService.getRedemptionStatus(id);
    } else {
      // Redemption ID
      // TODO: Add method to get by ID
      throw new Error('Getting by redemption ID not yet implemented');
    }
  }

  @Get('nft/:mintAddress')
  @ApiOperation({ summary: 'Get redemption status by NFT mint address' })
  @ApiResponse({ status: 200, description: 'Redemption status retrieved' })
  async getRedemptionByNFT(@Param('mintAddress') mintAddress: string) {
    return this.redemptionService.getRedemptionStatus(mintAddress);
  }

  @Get('user/:wallet')
  @ApiOperation({ summary: "Get user's redemption history" })
  @ApiResponse({ status: 200, description: 'Redemption history retrieved' })
  async getUserRedemptions(@Param('wallet') wallet: string) {
    return this.redemptionService.getUserRedemptions(wallet);
  }

  @Post('webhook/shipstation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ShipStation webhook handler' })
  async handleShipStationWebhook(@Body() webhook: any) {
    // Verify webhook signature
    // TODO: Add signature verification middleware
    await this.redemptionService.handleShipmentUpdate(webhook);
    return { success: true };
  }
}

