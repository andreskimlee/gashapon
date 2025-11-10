import {
  GAME_PROGRAM_ID,
  SOLANA_RPC_URL,
  TOKEN_MINT,
  TREASURY_WALLET,
} from "@/utils/constants";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

// Anchor discriminator for play_game from IDL
const PLAY_GAME_DISCRIMINATOR = Uint8Array.from([
  37, 88, 207, 85, 42, 144, 122, 197,
]);
const FINALIZE_PLAY_DISCRIMINATOR = Uint8Array.from([
  217, 0, 74, 63, 118, 193, 160, 9,
]);
const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

function toLEU64(value: bigint | number): Uint8Array {
  let x = BigInt(value as any);
  const out = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    // emulate BigInt ops without literal suffix to satisfy TS target
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    out[i] = Number(x & BigInt(0xff));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    x = x >> BigInt(8);
  }
  return out;
}

// Minimal ATA derivation without importing full helpers
export function findAssociatedTokenAddress(
  owner: PublicKey,
  mint: PublicKey
): PublicKey {
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  );
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

export async function playOnChain(opts: {
  walletPublicKey: PublicKey;
  gamePda: string;
  tokenAmount: number | bigint;
}): Promise<Transaction> {
  if (!GAME_PROGRAM_ID) throw new Error("GAME_PROGRAM_ID not configured");
  if (!TOKEN_MINT) throw new Error("TOKEN_MINT not configured");
  if (!TREASURY_WALLET) throw new Error("TREASURY_WALLET not configured");

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const programId = new PublicKey(GAME_PROGRAM_ID);
  const gamePubkey = new PublicKey(opts.gamePda);
  const user = opts.walletPublicKey;
  const mint = new PublicKey(TOKEN_MINT);
  const treasury = new PublicKey(TREASURY_WALLET);

  const userTokenAccount = findAssociatedTokenAddress(user, mint);
  const treasuryTokenAccount = findAssociatedTokenAddress(treasury, mint);

  // Instruction data = discriminator + u64 token_amount
  const amountLE = toLEU64(opts.tokenAmount);
  const data = new Uint8Array(PLAY_GAME_DISCRIMINATOR.length + amountLE.length);
  data.set(PLAY_GAME_DISCRIMINATOR, 0);
  data.set(amountLE, PLAY_GAME_DISCRIMINATOR.length);

  const keys = [
    { pubkey: gamePubkey, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
    { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  const ix = new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(data),
  });

  const tx = new Transaction();
  // Ensure user ATA exists
  const userAtaInfo = await connection.getAccountInfo(userTokenAccount);
  if (!userAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        user,
        userTokenAccount,
        user,
        mint
      )
    );
  }
  // Ensure treasury ATA exists (optional; payer will fund creation in devnet)
  const treasuryAtaInfo = await connection.getAccountInfo(treasuryTokenAccount);
  if (!treasuryAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        user,
        treasuryTokenAccount,
        treasury,
        mint
      )
    );
  }
  // Play instruction
  tx.add(ix);
  tx.feePayer = user;
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  // Return the unsigned transaction; caller (page) will sign & send via wallet adapter
  return tx;
}

export async function finalizeOnChain(opts: {
  walletPublicKey: PublicKey;
  gamePda: string;
}): Promise<{ tx: Transaction; mint: Keypair }> {
  if (!GAME_PROGRAM_ID) throw new Error("GAME_PROGRAM_ID not configured");
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const programId = new PublicKey(GAME_PROGRAM_ID);
  const gamePubkey = new PublicKey(opts.gamePda);
  const user = opts.walletPublicKey;

  // 1) Create new mint with authority = game PDA, decimals = 0
  const mint = Keypair.generate();
  const rentLamports = await getMinimumBalanceForRentExemptMint(connection);
  const createMintIx = SystemProgram.createAccount({
    fromPubkey: user,
    newAccountPubkey: mint.publicKey,
    space: MINT_SIZE,
    lamports: rentLamports,
    programId: TOKEN_PROGRAM_ID,
  });
  const initMintIx = createInitializeMint2Instruction(
    mint.publicKey,
    0, // decimals
    gamePubkey, // mint authority = game PDA
    gamePubkey // freeze authority = game PDA (ok)
  );

  // 2) Derive Metadata and Master Edition PDAs
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.publicKey.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );
  const [masterEditionPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.publicKey.toBuffer(),
      Buffer.from("edition"),
    ],
    METADATA_PROGRAM_ID
  );

  // 3) Ensure user's NFT ATA exists
  const userNftAta = findAssociatedTokenAddress(user, mint.publicKey);
  const ataInfo = await connection.getAccountInfo(userNftAta);
  const ensureUserAtaIx = !ataInfo
    ? createAssociatedTokenAccountInstruction(
        user,
        userNftAta,
        user,
        mint.publicKey
      )
    : null;

  // 4) Build finalize_play instruction with random value
  const random = crypto.getRandomValues(new Uint8Array(32));
  const data = new Uint8Array(FINALIZE_PLAY_DISCRIMINATOR.length + 32);
  data.set(FINALIZE_PLAY_DISCRIMINATOR, 0);
  data.set(random, FINALIZE_PLAY_DISCRIMINATOR.length);

  const keys = [
    { pubkey: gamePubkey, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: true, isWritable: false },
    { pubkey: mint.publicKey, isSigner: false, isWritable: true },
    { pubkey: metadataPda, isSigner: false, isWritable: true },
    { pubkey: masterEditionPda, isSigner: false, isWritable: true },
    { pubkey: userNftAta, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
      isSigner: false,
      isWritable: false,
    },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"),
      isSigner: false,
      isWritable: false,
    },
  ];

  const finalizeIx = new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(data),
  });

  const tx = new Transaction();
  tx.add(createMintIx, initMintIx);
  if (ensureUserAtaIx) tx.add(ensureUserAtaIx);
  tx.add(finalizeIx);

  // IMPORTANT: set fee payer and recent blockhash BEFORE partial signing with mint
  tx.feePayer = user;
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.partialSign(mint);
  return { tx, mint };
}

