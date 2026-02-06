"use client";

import Card from "@/components/ui/Card";
import { PlayEvent } from "@/hooks/useBroadcastQueue";
import { cn } from "@/utils/helpers";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

interface QueuePanelProps {
  queue: PlayEvent[];
  currentPlay: PlayEvent | null;
  maxVisible?: number;
}

function truncateWallet(wallet: string) {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export function QueuePanel({
  queue,
  currentPlay,
  maxVisible = 8,
}: QueuePanelProps) {
  const visibleQueue = queue.slice(0, maxVisible);

  return (
    <div
      className={cn(
        "w-96 h-full flex flex-col",
        "bg-gradient-to-b from-[#f5ede3] via-[#f0e8dc] to-[#e8ddd0]",
        "rounded-2xl border-2 border-[#d9ccbb]",
        "shadow-[0_4px_30px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.6)]",
        "overflow-hidden"
      )}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#d9ccbb]/60 bg-gradient-to-r from-[#ede5da] to-[#f0e8dc]">
        <h3 className="font-display text-lg text-[#6b6157] flex items-center gap-2">
          Up Next
          {queue.length > 0 && (
            <span className="ml-auto bg-pastel-coral text-white text-sm font-bold px-3 py-1 rounded-full">
              {queue.length}
            </span>
          )}
        </h3>
      </div>

      {/* Current play indicator */}
      {currentPlay && (
        <div className="px-5 py-3 bg-pastel-yellow/20 border-b border-pastel-yellow/30">
          <p className="text-xs text-[#8a7e70] font-medium tracking-wider mb-1">
            NOW PLAYING
          </p>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-red-500"
            />
            <span className="text-base font-medium text-[#5a5148] truncate">
              {truncateWallet(currentPlay.userWallet)}
            </span>
          </div>
        </div>
      )}

      {/* Queue list */}
      <div className="flex-1 overflow-hidden px-4 py-3">
        <AnimatePresence mode="popLayout">
          {visibleQueue.length > 0 ? (
            visibleQueue.map((play, index) => (
              <motion.div
                key={play.id}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0, height: 0, marginBottom: 0 }}
                transition={{
                  type: "spring",
                  damping: 20,
                  delay: index * 0.05,
                }}
                layout
                className="mb-2.5"
              >
                <Card
                  variant="arcade"
                  shadowColor="mint"
                  padding="sm"
                  className="bg-white/90"
                >
                  <div className="flex items-center gap-3">
                    {/* Channel number */}
                    <div className="w-7 h-7 rounded-md bg-[#2a2a2a] flex items-center justify-center shrink-0">
                      <span className="text-xs font-display text-green-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Player avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pastel-sky to-pastel-lavender flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">
                        {play.userWallet.slice(0, 2).toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#5a5148] truncate">
                        {truncateWallet(play.userWallet)}
                      </p>
                      <div className="flex items-center gap-1">
                        {play.gameImage && (
                          <div className="relative w-4 h-4 rounded overflow-hidden">
                            <Image
                              src={play.gameImage}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <p className="text-xs text-[#8a7e70] truncate">
                          {play.gameName}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center py-8"
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 rounded-full bg-pastel-coral/10 flex items-center justify-center mb-4"
              >
                <div className="w-8 h-8 rounded-full border-3 border-pastel-coral/40 border-dashed" />
              </motion.div>
              <p className="text-[#8a7e70] text-base">
                Waiting for players...
              </p>
              <p className="text-[#a89e90] text-sm mt-1">
                New plays will appear here
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {queue.length > maxVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-2"
          >
            <span className="text-xs text-[#a89e90]">
              +{queue.length - maxVisible} more in queue
            </span>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#d9ccbb]/60 bg-[#ede5da]/50">
        <div className="flex items-center justify-between text-xs text-[#8a7e70]">
          <span>Total queued</span>
          <span className="font-medium text-[#5a5148] text-sm">{queue.length}</span>
        </div>
      </div>
    </div>
  );
}
