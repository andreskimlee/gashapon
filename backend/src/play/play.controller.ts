import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
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

  /**
   * Finalize a play session with backend-generated randomness
   * This is the secure endpoint that determines play outcomes
   */
  @Post(':id/play/finalize')
  @UseGuards(WalletAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Finalize a play session with backend randomness',
    description: 'After user calls play_game on-chain, call this endpoint to determine the outcome securely'
  })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: {
        sessionPda: { type: 'string', description: 'Play session PDA address' },
        gamePda: { type: 'string', description: 'Game PDA address' },
      },
      required: ['sessionPda', 'gamePda'],
    } 
  })
  @ApiResponse({ status: 200, description: 'Play finalized successfully' })
  async finalizePlay(
    @Param('id', ParseIntPipe) id: number,
    @CurrentWallet() wallet: string,
    @Body() body: { sessionPda: string; gamePda: string },
  ) {
    return this.playService.finalizePlay({
      sessionPda: body.sessionPda,
      gamePda: body.gamePda,
      gameDbId: id,
      userWallet: wallet,
    });
  }

  /**
   * Get play session status from on-chain data
   */
  @Get('sessions/:sessionPda/status')
  @ApiOperation({ summary: 'Get play session status from on-chain' })
  @ApiResponse({ status: 200, description: 'Session status' })
  async getSessionStatus(@Param('sessionPda') sessionPda: string) {
    return this.playService.getSessionStatus(sessionPda);
  }

  @Get('plays/:signature')
  @ApiOperation({ summary: 'Get play result by transaction signature' })
  @ApiResponse({ status: 200, description: 'Play found' })
  async getPlay(@Param('signature') signature: string) {
    return this.playService.getPlayBySignature(signature);
  }

  /**
   * Save a recording of player actions for a play session
   * Used for broadcast replay feature
   */
  @Post('plays/:signature/recording')
  @UseGuards(WalletAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Save recording for a play session',
    description: 'Saves a base64-encoded recording of player actions for broadcast replay'
  })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: {
        recording: { type: 'string', description: 'Base64-encoded recording data' },
      },
      required: ['recording'],
    } 
  })
  @ApiResponse({ status: 200, description: 'Recording saved successfully' })
  async saveRecording(
    @Param('signature') signature: string,
    @CurrentWallet() wallet: string,
    @Body() body: { recording: string },
  ) {
    return this.playService.saveRecording(signature, body.recording, wallet);
  }
}


