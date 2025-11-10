import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftService } from './nft.service';
import { NftController } from './nft.controller';
import { NftEntity } from './nft.entity';
import { PrizeEntity } from '../prize/prize.entity';
import { PlayEntity } from '../play/play.entity';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NftEntity, PrizeEntity, PlayEntity]),
    BlockchainModule,
    AuthModule,
  ],
  controllers: [NftController],
  providers: [NftService],
  exports: [NftService],
})
export class NftModule {}

