import * as Joi from 'joi';

/**
 * Configuration schema for environment variables
 * This schema validates all environment variables on application startup
 */
export const configSchema = Joi.object({
  // Server Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3002),

  // Supabase Configuration (Required)
  // Use DATABASE_URL for direct PostgreSQL connection (recommended for indexer)
  // Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
  DATABASE_URL: Joi.string()
    .pattern(/^postgresql?:\/\//)
    .required()
    .messages({
      'any.required':
        'DATABASE_URL is required. Get it from Supabase Settings > Database',
      'string.pattern.base':
        'DATABASE_URL must be a PostgreSQL connection string (postgresql://...)',
    }),
  // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are optional for indexer
  // Only needed if you want to use Supabase REST API features
  SUPABASE_URL: Joi.string().uri().optional(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().optional(),

  // Helius Configuration (Required)
  HELIUS_API_KEY: Joi.string().required(),
  SOLANA_NETWORK: Joi.string()
    .valid('devnet', 'mainnet-beta')
    .default('devnet'),

  // Program IDs (Optional - defaults provided)
  // Note: This is the single program that handles all games. Each game is a PDA account
  // created by this program, identified by game_id. The program address is:
  // PDA([b"game", game_id.to_le_bytes()]) derived from this program.
  GACHAPON_GAME_PROGRAM_ID: Joi.string().default(
    'EKzLHZyU6WVfhYVXcE6R4hRE4YuWrva8NeLGMYB7ZDU6',
  ),
  GACHAPON_MARKETPLACE_PROGRAM_ID: Joi.string().default(
    '4zHkHBrSyBsi2L5J1ikZ5kQwNcGMcE2x3wKrG3FY7UqC',
  ),
}).unknown();

/**
 * Configuration validation options
 */
export const configValidationOptions = {
  allowUnknown: true,
  abortEarly: false,
};
