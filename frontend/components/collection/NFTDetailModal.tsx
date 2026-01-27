"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

import { CometCard } from "@/components/ui/comet-card";
import CTAButton from "@/components/ui/CTAButton";
import type { NFT } from "@/types/api/nfts";

interface NFTDetailModalProps {
  nft: NFT | null;
  onClose: () => void;
  onRedeem: () => void;
  onClaim?: () => void;
  isClaiming?: boolean;
}

const tierColors = {
  common: "bg-gray-100 text-gray-600 border-gray-300",
  uncommon: "bg-teal-100 text-teal-700 border-teal-300",
  rare: "bg-purple-100 text-purple-700 border-purple-300",
  legendary: "bg-amber-100 text-amber-700 border-amber-300",
};

export default function NFTDetailModal({
  nft,
  onClose,
  onRedeem,
  onClaim,
  isClaiming,
}: NFTDetailModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (nft) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [nft]);

  const isPending = nft?.isPending === true;

  return (
    <AnimatePresence>
      {nft && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            className="relative z-10 w-full max-w-sm"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-2 -right-2 z-20 w-10 h-10 rounded-full bg-white border-2 border-[#111827] flex items-center justify-center hover:bg-gray-100 transition-colors"
              style={{ boxShadow: "2px 3px 0 #111827" }}
            >
              <X className="w-5 h-5 text-[#111827]" />
            </button>

            <CometCard rotateDepth={12} translateDepth={15}>
              <div
                className="flex flex-col rounded-2xl bg-white border-2 border-[#111827] overflow-hidden"
                style={{ boxShadow: "6px 8px 0 #8ECCC1" }}
              >
                {/* Image */}
                <div className="aspect-square w-full bg-[#E9EEF2] relative">
                  {nft.imageUrl ? (
                    <img
                      src={nft.imageUrl}
                      alt={nft.name || "Prize"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-8xl">🎁</span>
                    </div>
                  )}

                  {/* Tier badge overlay */}
                  {nft.tier && (
                    <div className="absolute top-3 left-3">
                      <span
                        className={`
                          inline-block px-3 py-1 rounded-full text-sm font-bold uppercase border
                          ${tierColors[nft.tier as keyof typeof tierColors] || tierColors.common}
                        `}
                      >
                        {nft.tier}
                      </span>
                    </div>
                  )}

                  {/* Pending badge */}
                  {isPending && (
                    <div className="absolute top-3 right-3 px-3 py-1 bg-amber-400 text-amber-900 text-sm font-bold rounded-full animate-pulse">
                      NEW
                    </div>
                  )}

                  {/* Redeemed overlay */}
                  {nft.isRedeemed && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="bg-emerald-500 text-white px-4 py-2 rounded-full font-bold text-lg">
                        ✓ REDEEMED
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Section */}
                <div className="p-5">
                  <h2 className="font-display text-2xl text-[#111827] mb-2">
                    {nft.name?.toUpperCase() || `PRIZE #${nft.prizeId}`}
                  </h2>

                  {/* Description if available */}
                  {nft.description && (
                    <p className="text-pastel-textLight text-sm mb-4 line-clamp-2">
                      {nft.description}
                    </p>
                  )}

                  {/* Mint address */}
                  <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
                    <span className="text-xs text-pastel-textLight">Mint:</span>
                    <span className="text-xs font-mono text-[#111827] truncate">
                      {isPending
                        ? "Pending on-chain claim"
                        : `${nft.mintAddress.slice(0, 12)}...${nft.mintAddress.slice(-8)}`}
                    </span>
                  </div>

                  {/* Redeemed info */}
                  {nft.isRedeemed && nft.redeemedAt && (
                    <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-sm text-emerald-700">
                        <span className="font-bold">Redeemed:</span>{" "}
                        {new Date(nft.redeemedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  {isPending ? (
                    <CTAButton
                      variant="orange"
                      size="lg"
                      className="w-full"
                      disabled={isClaiming}
                      onClick={onClaim}
                    >
                      {isClaiming ? "CLAIMING..." : "CLAIM NFT"}
                    </CTAButton>
                  ) : !nft.isRedeemed ? (
                    <CTAButton
                      variant="pink"
                      size="lg"
                      className="w-full"
                      onClick={onRedeem}
                    >
                      REDEEM FOR PHYSICAL
                    </CTAButton>
                  ) : null}
                </div>
              </div>
            </CometCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
