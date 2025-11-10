import { Module } from '@nestjs/common';
import { MetaplexService } from './metaplex.service';
import { SolanaService } from './solana.service';

@Module({
  providers: [SolanaService, MetaplexService],
  exports: [SolanaService, MetaplexService],
})
export class BlockchainModule {}

