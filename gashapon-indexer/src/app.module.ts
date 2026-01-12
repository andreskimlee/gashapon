import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HeliusModule } from './helius/helius.module';
import { IndexerModule } from './indexer/indexer.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ConfigModule, DatabaseModule, HeliusModule, IndexerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
