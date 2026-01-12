import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPrizeCostColumn1762800000000 implements MigrationInterface {
  name = "AddPrizeCostColumn1762800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add costInUsd column to prizes table
    await queryRunner.query(`
      ALTER TABLE "prizes" 
      ADD COLUMN IF NOT EXISTS "costInUsd" decimal(10,2) DEFAULT NULL
    `);

    // Add updatedAt column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE "prizes" 
      ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "prizes" DROP COLUMN IF EXISTS "costInUsd"
    `);
    await queryRunner.query(`
      ALTER TABLE "prizes" DROP COLUMN IF EXISTS "updatedAt"
    `);
  }
}
