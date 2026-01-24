import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrizeDimensions1765100000000 implements MigrationInterface {
  name = 'AddPrizeDimensions1765100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add dimension columns for UPS shipping calculations
    await queryRunner.query(`
      ALTER TABLE "prizes"
      ADD COLUMN IF NOT EXISTS "lengthInches" DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS "widthInches" DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS "heightInches" DECIMAL(5,2)
    `);

    // Add comment explaining the columns
    await queryRunner.query(`
      COMMENT ON COLUMN "prizes"."lengthInches" IS 'Package length in inches for UPS shipping';
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "prizes"."widthInches" IS 'Package width in inches for UPS shipping';
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "prizes"."heightInches" IS 'Package height in inches for UPS shipping';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "prizes"
      DROP COLUMN IF EXISTS "lengthInches",
      DROP COLUMN IF EXISTS "widthInches",
      DROP COLUMN IF EXISTS "heightInches"
    `);
  }
}
