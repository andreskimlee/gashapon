import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayEntity } from './play.entity';
import { PlayService } from './play.service';
import { PlayController } from './play.controller';
import { GameEntity } from '../game/game.entity';
import { PrizeEntity } from '../prize/prize.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([PlayEntity, GameEntity, PrizeEntity]), AuthModule],
  controllers: [PlayController],
  providers: [PlayService],
  exports: [PlayService],
})
export class PlayModule {}


