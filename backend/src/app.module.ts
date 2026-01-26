import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BlockchainModule } from "./blockchain/blockchain.module";
import { CategoryModule } from "./category/category.module";
import { CommonModule } from "./common/common.module";
import { ConfigModule } from "./config/config.module";
import { HealthModule } from "./health/health.module";
import { NftModule } from "./nft/nft.module";
import { RedemptionModule } from "./redemption/redemption.module";
import { UserModule } from "./user/user.module";
import { GameModule } from "./game/game.module";
import { PlayModule } from "./play/play.module";
import { PrizeModule } from "./prize/prize.module";

@Module({
  imports: [
    ConfigModule, // ConfigModule includes validation
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // DATABASE_URL is validated by Joi schema to match indexer behavior
        let databaseUrl = configService.get<string>("DATABASE_URL") || "";

        // Remove quotes if present (common in .env files)
        if (databaseUrl) {
          databaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, "");

          // Fix URL encoding issues - the # character in passwords breaks URL parsing
          // We need to encode # as %23 in the password part before parsing
          // Pattern: postgresql://user:password#with#hash@host:port/db
          const urlPattern = /^(postgresql?:\/\/)([^:]+):([^@]+)@(.+)$/;
          const match = databaseUrl.match(urlPattern);

          if (match) {
            const [, protocol, username, password, rest] = match;
            // URL-encode the password to handle special characters like #
            const encodedPassword = encodeURIComponent(password);
            databaseUrl = `${protocol}${username}:${encodedPassword}@${rest}`;
          }
        }

        return {
          type: "postgres",
          url: databaseUrl,
          // Supabase connection string format:
          // postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
          ssl:
            configService.get<string>("NODE_ENV") === "production"
              ? {
                  rejectUnauthorized: false,
                }
              : false,
          entities: [__dirname + "/**/*.entity{.ts,.js}"],
          migrations: [__dirname + "/../../migrations/*{.ts,.js}"],
          migrationsRun: configService.get<string>("NODE_ENV") === "production", // Auto-run migrations in production
          synchronize: false, // Never use synchronize - use migrations instead
          logging: configService.get<string>("NODE_ENV") === "development",
          extra: {
            max: 10, // Connection pool size
          },
        };
      },
      inject: [ConfigService],
    }),
    BlockchainModule,
    CategoryModule,
    CommonModule,
    HealthModule,
    UserModule,
    RedemptionModule,
    NftModule,
    GameModule,
    PlayModule,
    PrizeModule,
  ],
})
export class AppModule {}
