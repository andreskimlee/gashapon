import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  
  logger.log(`🚀 Gashapon Indexer is running on port ${port}`);
  logger.log('📡 Listening to Helius WebSocket for blockchain events...');
}
bootstrap();
