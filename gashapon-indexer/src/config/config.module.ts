import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configSchema, configValidationOptions } from './config.schema';

@Global()
@Module({
  imports: [
    // Type assertion needed due to NestJS version mismatch in workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: configSchema,
      validationOptions: configValidationOptions,
    }) as any,
  ],
})
export class ConfigModule {}
