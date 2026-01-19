"use client";

import Card from "@/components/ui/Card";
import CTAButton from "@/components/ui/CTAButton";

export type LoseScreenProps = {
  gameName?: string;
  onPlayAgain?: () => void;
};

export function LoseScreen({ onPlayAgain }: LoseScreenProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden">
      {/* Soft pastel gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-pastel-sky via-pastel-lavender to-pastel-pinkLight" />

      {/* Floating clouds (slower, calming) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[10%] -left-20 w-40 h-20 bg-white/60 rounded-full blur-sm"
          style={{ animation: "float-cloud-calm 10s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[30%] -right-16 w-32 h-16 bg-white/50 rounded-full blur-sm"
          style={{ animation: "float-cloud-calm 12s ease-in-out infinite 2s" }}
        />
        <div
          className="absolute bottom-[20%] left-[10%] w-24 h-12 bg-white/40 rounded-full blur-sm"
          style={{ animation: "float-cloud-calm 14s ease-in-out infinite 4s" }}
        />
      </div>

      {/* Gentle sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[25%] left-[20%] text-xl opacity-60"
          style={{ animation: "gentle-sparkle 2s ease-in-out infinite" }}
        >
          ✨
        </div>
        <div
          className="absolute top-[20%] right-[25%] text-lg opacity-50"
          style={{ animation: "gentle-sparkle 2s ease-in-out infinite 0.7s" }}
        >
          💫
        </div>
        <div
          className="absolute bottom-[30%] right-[20%] text-xl opacity-60"
          style={{ animation: "gentle-sparkle 2s ease-in-out infinite 1.4s" }}
        >
          ⭐
        </div>
      </div>

      {/* Main content card */}
      <Card
        variant="arcade"
        shadowColor="purple"
        padding="xl"
        className="relative z-10 mx-4 max-w-md text-center"
      >
        {/* Cute sad face that becomes encouraging */}
        <div className="flex justify-center mb-4">
          <div
            className="text-6xl"
            style={{ animation: "wiggle-sad 2s ease-in-out infinite" }}
          >
            🎰
          </div>
        </div>

        {/* Lose message - encouraging! */}
        <h2 className="font-display text-3xl text-pastel-coral mb-2 text-outline-xl">
          SO CLOSE!
        </h2>
        <p className="text-pastel-textLight text-base mb-2">
          The prize slipped away... 💨
        </p>
        <p className="text-pastel-coral text-sm mb-6 font-medium">
          ✨ Don't give up! Try again! ✨
        </p>

        {/* Encouraging message box */}
        <div className="mb-6 px-5 py-3 rounded-2xl bg-pastel-lavender/50 border-2 border-pastel-purple/30">
          <p className="text-sm text-pastel-textLight">
            🍀 Every try gets you closer to winning!
          </p>
        </div>

        {/* Play again button */}
        {onPlayAgain && (
          <CTAButton
            variant="orange"
            size="sm"
            onClick={onPlayAgain}
            className="w-full"
          >
            TRY AGAIN
          </CTAButton>
        )}

        {/* Hearts decoration */}
        <div className="flex justify-center gap-2 mt-4">
          <span className="text-pastel-pink text-lg">💕</span>
          <span className="text-pastel-purple text-lg">💜</span>
          <span className="text-pastel-sky text-lg">💙</span>
        </div>
      </Card>

      {/* Bottom encouragement */}
      <div className="absolute bottom-6 text-center z-10">
        <p className="text-pastel-textLight text-xs font-medium">
          🌟 Winners never quit! 🌟
        </p>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes float-cloud-calm {
          0%,
          100% {
            transform: translateX(0) translateY(0);
          }
          50% {
            transform: translateX(10px) translateY(-5px);
          }
        }
        @keyframes gentle-sparkle {
          0%,
          100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(0.9);
          }
        }
        @keyframes wiggle-sad {
          0%,
          100% {
            transform: rotate(-3deg);
          }
          50% {
            transform: rotate(3deg);
          }
        }
      `}</style>
    </div>
  );
}
