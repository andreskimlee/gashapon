import { GAME_PROGRAM_ID, SOLANA_RPC_URL } from "@/utils/constants";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";

// Lazy-loaded PublicKey to avoid build-time errors when env vars are not set
let _PROGRAM_ID: PublicKey | null = null;
function getProgramId(): PublicKey {
  if (!_PROGRAM_ID) {
    if (!GAME_PROGRAM_ID) {
      throw new Error("GAME_PROGRAM_ID environment variable is not set");
    }
    _PROGRAM_ID = new PublicKey(GAME_PROGRAM_ID);
  }
  return _PROGRAM_ID;
}

// Instruction discriminators from IDL
const INITIALIZE_GAME_DISCRIMINATOR = Buffer.from([
  44, 62, 102, 247, 126, 208, 130, 215,
]);
const ADD_PRIZE_DISCRIMINATOR = Buffer.from([
  72, 182, 203, 140, 3, 163, 192, 98,
]);

// Tier enum values
const TIER_VALUES: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  legendary: 3,
};

export interface GameParams {
  gameId: number;
  name: string;
  description: string;
  imageUrl: string;
  costUsd: number; // in cents
  tokenMint: string;
  treasuryWallet: string;
}

export interface PrizeParams {
  prizeIndex: number;
  prizeId: number;
  name: string;
  description: string;
  imageUrl: string;
  metadataUri: string;
  physicalSku: string;
  tier: "common" | "uncommon" | "rare" | "legendary";
  probabilityBp: number;
  costUsd: number; // in cents
  supplyTotal: number;
}

/**
 * Get the config PDA
 */
export function getConfigPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    getProgramId()
  );
  return pda;
}

/**
 * Get the game PDA for a given game ID
 */
export function getGamePda(gameId: number): PublicKey {
  const gameIdBn = new BN(gameId);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), gameIdBn.toArrayLike(Buffer, "le", 8)],
    getProgramId()
  );
  return pda;
}

/**
 * Get the prize PDA
 */
export function getPrizePda(gamePda: PublicKey, prizeIndex: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("prize"), gamePda.toBuffer(), Buffer.from([prizeIndex])],
    getProgramId()
  );
  return pda;
}

/**
 * Encode a Borsh string (4-byte length prefix + UTF-8 bytes)
 */
function encodeString(str: string): Buffer {
  const bytes = Buffer.from(str, "utf8");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([lenBuf, bytes]);
}

/**
 * Find the next available game ID by checking on-chain accounts
 */
export async function getNextGameId(connection: Connection): Promise<number> {
  // Start from 1 and find the first available ID
  for (let id = 1; id <= 1000; id++) {
    const gamePda = getGamePda(id);
    const account = await connection.getAccountInfo(gamePda);
    if (!account) {
      return id;
    }
  }
  throw new Error("No available game ID found");
}

/**
 * Build the initialize_game instruction
 */
