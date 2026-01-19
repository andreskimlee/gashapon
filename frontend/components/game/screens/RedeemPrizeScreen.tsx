"use client";

import { useState } from "react";
import bs58 from "bs58";

import AddressAutocomplete, {
  type ParsedAddress,
} from "@/components/ui/AddressAutocomplete";
import Card from "@/components/ui/Card";
import CTAButton from "@/components/ui/CTAButton";
import { toast } from "@/components/ui/Toast";
import { redemptionApi } from "@/services/api/redemption";
import { encryptShippingData, type ShippingData } from "@/utils/encryption";
import { RedemptionSuccessScreen } from "./RedemptionSuccessScreen";

export type RedeemPrizeScreenProps = {
  gameName?: string;
  prizeName?: string;
  prizeImageUrl?: string;
  prizeMint?: string;
  userWallet?: string;
  /** Wallet adapter's signMessage function - REQUIRED for secure redemption */
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
  onPlayAgain?: () => void;
  onViewCollection?: () => void;
  onBack?: () => void;
};

interface RedemptionSuccess {
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  estimatedDelivery?: string;
}

export function RedeemPrizeScreen({
  prizeMint,
  userWallet,
  signMessage,
  onPlayAgain,
  onViewCollection,
  onBack,
}: RedeemPrizeScreenProps) {
  const [redemptionSuccess, setRedemptionSuccess] = useState<RedemptionSuccess | null>(null);
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
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateShipping = (field: keyof ShippingData, value: string) => {
    setShipping((prev) => ({ ...prev, [field]: value }));
    // If user manually edits city/state/zip/country, mark as unverified
    if (["city", "state", "zip", "country"].includes(field)) {
      setAddressVerified(false);
    }
  };

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
    setRedeemMessage(null);
  };

  const handleAddressInputChange = (value: string) => {
    setAddressInput(value);
    setShipping((prev) => ({ ...prev, address: value }));
    // If user types manually after selecting, mark as unverified
    if (addressVerified) {
      setAddressVerified(false);
    }
  };

  const handleRedeem = async () => {
    // Debug: Log the values we're working with
    console.log("Redeem attempt:", { prizeMint, userWallet, hasSignMessage: !!signMessage });

    if (!prizeMint || !userWallet) {
      toast.error(
        `Missing required data: ${!prizeMint ? "Prize NFT mint" : ""} ${!userWallet ? "Wallet address" : ""}`.trim()
      );
      return;
    }

    if (!signMessage) {
      toast.error("Wallet doesn't support message signing. Please use a different wallet.");
      return;
    }

    if (
      !shipping.name ||
      !shipping.address ||
      !shipping.city ||
      !shipping.state ||
      !shipping.zip ||
      !shipping.country ||
      !shipping.phone
    ) {
      toast.warning("Please fill out all required shipping fields.");
      return;
    }

    // Warn if address is not verified
    if (!addressVerified) {
      toast.warning("Address not verified - delivery issues may occur.");
      const proceed = window.confirm(
        "Your address hasn't been verified through autocomplete. " +
          "Unverified addresses may cause delivery issues. Continue anyway?"
      );
      if (!proceed) return;
    }

    setSubmitting(true);
    setRedeemMessage("Encrypting shipping data...");

    try {
      // Step 1: Encrypt shipping data
      let encryptedData: string;
      try {
        encryptedData = await encryptShippingData({
          name: shipping.name,
          address: shipping.address,
          city: shipping.city,
          state: shipping.state,
          zip: shipping.zip,
          country: shipping.country,
          phone: shipping.phone,
          email: shipping.email || undefined,
        });
        console.log("Encryption successful, data length:", encryptedData.length);
      } catch (encryptError) {
        console.error("Encryption failed:", encryptError);
        toast.error(
          `Encryption failed: ${encryptError instanceof Error ? encryptError.message : "Unknown error"}`
        );
        setRedeemMessage(null);
        setSubmitting(false);
        return;
      }

      // Step 2: Sign message to prove wallet ownership
      setRedeemMessage("Please sign the message in your wallet...");
      
      // Create a deterministic message to sign with timestamp for replay protection
      const timestamp = Date.now();
      const message = `Gashapon Prize Redemption\n\nNFT: ${prizeMint}\nWallet: ${userWallet}\nTimestamp: ${timestamp}\n\nBy signing this message, you confirm that you own this NFT and authorize its redemption for physical delivery.`;
      const messageBytes = new TextEncoder().encode(message);
      
      let signatureBytes: Uint8Array;
      try {
        signatureBytes = await signMessage(messageBytes);
      } catch (signError) {
        console.error("Signing failed:", signError);
        toast.error("Message signing was cancelled or failed. Please try again.");
        setRedeemMessage(null);
        setSubmitting(false);
        return;
      }
      
      // Encode signature as base58 (standard for Solana signatures)
      const signatureBase58 = bs58.encode(signatureBytes);

      setRedeemMessage("Submitting redemption...");

      // Step 3: Submit to backend with cryptographic signature
      const payload = {
        nftMint: prizeMint,
        userWallet,
        signature: signatureBase58,
        message, // Send the original message for verification
        timestamp, // Send timestamp for replay protection
        encryptedShippingData: encryptedData,
      };
      console.log("Submitting redemption payload:", {
        ...payload,
        encryptedShippingData: `${encryptedData.slice(0, 50)}...`,
        signature: `${signatureBase58.slice(0, 20)}...`,
      });

      const res = await redemptionApi.redeemNft(payload);

      if (res.success) {
        toast.success("Prize redeemed successfully! Your order is being processed.");
        // Show success screen
        setRedemptionSuccess({
          trackingNumber: res.trackingNumber,
          trackingUrl: res.trackingUrl,
          carrier: res.carrier,
          estimatedDelivery: res.estimatedDelivery,
        });
      } else {
        toast.error(res.error || "Redemption failed. Please try again.");
      }
    } catch (error) {
      console.error("Redemption error:", error);
      toast.error(
        error instanceof Error ? error.message : "Redemption failed. Please try again."
      );
    } finally {
      setRedeemMessage(null);
      setSubmitting(false);
    }
  };

  // Show success screen after successful redemption
  if (redemptionSuccess) {
    return (
      <RedemptionSuccessScreen
        trackingNumber={redemptionSuccess.trackingNumber}
        trackingUrl={redemptionSuccess.trackingUrl}
        carrier={redemptionSuccess.carrier}
        estimatedDelivery={redemptionSuccess.estimatedDelivery}
        onPlayAgain={onPlayAgain}
        onViewCollection={onViewCollection}
      />
    );
  }

  const inputClassName =
    "rounded-xl px-3 py-2 border-2 border-pastel-pink/30 focus:border-pastel-coral focus:outline-none text-sm bg-white text-pastel-text";

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-pastel-yellow via-pastel-pinkLight to-pastel-lavender" />

      <Card
        variant="arcade"
        shadowColor="coral"
        padding="xl"
        className="relative z-10 mx-4 w-full max-w-lg text-center"
      >
        <h2 className="font-display text-3xl text-pastel-coral mb-2 text-outline-xl">
          REDEEM PRIZE
        </h2>
        <p className="text-pastel-text text-sm mb-4">
          Start typing your address to find and verify it. Your shipping details
          are encrypted and never stored.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
          <input
            className={`${inputClassName} md:col-span-2`}
            placeholder="Full Name *"
            value={shipping.name}
            onChange={(e) => updateShipping("name", e.target.value)}
          />

          {/* Address autocomplete */}
          <div className="md:col-span-2">
            <AddressAutocomplete
              value={addressInput}
              onChange={handleAddressInputChange}
              onAddressSelect={handleAddressSelect}
              placeholder="Start typing your address... *"
              className={`${inputClassName} w-full ${
                addressVerified ? "border-green-400 bg-green-50" : ""
              }`}
            />
            {addressVerified && (
              <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Address verified
              </div>
            )}
          </div>

          {/* City - auto-filled but editable */}
          <input
            className={`${inputClassName} ${
              addressVerified && shipping.city ? "bg-pastel-mint/20" : ""
            }`}
            placeholder="City *"
            value={shipping.city}
            onChange={(e) => updateShipping("city", e.target.value)}
          />

          {/* State - auto-filled but editable */}
          <input
            className={`${inputClassName} ${
              addressVerified && shipping.state ? "bg-pastel-mint/20" : ""
            }`}
            placeholder="State *"
            value={shipping.state}
            onChange={(e) => updateShipping("state", e.target.value)}
          />

          {/* ZIP - auto-filled but editable */}
          <input
            className={`${inputClassName} ${
              addressVerified && shipping.zip ? "bg-pastel-mint/20" : ""
            }`}
            placeholder="ZIP *"
            value={shipping.zip}
            onChange={(e) => updateShipping("zip", e.target.value)}
          />

          {/* Country - auto-filled but editable */}
          <input
            className={`${inputClassName} ${
              addressVerified && shipping.country ? "bg-pastel-mint/20" : ""
            }`}
            placeholder="Country *"
            value={shipping.country}
            onChange={(e) => updateShipping("country", e.target.value)}
          />

          {/* Phone - required by ShipEngine */}
          <input
            className={`${inputClassName} md:col-span-2`}
            placeholder="Phone Number *"
            type="tel"
            value={shipping.phone}
            onChange={(e) => updateShipping("phone", e.target.value)}
          />

          <input
            className={`${inputClassName} md:col-span-2`}
            placeholder="Email (optional - for tracking updates)"
            value={shipping.email}
            onChange={(e) => updateShipping("email", e.target.value)}
          />
        </div>

        {/* Verified address summary */}
        {addressVerified && shipping.address && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-left">
            <div className="text-xs font-semibold text-green-700 mb-1">
              Verified Shipping Address:
            </div>
            <div className="text-sm text-green-800">
              {shipping.address}
              <br />
              {shipping.city}, {shipping.state} {shipping.zip}
              <br />
              {shipping.country}
            </div>
          </div>
        )}

        {redeemMessage && (
          <div
            className={`mt-3 text-sm ${
              redeemMessage.includes("submitted")
                ? "text-green-600"
                : "text-pastel-textLight"
            }`}
          >
            {redeemMessage}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <CTAButton
            variant="orange"
            size="xs"
            onClick={handleRedeem}
            className="w-full"
            disabled={submitting}
          >
            {submitting ? "SUBMITTING..." : "SUBMIT"}
          </CTAButton>
          {onBack && (
            <CTAButton
              variant="pink"
              size="xs"
              onClick={onBack}
              className="w-full"
            >
              BACK
            </CTAButton>
          )}
        </div>
      </Card>
    </div>
  );
}
