/**
 * Token Balance Proxy API
 * 
 * Fetches SPL token balance server-side to avoid exposing RPC URL to clients.
 */

import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
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

    // Get the associated token account
    const tokenAccount = await getAssociatedTokenAddress(mintPubkey, walletPubkey);

    try {
      const accountInfo = await getAccount(connection, tokenAccount);
      const rawBalance = Number(accountInfo.amount);
      const displayBalance = rawBalance / Math.pow(10, TOKEN_DECIMALS);

      return NextResponse.json({
        balance: displayBalance,
        rawBalance,
        tokenAccount: tokenAccount.toString(),
        tokenMint: TOKEN_MINT,
      });
    } catch (err: any) {
      // Token account doesn't exist - user has 0 balance
      if (err.name === "TokenAccountNotFoundError") {
        return NextResponse.json({
          balance: 0,
          rawBalance: 0,
          tokenAccount: tokenAccount.toString(),
          tokenMint: TOKEN_MINT,
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
