/**
 * Wallet Balance Component
 *
 * Displays user's token balance (SPL token used for games)
 * Shows "LOG IN" when wallet is not connected
 * Shows custom wallet modal when connected (with balance + disconnect)
 * 
 * Uses server-side API proxy to avoid exposing RPC URL to clients.
 */

"use client";

import { formatCompact } from "@/utils/format";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useCallback, useEffect, useState } from "react";
import WalletModal from "./WalletModal";

export default function WalletBalance() {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Fetch token balance via server-side proxy (doesn't expose RPC URL)
  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connected) {
      setBalance(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/balance/${publicKey.toString()}`);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("[WalletBalance] API error:", error);
        setBalance(null);
        return;
      }

      const data = await response.json();
      console.log("[WalletBalance] Balance fetched:", data);
      setBalance(data.balance);
    } catch (error) {
      console.error("[WalletBalance] Error fetching balance:", error);
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connected]);

  // Fetch balance when wallet connects
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Refresh balance periodically (every 15 seconds)
  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(fetchBalance, 15000);
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
