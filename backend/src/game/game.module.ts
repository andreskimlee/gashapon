import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameEntity } from './game.entity';
import { PrizeEntity } from '../prize/prize.entity';
import { GameService } from './game.service';
import { GameController } from './game.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GameEntity, PrizeEntity])],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}


