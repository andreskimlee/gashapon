import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1762647065336 implements MigrationInterface {
    name = 'InitialSchema1762647065336'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "marketplace_listings" ("id" SERIAL NOT NULL, "nftMint" character varying(44) NOT NULL, "onChainListingAddress" character varying(44), "sellerWallet" character varying(44) NOT NULL, "priceInTokens" bigint NOT NULL, "priceInSol" bigint, "isActive" boolean NOT NULL DEFAULT true, "listedAt" TIMESTAMP NOT NULL DEFAULT now(), "cancelledAt" TIMESTAMP, "soldAt" TIMESTAMP, "buyerWallet" character varying(44), "saleTx" character varying(88), "nftId" integer, CONSTRAINT "UQ_08af4078f1ad38ed97c0a108333" UNIQUE ("onChainListingAddress"), CONSTRAINT "PK_060673e8fb9a86172be30c612df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2c9360cd7549608c205cf49ba9" ON "marketplace_listings" ("nftMint") `);
        await queryRunner.query(`CREATE INDEX "IDX_eeee70b197dc0ef127dd548cab" ON "marketplace_listings" ("sellerWallet") `);
        await queryRunner.query(`CREATE INDEX "IDX_4bec66e827bbdbc2c09cc40f32" ON "marketplace_listings" ("isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_24ff911fc8464bca456a0c7bfe" ON "marketplace_listings" ("listedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_7a8088c0ac34b47b6af52b36c5" ON "marketplace_listings" ("nftMint", "isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_4432eef3a5c8126bb2c7103a16" ON "marketplace_listings" ("sellerWallet", "isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_f70e977e5a967ddcd7fedda093" ON "marketplace_listings" ("isActive", "priceInTokens") `);
        await queryRunner.query(`CREATE TABLE "nfts" ("id" SERIAL NOT NULL, "mintAddress" character varying(44) NOT NULL, "prizeId" integer NOT NULL, "gameId" integer NOT NULL, "currentOwner" character varying(44) NOT NULL, "isRedeemed" boolean NOT NULL DEFAULT false, "redemptionTx" character varying(88), "mintedAt" TIMESTAMP NOT NULL DEFAULT now(), "redeemedAt" TIMESTAMP, CONSTRAINT "UQ_8857f9adf9d7cb761630916f478" UNIQUE ("mintAddress"), CONSTRAINT "PK_65562dd9630b48c4d4710d66772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8857f9adf9d7cb761630916f47" ON "nfts" ("mintAddress") `);
        await queryRunner.query(`CREATE INDEX "IDX_b83dc118859c92d3756ef97e43" ON "nfts" ("prizeId") `);
        await queryRunner.query(`CREATE INDEX "IDX_359a0cda8115e79678e96f29b7" ON "nfts" ("gameId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f39f5ee6782da6c585d5ce66ce" ON "nfts" ("currentOwner") `);
        await queryRunner.query(`CREATE INDEX "IDX_14a20fa47a682b302264286f1f" ON "nfts" ("isRedeemed") `);
        await queryRunner.query(`CREATE INDEX "IDX_c62b0c729cadde47a3d276c225" ON "nfts" ("isRedeemed", "mintAddress") `);
        await queryRunner.query(`CREATE INDEX "IDX_638b097a3abebd0ac182f657fc" ON "nfts" ("currentOwner", "isRedeemed") `);
        await queryRunner.query(`CREATE TYPE "public"."plays_status_enum" AS ENUM('pending', 'completed', 'failed')`);
        await queryRunner.query(`CREATE TABLE "plays" ("id" SERIAL NOT NULL, "gameId" integer NOT NULL, "userWallet" character varying(44) NOT NULL, "prizeId" integer, "nftMint" character varying(44), "transactionSignature" character varying(88) NOT NULL, "randomValue" bytea, "tokenAmountPaid" bigint, "status" "public"."plays_status_enum" NOT NULL DEFAULT 'pending', "playedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_93b90227ff9b17dffe5f6723a0e" UNIQUE ("transactionSignature"), CONSTRAINT "PK_d2e16be5395a94fdc41ab0f999d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e35f5d088af2f5908af8553480" ON "plays" ("gameId") `);
        await queryRunner.query(`CREATE INDEX "IDX_19901756454f7cbb79f4918b2f" ON "plays" ("userWallet") `);
        await queryRunner.query(`CREATE INDEX "IDX_1ea33305e55136cbe2a14e1f41" ON "plays" ("nftMint") `);
        await queryRunner.query(`CREATE INDEX "IDX_93b90227ff9b17dffe5f6723a0" ON "plays" ("transactionSignature") `);
        await queryRunner.query(`CREATE INDEX "IDX_aa89912a78d48aec3cf7592836" ON "plays" ("playedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_e862af20359d416adc5a9743d9" ON "plays" ("gameId", "playedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_0a455e14def5c5f26f1575f5e1" ON "plays" ("userWallet", "playedAt") `);
        await queryRunner.query(`CREATE TABLE "games" ("id" SERIAL NOT NULL, "onChainAddress" character varying(44) NOT NULL, "gameId" bigint NOT NULL, "name" character varying(255) NOT NULL, "description" text, "imageUrl" text, "costInTokens" bigint NOT NULL, "costInUsd" numeric(10,2), "isActive" boolean NOT NULL DEFAULT true, "totalPlays" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4583aebc53c4976f8dfd106c7d7" UNIQUE ("onChainAddress"), CONSTRAINT "UQ_8595e49a5ac9e19f2ce4c39f3b3" UNIQUE ("gameId"), CONSTRAINT "PK_c9b16b62917b5595af982d66337" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_43ce454a72bdc3c95863b0b1aa" ON "games" ("isActive", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "prizes" ("id" SERIAL NOT NULL, "gameId" integer NOT NULL, "prizeId" bigint NOT NULL, "name" character varying(255) NOT NULL, "description" text, "imageUrl" text, "physicalSku" character varying(100) NOT NULL, "tier" character varying(20) NOT NULL, "probabilityBasisPoints" integer NOT NULL, "supplyTotal" integer NOT NULL, "supplyRemaining" integer NOT NULL, "metadataUri" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_47e4c94a955b9bf019cae56ba6a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9af528ec9a619936cb14c7af86" ON "prizes" ("physicalSku") `);
        await queryRunner.query(`CREATE INDEX "IDX_431d07a1944194329c01eace78" ON "prizes" ("supplyRemaining") `);
        await queryRunner.query(`CREATE INDEX "IDX_d61c2e2e9859d3d13e7f860674" ON "prizes" ("gameId", "tier") `);
        await queryRunner.query(`CREATE TYPE "public"."redemptions_status_enum" AS ENUM('processing', 'shipped', 'delivered', 'failed')`);
        await queryRunner.query(`CREATE TABLE "redemptions" ("id" SERIAL NOT NULL, "nftMint" character varying(44) NOT NULL, "userWallet" character varying(44) NOT NULL, "prizeId" integer NOT NULL, "shipmentProvider" character varying(50) NOT NULL, "shipmentId" character varying(100) NOT NULL, "trackingNumber" character varying(100), "carrier" character varying(50), "status" "public"."redemptions_status_enum" NOT NULL DEFAULT 'processing', "estimatedDelivery" date, "redeemedAt" TIMESTAMP NOT NULL DEFAULT now(), "shippedAt" TIMESTAMP, "deliveredAt" TIMESTAMP, "failureReason" text, "retryCount" integer NOT NULL DEFAULT '0', "dataDeletionScheduledAt" TIMESTAMP, CONSTRAINT "UQ_19b8e04e0baf3e43304bddb1d67" UNIQUE ("nftMint"), CONSTRAINT "PK_def143ab94376fea5985bb04219" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_19b8e04e0baf3e43304bddb1d6" ON "redemptions" ("nftMint") `);
        await queryRunner.query(`CREATE INDEX "IDX_85d55b1a5527981855b5f2037a" ON "redemptions" ("userWallet") `);
        await queryRunner.query(`CREATE INDEX "IDX_05bebf373fcf3ba250d5a9793d" ON "redemptions" ("shipmentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8175d3bf82703c703fae13cfdc" ON "redemptions" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_f78eaa4b5dbde4f41e869e6fdd" ON "redemptions" ("redeemedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_8ded46da8db31f3cce7caeb5b1" ON "redemptions" ("dataDeletionScheduledAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_e6d11493b2eb8a61ba7b7adc65" ON "redemptions" ("status", "redeemedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_6014dc0b11f02342f221f884f4" ON "redemptions" ("userWallet", "redeemedAt") `);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" ADD CONSTRAINT "FK_ec06b03ec873b217d9e119574bf" FOREIGN KEY ("nftId") REFERENCES "nfts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "nfts" ADD CONSTRAINT "FK_b83dc118859c92d3756ef97e433" FOREIGN KEY ("prizeId") REFERENCES "prizes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "nfts" ADD CONSTRAINT "FK_359a0cda8115e79678e96f29b7e" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "plays" ADD CONSTRAINT "FK_e35f5d088af2f5908af8553480a" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "plays" ADD CONSTRAINT "FK_35413448a4312a4e33a85b679c2" FOREIGN KEY ("prizeId") REFERENCES "prizes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "prizes" ADD CONSTRAINT "FK_7bfd5d69fd450aa04abb86caf58" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_09dd660e50d96f84bfc1ad83713" FOREIGN KEY ("prizeId") REFERENCES "prizes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_09dd660e50d96f84bfc1ad83713"`);
        await queryRunner.query(`ALTER TABLE "prizes" DROP CONSTRAINT "FK_7bfd5d69fd450aa04abb86caf58"`);
        await queryRunner.query(`ALTER TABLE "plays" DROP CONSTRAINT "FK_35413448a4312a4e33a85b679c2"`);
        await queryRunner.query(`ALTER TABLE "plays" DROP CONSTRAINT "FK_e35f5d088af2f5908af8553480a"`);
        await queryRunner.query(`ALTER TABLE "nfts" DROP CONSTRAINT "FK_359a0cda8115e79678e96f29b7e"`);
        await queryRunner.query(`ALTER TABLE "nfts" DROP CONSTRAINT "FK_b83dc118859c92d3756ef97e433"`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" DROP CONSTRAINT "FK_ec06b03ec873b217d9e119574bf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6014dc0b11f02342f221f884f4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e6d11493b2eb8a61ba7b7adc65"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8ded46da8db31f3cce7caeb5b1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f78eaa4b5dbde4f41e869e6fdd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8175d3bf82703c703fae13cfdc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_05bebf373fcf3ba250d5a9793d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_85d55b1a5527981855b5f2037a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_19b8e04e0baf3e43304bddb1d6"`);
        await queryRunner.query(`DROP TABLE "redemptions"`);
        await queryRunner.query(`DROP TYPE "public"."redemptions_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d61c2e2e9859d3d13e7f860674"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_431d07a1944194329c01eace78"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9af528ec9a619936cb14c7af86"`);
        await queryRunner.query(`DROP TABLE "prizes"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_43ce454a72bdc3c95863b0b1aa"`);
        await queryRunner.query(`DROP TABLE "games"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0a455e14def5c5f26f1575f5e1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e862af20359d416adc5a9743d9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aa89912a78d48aec3cf7592836"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_93b90227ff9b17dffe5f6723a0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1ea33305e55136cbe2a14e1f41"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_19901756454f7cbb79f4918b2f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e35f5d088af2f5908af8553480"`);
        await queryRunner.query(`DROP TABLE "plays"`);
        await queryRunner.query(`DROP TYPE "public"."plays_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_638b097a3abebd0ac182f657fc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c62b0c729cadde47a3d276c225"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_14a20fa47a682b302264286f1f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f39f5ee6782da6c585d5ce66ce"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_359a0cda8115e79678e96f29b7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b83dc118859c92d3756ef97e43"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8857f9adf9d7cb761630916f47"`);
        await queryRunner.query(`DROP TABLE "nfts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f70e977e5a967ddcd7fedda093"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4432eef3a5c8126bb2c7103a16"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7a8088c0ac34b47b6af52b36c5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_24ff911fc8464bca456a0c7bfe"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4bec66e827bbdbc2c09cc40f32"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eeee70b197dc0ef127dd548cab"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2c9360cd7549608c205cf49ba9"`);
        await queryRunner.query(`DROP TABLE "marketplace_listings"`);
    }

}