/**
 * Build a single transaction that:
 * 1) Ensures user and treasury ATAs for TOKEN_MINT
 * 2) Calls play_game (token transfer)
 * 3) Creates and initializes an NFT mint with authority = game PDA
 * 4) Ensures user's NFT ATA
 * 5) Calls finalize_play with random value and Metaplex accounts
 *
 * User signs ONCE.
 */
export async function playAndFinalizeOnChain(opts: {
  walletPublicKey: PublicKey;
  gamePda: string;
  tokenAmount: number | bigint;
}): Promise<{ tx: Transaction; mint: Keypair }> {
  if (!GAME_PROGRAM_ID) throw new Error("GAME_PROGRAM_ID not configured");
  if (!TOKEN_MINT) throw new Error("TOKEN_MINT not configured");
  if (!TREASURY_WALLET) throw new Error("TREASURY_WALLET not configured");

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const programId = new PublicKey(GAME_PROGRAM_ID);
  const gamePubkey = new PublicKey(opts.gamePda);
  const user = opts.walletPublicKey;
  const mintAddress = new PublicKey(TOKEN_MINT);
  const treasury = new PublicKey(TREASURY_WALLET);
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  );

  const userTokenAccount = findAssociatedTokenAddress(user, mintAddress);
  const treasuryTokenAccount = findAssociatedTokenAddress(
    treasury,
    mintAddress
  );

  // Build play_game instruction data
  const amountLE = toLEU64(opts.tokenAmount);
  const playData = new Uint8Array(
    PLAY_GAME_DISCRIMINATOR.length + amountLE.length
  );
  playData.set(PLAY_GAME_DISCRIMINATOR, 0);
  playData.set(amountLE, PLAY_GAME_DISCRIMINATOR.length);

  const playKeys = [
    { pubkey: gamePubkey, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
    { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  const playIx = new TransactionInstruction({
    programId,
    keys: playKeys,
    data: Buffer.from(playData),
  });

  // Prepare NFT mint and finalize accounts
  const prizeMint = Keypair.generate();
  const rentLamports = await getMinimumBalanceForRentExemptMint(connection);
  const createPrizeMintIx = SystemProgram.createAccount({
    fromPubkey: user,
    newAccountPubkey: prizeMint.publicKey,
    space: MINT_SIZE,
    lamports: rentLamports,
    programId: TOKEN_PROGRAM_ID,
  });
  const initPrizeMintIx = createInitializeMint2Instruction(
    prizeMint.publicKey,
    0,
    gamePubkey,
    gamePubkey
  );
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      prizeMint.publicKey.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );
  const [masterEditionPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      prizeMint.publicKey.toBuffer(),
      Buffer.from("edition"),
    ],
    METADATA_PROGRAM_ID
  );
  const userPrizeAta = findAssociatedTokenAddress(user, prizeMint.publicKey);
  const userPrizeAtaInfo = await connection.getAccountInfo(userPrizeAta);
  const ensureUserPrizeAtaIx = !userPrizeAtaInfo
    ? createAssociatedTokenAccountInstruction(
        user,
        userPrizeAta,
        user,
        prizeMint.publicKey
      )
    : null;

  // finalize data
  const random = crypto.getRandomValues(new Uint8Array(32));
  const finData = new Uint8Array(
    FINALIZE_PLAY_DISCRIMINATOR.length + random.length
  );
  finData.set(FINALIZE_PLAY_DISCRIMINATOR, 0);
  finData.set(random, FINALIZE_PLAY_DISCRIMINATOR.length);

  const finKeys = [
    { pubkey: gamePubkey, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: true, isWritable: false },
    { pubkey: prizeMint.publicKey, isSigner: false, isWritable: true },
    { pubkey: metadataPda, isSigner: false, isWritable: true },
    { pubkey: masterEditionPda, isSigner: false, isWritable: true },
    { pubkey: userPrizeAta, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"),
      isSigner: false,
      isWritable: false,
    },
  ];
  const finalizeIx = new TransactionInstruction({
    programId,
    keys: finKeys,
    data: Buffer.from(finData),
  });

  // Ensure ATAs for token transfer
  const tx = new Transaction();
  const userAtaInfo = await connection.getAccountInfo(userTokenAccount);
  if (!userAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        user,
        userTokenAccount,
        user,
        mintAddress
      )
    );
  }
  const treasuryAtaInfo = await connection.getAccountInfo(treasuryTokenAccount);
  if (!treasuryAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        user,
        treasuryTokenAccount,
        treasury,
        mintAddress
      )
    );
  }
  // Order: play -> create prize mint -> init -> ensure user prize ATA -> finalize
  tx.add(playIx, createPrizeMintIx, initPrizeMintIx);
  if (ensureUserPrizeAtaIx) tx.add(ensureUserPrizeAtaIx);
  tx.add(finalizeIx);

  // Prepare for signing (blockhash + fee payer) and partial sign with prize mint
  tx.feePayer = user;
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.partialSign(prizeMint);

  return { tx, mint: prizeMint };
}
