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
  phone: string;
  email?: string;
}

/**
 * Encryption service using AES-256-GCM
 * 
 * Both the Next.js frontend API route and this backend service
 * use the same ENCRYPTION_KEY to encrypt/decrypt shipping data.
 * 
 * Encrypted data format: base64(iv):base64(tag):base64(ciphertext)
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
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
      // Parse the encrypted data format: base64(iv):base64(tag):base64(ciphertext)
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'base64');
      const tag = Buffer.from(parts[1], 'base64');
      const encrypted = Buffer.from(parts[2], 'base64');

      // Get encryption key from environment
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
      throw new BadRequestException(
        `Failed to decrypt shipping data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate shipping data structure
   */
  private validateShippingData(data: unknown): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid shipping data');
    }

    const requiredFields = ['name', 'address', 'city', 'state', 'zip', 'country', 'phone'];
    for (const field of requiredFields) {
      if (!(field in data) || typeof (data as Record<string, unknown>)[field] !== 'string') {
        throw new Error(`Missing or invalid field: ${field}`);
      }
    }
  }

  /**
   * Get encryption key from environment
   */
  private getEncryptionKey(): Buffer {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('ENCRYPTION_KEY not configured');
    }

    // Key should be base64 encoded 32-byte key
    const keyBuffer = Buffer.from(key, 'base64');
    if (keyBuffer.length !== 32) {
      throw new Error('Encryption key must be 32 bytes');
    }
    return keyBuffer;
  }

  /**
   * Generate a new encryption key
   * Run: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }
}
