/**
 * Wallet Balance Component
 *
 * Displays user's token balance (SPL token used for games)
 * Shows "LOG IN" when wallet is not connected
 * Shows custom wallet modal when connected (with balance + disconnect)
 */

"use client";

import { formatCompact } from "@/utils/format";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import WalletModal from "./WalletModal";

// Game token mint address (pump.fun token)
const TOKEN_MINT_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_MINT || "11111111111111111111111111111111";
const GAME_TOKEN_MINT = new PublicKey(TOKEN_MINT_ADDRESS);

// Log the mint being used (for debugging)
if (typeof window !== "undefined") {
  console.log("[WalletBalance] Using token mint:", TOKEN_MINT_ADDRESS);
}

// Token decimals (USDC-style has 6 decimals)
const TOKEN_DECIMALS = 6;

export default function WalletBalance() {
  const { connection } = useConnection();
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

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
        publicKey,
      );

      console.log("[WalletBalance] Fetching balance for:", {
        wallet: publicKey.toString(),
        tokenMint: GAME_TOKEN_MINT.toString(),
        tokenAccount: tokenAccount.toString(),
      });

      try {
        const accountInfo = await getAccount(connection, tokenAccount);
        // Convert from raw amount to display amount (divide by 10^decimals)
        const rawBalance = Number(accountInfo.amount);
        const displayBalance = rawBalance / Math.pow(10, TOKEN_DECIMALS);
        console.log("[WalletBalance] Balance fetched:", { rawBalance, displayBalance });
        setBalance(displayBalance);
      } catch (err: any) {
        // Token account doesn't exist - user has 0 balance
        if (err.name === "TokenAccountNotFoundError") {
          console.log("[WalletBalance] Token account not found - balance is 0");
          setBalance(0);
        } else {
          console.error("[WalletBalance] Error fetching token account:", err);
          setBalance(null);
        }
      }
    } catch (error) {
      console.error("[WalletBalance] Error fetching balance:", error);
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connected, connection]);

  // Fetch balance when wallet connects
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Subscribe to token account changes for real-time balance updates
  useEffect(() => {
    if (!connected || !publicKey) return;

    let subscriptionId: number | null = null;

    const subscribeToBalance = async () => {
      try {
        const tokenAccount = await getAssociatedTokenAddress(
          GAME_TOKEN_MINT,
          publicKey,
        );

        // Subscribe to account changes
        subscriptionId = connection.onAccountChange(
          tokenAccount,
          (accountInfo) => {
            if (accountInfo.data.length > 0) {
              // Parse token account data - amount is at offset 64, 8 bytes (u64)
              const data = accountInfo.data;
              const rawBalance = Number(data.readBigUInt64LE(64));
              const displayBalance = rawBalance / Math.pow(10, TOKEN_DECIMALS);
              setBalance(displayBalance);
            }
          },
          "confirmed",
        );

        console.log("[WalletBalance] Subscribed to token account changes");
      } catch (err) {
        console.error("[WalletBalance] Error subscribing to account:", err);
      }
    };

    subscribeToBalance();

    // Cleanup subscription on unmount or wallet change
    return () => {
      if (subscriptionId !== null) {
        connection.removeAccountChangeListener(subscriptionId);
        console.log("[WalletBalance] Unsubscribed from token account changes");
      }
    };
  }, [connected, publicKey, connection]);

  // Refresh balance periodically as fallback (every 30 seconds)
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
        className="flex items-center gap-1.5 md:gap-2 bg-pastel-yellow rounded-full px-3 md:px-5 py-1.5 md:py-2 border-2 border-yellow-400/50 hover:bg-yellow-200 hover:border-yellow-500 transition-all cursor-pointer group"
      >
        <img
          src="/grabbit-coin-image.png"
          alt="Token"
          className="w-6 h-6 md:w-7 md:h-7 rounded-full group-hover:scale-110 transition-transform"
        />
        <span className="text-xs md:text-sm font-bold text-pastel-text">
          LOG IN
        </span>
      </button>
    );
  }

  // Connected - show balance + custom modal on click
  return (
    <>
      <div
        className="flex items-center gap-1.5 md:gap-2 bg-pastel-yellow rounded-full px-2.5 md:px-4 py-1.5 md:py-2 border-2 border-yellow-400/50 cursor-pointer hover:bg-yellow-200 transition-colors"
        onClick={() => setShowWalletModal(true)}
        title={`Wallet: ${publicKey?.toString().slice(0, 8)}...${publicKey?.toString().slice(-4)}`}
      >
        <img
          src="/grabbit-coin-image.png"
          alt="Token"
          className="w-6 h-6 md:w-7 md:h-7 rounded-full"
        />
        {isLoading ? (
          <span className="text-xs md:text-sm font-bold text-pastel-text animate-pulse">
            ...
          </span>
        ) : (
          <span className="text-xs md:text-sm font-bold text-pastel-text">
            {balance !== null ? formatCompact(balance) : "—"}
          </span>
        )}
      </div>

      {/* Custom Wallet Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        walletAddress={publicKey?.toString() || ""}
        balance={balance}
        onDisconnect={disconnect}
      />
    </>
  );
}
