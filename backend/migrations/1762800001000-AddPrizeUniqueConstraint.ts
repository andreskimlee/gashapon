import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPrizeUniqueConstraint1762800001000 implements MigrationInterface {
  name = "AddPrizeUniqueConstraint1762800001000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add unique constraint on (gameId, prizeId) for upsert operations
    await queryRunner.query(`
      ALTER TABLE "prizes" 
      ADD CONSTRAINT "UQ_prizes_gameId_prizeId" UNIQUE ("gameId", "prizeId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "prizes" DROP CONSTRAINT IF EXISTS "UQ_prizes_gameId_prizeId"
    `);
  }
}

