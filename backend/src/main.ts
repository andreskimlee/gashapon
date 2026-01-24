import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Enable CORS with support for Vercel preview deployments
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      // List of allowed origins
      const allowedOrigins = [
        frontendUrl,
        'http://localhost:3000',
        'http://localhost:3001',
      ];

      // Check exact match first
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Allow Vercel preview deployments (*.vercel.app)
      if (/\.vercel\.app$/.test(origin)) {
        callback(null, true);
        return;
      }

      // Allow custom domains if configured
      const additionalOrigins = process.env.CORS_ORIGINS?.split(',') || [];
      if (additionalOrigins.some((o) => origin === o.trim())) {
        callback(null, true);
        return;
      }

      // Reject other origins
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address', 'x-admin-key'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Gachapon API')
    .setDescription('API for Gachapon platform - NFT gachapon games on Solana')
    .setVersion('1.0')
    .addTag('users', 'User and collection endpoints')
    .addTag('redemptions', 'NFT redemption endpoints')
    .addTag('games', 'Game endpoints')
    .addTag('marketplace', 'Marketplace endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`API Documentation: http://localhost:${port}/api`);
}

bootstrap();

