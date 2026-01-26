/**
 * Token Price Proxy API
 * 
 * Proxies requests to pump.fun API to avoid CORS issues.
 * The request happens server-side where CORS doesn't apply.
 */

import { NextRequest, NextResponse } from "next/server";

const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
const isDevnet = SOLANA_NETWORK === "devnet";

const PUMP_FUN_API_URL = isDevnet
  ? "https://frontend-api-devnet-v3.pump.fun/coins-v2"
  : "https://frontend-api-v3.pump.fun/coins-v2";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  try {
    const { mint } = await params;
    
    if (!mint) {
      return NextResponse.json(
        { error: "Token mint address is required" },
        { status: 400 }
      );
    }

    const apiUrl = `${PUMP_FUN_API_URL}/${mint}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
      },
      // Cache for 30 seconds
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Token not found on pump.fun" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `pump.fun API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // All pump.fun tokens have a fixed supply of 1 billion tokens
    const PUMP_FUN_TOTAL_SUPPLY = 1_000_000_000;

    // Price per token = market cap / total supply
    const priceUsd = data.usd_market_cap / PUMP_FUN_TOTAL_SUPPLY;
    const priceSol = data.market_cap / PUMP_FUN_TOTAL_SUPPLY;

    return NextResponse.json({
      priceUsd,
      priceSol,
      marketCapUsd: data.usd_market_cap,
      symbol: data.symbol,
      name: data.name,
      source: "pump.fun",
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[Price API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch token price" },
      { status: 500 }
    );
  }
}
