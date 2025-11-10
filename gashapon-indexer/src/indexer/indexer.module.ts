import { Module } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { EventParserService } from './events/event-parser.service';
import { GameService } from './services/game.service';
import { PlayService } from './services/play.service';
import { PrizeService } from './services/prize.service';
import { NftService } from './services/nft.service';
import { MarketplaceService } from './services/marketplace.service';
import { HeliusModule } from '../helius/helius.module';
import { DatabaseModule } from '../database/database.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [HeliusModule, DatabaseModule, SupabaseModule],
  providers: [
    IndexerService,
    EventParserService,
    GameService,
    PlayService,
    PrizeService,
    NftService,
    MarketplaceService,
  ],
  exports: [IndexerService],
})
export class IndexerModule {}

