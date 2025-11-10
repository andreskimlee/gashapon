import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CollectionService } from './collection.service';
import { UserEntity } from './user.entity';
import { NftEntity } from '../nft/nft.entity';
import { PrizeEntity } from '../prize/prize.entity';
import { GameEntity } from '../game/game.entity';
import { RedemptionEntity } from '../redemption/redemption.entity';
import { MarketplaceListingEntity } from '../marketplace/marketplace-listing.entity';
import { PlayEntity } from '../play/play.entity';
import { NftModule } from '../nft/nft.module';
import { RedemptionModule } from '../redemption/redemption.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity, // Optional - can be removed if not needed
      NftEntity,
      PrizeEntity,
      GameEntity,
      RedemptionEntity,
      MarketplaceListingEntity,
      PlayEntity,
    ]),
    SupabaseModule,
    BlockchainModule,
    NftModule,
    RedemptionModule,
  ],
  controllers: [UserController],
  providers: [UserService, CollectionService],
  exports: [UserService, CollectionService],
})
export class UserModule {}

