import { Global, Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import * as Joi from "joi";

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      validationSchema: Joi.object({
        // Server
        NODE_ENV: Joi.string()
          .valid("development", "production", "test")
          .default("development"),
        PORT: Joi.number().default(3001),
        FRONTEND_URL: Joi.string().default("http://localhost:3000"),

        // Database (Required - match indexer behavior)
        // Use direct PostgreSQL connection string from Supabase
        // Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
        DATABASE_URL: Joi.string()
          .pattern(/^postgresql?:\/\//)
          .required()
          .messages({
            "any.required":
              "DATABASE_URL is required. Get it from Supabase Settings > Database",
            "string.pattern.base":
              "DATABASE_URL must be a PostgreSQL connection string (postgresql://...)",
          }),

        // Solana (Optional - defaults to devnet)
        SOLANA_RPC_URL: Joi.string()
          .uri()
          .default("https://api.devnet.solana.com"),
        SOLANA_NETWORK: Joi.string()
          .valid("devnet", "mainnet-beta")
          .default("devnet"),
        PLATFORM_WALLET_PRIVATE_KEY: Joi.string().optional(),

        // ShipStation (Optional in dev)
        SHIPSTATION_API_KEY: Joi.string().optional(),
        SHIPSTATION_API_SECRET: Joi.string().optional(),

        // Encryption - shared AES key for shipping data (base64-encoded 32 bytes)
        ENCRYPTION_KEY: Joi.string().optional(),

        // Redis (Optional)
        REDIS_URL: Joi.string().uri().optional(),

        // AWS (Optional)
        AWS_REGION: Joi.string().optional(),
        AWS_ACCESS_KEY_ID: Joi.string().optional(),
        AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
      }).unknown(), // Allow other env vars
      validationOptions: {
        allowUnknown: true,
        abortEarly: false, // Show all errors, not just first
      },
    }),
  ],
})
export class ConfigModule {}
