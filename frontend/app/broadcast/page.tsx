"use client";

import {
  BroadcastHeader,
  CommercialRotation,
  PlayDisplay,
  QueuePanel,
  WinnerTicker,
} from "@/components/broadcast";
import { BroadcastClawMachine } from "@/components/broadcast/BroadcastClawMachine";
import { CRTFrame } from "@/components/broadcast/CRTFrame";
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
    { t: 500, k: { ArrowRight: true } },
    { t: 2500, k: { ArrowRight: false } },
    { t: 3000, k: { ArrowUp: true } },
    { t: 4500, k: { ArrowUp: false } },
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
    skip,
  } = useBroadcastQueue({
    // Long timeout as safety fallback — replay completion triggers skip() explicitly
    playDisplayDuration: 120000,
    commercialDuration: 10000,
  });

  const { playSound, isSoundEnabled } = useSound();
  const prevPlayIdRef = useRef<string | null>(null);
  const prevIsWinRef = useRef<boolean>(false);
  
  const [clawMachineState, setClawMachineState] = useState<{
    visible: boolean;
    play: PlayEvent | null;
    key: string;
  }>({
    visible: false,
    play: null,
    key: "initial",
  });

  const handleReplayComplete = useCallback(() => {
    setTimeout(() => {
      setClawMachineState(prev => ({ ...prev, visible: false }));
      // Explicitly advance the queue now that the replay is done
      skip();
    }, 500);
  }, [skip]);

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

  // Ensure claw machine is hidden when commercials start playing
  // (prevents video from rendering behind the 3D canvas)
  useEffect(() => {
    if (isShowingCommercial) {
      setClawMachineState(prev => ({ ...prev, visible: false }));
    }
  }, [isShowingCommercial]);

  const triggerMockReplay = useCallback(() => {
    if (USE_MOCK_DATA) {
      setClawMachineState({
        visible: true,
        play: MOCK_PLAY,
        key: `mock-${Date.now()}`,
      });
    }
  }, []);

  useEffect(() => {
    if (!currentPlay) return;
    if (prevPlayIdRef.current !== currentPlay.id) {
      if (isSoundEnabled) playSound("buttonPress");
      prevPlayIdRef.current = currentPlay.id;
    }
  }, [currentPlay, playSound, isSoundEnabled]);

  useEffect(() => {
    if (!currentPlay) return;
    const isWin = currentPlay.outcome === "win";
    if (isWin && !prevIsWinRef.current && isSoundEnabled) {
      const timer = setTimeout(() => playSound("win"), 3500);
      return () => clearTimeout(timer);
    }
    prevIsWinRef.current = isWin;
  }, [currentPlay, playSound, isSoundEnabled]);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-pastel-sky via-pastel-mint/30 to-pastel-lavender overflow-hidden">
      {/* Main content - TV fills the viewport */}
      <div className="relative z-10 h-full flex p-3 gap-3">
        {/* CRT TV Frame - takes up all available width */}
        <CRTFrame
          isLive={true}
          queueLength={queueLength}
          className="flex-1 h-full"
        >
          {/* Screen content container */}
          <div className="relative w-full h-full" style={{ minHeight: "600px" }}>
            {/* In-screen header overlay - hidden during claw machine replay */}
            {!clawMachineState.visible && (
              <BroadcastHeader
                isShowingCommercial={isShowingCommercial}
                currentPlayerWallet={currentPlay?.userWallet}
                gameName={currentPlay?.gameName}
              />
            )}

            {/* Claw Machine */}
            {clawMachineState.visible && clawMachineState.play && (
              <div className="absolute inset-0 z-20">
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
                
                {/* Player info badge */}
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring", damping: 20 }}
                  className="absolute top-4 left-4 z-40"
                >
                  <div className="flex items-stretch bg-black/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                    {/* Prize image section */}
                    {clawMachineState.play.prizeImage && (
                      <div className="relative w-20 h-20 shrink-0">
                        <img
                          src={clawMachineState.play.prizeImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
                      </div>
                    )}
                    {/* Player details */}
                    <div className="flex flex-col justify-center px-4 py-2.5 gap-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pastel-coral to-pastel-yellow flex items-center justify-center ring-2 ring-white/20">
                          <span className="text-white text-[8px] font-bold">
                            {clawMachineState.play.userWallet.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-display text-white text-sm tracking-wide">
                          {clawMachineState.play.userWallet.length > 12 
                            ? `${clawMachineState.play.userWallet.slice(0, 6)}...${clawMachineState.play.userWallet.slice(-4)}`
                            : clawMachineState.play.userWallet}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 text-[10px] uppercase tracking-wider">Playing</span>
                        <span className="text-pastel-yellow text-xs font-medium">{clawMachineState.play.gameName}</span>
                      </div>
                      {clawMachineState.play.prizeName && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/50 text-[10px] uppercase tracking-wider">For</span>
                          <span className="text-pastel-mint text-xs font-medium">{clawMachineState.play.prizeName}</span>
                        </div>
                      )}
                    </div>
                    {/* LIVE indicator */}
                    <div className="flex items-start px-3 pt-2.5">
                      <div className="flex items-center gap-1.5 bg-red-500/90 rounded-full px-2 py-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-white text-[9px] font-bold tracking-wider">LIVE</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
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
                    onComplete={skip}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Winner ticker inside TV */}
            <div className="absolute bottom-0 left-0 right-0 z-30">
              <WinnerTicker recentWins={recentWins} />
            </div>
          </div>
        </CRTFrame>

        {/* Side panel */}
        <div className="h-full flex-shrink-0">
          <QueuePanel
            queue={queue}
            currentPlay={currentPlay}
            maxVisible={8}
          />
        </div>
      </div>

      {/* Test button */}
      {USE_MOCK_DATA && (
        <button
          onClick={triggerMockReplay}
          className="fixed bottom-4 left-4 z-50 bg-pastel-coral text-white px-4 py-2 rounded-lg shadow-lg hover:bg-pastel-coral/80 transition-colors font-medium text-sm"
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
                  initial={{ x: "50vw", y: "30vh", scale: 0 }}
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
                    i % 5 === 0 ? "bg-pastel-yellow rounded-full"
                      : i % 5 === 1 ? "bg-pastel-coral rounded-sm"
                      : i % 5 === 2 ? "bg-pastel-mint rounded-full"
                      : i % 5 === 3 ? "bg-pastel-lavender rounded-sm"
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
