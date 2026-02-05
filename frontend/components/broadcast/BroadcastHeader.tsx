"use client";

import { cn } from "@/utils/helpers";
import { motion } from "framer-motion";

interface BroadcastHeaderProps {
  queueLength: number;
  isLive?: boolean;
}

export function BroadcastHeader({
  queueLength,
  isLive = true,
}: BroadcastHeaderProps) {
  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-4">
      {/* Logo and LIVE indicator */}
      <div className="flex items-center gap-4">
        {/* LIVE Badge */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={cn(
              "w-3 h-3 rounded-full",
              isLive ? "bg-white" : "bg-red-300",
            )}
          />
          <span className="font-display text-sm tracking-wider">LIVE</span>
        </motion.div>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl text-pastel-coral text-outline-sm">
            GASHAPON
          </span>
          <span className="text-pastel-text text-sm font-medium">LIVE</span>
        </div>
      </div>

      {/* Center - Decorative sparkles */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-pastel-yellow">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="text-lg"
        >
          ✦
        </motion.span>
        <motion.span
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-xl"
        >
          ★
        </motion.span>
        <motion.span
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="text-lg"
        >
          ✦
        </motion.span>
      </div>

      {/* Right side - Queue stats */}
      <div className="flex items-center gap-4">
        {queueLength > 0 && (
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border-2 border-pastel-mint shadow-md"
          >
            <span className="text-pastel-text text-sm">Queue:</span>
            <span className="font-display text-lg text-pastel-coral">
              {queueLength}
            </span>
          </motion.div>
        )}

        {/* Time indicator */}
        <div className="text-pastel-text/70 text-sm font-medium">
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </header>
  );
}
