"use client";

import { PlayEvent } from "@/hooks/useBroadcastQueue";
import { cn } from "@/utils/helpers";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface PlayDisplayProps {
  play: PlayEvent;
  onShowReplay?: () => void;
  onHideReplay?: () => void;
  isReplayVisible?: boolean;
  /** Called when the display is completely done (result shown for enough time) */
  onComplete?: () => void;
}

function truncateWallet(wallet: string) {
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

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

export function PlayDisplay({ 
  play, 
  onShowReplay, 
  onHideReplay,
  isReplayVisible = false,
  onComplete,
}: PlayDisplayProps) {
  const [phase, setPhase] = useState<"intro" | "replay" | "result">("intro");
  const isWin = play.outcome === "win";
  const tierStyles = getTierStyles(play.prizeTier);
  const hasRecording = !!play.recording;

  const onShowReplayRef = useRef(onShowReplay);
  const onHideReplayRef = useRef(onHideReplay);
  const onCompleteRef = useRef(onComplete);
  
  useEffect(() => {
    onShowReplayRef.current = onShowReplay;
    onHideReplayRef.current = onHideReplay;
    onCompleteRef.current = onComplete;
  }, [onShowReplay, onHideReplay, onComplete]);

  useEffect(() => {
    setPhase("intro");
    onHideReplayRef.current?.();

    if (hasRecording) {
      const introTimer = setTimeout(() => {
        setPhase("replay");
        onShowReplayRef.current?.();
      }, 1500);
      return () => clearTimeout(introTimer);
    } else {
      const introTimer = setTimeout(() => setPhase("result"), 2000);
      return () => clearTimeout(introTimer);
    }
  }, [play.id, hasRecording, play.recording]);

  useEffect(() => {
    if (phase === "replay" && !isReplayVisible) {
      setPhase("result");
    }
  }, [phase, isReplayVisible]);

  // For plays without recordings, auto-complete after showing result for 6 seconds
  useEffect(() => {
    if (phase === "result" && !hasRecording) {
      const timer = setTimeout(() => {
        onCompleteRef.current?.();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [phase, hasRecording]);

  return (
    <div className="relative w-full h-full min-h-[500px] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div
          className={cn(
            "absolute inset-0 transition-all duration-1000",
            isWin
              ? "bg-gradient-to-br from-[#2d1b4e] via-[#3e2e1b] to-[#1b2e4e]"
              : "bg-gradient-to-br from-[#1b2040] via-[#1a2a3e] to-[#1b3e2e]",
          )}
        />

        {/* Animated sparkles for wins */}
        {isWin && phase === "result" && (
          <>
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: "50%", y: "50%", scale: 0, opacity: 1 }}
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
        phase === "replay" ? "absolute inset-0" : "max-w-3xl w-full px-8"
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
                className="flex items-center justify-center gap-5 mb-8"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pastel-mint to-pastel-sky flex items-center justify-center border-4 border-white/20 shadow-xl">
                  <span className="text-white font-bold text-3xl">
                    {play.userWallet.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="text-left">
                  <p className="font-display text-3xl text-white">
                    {truncateWallet(play.userWallet)}
                  </p>
                  <p className="text-white/60 text-lg">is playing...</p>
                </div>
              </motion.div>

              {/* Game info */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-5 border border-white/20"
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
                  <div className="w-16 h-16 rounded-xl bg-pastel-lavender/30 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-lg bg-pastel-lavender/50" />
                  </div>
                )}
                <span className="font-display text-2xl text-white">
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
              className="absolute inset-0 z-10"
            />
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
                  <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mb-8"
                  >
                    <motion.h2
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className={cn(
                        "font-display text-6xl bg-gradient-to-r bg-clip-text text-transparent",
                        tierStyles.gradient,
                      )}
                    >
                      WINNER!
                    </motion.h2>
                  </motion.div>

                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 15, delay: 0.2 }}
                    className={cn(
                      "inline-block p-2 rounded-3xl bg-white/10 backdrop-blur-sm",
                      tierStyles.glow,
                    )}
                  >
                    {play.prizeImage ? (
                      <div className="relative w-52 h-52 rounded-2xl overflow-hidden">
                        <Image
                          src={play.prizeImage}
                          alt={play.prizeName || "Prize"}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-52 h-52 rounded-2xl bg-gradient-to-br from-pastel-yellow/30 to-pastel-coral/30 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-xl bg-pastel-yellow/20 border-2 border-pastel-yellow/30" />
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-6"
                  >
                    <p className="font-display text-3xl text-white mb-3">
                      {play.prizeName || "Mystery Prize"}
                    </p>
                    {play.prizeTier && (
                      <span
                        className={cn(
                          "inline-block px-5 py-2 rounded-full text-base font-bold uppercase bg-gradient-to-r",
                          tierStyles.gradient,
                          "text-white shadow-lg",
                        )}
                      >
                        {play.prizeTier}
                      </span>
                    )}
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-5 text-white/60 text-lg"
                  >
                    Won by {truncateWallet(play.userWallet)}
                  </motion.p>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-block p-4"
                  >
                    <div className="w-44 h-44 rounded-full bg-white/5 flex items-center justify-center border-4 border-white/10">
                      <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/10" />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h2 className="font-display text-4xl text-white/50 mb-3">
                      No Prize This Time
                    </h2>
                    <p className="text-white/30 text-lg">
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
