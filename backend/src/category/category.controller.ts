import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  /**
   * PUBLIC ENDPOINTS
   */

  @Get()
  @ApiOperation({ summary: 'Get all active categories with their games' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getCategories() {
    return this.categoryService.getCategoriesWithGames();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get category by slug' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.categoryService.getCategoryBySlug(slug);
  }

  /**
   * ADMIN ENDPOINTS
   */

  @Get('admin/all')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all categories (including inactive) - Admin only' })
  @ApiResponse({ status: 200, description: 'All categories retrieved' })
  async getAllCategories() {
    return this.categoryService.getAllCategories();
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category - Admin only' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async createCategory(
    @Body()
    body: {
      name: string;
      slug: string;
      description?: string;
      icon?: string;
      gameIds?: number[];
      displayOrder?: number;
    },
  ) {
    return this.categoryService.createCategory(body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category - Admin only' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: Partial<{
      name: string;
      slug: string;
      description: string;
      icon: string;
      gameIds: number[];
      displayOrder: number;
      isActive: boolean;
    }>,
  ) {
    return this.categoryService.updateCategory(id, body);
  }

  @Patch(':id/games')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set games for a category - Admin only' })
  @ApiResponse({ status: 200, description: 'Category games updated successfully' })
  async setGames(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { gameIds: number[] },
  ) {
    return this.categoryService.setGamesForCategory(id, body.gameIds);
  }

  @Post(':id/games/add')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add games to a category - Admin only' })
  @ApiResponse({ status: 200, description: 'Games added to category' })
  async addGames(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { gameIds: number[] },
  ) {
    return this.categoryService.addGamesToCategory(id, body.gameIds);
  }

  @Post(':id/games/remove')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove games from a category - Admin only' })
  @ApiResponse({ status: 200, description: 'Games removed from category' })
  async removeGames(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { gameIds: number[] },
  ) {
    return this.categoryService.removeGamesFromCategory(id, body.gameIds);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category - Admin only' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    await this.categoryService.deleteCategory(id);
    return { success: true };
  }
}
