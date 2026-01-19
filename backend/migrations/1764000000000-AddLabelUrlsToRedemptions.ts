import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLabelUrlsToRedemptions1764000000000 implements MigrationInterface {
  name = "AddLabelUrlsToRedemptions1764000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add carrier code column
    await queryRunner.query(`
      ALTER TABLE "redemptions" 
      ADD COLUMN IF NOT EXISTS "carrierCode" varchar(50)
    `);

    // Add label PDF URL column
    await queryRunner.query(`
      ALTER TABLE "redemptions" 
      ADD COLUMN IF NOT EXISTS "labelPdfUrl" text
    `);

    // Add label PNG URL column
    await queryRunner.query(`
      ALTER TABLE "redemptions" 
      ADD COLUMN IF NOT EXISTS "labelPngUrl" text
    `);

    // Add tracking URL column
    await queryRunner.query(`
      ALTER TABLE "redemptions" 
      ADD COLUMN IF NOT EXISTS "trackingUrl" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "redemptions" DROP COLUMN IF EXISTS "trackingUrl"`);
    await queryRunner.query(`ALTER TABLE "redemptions" DROP COLUMN IF EXISTS "labelPngUrl"`);
    await queryRunner.query(`ALTER TABLE "redemptions" DROP COLUMN IF EXISTS "labelPdfUrl"`);
    await queryRunner.query(`ALTER TABLE "redemptions" DROP COLUMN IF EXISTS "carrierCode"`);
  }
}
