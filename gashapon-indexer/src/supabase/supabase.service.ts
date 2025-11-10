import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types/database.types';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClient<Database>;
  private readonly supabaseUrl: string;
  private readonly supabaseServiceKey: string;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    this.supabaseServiceKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured',
      );
    }
  }

  onModuleInit() {
    this.client = createClient<Database>(this.supabaseUrl, this.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log('✅ Supabase client initialized');
  }

  /**
   * Get Supabase client with service role key (for admin operations)
   */
  getClient(): SupabaseClient<Database> {
    return this.client;
  }

  /**
   * Get Supabase URL
   */
  getUrl(): string {
    return this.supabaseUrl;
  }
}

