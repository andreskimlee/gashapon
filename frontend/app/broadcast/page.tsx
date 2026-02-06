"use client";

import {
  BroadcastHeader,
  CommercialRotation,
  PlayDisplay,
  QueuePanel,
  WinnerTicker,
} from "@/components/broadcast";
import { BroadcastClawMachine } from "@/components/broadcast/BroadcastClawMachine";
import { useSound } from "@/contexts/SoundContext";
import { useBroadcastQueue, PlayEvent } from "@/hooks/useBroadcastQueue";
import { cn } from "@/utils/helpers";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { compressRecording, PlayRecording } from "@/hooks/useActionRecorder";

// Mock recording for testing - simulates: move right 2s, move up 1s, grab
const MOCK_RECORDING: PlayRecording = {
  v: 1,
  duration: 8000,
  frames: [
    { t: 0, k: { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false, Space: false } },
    // Move right for 2 seconds
    { t: 500, k: { ArrowRight: true } },
    { t: 2500, k: { ArrowRight: false } },
    // Move up/forward for 1.5 seconds  
    { t: 3000, k: { ArrowUp: true } },
    { t: 4500, k: { ArrowUp: false } },
    // Press space to grab
    { t: 5000, k: { Space: true } },
    { t: 5200, k: { Space: false } },
  ],
};

const MOCK_RECORDING_COMPRESSED = compressRecording(MOCK_RECORDING);

// Toggle this to test with mock data
const USE_MOCK_DATA = true;

const MOCK_PLAY: PlayEvent = {
  id: "mock-play-1",
  transactionSignature: "mock-sig-123456789",
  userWallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  gameId: 1,
  gameName: "Kawaii Capsules",
  gameImage: "/images/games/kawaii-capsules.png",
  outcome: "win",
  prizeName: "Golden Trophy",
  prizeImage: "/images/prizes/golden-trophy.png",
  prizeTier: "legendary",
  playedAt: new Date().toISOString(),
  recording: MOCK_RECORDING_COMPRESSED,
};

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
  
  // Persistent claw machine state - keeps 3D scene mounted to avoid WebGL context recreation
  const [clawMachineState, setClawMachineState] = useState<{
    visible: boolean;
    play: PlayEvent | null;
    key: string; // Used to reset the replay
  }>({
    visible: false,
    play: null,
    key: "initial",
  });

  // Handle replay completion - transition to result phase
  const handleReplayComplete = useCallback(() => {
    setTimeout(() => {
      setClawMachineState(prev => ({ ...prev, visible: false }));
    }, 500);
  }, []);

  // Memoized callbacks for PlayDisplay to prevent useEffect re-runs
  const handleShowReplay = useCallback(() => {
    if (!currentPlay) return;
    setClawMachineState({
      visible: true,
      play: currentPlay,
      key: currentPlay.id,
    });
  }, [currentPlay]);

  const handleHideReplay = useCallback(() => {
    setClawMachineState(prev => ({ ...prev, visible: false }));
  }, []);

  // Test function to trigger mock replay
  const triggerMockReplay = useCallback(() => {
    if (USE_MOCK_DATA) {
      setClawMachineState({
        visible: true,
        play: MOCK_PLAY,
        key: `mock-${Date.now()}`,
      });
    }
  }, []);

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
            {/* Claw Machine - only rendered when visible to avoid WebGL context loss */}
            {clawMachineState.visible && clawMachineState.play && (
              <div className="absolute inset-0 z-30">
                <BroadcastClawMachine
                  key={clawMachineState.key}
                  recordingData={clawMachineState.play.recording}
                  gameOutcome={clawMachineState.play.outcome}
                  onReplayComplete={handleReplayComplete}
                  autoPlay={true}
                  prizeName={clawMachineState.play.prizeName}
                  prizeImage={clawMachineState.play.prizeImage}
                  prizeTier={clawMachineState.play.prizeTier}
                  userWallet={clawMachineState.play.userWallet}
                />
                
                {/* Player info overlay - shown during replay */}
                <div className="absolute top-4 left-4 z-40 flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pastel-mint to-pastel-sky flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {clawMachineState.play.userWallet.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-pastel-text text-sm">
                      {clawMachineState.play.userWallet.length > 12 
                        ? `${clawMachineState.play.userWallet.slice(0, 6)}...${clawMachineState.play.userWallet.slice(-4)}`
                        : clawMachineState.play.userWallet}
                    </p>
                    <p className="text-pastel-text/60 text-xs">{clawMachineState.play.gameName}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Other content (commercials, intro/result displays) */}
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
                  <PlayDisplay 
                    play={currentPlay} 
                    onShowReplay={handleShowReplay}
                    onHideReplay={handleHideReplay}
                    isReplayVisible={clawMachineState.visible}
                  />
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

      {/* Test button for mock replay (only in development) */}
      {USE_MOCK_DATA && (
        <button
          onClick={triggerMockReplay}
          className="fixed bottom-4 left-4 z-50 bg-pastel-coral text-white px-4 py-2 rounded-lg shadow-lg hover:bg-pastel-coral/80 transition-colors font-medium"
        >
          Test Mock Replay
        </button>
      )}

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
