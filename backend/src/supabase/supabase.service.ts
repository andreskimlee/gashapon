import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types/database.types';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClient<Database>;
  private readonly supabaseUrl: string;
  private readonly supabaseKey: string;
  private readonly supabaseServiceKey: string;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    this.supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY') || '';
    this.supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Only throw error in production, allow development without Supabase
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    if (nodeEnv === 'production' && (!this.supabaseUrl || !this.supabaseKey)) {
      throw new Error('Supabase URL and ANON_KEY must be configured in production');
    }
  }

  onModuleInit() {
    // Initialize Supabase client with anon key (for client-side operations)
    // Only initialize if credentials are provided
    if (this.supabaseUrl && this.supabaseKey) {
      this.client = createClient<Database>(this.supabaseUrl, this.supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    } else {
      // Create a dummy client for development
      this.client = createClient<Database>('https://placeholder.supabase.co', 'placeholder-key', {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      console.warn('⚠️  Supabase not configured - using placeholder client. Set SUPABASE_URL and SUPABASE_ANON_KEY to enable.');
    }
  }

  /**
   * Get Supabase client (anon key - for public operations)
   */
  getClient(): SupabaseClient<Database> {
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    }
    return this.client;
  }

  /**
   * Get Supabase client with service role key (for admin operations)
   * Use with caution - bypasses Row Level Security
   */
  getAdminClient(): SupabaseClient<Database> {
    if (!this.supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }
    return createClient<Database>(this.supabaseUrl, this.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Get Supabase URL
   */
  getUrl(): string {
    return this.supabaseUrl;
  }

  /**
   * Get Supabase anon key
   */
  getAnonKey(): string {
    return this.supabaseKey;
  }
}

