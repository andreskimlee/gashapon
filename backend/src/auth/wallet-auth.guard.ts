import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class WalletAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const wallet = request.headers['x-wallet-address'];
    
    if (!wallet) {
      throw new UnauthorizedException('Wallet address required');
    }

    // TODO: Verify wallet signature
    // For now, just check header exists
    return true;
  }
}

