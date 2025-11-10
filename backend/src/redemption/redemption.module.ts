import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedemptionController } from './redemption.controller';
import { RedemptionService } from './redemption.service';
import { ShipStationService } from './shipstation.service';
import { EncryptionService } from '../common/encryption.service';
import { RedemptionEntity } from './redemption.entity';
import { NftEntity } from '../nft/nft.entity';
import { PrizeEntity } from '../prize/prize.entity';
import { NftModule } from '../nft/nft.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RedemptionEntity, NftEntity, PrizeEntity]),
    NftModule,
    BlockchainModule,
    AuthModule,
  ],
  controllers: [RedemptionController],
  providers: [RedemptionService, ShipStationService, EncryptionService],
  exports: [RedemptionService],
})
export class RedemptionModule {}

