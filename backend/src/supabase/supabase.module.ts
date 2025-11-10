import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseService } from './supabase.service';
import { RealtimeService } from './realtime.service';
import { StorageService } from './storage.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SupabaseService, RealtimeService, StorageService],
  exports: [SupabaseService, RealtimeService, StorageService],
})
export class SupabaseModule {}

