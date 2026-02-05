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

// Static promotional content types
type PromoContent = {
  type: "welcome" | "stats" | "winner-highlight" | "game-promo" | "cta" | "video";
  title: string;
  subtitle?: string;
  gradient: string;
  icon?: string;
  videoSrc?: string;
};

const staticPromos: PromoContent[] = [
  {
    type: "video",
    title: "Grabbit Fun",
    gradient: "from-pastel-coral via-pastel-yellow to-pastel-mint",
    videoSrc: "/broadcast/promos/Grabbit Fun Video.mp4",
  },
  {
    type: "welcome",
    title: "Welcome to Gashapon Live",
    subtitle: "Watch players win amazing prizes in real-time!",
    gradient: "from-pastel-coral via-pastel-yellow to-pastel-mint",
    icon: "🎰",
  },
  {
    type: "stats",
    title: "Thousands of Prizes Won",
    subtitle: "Join the fun and try your luck today!",
    gradient: "from-pastel-mint via-pastel-sky to-pastel-lavender",
    icon: "🏆",
  },
  {
    type: "cta",
    title: "Play Now!",
    subtitle: "gashapon.fun",
    gradient: "from-pastel-yellow via-pastel-coral to-pastel-lavender",
    icon: "🎮",
  },
];

// Truncate wallet for display
function truncateWallet(wallet: string) {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

// Get tier badge styling
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

  // Cycle through content types
  useEffect(() => {
    setContentIndex(commercialIndex % (staticPromos.length + (recentWins.length > 0 ? 1 : 0)));
  }, [commercialIndex, recentWins.length]);

  // Determine what content to show
  const showWinnerHighlight =
    recentWins.length > 0 && contentIndex === staticPromos.length;
  const currentPromo = showWinnerHighlight
    ? null
    : staticPromos[contentIndex % staticPromos.length];

  // Notify parent when showing video vs non-video content
  useEffect(() => {
    const isVideo = currentPromo?.type === "video";
    setIsShowingVideo?.(isVideo);
  }, [currentPromo, setIsShowingVideo]);

  // Auto-play video when it's a video promo
  useEffect(() => {
    if (currentPromo?.type === "video" && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Autoplay blocked - advance to next content
        onVideoComplete?.();
      });
    }
  }, [currentPromo, onVideoComplete]);

  // Handle video end
  const handleVideoEnded = () => {
    onVideoComplete?.();
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <motion.div
          key={contentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "absolute inset-0 bg-gradient-to-br",
            showWinnerHighlight
              ? "from-pastel-yellow/30 via-pastel-coral/20 to-pastel-lavender/30"
              : `${currentPromo?.gradient}`,
            "opacity-30",
          )}
        />

        {/* Floating decorative elements */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-10 w-20 h-20 rounded-full bg-white/20 blur-xl"
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-10 right-10 w-32 h-32 rounded-full bg-white/20 blur-xl"
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
              className="text-pastel-coral font-medium mb-4"
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
                {/* Winner avatar */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pastel-yellow to-pastel-coral flex items-center justify-center border-4 border-white shadow-lg mb-4">
                  <span className="text-white font-bold text-3xl">
                    {recentWins[0].userWallet.slice(0, 2).toUpperCase()}
                  </span>
                </div>

                <p className="font-display text-xl text-pastel-text mb-2">
                  {truncateWallet(recentWins[0].userWallet)}
                </p>

                <p className="text-pastel-text/60 mb-4">won</p>

                {/* Prize display */}
                {recentWins[0].prizeImage && (
                  <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-4 border-white shadow-xl mb-4">
                    <Image
                      src={recentWins[0].prizeImage}
                      alt={recentWins[0].prizeName || "Prize"}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <p className="font-display text-lg text-pastel-text mb-2">
                  {recentWins[0].prizeName || "Amazing Prize"}
                </p>

                {recentWins[0].prizeTier && (
                  <span
                    className={cn(
                      "px-4 py-1 rounded-full text-sm font-bold text-white bg-gradient-to-r",
                      getTierGradient(recentWins[0].prizeTier),
                    )}
                  >
                    {recentWins[0].prizeTier}
                  </span>
                )}

                <p className="text-pastel-text/40 text-sm mt-4">
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
            <div className="relative w-full h-full max-w-5xl max-h-[80vh] rounded-3xl overflow-hidden shadow-2xl">
              <video
                ref={videoRef}
                src={currentPromo.videoSrc}
                className="w-full h-full object-contain bg-black/10"
                muted
                playsInline
                onEnded={handleVideoEnded}
              />
              {/* Video overlay with branding */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-6">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-between"
                >
                  <span className="font-display text-xl text-white drop-shadow-lg">
                    {currentPromo.title}
                  </span>
                  <span className="text-white/80 text-sm">gashapon.fun</span>
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
            className="relative z-10 text-center max-w-2xl px-8"
          >
            {/* Icon */}
            {currentPromo.icon && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 15, delay: 0.2 }}
                className="mb-8"
              >
                <span className="text-8xl drop-shadow-lg">
                  {currentPromo.icon}
                </span>
              </motion.div>
            )}

            {/* Title */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={cn(
                "font-display text-4xl md:text-5xl mb-4 bg-gradient-to-r bg-clip-text text-transparent",
                currentPromo.gradient,
              )}
            >
              {currentPromo.title}
            </motion.h2>

            {/* Subtitle */}
            {currentPromo.subtitle && (
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-pastel-text/80"
              >
                {currentPromo.subtitle}
              </motion.p>
            )}

            {/* CTA type specific styling */}
            {currentPromo.type === "cta" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="mt-8"
              >
                <div className="inline-flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-full px-8 py-4 border-2 border-pastel-coral shadow-lg">
                  <span className="font-display text-2xl text-pastel-coral">
                    gashapon.fun
                  </span>
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-2xl"
                  >
                    →
                  </motion.span>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Decorative corner elements */}
      <div className="absolute top-4 left-4">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="text-3xl text-pastel-yellow/60"
        >
          ✦
        </motion.span>
      </div>
      <div className="absolute top-4 right-4">
        <motion.span
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="text-3xl text-pastel-coral/60"
        >
          ✦
        </motion.span>
      </div>
      <div className="absolute bottom-4 left-4">
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-3xl text-pastel-mint/60"
        >
          ★
        </motion.span>
      </div>
      <div className="absolute bottom-4 right-4">
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="text-3xl text-pastel-lavender/60"
        >
          ★
        </motion.span>
      </div>
    </div>
  );
}
