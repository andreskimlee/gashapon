import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AdminGuard } from "../auth/admin.guard";
import { CloudinaryService } from "../common/cloudinary.service";
import {
  CreateGameDto,
  GameAdminService,
  UpdateGameOnChainDto,
} from "./game-admin.service";

@ApiTags("admin/games")
@Controller("admin/games")
@UseGuards(AdminGuard)
export class GameAdminController {
  constructor(
    private readonly gameAdminService: GameAdminService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

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

  @Get("upload-signature")
  @ApiOperation({
    summary: "Get Cloudinary upload signature for direct browser uploads",
  })
  @ApiHeader({
    name: "x-admin-key",
    description: "Admin API key",
    required: true,
  })
  @ApiQuery({
    name: "type",
    enum: ["game", "prize"],
    description: "Type of image being uploaded",
  })
  @ApiResponse({
    status: 200,
    description: "Upload signature generated",
    schema: {
      type: "object",
      properties: {
        signature: { type: "string" },
        timestamp: { type: "number" },
        cloudName: { type: "string" },
        apiKey: { type: "string" },
        folder: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid type or Cloudinary not configured" })
  async getUploadSignature(@Query("type") type: "game" | "prize") {
    if (!this.cloudinaryService.isReady()) {
      throw new BadRequestException(
        "Image uploads are not configured. Contact administrator."
      );
    }

    if (!type || !["game", "prize"].includes(type)) {
      throw new BadRequestException('Query param "type" must be "game" or "prize"');
    }

    const folder = type === "game" ? "gashapon/games" : "gashapon/prizes";
    return this.cloudinaryService.generateUploadSignature(folder);
  }
}
