import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentWallet = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-wallet-address'] || '';
  },
);

