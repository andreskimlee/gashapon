import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface UploadSignatureResponse {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
}

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    this.isConfigured = !!(cloudName && apiKey && apiSecret);

    if (this.isConfigured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.logger.log('Cloudinary configured successfully');
    } else {
      this.logger.warn(
        'Cloudinary not configured - image uploads will be disabled. ' +
        'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
      );
    }
  }

  /**
   * Check if Cloudinary is configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Generate a signed upload signature for direct browser uploads
   * This allows the frontend to upload directly to Cloudinary without exposing the API secret
   */
  generateUploadSignature(folder: string): UploadSignatureResponse {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }

    const timestamp = Math.round(Date.now() / 1000);
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET')!;
    
    // Parameters that will be signed - only include what the frontend will send
    // The frontend must send EXACTLY these parameters for the signature to match
    const paramsToSign = {
      timestamp,
      folder,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      apiSecret
    );

    return {
      signature,
      timestamp,
      cloudName: this.configService.get<string>('CLOUDINARY_CLOUD_NAME')!,
      apiKey: this.configService.get<string>('CLOUDINARY_API_KEY')!,
      folder,
    };
  }

  /**
   * Generate optimized URL for an image
   * Applies auto-format and auto-quality transformations
   */
  getOptimizedUrl(publicId: string, options?: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale' | 'thumb';
  }): string {
    if (!this.isConfigured) {
      // Return publicId as-is if it's already a URL
      if (publicId.startsWith('http')) {
        return publicId;
      }
      return publicId;
    }

    const transformations: string[] = ['f_auto', 'q_auto'];
    
    if (options?.width) {
      transformations.push(`w_${options.width}`);
    }
    if (options?.height) {
      transformations.push(`h_${options.height}`);
    }
    if (options?.crop) {
      transformations.push(`c_${options.crop}`);
    }

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations.join(',')}/${publicId}`;
  }

  /**
   * Delete an image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn('Cloudinary not configured - cannot delete image');
      return false;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      this.logger.error(`Failed to delete image ${publicId}:`, error);
      return false;
    }
  }
}
