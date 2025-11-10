import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseService } from './database.service';

@Module({
  imports: [
    // Type assertion needed due to NestJS version mismatch in workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        let databaseUrl = configService.get<string>('DATABASE_URL') || '';

        // Remove quotes if present (common in .env files)
        if (databaseUrl) {
          databaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, '');

          // Fix URL encoding issues - the # character in passwords breaks URL parsing
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
          type: 'postgres',
          url: databaseUrl,
          ssl:
            configService.get<string>('NODE_ENV') === 'production'
              ? {
                  rejectUnauthorized: false,
                }
              : false,
          // No entities needed - we're using raw SQL queries
          synchronize: false,
          logging: configService.get<string>('NODE_ENV') === 'development',
          extra: {
            max: 10, // Connection pool size
          },
        };
      },
      inject: [ConfigService],
    }) as any,
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
