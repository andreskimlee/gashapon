"use client";

import { PlayEvent } from "@/hooks/useBroadcastQueue";
import { cn } from "@/utils/helpers";
import { motion } from "framer-motion";
import Image from "next/image";

interface WinnerTickerProps {
  recentWins: PlayEvent[];
}

function truncateWallet(wallet: string) {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

function getTierColor(tier: string | null | undefined) {
  switch (tier?.toLowerCase()) {
    case "legendary":
      return "text-yellow-300";
    case "epic":
      return "text-purple-300";
    case "rare":
      return "text-blue-300";
    case "uncommon":
      return "text-green-300";
    default:
      return "text-gray-300";
  }
}

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
  const displayWins = recentWins.length >= 3 
    ? [...recentWins, ...recentWins] 
    : recentWins;

  // Don't render anything when there are no winners — avoids covering video content
  if (recentWins.length === 0) {
    return null;
  }

  return (
    <div className="relative h-12 bg-[#1a1a2e]/90 border-t border-[#2a2a3e] overflow-hidden">
      {/* WINNERS label */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-4 bg-gradient-to-r from-pastel-coral to-pastel-coral/90 border-r border-pastel-coral/50">
        <span className="font-display text-white text-xs tracking-wider">
          WINNERS
        </span>
      </div>

      {/* Scrolling content */}
      <div className="h-full flex items-center ml-[100px] overflow-hidden">
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
          className="flex items-center gap-6 whitespace-nowrap"
        >
          {displayWins.map((win, index) => (
            <div
              key={`${win.id}-${index}`}
              className="flex items-center gap-2.5 bg-white/5 rounded-full pl-1 pr-4 py-1"
            >
              {/* Prize thumbnail */}
              {win.prizeImage ? (
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/20">
                  <Image
                    src={win.prizeImage}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-pastel-yellow/20 flex items-center justify-center">
                  <div className="w-4 h-4 rounded bg-pastel-yellow/40" />
                </div>
              )}

              {/* Win info */}
              <div className="flex items-center gap-2">
                <span className="font-medium text-white/80 text-sm">
                  {truncateWallet(win.userWallet)}
                </span>
                <span className="text-white/30 text-xs">won</span>
                <span
                  className={cn(
                    "font-medium text-sm",
                    getTierColor(win.prizeTier),
                  )}
                >
                  {win.prizeName || "Prize"}
                </span>
                <span className="text-white/20 text-xs">
                  {timeAgo(win.playedAt)}
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Gradient fade */}
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#1a1a2e] to-transparent pointer-events-none" />
    </div>
  );
}
