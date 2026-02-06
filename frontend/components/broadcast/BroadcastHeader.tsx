"use client";

import { motion } from "framer-motion";

interface BroadcastHeaderProps {
  isShowingCommercial?: boolean;
  currentPlayerWallet?: string | null;
  gameName?: string | null;
}

function truncateWallet(wallet: string) {
  if (wallet.length <= 10) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export function BroadcastHeader({
  isShowingCommercial = false,
  currentPlayerWallet,
  gameName,
}: BroadcastHeaderProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-3">
      {/* Left - Status indicator */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2"
      >
        <div className="w-2 h-2 rounded-full bg-pastel-yellow animate-pulse" />
        <span className="text-white text-sm font-medium tracking-wide">
          {isShowingCommercial
            ? "COMMERCIAL BREAK"
            : currentPlayerWallet
              ? "NOW PLAYING"
              : "STANDBY"}
        </span>
      </motion.div>

      {/* Right - Player info when playing */}
      {!isShowingCommercial && currentPlayerWallet && (
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-2.5 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pastel-mint to-pastel-sky flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">
              {currentPlayerWallet.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <span className="text-white text-sm font-medium">
            {truncateWallet(currentPlayerWallet)}
          </span>
          {gameName && (
            <>
              <span className="text-white/40 text-xs">|</span>
              <span className="text-white/60 text-xs">
                {gameName}
              </span>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
