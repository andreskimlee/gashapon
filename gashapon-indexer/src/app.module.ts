import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HeliusModule } from './helius/helius.module';
import { IndexerModule } from './indexer/indexer.module';

@Module({
  imports: [ConfigModule, DatabaseModule, HeliusModule, IndexerModule],
})
export class AppModule {}
