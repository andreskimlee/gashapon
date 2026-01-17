/**
 * Wallet Balance Component
 *
 * Displays user's token balance (SPL token used for games)
 * Shows "LOG IN" when wallet is not connected
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { formatCompact } from "@/utils/format";

// Game token mint address (pump.fun token)
const GAME_TOKEN_MINT = new PublicKey(
  "Cp95mjbZZnDvqCNYExmGYEzrgu6wAScf32Fmwt2Kpump"
);

// Token decimals (USDC-style has 6 decimals)
const TOKEN_DECIMALS = 6;

export default function WalletBalance() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch token balance
  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connected) {
      setBalance(null);
      return;
    }

    setIsLoading(true);
    try {
      // Get the associated token account for the user
      const tokenAccount = await getAssociatedTokenAddress(
        GAME_TOKEN_MINT,
        publicKey
      );

      try {
        const accountInfo = await getAccount(connection, tokenAccount);
        // Convert from raw amount to display amount (divide by 10^decimals)
        const rawBalance = Number(accountInfo.amount);
        const displayBalance = rawBalance / Math.pow(10, TOKEN_DECIMALS);
        setBalance(displayBalance);
      } catch (err: any) {
        // Token account doesn't exist - user has 0 balance
        if (err.name === "TokenAccountNotFoundError") {
          setBalance(0);
        } else {
          console.error("Error fetching token account:", err);
          setBalance(null);
        }
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connected, connection]);

  // Fetch balance when wallet connects
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Refresh balance periodically (every 30 seconds)
  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [connected, fetchBalance]);

  // Not connected - show LOG IN button
  if (!connected) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="flex items-center gap-2 bg-pastel-yellow rounded-full px-5 py-2 border-2 border-yellow-400/50 hover:bg-yellow-200 hover:border-yellow-500 transition-all cursor-pointer group"
      >
        <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-yellow-500 group-hover:scale-110 transition-transform">
          <span className="text-yellow-700 text-xs font-bold">$</span>
        </div>
        <span className="text-sm font-bold text-pastel-text">LOG IN</span>
      </button>
    );
  }

  // Connected - show balance
  return (
    <div
      className="flex items-center gap-2 bg-pastel-yellow rounded-full px-4 py-2 border-2 border-yellow-400/50 cursor-pointer hover:bg-yellow-200 transition-colors"
      onClick={() => setVisible(true)}
      title={`Wallet: ${publicKey?.toString().slice(0, 8)}...${publicKey?.toString().slice(-4)}`}
    >
      <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-yellow-500">
        <span className="text-yellow-700 text-xs font-bold">$</span>
      </div>
      {isLoading ? (
        <span className="text-sm font-bold text-pastel-text animate-pulse">
          ...
        </span>
      ) : (
        <>
          <span className="text-sm font-bold text-pastel-text">
            {balance !== null ? formatCompact(balance) : "—"}
          </span>
          <span className="text-xs font-semibold text-pastel-text/70">
            TOKENS
          </span>
        </>
      )}
    </div>
  );
}
