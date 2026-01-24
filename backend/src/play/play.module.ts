import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayEntity } from './play.entity';
import { PlayService } from './play.service';
import { PlayController } from './play.controller';
import { GameEntity } from '../game/game.entity';
import { PrizeEntity } from '../prize/prize.entity';
import { AuthModule } from '../auth/auth.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayEntity, GameEntity, PrizeEntity]),
    AuthModule,
    BlockchainModule,
  ],
  controllers: [PlayController],
  providers: [PlayService],
  exports: [PlayService],
})
export class PlayModule {}


