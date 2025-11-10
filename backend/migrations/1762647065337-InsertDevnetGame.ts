import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertDevnetGame1762647065337 implements MigrationInterface {
    name = 'InsertDevnetGame1762647065337'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert devnet game (game_id=2)
        // Game PDA: DVEewM3LmvYmiVgYquUqBqAQVYrmf2eZFwAn9bn2dCsu
        // Program ID: 4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG
        // Token Mint: Cp95mjbZZnDvqCNYExmGYEzrgu6wAScf32Fmwt2Kpump
        // Cost: 500 USD cents ($5.00)
        
        await queryRunner.query(`
            INSERT INTO "games" (
                "onChainAddress",
                "gameId",
                "name",
                "description",
                "imageUrl",
                "costInTokens",
                "costInUsd",
                "isActive",
                "totalPlays",
                "createdAt",
                "updatedAt"
            ) VALUES (
                'DVEewM3LmvYmiVgYquUqBqAQVYrmf2eZFwAn9bn2dCsu',
                2,
                'Devnet Test Game',
                'Test game for devnet environment',
                NULL,
                1000000,
                5.00,
                true,
                0,
                NOW(),
                NOW()
            )
            ON CONFLICT ("gameId") DO NOTHING
        `);

        // Get the game database ID (not the on-chain gameId)
        const gameResult = await queryRunner.query(`
            SELECT id FROM "games" WHERE "gameId" = 2
        `);
        
        if (gameResult.length === 0) {
            throw new Error('Failed to insert game');
        }
        
        const gameDbId = gameResult[0].id;

        // Check if prizes already exist
        const existingPrizes = await queryRunner.query(`
            SELECT "prizeId" FROM "prizes" 
            WHERE "gameId" = $1 AND "prizeId" IN (1, 2)
        `, [gameDbId]);
        
        const existingPrizeIds = existingPrizes.map((p: any) => p.prizeId);

        // Insert prizes for the game (only if they don't exist)
        if (!existingPrizeIds.includes(1)) {
            await queryRunner.query(`
                INSERT INTO "prizes" (
                    "gameId",
                    "prizeId",
                    "name",
                    "description",
                    "imageUrl",
                    "physicalSku",
                    "tier",
                    "probabilityBasisPoints",
                    "supplyTotal",
                    "supplyRemaining",
                    "metadataUri",
                    "createdAt"
                ) VALUES (
                    $1,
                    1,
                    'Common Prize',
                    'Common tier prize',
                    NULL,
                    'SKU-COMMON',
                    'common',
                    9000,
                    100,
                    100,
                    'ipfs://common',
                    NOW()
                )
            `, [gameDbId]);
        }

        if (!existingPrizeIds.includes(2)) {
            await queryRunner.query(`
                INSERT INTO "prizes" (
                    "gameId",
                    "prizeId",
                    "name",
                    "description",
                    "imageUrl",
                    "physicalSku",
                    "tier",
                    "probabilityBasisPoints",
                    "supplyTotal",
                    "supplyRemaining",
                    "metadataUri",
                    "createdAt"
                ) VALUES (
                    $1,
                    2,
                    'Rare Prize',
                    'Rare tier prize',
                    NULL,
                    'SKU-RARE',
                    'rare',
                    1000,
                    10,
                    10,
                    'ipfs://rare',
                    NOW()
                )
            `, [gameDbId]);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove prizes first (foreign key constraint)
        await queryRunner.query(`
            DELETE FROM "prizes" 
            WHERE "gameId" IN (
                SELECT id FROM "games" WHERE "gameId" = 2
            )
        `);

        // Remove the game
        await queryRunner.query(`
            DELETE FROM "games" WHERE "gameId" = 2
        `);
    }
}

