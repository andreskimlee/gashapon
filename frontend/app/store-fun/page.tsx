/**
 * store.fun White-label Landing Page
 *
 * Dark theme with royal blue accents - matching store.fun's brand
 * while letting Grabbit's playful character shine through.
 */

"use client";

import { motion } from "framer-motion";
import { Gamepad2, Gift, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import CTAButton from "@/components/ui/CTAButton";
import Loading from "@/components/ui/Loading";
import { useGame } from "@/hooks/api/useGames";
import { useTokenCost } from "@/hooks/useTokenCost";

// store.fun partnership game ID
const STORE_FUN_GAME_ID = 24;

// Royal blue theme colors
const THEME = {
  primary: "#4169E1", // Royal blue
  primaryLight: "#6B8DD6",
  primaryDark: "#2E4BA0",
  glow: "rgba(65, 105, 225, 0.4)",
};

function HeroSection() {
  return (
    <section className="relative py-8 md:py-12 px-4">
      <div className="container mx-auto text-center relative z-10">
        {/* Playful header badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-400/30 mb-6"
        >
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-gray-300">
            Exclusive Claw Machine
          </span>
        </motion.div>

        {/* Title - royal blue gradient */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="font-display text-4xl md:text-6xl text-white mb-4"
        >
          WIN{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            AMAZING
          </span>{" "}
          PRIZES
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-gray-400 max-w-xl mx-auto"
        >
          Play the store.fun claw machine powered by Grabbit
        </motion.p>
      </div>
    </section>
  );
}

function GameCard() {
  const { game, loading, error } = useGame(STORE_FUN_GAME_ID);

  const costUsdCents = game?.costInUsd
    ? Number(game.costInUsd) * 100
    : undefined;
  const { tokenAmountFormatted, loading: priceLoading } = useTokenCost(
    game?.currencyTokenMintAddress,
    costUsdCents,
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loading size="lg" />
        <p className="mt-4 text-gray-400">Loading game...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="text-center py-20">
        <p className="text-blue-400 text-xl mb-4">Failed to load game</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <section className="relative px-4 pb-8">
      <div className="container mx-auto max-w-6xl">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Featured Game</h2>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live
          </div>
        </div>

        {/* Main game card - LARGER with royal blue accents */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <Link href={`/games/${game.id}`}>
            <div className="group relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl border border-gray-700/50 overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_60px_rgba(65,105,225,0.2)]">
              {/* Image section - LARGE */}
              <div className="relative w-full h-[300px] md:h-[420px] bg-gradient-to-br from-blue-600/20 to-indigo-600/20">
                {game.imageUrl ? (
                  <Image
                    src={game.imageUrl}
                    alt={game.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <Gamepad2 className="w-24 h-24 text-gray-600" />
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />

                {/* Floating plays badge */}
                {typeof game.totalPlays === "number" && (
                  <div className="absolute top-4 left-4 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-sm font-medium text-white flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4" />
                    {game.totalPlays.toLocaleString()} plays
                  </div>
                )}

                {/* Game title overlay on image */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <h3 className="font-display text-3xl md:text-4xl text-white mb-2 group-hover:text-blue-300 transition-colors drop-shadow-lg">
                    {game.name.toUpperCase()}
                  </h3>
                  <p className="text-gray-300 text-base max-w-xl">
                    Try your luck at the claw machine and win exclusive prizes!
                  </p>
                </div>
              </div>

              {/* Content section */}
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  {/* Prize preview */}
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                      Prize Preview
                    </p>
                    <div className="flex gap-3">
                      {game.prizes?.slice(0, 4).map((prize, i) => (
                        <motion.div
                          key={prize.prizeId}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 + i * 0.1 }}
                          className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gray-700/50 border border-gray-600/50 overflow-hidden group-hover:border-blue-500/30 transition-colors"
                        >
                          {prize.imageUrl ? (
                            <Image
                              src={prize.imageUrl}
                              alt={prize.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Gift className="w-6 h-6 text-gray-500" />
                            </div>
                          )}
                        </motion.div>
                      ))}
                      {(game.prizes?.length || 0) > 4 && (
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gray-700/30 border border-gray-600/30 flex items-center justify-center text-sm text-gray-400">
                          +{(game.prizes?.length || 0) - 4}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price and CTA */}
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Price</p>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold text-white">
                          {game.costInUsd
                            ? `$${Number(game.costInUsd).toFixed(2)}`
                            : priceLoading
                              ? "..."
                              : `${tokenAmountFormatted || "?"}`}
                        </span>
                        {!game.costInUsd && (
                          <div className="relative w-8 h-8 rounded-full overflow-hidden">
                            <Image
                              src="/images/coin-images/store.fun.avif"
                              alt="token"
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <CTAButton
                      variant="royalBlue"
                      className="px-10 py-4 text-lg group-hover:scale-105 transition-transform"
                    >
                      PLAY NOW
                    </CTAButton>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// Interactive How It Works section
function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      icon: Wallet,
      title: "Connect Wallet",
      desc: "Link your Solana wallet to get started. We support Phantom, Solflare, and more.",
      color: "blue",
      details: [
        "Click the Connect button",
        "Approve the connection",
        "Ready to play!",
      ],
    },
    {
      icon: Gamepad2,
      title: "Play the Game",
      desc: "Control the claw machine and try to grab your favorite prize.",
      color: "indigo",
      details: [
        "Choose your timing",
        "Watch the claw descend",
        "Hope for the grab!",
      ],
    },
    {
      icon: Gift,
      title: "Win & Redeem",
      desc: "Win NFTs that can be redeemed for real physical prizes shipped to you.",
      color: "purple",
      details: [
        "Receive your NFT",
        "Enter shipping details",
        "Get your prize!",
      ],
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="relative px-4 py-16"
    >
      <div className="container mx-auto max-w-6xl">
        {/* Section header */}
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-display text-white mb-4"
          >
            HOW IT{" "}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              WORKS
            </span>
          </motion.h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Three simple steps to win amazing prizes
          </p>
        </div>

        {/* Interactive steps */}
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Step selector */}
          <div className="space-y-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isActive = activeStep === i;

              return (
                <motion.button
                  key={step.title}
                  onClick={() => setActiveStep(i)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-blue-500/50 shadow-[0_0_30px_rgba(65,105,225,0.15)]"
                      : "bg-gray-800/30 border-gray-700/50 hover:border-gray-600/50"
                  }`}
                  whileHover={{ x: isActive ? 0 : 8 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-4">
                    {/* Step number with icon */}
                    <div
                      className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30"
                          : "bg-gray-700/50"
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${isActive ? "text-white" : "text-gray-400"}`}
                      />
                      {/* Step number badge */}
                      <div
                        className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isActive
                            ? "bg-white text-blue-600"
                            : "bg-gray-600 text-gray-300"
                        }`}
                      >
                        {i + 1}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3
                        className={`font-bold text-lg mb-1 transition-colors ${
                          isActive ? "text-white" : "text-gray-300"
                        }`}
                      >
                        {step.title}
                      </h3>
                      <p
                        className={`text-sm transition-colors ${
                          isActive ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        {step.desc}
                      </p>
                    </div>

                    {/* Arrow indicator */}
                    <motion.div
                      animate={{
                        x: isActive ? 0 : -8,
                        opacity: isActive ? 1 : 0,
                      }}
                      className="text-blue-400 text-xl"
                    >
                      →
                    </motion.div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Visual display */}
          <div className="relative">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-3xl border border-gray-700/50 p-8 overflow-hidden"
            >
              {/* Background glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />

              {/* Large icon */}
              <div className="relative z-10 mb-6">
                <motion.div
                  animate={{
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-xl shadow-blue-500/30 mx-auto"
                >
                  {(() => {
                    const Icon = steps[activeStep].icon;
                    return <Icon className="w-12 h-12 text-white" />;
                  })()}
                </motion.div>
              </div>

              {/* Step details */}
              <div className="relative z-10 text-center">
                <h4 className="font-display text-2xl text-white mb-4">
                  {steps[activeStep].title}
                </h4>
                <div className="space-y-3">
                  {steps[activeStep].details.map((detail, i) => (
                    <motion.div
                      key={detail}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 text-gray-300 bg-gray-700/30 rounded-xl px-4 py-3"
                    >
                      <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-sm flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      {detail}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default function StoreFunPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#0a0d14] via-[#0f1420] to-[#0a0d14]">
      <HeroSection />
      <GameCard />
      <HowItWorks />
    </div>
  );
}
