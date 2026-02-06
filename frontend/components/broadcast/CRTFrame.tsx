"use client";

import { cn } from "@/utils/helpers";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface CRTFrameProps {
  children: ReactNode;
  isLive?: boolean;
  queueLength?: number;
  className?: string;
}

export function CRTFrame({
  children,
  isLive = true,
  queueLength = 0,
  className,
}: CRTFrameProps) {
  return (
    <div className={cn("relative flex flex-col", className)}>
      {/* TV Body - fills available space */}
      <div
        className={cn(
          "relative flex-1 flex flex-col rounded-[2.5rem] overflow-hidden",
          "bg-gradient-to-b from-[#f5ede3] via-[#f0e8dc] to-[#e8ddd0]",
          "shadow-[0_8px_60px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.6)]",
          "border-2 border-[#d9ccbb]"
        )}
      >
        {/* Top bezel */}
        <div className="relative h-12 flex items-center justify-end px-8 shrink-0">
          {/* LIVE indicator + queue */}
          <div className="flex items-center gap-3">
            {queueLength > 0 && (
              <div className="bg-white/60 backdrop-blur-sm rounded-full px-3 py-1 border border-pastel-mint/50">
                <span className="text-xs font-medium text-pastel-text">
                  {queueLength} in queue
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-red-500/90 rounded-full px-3 py-1">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={cn(
                  "w-2 h-2 rounded-full",
                  isLive ? "bg-white" : "bg-red-300"
                )}
              />
              <span className="font-display text-xs text-white tracking-wider">
                LIVE
              </span>
            </div>
          </div>
        </div>

        {/* Screen area - fills remaining space */}
        <div className="relative flex-1 mx-5 mb-5">
          <div
            className={cn(
              "relative h-full rounded-2xl overflow-hidden",
              "bg-[#1a1a2e]",
              "shadow-[inset_0_4px_30px_rgba(0,0,0,0.6),inset_0_0_80px_rgba(0,0,0,0.3)]"
            )}
          >
            {/* Screen content */}
            <div className="relative w-full h-full">
              {children}
            </div>

            {/* Scan line overlay */}
            <div
              className="absolute inset-0 pointer-events-none z-40 opacity-[0.03]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)",
                backgroundSize: "100% 2px",
              }}
            />

            {/* CRT vignette */}
            <div
              className="absolute inset-0 pointer-events-none z-40"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.2) 100%)",
              }}
            />

            {/* Subtle screen reflection */}
            <div
              className="absolute inset-0 pointer-events-none z-40 opacity-[0.03]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, transparent 40%, transparent 100%)",
              }}
            />
          </div>
        </div>

        {/* Bottom bezel - controls */}
        <div className="relative h-16 flex items-center justify-between px-10 pb-3 shrink-0">
          {/* Left knobs */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className={cn(
                  "w-10 h-10 rounded-full",
                  "bg-gradient-to-b from-pastel-coral to-[#e8949a]",
                  "shadow-[0_2px_6px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.3)]",
                  "border border-[#d4888e]"
                )}
              >
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-white/50 rounded-full" />
              </div>
            </div>
            <div className="relative">
              <div
                className={cn(
                  "w-10 h-10 rounded-full",
                  "bg-gradient-to-b from-pastel-mint to-[#8ad4b5]",
                  "shadow-[0_2px_6px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.3)]",
                  "border border-[#7cc4a5]"
                )}
              >
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-white/50 rounded-full" />
              </div>
            </div>
          </div>

          {/* Center branding */}
          <div className="flex items-center gap-3">
            <span className="font-display text-xl text-[#8a7e70] tracking-wider drop-shadow-sm">
              GRABBIT
            </span>
            <span className="text-xs text-[#a89e90] font-medium tracking-widest">
              LIVE
            </span>
          </div>

          {/* Right - speaker grill */}
          <div className="flex flex-col gap-1.5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-12 h-[2px] bg-[#c4b5a0] rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
