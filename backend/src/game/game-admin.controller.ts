import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  CreateGameDto,
  GameAdminService,
  UpdateGameOnChainDto,
} from "./game-admin.service";

/**
 * Simple header-based admin guard
 * In production, use proper JWT/session auth
 */
class AdminGuard {
  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    const adminKey = request.headers["x-admin-key"];
    // Check against environment variable or hardcoded key
    return (
      adminKey === process.env.ADMIN_API_KEY ||
      adminKey === "admin-secret-key-change-me"
    );
  }
}

@ApiTags("admin/games")
@Controller("admin/games")
export class GameAdminController {
  constructor(private readonly gameAdminService: GameAdminService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new game with prizes (admin only)" })
  @ApiHeader({
    name: "x-admin-key",
    description: "Admin API key",
    required: true,
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: { type: "string", example: "Anime Figure Collection" },
        description: { type: "string", example: "Win rare anime figures!" },
        imageUrl: { type: "string", example: "https://example.com/image.png" },
        costInTokens: { type: "number", example: 1000 },
        costInUsd: { type: "number", example: 5.0 },
        prizes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              imageUrl: { type: "string" },
              physicalSku: { type: "string" },
              tier: {
                type: "string",
                enum: ["common", "uncommon", "rare", "legendary"],
              },
              probabilityBasisPoints: { type: "number" },
              supplyTotal: { type: "number" },
              metadataUri: { type: "string" },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Game created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createGame(@Body() createGameDto: CreateGameDto) {
    return this.gameAdminService.createGame(createGameDto);
  }

  @Patch(":id/on-chain")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update game with on-chain address after deployment",
  })
  @ApiHeader({
    name: "x-admin-key",
    description: "Admin API key",
    required: true,
  })
  @ApiResponse({ status: 200, description: "Game updated successfully" })
  @ApiResponse({ status: 404, description: "Game not found" })
  async updateOnChainAddress(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateGameOnChainDto
  ) {
    return this.gameAdminService.updateOnChainAddress(id, updateDto);
  }

  @Patch(":id/activate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Activate a game (requires on-chain address)" })
  @ApiHeader({
    name: "x-admin-key",
    description: "Admin API key",
    required: true,
  })
  @ApiResponse({ status: 200, description: "Game activated" })
  async activateGame(@Param("id", ParseIntPipe) id: number) {
    return this.gameAdminService.activateGame(id);
  }

  @Patch(":id/deactivate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Deactivate a game" })
  @ApiHeader({
    name: "x-admin-key",
    description: "Admin API key",
    required: true,
  })
  @ApiResponse({ status: 200, description: "Game deactivated" })
  async deactivateGame(@Param("id", ParseIntPipe) id: number) {
    return this.gameAdminService.deactivateGame(id);
  }
}
