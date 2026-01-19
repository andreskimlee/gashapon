"use client";

import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import Image from "next/image";
import { useEffect, useState } from "react";

import Card from "@/components/ui/Card";
import CTAButton from "@/components/ui/CTAButton";

export type IntroScreenProps = {
  onPlay: () => void;
  isLoading: boolean;
  isConnected: boolean;
  isActive: boolean;
  costDisplay?: string;
  gameName?: string;
};

export function IntroScreen({
  onPlay,
  isLoading,
  isConnected,
  isActive,
  costDisplay,
  gameName,
}: IntroScreenProps) {
  const [blinkVisible, setBlinkVisible] = useState(true);
  const { setVisible: setWalletModalVisible } = useWalletModal();

  // Blinking "Press Start" effect
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkVisible((v) => !v);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const canPlay = isConnected && isActive && !isLoading;

  // Handle button click - open wallet modal if not connected, otherwise play
  const handleButtonClick = () => {
    if (!isConnected) {
      setWalletModalVisible(true);
    } else if (canPlay) {
      onPlay();
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden">
      {/* Pastel sky gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-pink-100" />

      {/* Floating clouds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[10%] -left-20 w-40 h-20 bg-white/70 rounded-full blur-sm"
          style={{ animation: "float-cloud 8s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[25%] -right-16 w-32 h-16 bg-white/60 rounded-full blur-sm"
          style={{ animation: "float-cloud 10s ease-in-out infinite 2s" }}
        />
        <div
          className="absolute top-[5%] left-[30%] w-24 h-12 bg-white/50 rounded-full blur-sm"
          style={{ animation: "float-cloud 12s ease-in-out infinite 4s" }}
        />
        <div
          className="absolute bottom-[30%] -left-10 w-28 h-14 bg-white/60 rounded-full blur-sm"
          style={{ animation: "float-cloud 9s ease-in-out infinite 1s" }}
        />
      </div>

      {/* Decorative sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[20%] left-[20%] text-2xl"
          style={{ animation: "sparkle 1.5s ease-in-out infinite" }}
        >
          ✨
        </div>
        <div
          className="absolute top-[15%] right-[25%] text-xl"
          style={{ animation: "sparkle 1.5s ease-in-out infinite 0.5s" }}
        >
          ⭐
        </div>
        <div
          className="absolute bottom-[25%] left-[15%] text-lg"
          style={{ animation: "sparkle 1.5s ease-in-out infinite 1s" }}
        >
          ✨
        </div>
        <div
          className="absolute bottom-[35%] right-[20%] text-2xl"
          style={{ animation: "sparkle 1.5s ease-in-out infinite 0.3s" }}
        >
          💫
        </div>
      </div>

      {/* Main content card - game card styling */}
      <Card
        variant="arcade"
        shadowColor="pink"
        borderColor="pink"
        hover
        padding="xl"
        className="relative z-10 mx-4 max-w-md text-center"
      >
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div style={{ animation: "bounce-gentle 2s ease-in-out infinite" }}>
            <Image
              src="/images/logo.png"
              alt="Gashapon Logo"
              width={80}
              height={80}
              className="drop-shadow-lg"
            />
          </div>
        </div>

        {/* Game title with outline shadow */}
        <div className="relative mb-4">
          <h2 className="font-display text-3xl md:text-4xl text-pastel-coral tracking-wide text-outline-xl">
            {gameName || "GASHAPON"}
          </h2>
          <div className="text-pastel-textLight text-sm font-bold tracking-widest mt-1">
            ★ CLAW MACHINE ★
          </div>
        </div>

        {/* Cost display - styled like wallet balance */}
        {costDisplay && (
          <div className="mb-6 inline-flex items-center gap-2 bg-pastel-yellow rounded-full px-4 py-2 border-2 border-yellow-400/50">
            <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-yellow-500">
              <span className="text-yellow-700 text-xs font-bold">$</span>
            </div>
            <span className="text-sm font-bold text-pastel-text">
              {costDisplay}
            </span>
          </div>
        )}

        {/* Play Button using CTAButton (same as game cards) */}
        <div className="mb-4">
          <CTAButton
            variant="orange"
            size="md"
            onClick={handleButtonClick}
            disabled={isLoading || (isConnected && !isActive)}
            className="w-full"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                LOADING...
              </span>
            ) : (
              <span
                className={
                  blinkVisible && canPlay ? "opacity-100" : "opacity-90"
                }
              >
                {canPlay
                  ? "PLAY NOW"
                  : !isConnected
                    ? "CONNECT WALLET"
                    : !isActive
                      ? "INACTIVE"
                      : "PLAY NOW"}
              </span>
            )}
          </CTAButton>
        </div>

        {/* Status messages - only show when not ready */}
        {(!isConnected || !isActive) && (
          <div className="text-center">
            {!isConnected && (
              <p className="text-pastel-coral text-sm font-medium animate-pulse">
                ⚠️ Connect your wallet to play
              </p>
            )}
            {isConnected && !isActive && (
              <p className="text-red-400 text-sm font-medium">
                ❌ This game is currently inactive
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Instructions at bottom */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-10">
        <div className="inline-flex gap-4 px-5 py-2 rounded-full bg-white/80 backdrop-blur-sm border-2 border-pastel-pink shadow-sm">
          <div className="text-pastel-text text-xs font-medium flex items-center gap-1">
            <span className="px-2 py-0.5 bg-pastel-pinkLight rounded text-[10px] text-pastel-coral">
              ↑↓←→
            </span>
            <span>Move</span>
          </div>
          <div className="text-pastel-text text-xs font-medium flex items-center gap-1">
            <span className="px-2 py-0.5 bg-pastel-pinkLight rounded text-[10px] text-pastel-coral">
              SPACE
            </span>
            <span>Grab</span>
          </div>
          <div className="text-pastel-text text-xs font-medium flex items-center gap-1">
            <span className="px-2 py-0.5 bg-pastel-pinkLight rounded text-[10px] text-pastel-coral">
              DRAG
            </span>
            <span>Rotate</span>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes float-cloud {
          0%,
          100% {
            transform: translateX(0) translateY(0);
          }
          50% {
            transform: translateX(20px) translateY(-10px);
          }
        }
        @keyframes sparkle {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }
        @keyframes bounce-gentle {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}
