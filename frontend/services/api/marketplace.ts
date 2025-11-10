/**
 * Marketplace API Service
 * 
 * API endpoints for marketplace operations
 */

import { apiClient } from './client';
import type {
  MarketplaceListing,
  CreateListingRequest,
  PurchaseRequest,
  MarketplaceSale,
} from '@/types/api/marketplace';

export const marketplaceApi = {
  /**
   * Get all active listings
   */
  getListings: async (params?: {
    tier?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<MarketplaceListing[]> => {
    const queryParams = new URLSearchParams();
    if (params?.tier) queryParams.append('tier', params.tier);
    if (params?.minPrice) queryParams.append('minPrice', params.minPrice.toString());
    if (params?.maxPrice) queryParams.append('maxPrice', params.maxPrice.toString());

    const query = queryParams.toString();
    return apiClient.get<MarketplaceListing[]>(
      `/marketplace/listings${query ? `?${query}` : ''}`
    );
  },

  /**
   * Create a new listing
   */
  createListing: async (data: CreateListingRequest) => {
    return apiClient.post('/marketplace/list', data);
  },

  /**
   * Purchase a listing
   */
  purchaseListing: async (data: PurchaseRequest) => {
    return apiClient.post('/marketplace/buy', data);
  },

  /**
   * Cancel a listing
   */
  cancelListing: async (listingId: string, sellerWallet: string, signature: string) => {
    return apiClient.delete(`/marketplace/listings/${listingId}`, {
      headers: {
        'X-Wallet': sellerWallet,
        'X-Signature': signature,
      },
    });
  },

  /**
   * Get sales history
   */
  getSalesHistory: async (): Promise<MarketplaceSale[]> => {
    return apiClient.get<MarketplaceSale[]>('/marketplace/sales-history');
  },
};

