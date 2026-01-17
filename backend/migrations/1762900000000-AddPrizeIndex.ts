import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrizeIndex1762900000000 implements MigrationInterface {
  name = 'AddPrizeIndex1762900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add prizeIndex column with default value of 0
    await queryRunner.query(`
      ALTER TABLE "prizes" 
      ADD COLUMN IF NOT EXISTS "prizeIndex" smallint NOT NULL DEFAULT 0
    `);

    // Create index on prizeIndex for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_prizes_prizeIndex" ON "prizes" ("prizeIndex")
    `);

    // Update existing prizes to set prizeIndex based on their order within each game
    // This sets prizeIndex = row_number - 1 (0-based index) for each game
    await queryRunner.query(`
      WITH indexed_prizes AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY "gameId" ORDER BY "prizeId") - 1 as new_index
        FROM prizes
      )
      UPDATE prizes 
      SET "prizeIndex" = indexed_prizes.new_index
      FROM indexed_prizes
      WHERE prizes.id = indexed_prizes.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_prizes_prizeIndex"`);
    await queryRunner.query(`ALTER TABLE "prizes" DROP COLUMN IF EXISTS "prizeIndex"`);
  }
}
