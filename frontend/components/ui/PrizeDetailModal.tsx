"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Badge from "./Badge";

export interface Prize {
  prizeId: number;
  name: string;
  description?: string;
  imageUrl?: string;
  tier: string;
  probabilityBasisPoints: number;
  supplyRemaining: number;
  supplyTotal: number;
}

interface PrizeDetailModalProps {
  prize: Prize | null;
  onClose: () => void;
}

export default function PrizeDetailModal({ prize, onClose }: PrizeDetailModalProps) {
  if (!prize) return null;

  return (
    <AnimatePresence>
      {prize && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-[#111827]/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal - Arcade style */}
          <motion.div
            className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl"
            style={{
              border: '2px solid #111827',
              borderRight: '4px solid #111827',
              borderBottom: '5px solid #111827',
            }}
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            {/* Header */}
            <div className="bg-pastel-mint px-6 py-4 border-b-2 border-[#111827] flex items-center justify-between">
              <h2 className="font-display text-xl text-[#111827] truncate pr-4">
                {prize.name.toUpperCase()}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white border-2 border-[#111827] hover:bg-pastel-pinkLight transition-colors flex-shrink-0"
                style={{ boxShadow: '2px 2px 0 #111827' }}
              >
                <X className="w-4 h-4 text-[#111827]" />
              </button>
            </div>

            <div className="p-6">
              {/* Large Prize Image */}
              <div 
                className="w-full aspect-square rounded-xl bg-pastel-pinkLight/50 flex items-center justify-center overflow-hidden border-2 border-[#111827] mb-5"
                style={{ boxShadow: '4px 4px 0 #111827' }}
              >
                {prize.imageUrl ? (
                  <img
                    src={prize.imageUrl}
                    alt={prize.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-8xl">⭐</span>
                )}
              </div>

              {/* Prize Details */}
              <div className="space-y-4">
                {/* Tier Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#111827] uppercase">Tier</span>
                  <Badge variant={prize.tier as any} size="md">
                    {prize.tier}
                  </Badge>
                </div>

                {/* Description */}
                {prize.description && (
                  <div>
                    <span className="text-sm font-bold text-[#111827] uppercase block mb-1">Description</span>
                    <p className="text-pastel-textLight text-sm">{prize.description}</p>
                  </div>
                )}

                {/* Supply Bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-bold text-[#111827] uppercase">Remaining</span>
                    <span className="text-pastel-textLight font-mono">
                      {prize.supplyRemaining} / {prize.supplyTotal}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-[#E9EEF2] border-2 border-[#111827] overflow-hidden">
                    <motion.div
                      className="h-full bg-pastel-mint"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${Math.max(0, Math.min(100, (prize.supplyRemaining / prize.supplyTotal) * 100))}%` 
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
