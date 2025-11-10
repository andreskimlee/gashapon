import { Module } from '@nestjs/common';
import { WalletAuthGuard } from './wallet-auth.guard';

@Module({
  imports: [],
  providers: [WalletAuthGuard],
  exports: [WalletAuthGuard],
})
export class AuthModule {}