export function buildInitializeGameInstruction(
  authority: PublicKey,
  params: GameParams
): TransactionInstruction {
  const gamePda = getGamePda(params.gameId);
  const configPda = getConfigPda();
  const treasury = new PublicKey(params.treasuryWallet);
  const tokenMint = new PublicKey(params.tokenMint);

  // Build instruction data
  const gameIdBuf = Buffer.alloc(8);
  new BN(params.gameId).toArrayLike(Buffer, "le", 8).copy(gameIdBuf);

  const nameBuf = encodeString(params.name);
  const descBuf = encodeString(params.description);
  const imageBuf = encodeString(params.imageUrl);

  const costBuf = Buffer.alloc(8);
  new BN(params.costUsd).toArrayLike(Buffer, "le", 8).copy(costBuf);

  const data = Buffer.concat([
    INITIALIZE_GAME_DISCRIMINATOR,
    gameIdBuf,
    nameBuf,
    descBuf,
    imageBuf,
    costBuf,
    tokenMint.toBuffer(),
  ]);

  return new TransactionInstruction({
    programId: getProgramId(),
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: gamePda, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build the add_prize instruction
 */
export function buildAddPrizeInstruction(
  authority: PublicKey,
  gameId: number,
  params: PrizeParams
): TransactionInstruction {
  const gamePda = getGamePda(gameId);
  const prizePda = getPrizePda(gamePda, params.prizeIndex);

  // Build instruction data
  const prizeIdBuf = Buffer.alloc(8);
  new BN(params.prizeId).toArrayLike(Buffer, "le", 8).copy(prizeIdBuf);

  const nameBuf = encodeString(params.name);
  const descBuf = encodeString(params.description);
  const imageBuf = encodeString(params.imageUrl);
  const metadataBuf = encodeString(params.metadataUri);
  const skuBuf = encodeString(params.physicalSku);

  const tierBuf = Buffer.from([TIER_VALUES[params.tier] || 0]);

  const probBuf = Buffer.alloc(2);
  probBuf.writeUInt16LE(params.probabilityBp, 0);

  const costBuf = Buffer.alloc(8);
  new BN(params.costUsd).toArrayLike(Buffer, "le", 8).copy(costBuf);

  const supplyBuf = Buffer.alloc(4);
  supplyBuf.writeUInt32LE(params.supplyTotal, 0);

  const data = Buffer.concat([
    ADD_PRIZE_DISCRIMINATOR,
    Buffer.from([params.prizeIndex]),
    prizeIdBuf,
    nameBuf,
    descBuf,
    imageBuf,
    metadataBuf,
    skuBuf,
    tierBuf,
    probBuf,
    costBuf,
    supplyBuf,
  ]);

  return new TransactionInstruction({
    programId: getProgramId(),
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: gamePda, isSigner: false, isWritable: true },
      { pubkey: prizePda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export interface CreateGameInput {
  name: string;
  description: string;
  imageUrl: string;
  costInTokens: number;
  tokenMint: string;
  treasuryWallet: string;
  prizes: Array<{
    name: string;
    description: string;
    imageUrl: string;
    metadataUri: string;
    physicalSku: string;
    tier: "common" | "uncommon" | "rare" | "legendary";
    probabilityBasisPoints: number;
    supplyTotal: number;
  }>;
}

/**
 * Build transactions to deploy a game with prizes
 * Returns array of transactions (may need multiple due to size limits)
 */
export async function buildDeployGameTransactions(
  connection: Connection,
  authority: PublicKey,
  input: CreateGameInput
): Promise<{ transactions: Transaction[]; gameId: number; gamePda: string }> {
  const gameId = await getNextGameId(connection);
  const gamePda = getGamePda(gameId);

  const transactions: Transaction[] = [];

  // Transaction 1: Initialize game
  const initTx = new Transaction();
  initTx.add(
    buildInitializeGameInstruction(authority, {
      gameId,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      costUsd: input.costInTokens, // Using tokens as cents for simplicity
      tokenMint: input.tokenMint,
      treasuryWallet: input.treasuryWallet,
    })
  );
  initTx.feePayer = authority;
  const { blockhash } = await connection.getLatestBlockhash();
  initTx.recentBlockhash = blockhash;
  transactions.push(initTx);

  // Transaction 2+: Add prizes (batch up to 3 per tx to stay under size limit)
  const PRIZES_PER_TX = 3;
  for (let i = 0; i < input.prizes.length; i += PRIZES_PER_TX) {
    const prizeTx = new Transaction();
    const batch = input.prizes.slice(i, i + PRIZES_PER_TX);

    for (let j = 0; j < batch.length; j++) {
      const prize = batch[j];
      const prizeIndex = i + j;

      prizeTx.add(
        buildAddPrizeInstruction(authority, gameId, {
          prizeIndex,
          prizeId: prizeIndex + 1,
          name: prize.name,
          description: prize.description || "",
          imageUrl: prize.imageUrl || "",
          metadataUri: prize.metadataUri || "",
          physicalSku: prize.physicalSku,
          tier: prize.tier,
          probabilityBp: prize.probabilityBasisPoints,
          costUsd: 0,
          supplyTotal: prize.supplyTotal,
        })
      );
    }

    prizeTx.feePayer = authority;
    const { blockhash: prizeBlockhash } =
      await connection.getLatestBlockhash();
    prizeTx.recentBlockhash = prizeBlockhash;
    transactions.push(prizeTx);
  }

  return {
    transactions,
    gameId,
    gamePda: gamePda.toString(),
  };
}
