"use client";

import { PlayEvent } from "@/hooks/useBroadcastQueue";
import { cn } from "@/utils/helpers";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { BroadcastClawMachine } from "./BroadcastClawMachine";

interface PlayDisplayProps {
  play: PlayEvent;
}

// Truncate wallet address for display
function truncateWallet(wallet: string) {
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

// Get tier styling
function getTierStyles(tier: string | null | undefined) {
  switch (tier?.toLowerCase()) {
    case "legendary":
      return {
        gradient: "from-yellow-400 via-orange-400 to-red-400",
        glow: "shadow-[0_0_60px_rgba(251,191,36,0.6)]",
        text: "text-yellow-300",
      };
    case "epic":
      return {
        gradient: "from-purple-400 via-pink-400 to-rose-400",
        glow: "shadow-[0_0_50px_rgba(168,85,247,0.5)]",
        text: "text-purple-300",
      };
    case "rare":
      return {
        gradient: "from-blue-400 via-cyan-400 to-teal-400",
        glow: "shadow-[0_0_40px_rgba(59,130,246,0.4)]",
        text: "text-blue-300",
      };
    case "uncommon":
      return {
        gradient: "from-green-400 via-emerald-400 to-teal-400",
        glow: "shadow-[0_0_30px_rgba(34,197,94,0.4)]",
        text: "text-green-300",
      };
    default:
      return {
        gradient: "from-gray-300 via-gray-400 to-gray-500",
        glow: "",
        text: "text-gray-300",
      };
  }
}

export function PlayDisplay({ play }: PlayDisplayProps) {
  const [phase, setPhase] = useState<"intro" | "replay" | "result">("intro");
  const isWin = play.outcome === "win";
  const tierStyles = getTierStyles(play.prizeTier);
  const hasRecording = !!play.recording;

  // Handle replay completion
  const handleReplayComplete = useCallback(() => {
    // Show result after replay finishes
    setTimeout(() => setPhase("result"), 500);
  }, []);

  // Animate through phases
  useEffect(() => {
    setPhase("intro");

    if (hasRecording) {
      // With recording: intro → replay → result
      const introTimer = setTimeout(() => setPhase("replay"), 1500);
      return () => clearTimeout(introTimer);
    } else {
      // Without recording: intro → result (skip replay)
      const introTimer = setTimeout(() => setPhase("result"), 2000);
      return () => clearTimeout(introTimer);
    }
  }, [play.id, hasRecording]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div
          className={cn(
            "absolute inset-0 transition-all duration-1000",
            isWin
              ? "bg-gradient-to-br from-pastel-yellow/40 via-pastel-coral/30 to-pastel-lavender/40"
              : "bg-gradient-to-br from-pastel-lavender/40 via-pastel-sky/30 to-pastel-mint/40",
          )}
        />

        {/* Animated sparkles for wins */}
        {isWin && phase === "result" && (
          <>
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: "50%",
                  y: "50%",
                  scale: 0,
                  opacity: 1,
                }}
                animate={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 2,
                }}
                className={cn(
                  "absolute w-3 h-3 rounded-full",
                  i % 3 === 0
                    ? "bg-pastel-yellow"
                    : i % 3 === 1
                      ? "bg-pastel-coral"
                      : "bg-white",
                )}
              />
            ))}
          </>
        )}
      </div>

      {/* Main content */}
      <div className={cn(
        "relative z-10",
        phase === "replay" ? "absolute inset-0" : "max-w-2xl w-full px-8"
      )}>
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="text-center"
            >
              {/* Player info */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-4 mb-6"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pastel-mint to-pastel-sky flex items-center justify-center border-4 border-white shadow-xl">
                  <span className="text-white font-bold text-2xl">
                    {play.userWallet.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="text-left">
                  <p className="font-display text-2xl text-pastel-text">
                    {truncateWallet(play.userWallet)}
                  </p>
                  <p className="text-pastel-text/60">is playing...</p>
                </div>
              </motion.div>

              {/* Game info */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="inline-flex items-center gap-4 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 border-2 border-pastel-mint shadow-lg"
              >
                {play.gameImage ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden">
                    <Image
                      src={play.gameImage}
                      alt={play.gameName}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-pastel-lavender flex items-center justify-center">
                    <span className="text-3xl">🎰</span>
                  </div>
                )}
                <span className="font-display text-xl text-pastel-text">
                  {play.gameName}
                </span>
              </motion.div>
            </motion.div>
          )}

          {phase === "replay" && (
            <motion.div
              key="replay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              {/* Player info overlay */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pastel-mint to-pastel-sky flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {play.userWallet.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-pastel-text text-sm">
                    {truncateWallet(play.userWallet)}
                  </p>
                  <p className="text-pastel-text/60 text-xs">{play.gameName}</p>
                </div>
              </div>

              {/* Claw machine replay */}
              <BroadcastClawMachine
                recordingData={play.recording}
                gameOutcome={play.outcome}
                onReplayComplete={handleReplayComplete}
                autoPlay={true}
              />
            </motion.div>
          )}

          {phase === "result" && (
            <motion.div
              key="result"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              {isWin ? (
                <>
                  {/* Winner header */}
                  <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mb-6"
                  >
                    <motion.h2
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className={cn(
                        "font-display text-5xl bg-gradient-to-r bg-clip-text text-transparent",
                        tierStyles.gradient,
                      )}
                    >
                      WINNER!
                    </motion.h2>
                  </motion.div>

                  {/* Prize display */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 15, delay: 0.2 }}
                    className={cn(
                      "inline-block p-2 rounded-3xl bg-white",
                      tierStyles.glow,
                    )}
                  >
                    {play.prizeImage ? (
                      <div className="relative w-48 h-48 rounded-2xl overflow-hidden">
                        <Image
                          src={play.prizeImage}
                          alt={play.prizeName || "Prize"}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-pastel-yellow to-pastel-coral flex items-center justify-center">
                        <span className="text-7xl">🎁</span>
                      </div>
                    )}
                  </motion.div>

                  {/* Prize info */}
                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-6"
                  >
                    <p className="font-display text-2xl text-pastel-text mb-2">
                      {play.prizeName || "Mystery Prize"}
                    </p>
                    {play.prizeTier && (
                      <span
                        className={cn(
                          "inline-block px-4 py-2 rounded-full text-sm font-bold uppercase bg-gradient-to-r",
                          tierStyles.gradient,
                          "text-white shadow-lg",
                        )}
                      >
                        {play.prizeTier}
                      </span>
                    )}
                  </motion.div>

                  {/* Player attribution */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-4 text-pastel-text/60"
                  >
                    Won by {truncateWallet(play.userWallet)}
                  </motion.p>
                </>
              ) : (
                <>
                  {/* No win display */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-block p-4"
                  >
                    <div className="w-40 h-40 rounded-full bg-pastel-lavender/50 flex items-center justify-center border-4 border-pastel-lavender">
                      <span className="text-6xl opacity-50">💨</span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h2 className="font-display text-3xl text-pastel-text/60 mb-2">
                      No Prize This Time
                    </h2>
                    <p className="text-pastel-text/40">
                      {truncateWallet(play.userWallet)} will try again!
                    </p>
                  </motion.div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
