import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupportTickets1766100000000 implements MigrationInterface {
  name = 'AddSupportTickets1766100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "support_tickets" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "wallet_address" TEXT,
        "subject" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "status" TEXT DEFAULT 'open',
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "resolved_at" TIMESTAMPTZ
      )
    `);

    // Add indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_support_tickets_status" 
      ON "support_tickets" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_support_tickets_email" 
      ON "support_tickets" ("email")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_support_tickets_created_at" 
      ON "support_tickets" ("created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "support_tickets"`);
  }
}
