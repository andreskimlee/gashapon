import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from './category.entity';
import { GameService } from '../game/game.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    private readonly gameService: GameService,
  ) {}

  /**
   * Get all active categories ordered by displayOrder
   */
  async getActiveCategories(): Promise<CategoryEntity[]> {
    return this.categoryRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Get all categories (including inactive) - for admin
   */
  async getAllCategories(): Promise<CategoryEntity[]> {
    return this.categoryRepository.find({
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: number): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findOne({ where: { slug } });
    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }
    return category;
  }

  /**
   * Get categories with their games populated
   * Returns a map of category name to game objects
   */
  async getCategoriesWithGames(): Promise<{
    categories: Array<{
      id: number;
      name: string;
      slug: string;
      icon: string | null;
      games: any[];
    }>;
  }> {
    const categories = await this.getActiveCategories();
    const games = await this.gameService.listGames({ active: true });

    // Create a game lookup map
    const gameMap = new Map(games.map(g => [g.id, g]));

    // Build categories with games
    const categoriesWithGames = categories.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      games: category.gameIds
        .map(id => gameMap.get(id))
        .filter(g => g !== undefined),
    }));

    return { categories: categoriesWithGames };
  }

  /**
   * Create a new category
   */
  async createCategory(data: {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    gameIds?: number[];
    displayOrder?: number;
  }): Promise<CategoryEntity> {
    const category = this.categoryRepository.create({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      icon: data.icon || null,
      gameIds: data.gameIds || [],
      displayOrder: data.displayOrder ?? 0,
      isActive: true,
    });
    return this.categoryRepository.save(category);
  }

  /**
   * Update a category
   */
  async updateCategory(
    id: number,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      icon: string;
      gameIds: number[];
      displayOrder: number;
      isActive: boolean;
    }>,
  ): Promise<CategoryEntity> {
    const category = await this.getCategoryById(id);
    Object.assign(category, data);
    return this.categoryRepository.save(category);
  }

  /**
   * Add games to a category
   */
  async addGamesToCategory(id: number, gameIds: number[]): Promise<CategoryEntity> {
    const category = await this.getCategoryById(id);
    const uniqueIds = [...new Set([...category.gameIds, ...gameIds])];
    category.gameIds = uniqueIds;
    return this.categoryRepository.save(category);
  }

  /**
   * Remove games from a category
   */
  async removeGamesFromCategory(id: number, gameIds: number[]): Promise<CategoryEntity> {
    const category = await this.getCategoryById(id);
    category.gameIds = category.gameIds.filter(gid => !gameIds.includes(gid));
    return this.categoryRepository.save(category);
  }

  /**
   * Set games for a category (replace all)
   */
  async setGamesForCategory(id: number, gameIds: number[]): Promise<CategoryEntity> {
    const category = await this.getCategoryById(id);
    category.gameIds = gameIds;
    return this.categoryRepository.save(category);
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: number): Promise<void> {
    const result = await this.categoryRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
  }
}
