"use client";

import Card from "@/components/ui/Card";
import { PlayEvent } from "@/hooks/useBroadcastQueue";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

interface QueuePanelProps {
  queue: PlayEvent[];
  currentPlay: PlayEvent | null;
  maxVisible?: number;
}

// Truncate wallet for display
function truncateWallet(wallet: string) {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export function QueuePanel({
  queue,
  currentPlay,
  maxVisible = 5,
}: QueuePanelProps) {
  const visibleQueue = queue.slice(0, maxVisible);

  return (
    <div className="w-80 h-full bg-white/30 backdrop-blur-md border-l border-white/50 flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/30">
        <h3 className="font-display text-lg text-pastel-text flex items-center gap-2">
          <span className="text-xl">📋</span>
          Up Next
          {queue.length > 0 && (
            <span className="ml-auto bg-pastel-coral text-white text-xs font-bold px-2 py-1 rounded-full">
              {queue.length}
            </span>
          )}
        </h3>
      </div>

      {/* Current play indicator */}
      {currentPlay && (
        <div className="px-4 py-3 bg-pastel-yellow/30 border-b border-pastel-yellow/50">
          <p className="text-xs text-pastel-text/60 mb-1">NOW PLAYING</p>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-red-500"
            />
            <span className="text-sm font-medium text-pastel-text truncate">
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
                transition={{ type: "spring", damping: 20, delay: index * 0.05 }}
                layout
                className="mb-3"
              >
                <Card
                  variant="arcade"
                  shadowColor="mint"
                  padding="sm"
                  className="bg-white/90"
                >
                  <div className="flex items-center gap-3">
                    {/* Position number */}
                    <div className="w-6 h-6 rounded-full bg-pastel-mint flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-white">
                        {index + 1}
                      </span>
                    </div>

                    {/* Player avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pastel-sky to-pastel-lavender flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">
                        {play.userWallet.slice(0, 2).toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-pastel-text truncate">
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
                        <p className="text-xs text-pastel-text/60 truncate">
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
              className="h-full flex flex-col items-center justify-center text-center"
            >
              <motion.span
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-4xl mb-3"
              >
                🎯
              </motion.span>
              <p className="text-pastel-text/60 text-sm">
                Waiting for players...
              </p>
              <p className="text-pastel-text/40 text-xs mt-1">
                New plays will appear here
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* More in queue indicator */}
        {queue.length > maxVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-2"
          >
            <span className="text-xs text-pastel-text/50">
              +{queue.length - maxVisible} more in queue
            </span>
          </motion.div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-3 border-t border-white/30 bg-white/20">
        <div className="flex items-center justify-between text-xs text-pastel-text/60">
          <span>Total queued</span>
          <span className="font-medium text-pastel-text">{queue.length}</span>
        </div>
      </div>
    </div>
  );
}
