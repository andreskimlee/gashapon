import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlayRecording1768000000000 implements MigrationInterface {
  name = 'AddPlayRecording1768000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "plays" ADD COLUMN IF NOT EXISTS "recording" TEXT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "plays" DROP COLUMN IF EXISTS "recording"
    `);
  }
}
