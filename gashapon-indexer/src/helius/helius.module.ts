import { Module } from '@nestjs/common';
import { HeliusService } from './helius.service';

@Module({
  providers: [HeliusService],
  exports: [HeliusService],
})
export class HeliusModule {}

