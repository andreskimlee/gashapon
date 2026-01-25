"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";
import bs58 from "bs58";

import AddressAutocomplete, { type ParsedAddress } from "@/components/ui/AddressAutocomplete";
import CTAButton from "@/components/ui/CTAButton";
import { toast } from "@/components/ui/Toast";
import { redemptionApi } from "@/services/api/redemption";
import type { NFT, RedemptionRequest } from "@/types/api/nfts";
import { encryptShippingData, type ShippingData } from "@/utils/encryption";

interface RedeemModalProps {
  nft: NFT | null;
  walletAddress: string;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RedeemModal({
  nft,
  walletAddress,
  signMessage,
  onClose,
  onSuccess,
}: RedeemModalProps) {
  const [shipping, setShipping] = useState<ShippingData>({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    phone: "",
    email: "",
  });
  const [addressInput, setAddressInput] = useState("");
  const [addressVerified, setAddressVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "signing" | "submitting">("form");

  const handleAddressSelect = (parsed: ParsedAddress) => {
    setShipping((prev) => ({
      ...prev,
      address: parsed.address,
      city: parsed.city,
      state: parsed.state,
      zip: parsed.zip,
      country: parsed.country || "US",
    }));
    setAddressInput(parsed.address);
    setAddressVerified(true);
  };

  const handleSubmit = async () => {
    if (!nft || !walletAddress) return;

    if (!signMessage) {
      toast.error("Wallet doesn't support message signing.");
      return;
    }

    if (!shipping.name || !shipping.address || !shipping.city || !shipping.state || !shipping.zip || !shipping.phone) {
      toast.warning("Please fill out all required fields.");
      return;
    }

    if (!addressVerified) {
      const proceed = window.confirm(
        "Your address hasn't been verified. Unverified addresses may cause delivery issues. Continue anyway?"
      );
      if (!proceed) return;
    }

    setSubmitting(true);
    setStep("signing");

    try {
      // Encrypt shipping data
      const encryptedShippingData = await encryptShippingData({
        name: shipping.name,
        address: shipping.address,
        city: shipping.city,
        state: shipping.state,
        zip: shipping.zip,
        country: shipping.country,
        phone: shipping.phone,
        email: shipping.email || undefined,
      });

      // Sign message
      const timestamp = Date.now();
      const message = `Grabbit Prize Redemption\n\nNFT: ${nft.mintAddress}\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\n\nBy signing this message, you confirm that you own this NFT and authorize its redemption for physical delivery.`;
      const messageBytes = new TextEncoder().encode(message);

      let signatureBytes: Uint8Array;
      try {
        signatureBytes = await signMessage(messageBytes);
      } catch {
        toast.error("Message signing was cancelled.");
        setStep("form");
        setSubmitting(false);
        return;
      }

      setStep("submitting");
      const signatureBase58 = bs58.encode(signatureBytes);

      const payload: RedemptionRequest = {
        nftMint: nft.mintAddress,
        userWallet: walletAddress,
        signature: signatureBase58,
        message,
        timestamp,
        encryptedShippingData,
      };

      const res = await redemptionApi.redeemNft(payload);

      if (res.success) {
        toast.success("Prize redeemed! Check your email for tracking info.");
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Redemption failed");
        setStep("form");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Redemption failed");
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl px-4 py-3 border-2 border-[#111827] focus:border-pastel-coral focus:outline-none text-[#111827] bg-white placeholder:text-pastel-textLight";

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
            className="absolute inset-0 bg-[#111827]/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal - Arcade style */}
          <motion.div
            className="relative w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl"
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
              <h2 className="font-display text-2xl text-[#111827]">
                REDEEM PRIZE
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white border-2 border-[#111827] hover:bg-pastel-pinkLight transition-colors"
                style={{ boxShadow: '2px 2px 0 #111827' }}
              >
                <X className="w-4 h-4 text-[#111827]" />
              </button>
            </div>

            <div className="p-6">
              {/* NFT Preview */}
              <div className="flex items-center gap-4 mb-6 p-4 bg-[#E9EEF2] rounded-xl border-2 border-[#111827]">
                <div 
                  className="w-16 h-16 rounded-xl bg-white flex items-center justify-center overflow-hidden border-2 border-[#111827]"
                >
                  {nft.imageUrl ? (
                    <img src={nft.imageUrl} alt={nft.name || "Prize"} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🎁</span>
                  )}
                </div>
                <div>
                  <h3 className="font-display text-lg text-[#111827]">
                    {nft.name?.toUpperCase() || `PRIZE #${nft.prizeId}`}
                  </h3>
                  <p className="text-sm text-pastel-textLight font-mono">
                    {nft.mintAddress.slice(0, 8)}...{nft.mintAddress.slice(-6)}
                  </p>
                </div>
              </div>

              {/* Form or Status */}
              {step === "form" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-bold text-[#111827] uppercase mb-1">Full Name *</label>
                    <input
                      className={inputClass}
                      placeholder="John Doe"
                      value={shipping.name}
                      onChange={(e) => setShipping((s) => ({ ...s, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111827] uppercase mb-1">Street Address *</label>
                    <AddressAutocomplete
                      value={addressInput}
                      onChange={(v) => {
                        setAddressInput(v);
                        setShipping((s) => ({ ...s, address: v }));
                        setAddressVerified(false);
                      }}
                      onAddressSelect={handleAddressSelect}
                      placeholder="Start typing address..."
                      className={`${inputClass} ${addressVerified ? "border-emerald-500 bg-emerald-50" : ""}`}
                    />
                    {addressVerified && (
                      <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
                        <span>✓</span> ADDRESS VERIFIED
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#111827] uppercase mb-1">City *</label>
                      <input
                        className={inputClass}
                        placeholder="Los Angeles"
                        value={shipping.city}
                        onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#111827] uppercase mb-1">State *</label>
                      <input
                        className={inputClass}
                        placeholder="CA"
                        value={shipping.state}
                        onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#111827] uppercase mb-1">ZIP *</label>
                      <input
                        className={inputClass}
                        placeholder="90001"
                        value={shipping.zip}
                        onChange={(e) => setShipping((s) => ({ ...s, zip: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#111827] uppercase mb-1">Country *</label>
                      <input
                        className={inputClass}
                        placeholder="US"
                        value={shipping.country}
                        onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111827] uppercase mb-1">Phone Number *</label>
                    <input
                      className={inputClass}
                      placeholder="+1 (555) 123-4567"
                      type="tel"
                      value={shipping.phone}
                      onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111827] uppercase mb-1">Email (Optional)</label>
                    <input
                      className={inputClass}
                      placeholder="for tracking updates"
                      type="email"
                      value={shipping.email}
                      onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))}
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <CTAButton
                      variant="pink"
                      size="md"
                      className="flex-1"
                      onClick={onClose}
                    >
                      CANCEL
                    </CTAButton>
                    <CTAButton
                      variant="orange"
                      size="md"
                      className="flex-1"
                      onClick={handleSubmit}
                      disabled={submitting}
                    >
                      REDEEM
                    </CTAButton>
                  </div>
                </motion.div>
              )}

              {step === "signing" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-12 text-center"
                >
                  <motion.div
                    className="w-20 h-20 mx-auto mb-4 rounded-xl bg-pastel-yellow border-2 border-[#111827] flex items-center justify-center"
                    style={{ boxShadow: '4px 4px 0 #111827' }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <span className="text-4xl">✍️</span>
                  </motion.div>
                  <h3 className="font-display text-2xl text-[#111827] mb-2">SIGN MESSAGE</h3>
                  <p className="text-pastel-textLight">Please confirm in your wallet...</p>
                </motion.div>
              )}

              {step === "submitting" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-12 text-center"
                >
                  <motion.div
                    className="w-20 h-20 mx-auto mb-4 rounded-xl bg-pastel-mint border-2 border-[#111827] flex items-center justify-center"
                    style={{ boxShadow: '4px 4px 0 #111827' }}
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <span className="text-4xl">📦</span>
                  </motion.div>
                  <h3 className="font-display text-2xl text-[#111827] mb-2">PROCESSING</h3>
                  <p className="text-pastel-textLight">Creating your shipment...</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
