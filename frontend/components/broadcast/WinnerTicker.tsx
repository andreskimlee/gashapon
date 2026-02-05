"use client";

import { PlayEvent } from "@/hooks/useBroadcastQueue";
import { cn } from "@/utils/helpers";
import { motion } from "framer-motion";
import Image from "next/image";

interface WinnerTickerProps {
  recentWins: PlayEvent[];
}

// Truncate wallet for display
function truncateWallet(wallet: string) {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

// Get tier color
function getTierColor(tier: string | null | undefined) {
  switch (tier?.toLowerCase()) {
    case "legendary":
      return "text-yellow-500";
    case "epic":
      return "text-purple-500";
    case "rare":
      return "text-blue-500";
    case "uncommon":
      return "text-green-500";
    default:
      return "text-gray-500";
  }
}

// Format time ago
function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function WinnerTicker({ recentWins }: WinnerTickerProps) {
  // Duplicate wins for seamless scrolling if we have enough
  const displayWins = recentWins.length >= 3 
    ? [...recentWins, ...recentWins] 
    : recentWins;

  if (recentWins.length === 0) {
    return (
      <div className="relative z-20 h-16 bg-white/50 backdrop-blur-md border-t border-white/30 flex items-center justify-center">
        <p className="text-pastel-text/50 text-sm">
          Waiting for winners... Play now at gashapon.fun!
        </p>
      </div>
    );
  }

  return (
    <div className="relative z-20 h-16 bg-white/50 backdrop-blur-md border-t border-white/30 overflow-hidden">
      {/* Label */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-4 bg-gradient-to-r from-pastel-coral to-pastel-coral/90">
        <span className="font-display text-white text-sm">WINNERS</span>
      </div>

      {/* Scrolling content */}
      <div className="h-full flex items-center ml-28 overflow-hidden">
        <motion.div
          animate={{
            x: recentWins.length >= 3 ? [0, `-${50}%`] : 0,
          }}
          transition={{
            x: {
              duration: recentWins.length * 5,
              repeat: Infinity,
              ease: "linear",
            },
          }}
          className="flex items-center gap-8 whitespace-nowrap"
        >
          {displayWins.map((win, index) => (
            <div
              key={`${win.id}-${index}`}
              className="flex items-center gap-3 bg-white/70 rounded-full pl-1 pr-4 py-1"
            >
              {/* Prize thumbnail */}
              {win.prizeImage ? (
                <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                  <Image
                    src={win.prizeImage}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-pastel-yellow flex items-center justify-center">
                  <span className="text-lg">🎁</span>
                </div>
              )}

              {/* Win info */}
              <div className="flex items-center gap-2">
                <span className="font-medium text-pastel-text text-sm">
                  {truncateWallet(win.userWallet)}
                </span>
                <span className="text-pastel-text/40">won</span>
                <span
                  className={cn(
                    "font-medium text-sm",
                    getTierColor(win.prizeTier),
                  )}
                >
                  {win.prizeName || "Prize"}
                </span>
                <span className="text-pastel-text/30 text-xs">
                  • {timeAgo(win.playedAt)}
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Gradient fade on right */}
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white/50 to-transparent pointer-events-none" />
    </div>
  );
}
