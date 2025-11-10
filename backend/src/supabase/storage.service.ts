import { Injectable } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class StorageService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Upload prize metadata image to Supabase Storage
   */
  async uploadPrizeImage(
    file: Buffer,
    fileName: string,
    contentType: string = 'image/png',
  ): Promise<{ path: string; url: string }> {
    const client = this.supabaseService.getClient();
    const filePath = `prizes/${fileName}`;

    const { data, error } = await client.storage
      .from('prize-images')
      .upload(filePath, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    const { data: urlData } = client.storage.from('prize-images').getPublicUrl(filePath);

    return {
      path: data.path,
      url: urlData.publicUrl,
    };
  }

  /**
   * Upload NFT metadata JSON to Supabase Storage
   */
  async uploadNFTMetadata(
    metadata: object,
    fileName: string,
  ): Promise<{ path: string; url: string }> {
    const client = this.supabaseService.getClient();
    const filePath = `metadata/${fileName}`;
    const jsonString = JSON.stringify(metadata);

    const { data, error } = await client.storage
      .from('nft-metadata')
      .upload(filePath, jsonString, {
        contentType: 'application/json',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload metadata: ${error.message}`);
    }

    const { data: urlData } = client.storage.from('nft-metadata').getPublicUrl(filePath);

    return {
      path: data.path,
      url: urlData.publicUrl,
    };
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    const client = this.supabaseService.getClient();
    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    const client = this.supabaseService.getClient();
    const { error } = await client.storage.from(bucket).remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}

