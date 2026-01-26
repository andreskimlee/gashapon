import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGameCategories1767000000000 implements MigrationInterface {
    name = 'AddGameCategories1767000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create game_categories table
        // Stores categories with their display order and game IDs (as JSON array)
        await queryRunner.query(`
            CREATE TABLE "game_categories" (
                "id" SERIAL NOT NULL,
                "name" character varying(100) NOT NULL,
                "slug" character varying(100) NOT NULL,
                "description" text,
                "icon" character varying(50),
                "gameIds" jsonb NOT NULL DEFAULT '[]',
                "displayOrder" integer NOT NULL DEFAULT 0,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_game_categories_name" UNIQUE ("name"),
                CONSTRAINT "UQ_game_categories_slug" UNIQUE ("slug"),
                CONSTRAINT "PK_game_categories" PRIMARY KEY ("id")
            )
        `);

        // Add indexes
        await queryRunner.query(`CREATE INDEX "IDX_game_categories_isActive" ON "game_categories" ("isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_game_categories_displayOrder" ON "game_categories" ("displayOrder")`);
        await queryRunner.query(`CREATE INDEX "IDX_game_categories_isActive_displayOrder" ON "game_categories" ("isActive", "displayOrder")`);

        // Insert default categories
        await queryRunner.query(`
            INSERT INTO "game_categories" ("name", "slug", "icon", "gameIds", "displayOrder", "isActive")
            VALUES 
                ('Featured', 'featured', 'Sparkles', '[]', 0, true),
                ('Trending', 'trending', 'TrendingUp', '[]', 1, true),
                ('New Arrivals', 'new-arrivals', 'Clock', '[]', 2, true),
                ('Top Rated', 'top-rated', 'Star', '[]', 3, true),
                ('Hot Right Now', 'hot-right-now', 'Flame', '[]', 4, true),
                ('Limited Edition', 'limited-edition', 'Gift', '[]', 5, true)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_game_categories_isActive_displayOrder"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_game_categories_displayOrder"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_game_categories_isActive"`);
        await queryRunner.query(`DROP TABLE "game_categories"`);
    }
}
