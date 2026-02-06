"use client";

import Card from "@/components/ui/Card";
import { PlayEvent } from "@/hooks/useBroadcastQueue";
import { cn } from "@/utils/helpers";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface CommercialRotationProps {
  commercialIndex: number;
  recentWins: PlayEvent[];
  onVideoComplete?: () => void;
  setIsShowingVideo?: (isVideo: boolean) => void;
}

type PromoContent = {
  type: "welcome" | "stats" | "winner-highlight" | "game-promo" | "cta" | "video";
  title: string;
  subtitle?: string;
  bgGradient: string;
  titleColor: string;
  subtitleColor: string;
  videoSrc?: string;
};

const staticPromos: PromoContent[] = [
  {
    type: "video",
    title: "Grabbit Fun",
    bgGradient: "from-[#1a1a2e] to-[#1a1a2e]",
    titleColor: "text-white",
    subtitleColor: "text-white/70",
    videoSrc: "/broadcast/promos/Grabbit Fun Video.mp4",
  },
  {
    type: "welcome",
    title: "Welcome to Grabbit Live",
    subtitle: "Watch players win amazing prizes in real-time!",
    bgGradient: "from-[#2d1b4e] via-[#1a1a3e] to-[#1b2e4e]",
    titleColor: "text-white",
    subtitleColor: "text-white/70",
  },
  {
    type: "stats",
    title: "Thousands of Prizes Won",
    subtitle: "Join the fun and try your luck today!",
    bgGradient: "from-[#1b3e2e] via-[#1a2a3e] to-[#1b2040]",
    titleColor: "text-white",
    subtitleColor: "text-white/70",
  },
  {
    type: "cta",
    title: "Play Now!",
    subtitle: "grabbit.fun",
    bgGradient: "from-[#3e1b2e] via-[#2e1a3e] to-[#1b2e4e]",
    titleColor: "text-white",
    subtitleColor: "text-white/70",
  },
];

function truncateWallet(wallet: string) {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

function getTierGradient(tier: string | null | undefined) {
  switch (tier?.toLowerCase()) {
    case "legendary":
      return "from-yellow-400 to-orange-500";
    case "epic":
      return "from-purple-400 to-pink-500";
    case "rare":
      return "from-blue-400 to-cyan-500";
    case "uncommon":
      return "from-green-400 to-emerald-500";
    default:
      return "from-gray-400 to-gray-500";
  }
}

export function CommercialRotation({
  commercialIndex,
  recentWins,
  onVideoComplete,
  setIsShowingVideo,
}: CommercialRotationProps) {
  const [contentIndex, setContentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setContentIndex(commercialIndex % (staticPromos.length + (recentWins.length > 0 ? 1 : 0)));
  }, [commercialIndex, recentWins.length]);

  const showWinnerHighlight =
    recentWins.length > 0 && contentIndex === staticPromos.length;
  const currentPromo = showWinnerHighlight
    ? null
    : staticPromos[contentIndex % staticPromos.length];

  useEffect(() => {
    const isVideo = currentPromo?.type === "video";
    setIsShowingVideo?.(isVideo);
  }, [currentPromo, setIsShowingVideo]);

  // Auto-play video — depend on both contentIndex and commercialIndex.
  // commercialIndex ensures re-fire on remount even when contentIndex doesn't change
  // (e.g. component remounts with useState(0) and computed index is also 0).
  useEffect(() => {
    if (currentPromo?.type === "video" && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        onVideoComplete?.();
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentIndex, commercialIndex]);

  const handleVideoEnded = () => {
    onVideoComplete?.();
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0">
        <motion.div
          key={contentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className={cn(
            "absolute inset-0 bg-gradient-to-br",
            showWinnerHighlight
              ? "from-[#2d1b4e] via-[#1a1a3e] to-[#3e2e1b]"
              : currentPromo?.bgGradient,
          )}
        />

        {/* Subtle ambient glow */}
        <motion.div
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full bg-pastel-coral/10 blur-[100px]"
        />
        <motion.div
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-1/2 h-1/2 rounded-full bg-pastel-mint/10 blur-[100px]"
        />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {showWinnerHighlight && recentWins.length > 0 ? (
          <motion.div
            key="winner-highlight"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="relative z-10 text-center max-w-2xl px-8"
          >
            <motion.p
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-pastel-coral font-display text-lg tracking-wider mb-6"
            >
              RECENT WINNER
            </motion.p>

            <Card
              variant="arcade"
              shadowColor="coral"
              padding="xl"
              className="inline-block"
            >
              <div className="flex flex-col items-center">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-pastel-yellow to-pastel-coral flex items-center justify-center border-4 border-white shadow-lg mb-4">
                  <span className="text-white font-bold text-4xl">
                    {recentWins[0].userWallet.slice(0, 2).toUpperCase()}
                  </span>
                </div>

                <p className="font-display text-2xl text-pastel-text mb-2">
                  {truncateWallet(recentWins[0].userWallet)}
                </p>

                <p className="text-pastel-text/60 mb-4 text-lg">won</p>

                {recentWins[0].prizeImage && (
                  <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-4 border-white shadow-xl mb-4">
                    <Image
                      src={recentWins[0].prizeImage}
                      alt={recentWins[0].prizeName || "Prize"}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <p className="font-display text-xl text-pastel-text mb-2">
                  {recentWins[0].prizeName || "Amazing Prize"}
                </p>

                {recentWins[0].prizeTier && (
                  <span
                    className={cn(
                      "px-5 py-1.5 rounded-full text-base font-bold text-white bg-gradient-to-r",
                      getTierGradient(recentWins[0].prizeTier),
                    )}
                  >
                    {recentWins[0].prizeTier}
                  </span>
                )}

                <p className="text-pastel-text/40 text-base mt-4">
                  from {recentWins[0].gameName}
                </p>
              </div>
            </Card>
          </motion.div>
        ) : currentPromo?.type === "video" && currentPromo.videoSrc ? (
          <motion.div
            key={`video-${contentIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 w-full h-full flex items-center justify-center"
          >
            <div className="relative w-full h-full overflow-hidden">
              <video
                ref={videoRef}
                src={currentPromo.videoSrc}
                className="w-full h-full object-cover"
                playsInline
                onEnded={handleVideoEnded}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-8">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-between"
                >
                  <span className="font-display text-2xl text-white drop-shadow-lg">
                    {currentPromo.title}
                  </span>
                  <span className="text-white/80 text-base font-medium">grabbit.fun</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : currentPromo ? (
          <motion.div
            key={`promo-${contentIndex}`}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="relative z-10 text-center max-w-3xl px-12"
          >
            {/* Title - large, white, readable */}
            <motion.h2
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={cn(
                "font-display text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight",
                currentPromo.titleColor,
              )}
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}
            >
              {currentPromo.title}
            </motion.h2>

            {/* Subtitle - clearly readable */}
            {currentPromo.subtitle && (
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className={cn(
                  "text-2xl md:text-3xl",
                  currentPromo.subtitleColor,
                )}
              >
                {currentPromo.subtitle}
              </motion.p>
            )}

            {/* CTA specific */}
            {currentPromo.type === "cta" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="mt-10"
              >
                <div className="inline-flex items-center gap-4 bg-white rounded-full px-10 py-5 shadow-2xl">
                  <span className="font-display text-3xl text-pastel-coral">
                    grabbit.fun
                  </span>
                  <motion.span
                    animate={{ x: [0, 8, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-3xl text-pastel-coral"
                  >
                    &rarr;
                  </motion.span>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
