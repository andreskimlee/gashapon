import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

describe("gachapon-game", () => {
  // Set up provider with localnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const wallet = provider.wallet as anchor.Wallet;

  // Load program from workspace or IDL
  const gameProgramIdl = require("../target/idl/gachapon_game.json");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameProgram: Program<any> =
    (anchor.workspace?.GachaponGame as Program<any>) ||
    (new anchor.Program(gameProgramIdl, provider) as Program<any>);

  let tokenMint: PublicKey;
  let user = Keypair.generate();
  let treasury = Keypair.generate();

  let gamePda: PublicKey;
  let gameId = new BN(1);

  before(async () => {
    for (const kp of [user, treasury]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig, "confirmed");
    }

    tokenMint = await createMint(
      provider.connection,
      wallet.payer as any,
      wallet.publicKey,
      null,
      6
    );

    [gamePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("game"), Buffer.from(gameId.toArray("le", 8))],
      gameProgram.programId
    );

    const prizePool = [
      {
        prizeId: new BN(1),
        name: "Common Prize",
        metadataUri: "ipfs://common",
        physicalSku: "SKU-COMMON",
        tier: { common: {} } as any,
        probabilityBp: 9000,
        supplyTotal: 100,
        supplyRemaining: 100,
      },
      {
        prizeId: new BN(2),
        name: "Rare Prize",
        metadataUri: "ipfs://rare",
        physicalSku: "SKU-RARE",
        tier: { rare: {} } as any,
        probabilityBp: 1000,
        supplyTotal: 10,
        supplyRemaining: 10,
      },
    ];

    // @ts-expect-error - Anchor Program types are complex, TypeScript has recursion limits
    await gameProgram.methods
      .initializeGame(gameId, new BN(500), tokenMint, prizePool)
      .accounts({
        authority: wallet.publicKey,
        game: gamePda,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  });

  it("plays the game and transfers tokens", async () => {
    const userAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet.payer as any,
        tokenMint,
        user.publicKey
      )
    ).address;
    const treasuryAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet.payer as any,
        tokenMint,
        treasury.publicKey
      )
    ).address;
    await mintTo(
      provider.connection,
      wallet.payer as any,
      tokenMint,
      userAta,
      wallet.publicKey,
      1_000_000
    );

    await gameProgram.methods
      .playGame(new BN(100_000))
      .accounts({
        game: gamePda,
        user: user.publicKey,
        userTokenAccount: userAta,
        treasuryTokenAccount: treasuryAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();
  });

  it("finalizes play with deterministic random value", async () => {
    const random = Buffer.alloc(32, 0);
    random[0] = 1; // deterministic
    await gameProgram.methods
      .finalizePlay([...random] as any)
      .accounts({
        game: gamePda,
        user: user.publicKey,
      })
      .signers([user])
      .rpc();
  });

  it("updates game status and replenishes supply", async () => {
    await gameProgram.methods
      .updateGameStatus(true)
      .accounts({ game: gamePda, authority: wallet.publicKey })
      .rpc();

    await gameProgram.methods
      .replenishPrizeSupply(new BN(2), 5)
      .accounts({ game: gamePda, authority: wallet.publicKey })
      .rpc();
  });
});
