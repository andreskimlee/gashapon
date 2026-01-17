import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCurrencyTokenMint1762950000000 implements MigrationInterface {
    name = 'AddCurrencyTokenMint1762950000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add currencyTokenMintAddress column to games table
        await queryRunner.query(`
            ALTER TABLE "games" 
            ADD COLUMN "currencyTokenMintAddress" character varying(44)
        `);
        
        // Create index for efficient lookups
        await queryRunner.query(`
            CREATE INDEX "IDX_games_currencyTokenMintAddress" 
            ON "games" ("currencyTokenMintAddress")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_games_currencyTokenMintAddress"`);
        await queryRunner.query(`ALTER TABLE "games" DROP COLUMN "currencyTokenMintAddress"`);
    }
}
