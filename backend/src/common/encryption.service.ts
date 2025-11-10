import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface ShippingData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  email?: string;
}

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits

  constructor(private configService: ConfigService) {}

  /**
   * Decrypt shipping data (server-side, in-memory only)
   * This should only be called when immediately forwarding to fulfillment
   * The decrypted data should NEVER be persisted
   */
  async decryptShippingData(encryptedData: string): Promise<ShippingData> {
    try {
      // Parse the encrypted data format: base64(iv:tag:encrypted)
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'base64');
      const tag = Buffer.from(parts[1], 'base64');
      const encrypted = Buffer.from(parts[2], 'base64');

      // Get encryption key from environment (should be rotated regularly)
      const encryptionKey = this.getEncryptionKey();

      const decipher = crypto.createDecipheriv(this.algorithm, encryptionKey, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      const shippingData: ShippingData = JSON.parse(decrypted);

      // Validate required fields
      this.validateShippingData(shippingData);

      return shippingData;
    } catch (error) {
      throw new BadRequestException(`Failed to decrypt shipping data: ${error.message}`);
    }
  }

  /**
   * Validate shipping data structure
   */
  private validateShippingData(data: any): void {
    const requiredFields = ['name', 'address', 'city', 'state', 'zip', 'country'];
    for (const field of requiredFields) {
      if (!data[field] || typeof data[field] !== 'string') {
        throw new Error(`Missing or invalid field: ${field}`);
      }
    }
  }

  /**
   * Get encryption key from environment
   * In production, this should use AWS KMS or similar
   */
  private getEncryptionKey(): Buffer {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('ENCRYPTION_KEY not configured');
    }

    // Key should be base64 encoded 32-byte key
    try {
      return Buffer.from(key, 'base64');
    } catch (error) {
      throw new Error('Invalid encryption key format');
    }
  }

  /**
   * Generate a new encryption key (for key rotation)
   * This should be run periodically and the key stored securely
   */
  static generateEncryptionKey(): string {
    const key = crypto.randomBytes(this.prototype.keyLength);
    return key.toString('base64');
  }
}

