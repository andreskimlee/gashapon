/**
 * Configuration interface for type-safe access to environment variables
 * This interface matches the configSchema validation
 */
export interface IConfig {
  // Server
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;

  // Database (Direct PostgreSQL connection - recommended for indexer)
  DATABASE_URL: string;

  // Supabase (Optional - only needed for REST API features)
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;

  // Helius
  HELIUS_API_KEY: string;
  SOLANA_NETWORK: 'devnet' | 'mainnet-beta';

  // Program IDs
  GACHAPON_GAME_PROGRAM_ID: string;
  GACHAPON_MARKETPLACE_PROGRAM_ID: string;
}
