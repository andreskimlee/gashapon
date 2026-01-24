import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Admin Guard
 * Validates admin API key from request headers
 * 
 * SECURITY: API key must be set via ADMIN_API_KEY environment variable
 * Never use hardcoded fallback keys in production
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminKey = request.headers['x-admin-key'];

    if (!adminKey) {
      throw new UnauthorizedException('Admin API key required');
    }

    const validAdminKey = this.configService.get<string>('ADMIN_API_KEY');
    
    // In production, ADMIN_API_KEY must be configured
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    if (nodeEnv === 'production' && !validAdminKey) {
      throw new UnauthorizedException('Admin API key not configured on server');
    }

    // Validate the key
    if (adminKey !== validAdminKey) {
      throw new UnauthorizedException('Invalid admin API key');
    }

    return true;
  }
}
