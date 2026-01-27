import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { GameService } from "./game.service";

// Deployed: 2026-01-27

@ApiTags("games")
@Controller("games")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get()
  @ApiOperation({ summary: "List games" })
  @ApiQuery({ name: "active", required: false, type: Boolean })
  @ApiResponse({ status: 200, description: "Games retrieved successfully" })
  async listGames(@Query("active") active?: string) {
    const activeBool =
      typeof active === "string" ? active.toLowerCase() === "true" : undefined;
    return this.gameService.listGames({ active: activeBool });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get game by ID (includes prizes)" })
  @ApiResponse({ status: 200, description: "Game retrieved successfully" })
  async getGame(@Param("id", ParseIntPipe) id: number) {
    return this.gameService.getGameById(id);
  }
}
