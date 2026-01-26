/**
 * Token Balance Proxy API
 * 
 * Fetches SPL token balance server-side to avoid exposing RPC URL to clients.
 * Supports both regular SPL tokens and Token-2022 tokens.
 */

import { 
  getAccount, 
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";

// Server-side only - not exposed to client
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const TOKEN_MINT = process.env.NEXT_PUBLIC_TOKEN_MINT || "";
const TOKEN_DECIMALS = 6;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params;

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    if (!TOKEN_MINT) {
      return NextResponse.json(
        { error: "Token mint not configured" },
        { status: 500 }
      );
    }

    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const walletPubkey = new PublicKey(wallet);
    const mintPubkey = new PublicKey(TOKEN_MINT);

    // First, check which token program owns the mint (regular SPL or Token-2022)
    const mintAccountInfo = await connection.getAccountInfo(mintPubkey);
    if (!mintAccountInfo) {
      return NextResponse.json(
        { error: "Token mint not found" },
        { status: 404 }
      );
    }

    const isToken2022 = mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
    const tokenProgramId = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

    // Get the associated token account for the correct program
    const tokenAccount = getAssociatedTokenAddressSync(
      mintPubkey, 
      walletPubkey,
      false, // allowOwnerOffCurve
      tokenProgramId
    );

    try {
      const accountInfo = await getAccount(connection, tokenAccount, "confirmed", tokenProgramId);
      const rawBalance = Number(accountInfo.amount);
      const displayBalance = rawBalance / Math.pow(10, TOKEN_DECIMALS);

      return NextResponse.json({
        balance: displayBalance,
        rawBalance,
        tokenAccount: tokenAccount.toString(),
        tokenMint: TOKEN_MINT,
        tokenProgram: isToken2022 ? "token-2022" : "spl-token",
      });
    } catch (err: any) {
      // Token account doesn't exist - user has 0 balance
      if (err.name === "TokenAccountNotFoundError") {
        return NextResponse.json({
          balance: 0,
          rawBalance: 0,
          tokenAccount: tokenAccount.toString(),
          tokenMint: TOKEN_MINT,
          tokenProgram: isToken2022 ? "token-2022" : "spl-token",
        });
      }
      throw err;
    }
  } catch (error) {
    console.error("[Balance API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}
