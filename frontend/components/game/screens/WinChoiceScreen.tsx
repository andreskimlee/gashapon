"use client";

import CTAButton from "@/components/ui/CTAButton";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export type WinChoiceScreenProps = {
  gameName?: string;
  prizeName?: string;
  prizeImageUrl?: string;
  onViewCollection?: () => void;
  onRedeem?: () => void;
  onSaveForLater?: () => void;
};

// Confetti particle component
function ConfettiParticle({
  delay,
  x,
  color,
}: {
  delay: number;
  x: number;
  color: string;
}) {
  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm"
      style={{
        backgroundColor: color,
        left: `${x}%`,
        top: "-20px",
      }}
      initial={{ y: 0, rotate: 0, opacity: 1 }}
      animate={{
        y: 800,
        rotate: 720,
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 3 + Math.random() * 2,
        delay: delay,
        ease: "easeIn",
        repeat: Infinity,
        repeatDelay: Math.random() * 2,
      }}
    />
  );
}

// Sparkle burst component
function Sparkle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute text-2xl pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ scale: 0, opacity: 0, rotate: 0 }}
      animate={{
        scale: [0, 1.5, 0],
        opacity: [0, 1, 0],
        rotate: [0, 180],
      }}
      transition={{
        duration: 1.5,
        delay: delay,
        repeat: Infinity,
        repeatDelay: 2 + Math.random() * 3,
      }}
    >
      ✨
    </motion.div>
  );
}

// Floating emoji component
function FloatingEmoji({
  emoji,
  delay,
  x,
}: {
  emoji: string;
  delay: number;
  x: number;
}) {
  return (
    <motion.div
      className="absolute text-4xl pointer-events-none"
      style={{ left: `${x}%`, bottom: "0" }}
      initial={{ y: 0, opacity: 0, scale: 0 }}
      animate={{
        y: -600,
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1, 0.5],
        x: [0, Math.random() * 40 - 20, Math.random() * 60 - 30],
      }}
      transition={{
        duration: 4,
        delay: delay,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: 3 + Math.random() * 2,
      }}
    >
      {emoji}
    </motion.div>
  );
}

