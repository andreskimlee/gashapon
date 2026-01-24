import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartnershipApplications1766000000000 implements MigrationInterface {
  name = 'AddPartnershipApplications1766000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "partnership_applications" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "project_name" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "token_address" TEXT NOT NULL,
        "market_cap" TEXT NOT NULL,
        "prize_ideas" TEXT NOT NULL,
        "contact" TEXT NOT NULL,
        "additional_notes" TEXT,
        "status" TEXT DEFAULT 'pending',
        "created_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add index on status for filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_partnership_applications_status" 
      ON "partnership_applications" ("status")
    `);

    // Add index on created_at for sorting
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_partnership_applications_created_at" 
      ON "partnership_applications" ("created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "partnership_applications"`);
  }
}
