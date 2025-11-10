import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PlayService } from './play.service';
import { WalletAuthGuard } from '../auth/wallet-auth.guard';
import { CurrentWallet } from '../auth/current-wallet.decorator';

@ApiTags('games')
@Controller('games')
export class PlayController {
  constructor(private readonly playService: PlayService) {}

  @Post(':id/play/simulate')
  @UseGuards(WalletAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'DEV ONLY - Simulate a game play (no on-chain interaction)' })
  @ApiBody({ schema: { type: 'object', properties: {} } })
  @ApiResponse({ status: 200, description: 'Simulated play result' })
  async simulate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentWallet() wallet: string,
    @Body() _body: Record<string, unknown>,
  ) {
    return this.playService.simulatePlay(id, wallet);
  }

  @Get('plays/:signature')
  @ApiOperation({ summary: 'Get play result by transaction signature' })
  @ApiResponse({ status: 200, description: 'Play found' })
  async getPlay(@Param('signature') signature: string) {
    return this.playService.getPlayBySignature(signature);
  }
}