export function WinChoiceScreen({
  prizeName,
  prizeImageUrl,
  onViewCollection,
  onRedeem,
  onSaveForLater,
}: WinChoiceScreenProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Stagger the content reveal
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Generate confetti colors
  const confettiColors = [
    "#FFD700", // Gold
    "#FF6B9D", // Pink
    "#7DD3FC", // Sky blue
    "#A7F3D0", // Mint
    "#FDE68A", // Yellow
    "#C4B5FD", // Purple
    "#FCA5A5", // Coral
  ];

  // Generate confetti particles
  const confetti = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    delay: i * 0.08,
    x: Math.random() * 100,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
  }));

  // Generate sparkles
  const sparkles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    delay: i * 0.3,
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
  }));

  // Floating celebration emojis
  const emojis = ["🎉", "🎊", "⭐", "💫", "🌟", "✨", "🎁", "🏆"];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-amber-100 via-pink-100 to-purple-100" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-yellow-200/50 via-transparent to-pink-200/50"
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Confetti layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((particle) => (
          <ConfettiParticle
            key={particle.id}
            delay={particle.delay}
            x={particle.x}
            color={particle.color}
          />
        ))}
      </div>

      {/* Sparkles layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {sparkles.map((sparkle) => (
          <Sparkle
            key={sparkle.id}
            delay={sparkle.delay}
            x={sparkle.x}
            y={sparkle.y}
          />
        ))}
      </div>

      {/* Floating emojis */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {emojis.map((emoji, i) => (
          <FloatingEmoji
            key={i}
            emoji={emoji}
            delay={i * 0.5}
            x={5 + i * 12}
          />
        ))}
      </div>

      {/* Radial glow behind prize */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(255,215,0,0.4), rgba(255,255,255,0.2) 35%, transparent 60%)",
          }}
        />
      </motion.div>

      {/* Animated light rays */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-[200%] w-4 bg-gradient-to-b from-yellow-200/60 via-yellow-100/30 to-transparent origin-bottom"
            style={{
              left: "50%",
              bottom: "45%",
              transform: `translateX(-50%) rotate(${i * 45}deg)`,
            }}
            animate={{
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 2,
              delay: i * 0.15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>

      <AnimatePresence>
        {showContent && (
          <div className="relative z-10 h-full w-full px-6 py-8 flex flex-col items-center justify-between text-center">
            {/* Header */}
            <motion.div
              className="space-y-2"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: "backOut" }}
            >
              <motion.div
                className="text-xs tracking-[0.35em] uppercase text-amber-600 font-semibold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                🎊 Prize Unlocked 🎊
              </motion.div>
              <motion.h2
                className="font-display text-5xl md:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500"
                style={{
                  textShadow:
                    "0 4px 12px rgba(255,165,0,0.3), 0 2px 4px rgba(0,0,0,0.1)",
                  WebkitTextStroke: "2px rgba(255,255,255,0.5)",
                }}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.2,
                }}
              >
                YOU WIN!
              </motion.h2>
            </motion.div>

            {/* Prize display */}
            <motion.div
              className="flex flex-col items-center gap-5"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 150,
                damping: 20,
                delay: 0.4,
              }}
            >
              <div className="relative">
                {/* Animated glow rings */}
                <motion.div
                  className="absolute -inset-6 rounded-full border-4 border-yellow-300/50"
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="absolute -inset-10 rounded-full border-2 border-orange-200/40"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                {/* Prize glow */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 blur-2xl"
                  animate={{
                    opacity: [0.4, 0.7, 0.4],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                {/* Prize container */}
                <motion.div
                  className="relative h-52 w-52 md:h-64 md:w-64 rounded-full bg-white border-4 border-yellow-300 shadow-2xl overflow-hidden flex items-center justify-center"
                  style={{
                    boxShadow:
                      "0 0 60px rgba(255,215,0,0.4), 0 10px 40px rgba(0,0,0,0.15)",
                  }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {prizeImageUrl ? (
                    <motion.img
                      src={prizeImageUrl}
                      alt={prizeName ? `${prizeName} prize` : "Prize"}
                      className="h-full w-full object-contain p-6"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 150,
                        damping: 15,
                        delay: 0.6,
                      }}
                    />
                  ) : (
                    <motion.div
                      className="text-7xl"
                      animate={{
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 1,
                      }}
                    >
                      🏆
                    </motion.div>
                  )}
                </motion.div>

                {/* Rotating sparkle ring */}
                <motion.div
                  className="absolute -inset-4 pointer-events-none"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  {[0, 72, 144, 216, 288].map((deg, i) => (
                    <motion.span
                      key={i}
                      className="absolute text-xl"
                      style={{
                        top: "50%",
                        left: "50%",
                        transform: `rotate(${deg}deg) translateY(-140px) rotate(-${deg}deg)`,
                      }}
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.7, 1, 0.7],
                      }}
                      transition={{
                        duration: 1.5,
                        delay: i * 0.2,
                        repeat: Infinity,
                      }}
                    >
                      ⭐
                    </motion.span>
                  ))}
                </motion.div>
              </div>

              {/* Prize name badge */}
              {prizeName && (
                <motion.div
                  className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-300 shadow-lg"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                >
                  <span className="text-amber-800 font-bold text-xl">
                    {prizeName}
                  </span>
                </motion.div>
              )}
            </motion.div>

            {/* Action buttons */}
            <motion.div
              className="w-full max-w-sm flex flex-col gap-3"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              {onRedeem && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <CTAButton
                    variant="orange"
                    size="sm"
                    onClick={onRedeem}
                    className="w-full shadow-lg"
                  >
                    REDEEM PRIZE
                  </CTAButton>
                </motion.div>
              )}
              {onSaveForLater && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <CTAButton
                    variant="pink"
                    size="sm"
                    onClick={onSaveForLater}
                    className="w-full"
                  >
                    SAVE FOR LATER
                  </CTAButton>
                </motion.div>
              )}
              {onViewCollection && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <CTAButton
                    variant="pink"
                    size="sm"
                    onClick={onViewCollection}
                    className="w-full"
                  >
                    VIEW COLLECTION
                  </CTAButton>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
