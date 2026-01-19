"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import Card from "@/components/ui/Card";

export type LoadingScreenProps = {
  gameName?: string;
  message?: string;
};

export function LoadingScreen({ gameName, message }: LoadingScreenProps) {
  const [dots, setDots] = useState("");
  const [clawY, setClawY] = useState(0);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Claw bobbing animation
  useEffect(() => {
    const interval = setInterval(() => {
      setClawY((y) => (y === 0 ? 8 : 0));
    }, 600);
    return () => clearInterval(interval);
  }, []);

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

      {/* Main content card */}
      <Card
        variant="arcade"
        shadowColor="pink"
        padding="xl"
        className="relative z-10 mx-4 max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div
            className="relative transition-transform duration-300"
            style={{ transform: `translateY(${clawY}px)` }}
          >
            <Image
              src="/images/logo.png"
              alt="Gashapon Logo"
              width={100}
              height={100}
              className="drop-shadow-lg"
            />
          </div>
        </div>

        {/* Title */}
        <h2 className="font-display text-2xl md:text-3xl text-center text-pastel-coral mb-2 tracking-wide text-outline-xl">
          {gameName || "GASHAPON"}
        </h2>

        {/* Loading text */}
        <div className="text-center mb-6">
          <p className="text-xl font-display text-pastel-text">
            Getting your prize{dots}
          </p>
          <p className="text-sm text-pastel-textLight mt-2 font-medium">
            {message || "Processing on Solana blockchain"}
          </p>
        </div>

        {/* Cute progress bar */}
        <div className="relative">
          <div className="w-full h-4 bg-pastel-pinkLight rounded-full overflow-hidden border-2 border-pastel-pink">
            <div
              className="h-full bg-gradient-to-r from-pastel-coral via-pastel-peach to-pastel-coral rounded-full"
              style={{
                animation: "progress-slide 1.5s ease-in-out infinite",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
          {/* Decorative dots on progress bar */}
          <div className="absolute top-1/2 -translate-y-1/2 left-2 w-2 h-2 bg-white/60 rounded-full" />
          <div className="absolute top-1/2 -translate-y-1/2 right-2 w-2 h-2 bg-white/60 rounded-full" />
        </div>

        {/* Bouncing coins decoration */}
        <div className="flex justify-center gap-3 mt-6">
          <span
            className="text-2xl"
            style={{ animation: "bounce-coin 0.6s ease-in-out infinite" }}
          >
            🪙
          </span>
          <span
            className="text-2xl"
            style={{ animation: "bounce-coin 0.6s ease-in-out infinite 0.2s" }}
          >
            🎀
          </span>
          <span
            className="text-2xl"
            style={{ animation: "bounce-coin 0.6s ease-in-out infinite 0.4s" }}
          >
            🪙
          </span>
        </div>
      </Card>

      {/* Bottom decoration */}
      <div className="absolute bottom-4 text-center z-10">
        <p className="text-pink-400/80 text-xs font-medium">✨ Good luck! ✨</p>
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
        @keyframes wiggle {
          0%,
          100% {
            transform: translateX(-50%) rotate(-3deg);
          }
          50% {
            transform: translateX(-50%) rotate(3deg);
          }
        }
        @keyframes progress-slide {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        @keyframes bounce-coin {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </div>
  );
}
