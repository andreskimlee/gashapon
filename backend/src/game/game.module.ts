import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameEntity } from './game.entity';
import { PrizeEntity } from '../prize/prize.entity';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameAdminController } from './game-admin.controller';
import { GameAdminService } from './game-admin.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameEntity, PrizeEntity]),
    BlockchainModule,
  ],
  controllers: [GameController, GameAdminController],
  providers: [GameService, GameAdminService],
  exports: [GameService, GameAdminService],
})
export class GameModule {}
