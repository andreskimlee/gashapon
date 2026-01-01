import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNftOwnerships1762732345000 implements MigrationInterface {
    name = 'AddNftOwnerships1762732345000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          CREATE TABLE "nft_ownerships" (
            "mintAddress" character varying(44) NOT NULL,
            "owner" character varying(44) NOT NULL,
            "amount" integer NOT NULL DEFAULT 0,
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_nft_ownerships_mint_owner" PRIMARY KEY ("mintAddress", "owner"),
            CONSTRAINT "FK_nft_ownerships_mint_nfts" FOREIGN KEY ("mintAddress") REFERENCES "nfts"("mintAddress") ON DELETE CASCADE ON UPDATE NO ACTION
          )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nft_ownerships_owner" ON "nft_ownerships" ("owner")`);
      }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_nft_ownerships_owner"`);
        await queryRunner.query(`DROP TABLE "nft_ownerships"`);
    }

}





