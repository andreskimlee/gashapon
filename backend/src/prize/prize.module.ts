import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrizeEntity } from './prize.entity';
import { PrizeMetadataController } from './prize.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PrizeEntity])],
  controllers: [PrizeMetadataController],
  exports: [TypeOrmModule],
})
export class PrizeModule {}
