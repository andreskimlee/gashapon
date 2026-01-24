/**
 * Custom Wallet Modal
 * 
 * Shows token balance and disconnect option when wallet is connected.
 * Uses the existing Modal component with kawaii pastel styling.
 */

"use client";

import { motion } from "framer-motion";
import { LogOut, Wallet, Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

import Button from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { formatCompact } from "@/utils/format";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  balance: number | null;
  onDisconnect: () => void;
}

// Token contract address
const TOKEN_CA = "Cp95mjbZZnDvqCNYExmGYEzrgu6wAScf32Fmwt2Kpump";

export default function WalletModal({
  isOpen,
  onClose,
  walletAddress,
  balance,
  onDisconnect,
}: WalletModalProps) {
  const [copied, setCopied] = useState(false);
  const [caCopied, setCaCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast.success("Address copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCa = async () => {
    await navigator.clipboard.writeText(TOKEN_CA);
    setCaCopied(true);
    toast.success("Token CA copied to clipboard!");
    setTimeout(() => setCaCopied(false), 2000);
  };

  const handleDisconnect = () => {
    onDisconnect();
    onClose();
  };

  const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  const solscanUrl = `https://solscan.io/account/${walletAddress}`;

  const modalContent = (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop - clicks here close the modal */}
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden border-4 border-[#111827]"
        style={{ boxShadow: "6px 8px 0 #111827" }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-pastel-mint to-pastel-sky px-6 py-4 border-b-4 border-[#111827]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-[#111827] flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[#111827]" />
              </div>
              <div>
                <h2 className="font-display text-lg text-[#111827]">MY WALLET</h2>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-[#111827]/70 hover:text-[#111827] transition-colors"
                >
                  <span className="font-mono">{shortAddress}</span>
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/50 hover:bg-white border-2 border-[#111827] flex items-center justify-center transition-colors"
            >
              <span className="text-[#111827] font-bold">×</span>
            </button>
          </div>
        </div>

        {/* Balance Section */}
        <div className="px-6 py-8">
          <div className="text-center mb-6">
            <p className="text-sm text-pastel-textLight mb-2 font-semibold uppercase tracking-wide">
              Token Balance
            </p>
            <div className="inline-flex items-center gap-3 bg-pastel-yellow rounded-2xl px-6 py-4 border-3 border-yellow-400/50">
              <img 
                src="/gashapon_token.png" 
                alt="Token" 
                className="w-12 h-12 rounded-full"
              />
              <span className="text-3xl font-bold text-[#111827]">
                {balance !== null ? formatCompact(balance) : "0"}
              </span>
            </div>
            {/* Copy CA Button */}
            <button
              onClick={handleCopyCa}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E9EEF2] border-2 border-[#111827]/20 text-xs font-bold text-[#111827]/70 hover:bg-[#dde3e7] hover:text-[#111827] transition-colors"
            >
              <span className="font-mono">{TOKEN_CA.slice(0, 6)}...{TOKEN_CA.slice(-4)}</span>
              {caCopied ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* View on Solscan */}
          <a
            href={solscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-pastel-textLight hover:text-pastel-coral transition-colors mb-6"
          >
            <span>View on Solscan</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Disconnect Button */}
          <Button
            variant="danger"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleDisconnect}
          >
            <LogOut className="w-4 h-4" />
            DISCONNECT WALLET
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );

  // Use portal to render modal at root level
  if (typeof window !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return null;
}
