"use client";

import Card from "@/components/ui/Card";
import { cn } from "@/utils/helpers";
import { motion } from "framer-motion";
import Image from "next/image";

interface PlayCardProps {
  userWallet: string;
  gameName: string;
  gameImage?: string | null;
  outcome: "win" | "lose";
  prizeName?: string | null;
  prizeTier?: string | null;
  prizeImage?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Truncate wallet address for display
function truncateWallet(wallet: string) {
  if (wallet.length <= 10) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

// Get tier badge color
function getTierColor(tier: string | null | undefined) {
  switch (tier?.toLowerCase()) {
    case "legendary":
      return "bg-gradient-to-r from-yellow-400 to-orange-500 text-white";
    case "epic":
      return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
    case "rare":
      return "bg-gradient-to-r from-blue-400 to-cyan-500 text-white";
    case "uncommon":
      return "bg-gradient-to-r from-green-400 to-emerald-500 text-white";
    default:
      return "bg-gray-400 text-white";
  }
}

export function PlayCard({
  userWallet,
  gameName,
  gameImage,
  outcome,
  prizeName,
  prizeTier,
  prizeImage,
  size = "md",
  className,
}: PlayCardProps) {
  const isWin = outcome === "win";

  const sizeStyles = {
    sm: {
      card: "max-w-xs",
      avatar: "w-10 h-10",
      text: "text-sm",
      prize: "w-12 h-12",
    },
    md: {
      card: "max-w-sm",
      avatar: "w-14 h-14",
      text: "text-base",
      prize: "w-20 h-20",
    },
    lg: {
      card: "max-w-md",
      avatar: "w-20 h-20",
      text: "text-lg",
      prize: "w-28 h-28",
    },
  };

  const styles = sizeStyles[size];

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: -20 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className={cn(styles.card, className)}
    >
      <Card
        variant="arcade"
        shadowColor={isWin ? "coral" : "purple"}
        padding="lg"
        className="relative overflow-hidden"
      >
        {/* Background glow for wins */}
        {isWin && (
          <div className="absolute inset-0 bg-gradient-to-br from-pastel-yellow/20 via-transparent to-pastel-coral/20 pointer-events-none" />
        )}

        <div className="relative z-10">
          {/* Player info */}
          <div className="flex items-center gap-3 mb-4">
            {/* Avatar placeholder */}
            <div
              className={cn(
                styles.avatar,
                "rounded-full bg-gradient-to-br from-pastel-mint to-pastel-sky flex items-center justify-center border-2 border-white shadow-md",
              )}
            >
              <span className="text-white font-bold text-lg">
                {userWallet.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p
                className={cn(
                  "font-bold text-pastel-text",
                  styles.text,
                )}
              >
                {truncateWallet(userWallet)}
              </p>
              <p className="text-pastel-text/60 text-sm">played</p>
            </div>
          </div>

          {/* Game info */}
          <div className="flex items-center gap-3 mb-4 bg-pastel-sky/30 rounded-xl p-3">
            {gameImage ? (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                <Image
                  src={gameImage}
                  alt={gameName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-pastel-lavender flex items-center justify-center">
                <div className="w-6 h-6 rounded bg-pastel-lavender/80 border-2 border-white/30" />
              </div>
            )}
            <span className={cn("font-display text-pastel-text", styles.text)}>
              {gameName}
            </span>
          </div>

          {/* Result */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className={cn(
              "text-center py-4 rounded-xl",
              isWin
                ? "bg-gradient-to-r from-pastel-yellow/50 to-pastel-coral/50"
                : "bg-pastel-lavender/50",
            )}
          >
            {isWin ? (
              <>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="font-display text-2xl text-pastel-coral mb-2"
                >
                  WINNER!
                </motion.div>
                {prizeImage && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-center mb-2"
                  >
                    <div
                      className={cn(
                        styles.prize,
                        "relative rounded-xl overflow-hidden border-4 border-white shadow-lg",
                      )}
                    >
                      <Image
                        src={prizeImage}
                        alt={prizeName || "Prize"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </motion.div>
                )}
                <p className={cn("font-bold text-pastel-text", styles.text)}>
                  {prizeName || "Mystery Prize"}
                </p>
                {prizeTier && (
                  <span
                    className={cn(
                      "inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase",
                      getTierColor(prizeTier),
                    )}
                  >
                    {prizeTier}
                  </span>
                )}
              </>
            ) : (
              <>
                <div className="font-display text-xl text-pastel-text/60 mb-1">
                  No Prize
                </div>
                <p className="text-pastel-text/50 text-sm">Better luck next time!</p>
              </>
            )}
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}
