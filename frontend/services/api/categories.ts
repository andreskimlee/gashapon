/**
 * Categories API Service
 * 
 * Endpoints for game categories
 */

import { apiClient } from './client';
import type { Game } from '@/types/game/game';

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  games: Game[];
}

export interface CategoriesResponse {
  categories: Category[];
}

export const categoriesApi = {
  /**
   * Get all active categories with their games
   */
  getCategories: async (): Promise<CategoriesResponse> => {
    return apiClient.get<CategoriesResponse>('/categories');
  },

  /**
   * Get a category by slug
   */
  getCategoryBySlug: async (slug: string): Promise<Category> => {
    return apiClient.get<Category>(`/categories/${slug}`);
  },
};
