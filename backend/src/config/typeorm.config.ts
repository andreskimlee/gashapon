import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config({ path: ['.env.local', '.env'] });

const configService = new ConfigService();

// Get DATABASE_URL (required)
let databaseUrl = configService.get<string>('DATABASE_URL');

// Remove quotes and fix URL encoding
if (databaseUrl) {
  databaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, '');
  
  // Fix URL encoding issues - the # character in passwords breaks URL parsing
  const urlPattern = /^(postgresql?:\/\/)([^:]+):([^@]+)@(.+)$/;
  const match = databaseUrl.match(urlPattern);
  
  if (match) {
    const [, protocol, username, password, rest] = match;
    const encodedPassword = encodeURIComponent(password);
    databaseUrl = `${protocol}${username}:${encodedPassword}@${rest}`;
  }
}

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: configService.get<string>('NODE_ENV') === 'production' ? {
    rejectUnauthorized: false,
  } : false,
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../../migrations/**/*{.ts,.js}')],
  synchronize: false, // Never use synchronize with migrations
  logging: true,
});

