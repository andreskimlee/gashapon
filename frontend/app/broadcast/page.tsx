"use client";

import {
  BroadcastHeader,
  CommercialRotation,
  PlayDisplay,
  QueuePanel,
  WinnerTicker,
} from "@/components/broadcast";
import { useSound } from "@/contexts/SoundContext";
import { useBroadcastQueue } from "@/hooks/useBroadcastQueue";
import { cn } from "@/utils/helpers";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";

export default function BroadcastPage() {
  const {
    currentPlay,
    queue,
    queueLength,
    isShowingCommercial,
    commercialIndex,
    recentWins,
    setIsShowingVideo,
    onVideoComplete,
  } = useBroadcastQueue({
    playDisplayDuration: 8000,
    commercialDuration: 10000,
  });

  const { playSound, isSoundEnabled } = useSound();
  const prevPlayIdRef = useRef<string | null>(null);
  const prevIsWinRef = useRef<boolean>(false);

  // Play sound effects when plays change
  useEffect(() => {
    if (!currentPlay) return;

    // Play queue entry sound when new play starts
    if (prevPlayIdRef.current !== currentPlay.id) {
      if (isSoundEnabled) {
        playSound("buttonPress");
      }
      prevPlayIdRef.current = currentPlay.id;
    }
  }, [currentPlay, playSound, isSoundEnabled]);

  // Play win sound when outcome is revealed
  useEffect(() => {
    if (!currentPlay) return;

    const isWin = currentPlay.outcome === "win";
    if (isWin && !prevIsWinRef.current && isSoundEnabled) {
      // Delay to sync with reveal animation
      const timer = setTimeout(() => {
        playSound("win");
      }, 3500);
      return () => clearTimeout(timer);
    }
    prevIsWinRef.current = isWin;
  }, [currentPlay, playSound, isSoundEnabled]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-sky via-pastel-mint/30 to-pastel-lavender overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Floating clouds */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-10 w-40 h-20 rounded-full bg-white/30 blur-2xl"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5,
          }}
          className="absolute top-40 right-20 w-60 h-24 rounded-full bg-white/20 blur-2xl"
        />
        <motion.div
          animate={{
            x: [0, 60, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 10,
          }}
          className="absolute bottom-40 left-1/4 w-48 h-16 rounded-full bg-white/25 blur-2xl"
        />

        {/* Sparkle particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: ["100vh", "-10vh"],
              x: [
                `${Math.random() * 100}vw`,
                `${Math.random() * 100}vw`,
              ],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 10,
              ease: "linear",
            }}
            className={cn(
              "absolute w-2 h-2 rounded-full",
              i % 4 === 0
                ? "bg-pastel-yellow"
                : i % 4 === 1
                  ? "bg-pastel-coral"
                  : i % 4 === 2
                    ? "bg-pastel-mint"
                    : "bg-white",
            )}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <BroadcastHeader queueLength={queueLength} isLive={true} />

        {/* Main area */}
        <main className="flex-1 flex overflow-hidden">
          {/* Main display area (70%) */}
          <div className="flex-1 relative">
            <AnimatePresence mode="wait">
              {isShowingCommercial ? (
                <motion.div
                  key="commercial"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                >
                  <CommercialRotation
                    commercialIndex={commercialIndex}
                    recentWins={recentWins}
                    onVideoComplete={onVideoComplete}
                    setIsShowingVideo={setIsShowingVideo}
                  />
                </motion.div>
              ) : currentPlay ? (
                <motion.div
                  key={currentPlay.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <PlayDisplay play={currentPlay} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Side panel (30%) */}
          <QueuePanel
            queue={queue}
            currentPlay={currentPlay}
            maxVisible={5}
          />
        </main>

        {/* Bottom ticker */}
        <WinnerTicker recentWins={recentWins} />
      </div>

      {/* Confetti overlay for big wins */}
      <AnimatePresence>
        {currentPlay?.outcome === "win" &&
          (currentPlay.prizeTier === "legendary" ||
            currentPlay.prizeTier === "epic") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 pointer-events-none z-50"
            >
              {[...Array(50)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    x: "50vw",
                    y: "30vh",
                    scale: 0,
                  }}
                  animate={{
                    x: `${Math.random() * 100}vw`,
                    y: `${50 + Math.random() * 60}vh`,
                    scale: [0, 1, 1, 0],
                    rotate: Math.random() * 720 - 360,
                  }}
                  transition={{
                    duration: 3,
                    delay: Math.random() * 0.5,
                    ease: "easeOut",
                  }}
                  className={cn(
                    "absolute w-3 h-3",
                    i % 5 === 0
                      ? "bg-pastel-yellow rounded-full"
                      : i % 5 === 1
                        ? "bg-pastel-coral rounded-sm"
                        : i % 5 === 2
                          ? "bg-pastel-mint rounded-full"
                          : i % 5 === 3
                            ? "bg-pastel-lavender rounded-sm"
                            : "bg-white rounded-full",
                  )}
                />
              ))}
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
