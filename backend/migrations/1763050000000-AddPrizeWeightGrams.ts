import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPrizeWeightGrams1763050000000 implements MigrationInterface {
  name = "AddPrizeWeightGrams1763050000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "prizes" ADD "weightGrams" integer`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "prizes" DROP COLUMN "weightGrams"`);
  }
}
