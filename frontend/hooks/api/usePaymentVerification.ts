import { supabase } from "@/lib/supabase";
import { useEffect, useRef, useCallback } from "react";

export type PaymentVerificationPayload = {
  transactionSignature: string;
  status: "verified" | "rejected";
  message: string;
  actualUsdValue: number | null;
};

/**
 * Subscribe to payment verification broadcasts.
 * The indexer broadcasts this BEFORE the game outcome is determined.
 * Frontend should wait for "verified" before starting the game animation.
 * If "rejected", show an error - the user underpaid.
 */
export function usePaymentVerification(
  transactionSignature: string | null | undefined,
  onVerification: (payload: PaymentVerificationPayload) => void,
  options?: { timeoutMs?: number }
) {
  const signatureRef = useRef<string | null | undefined>(null);
  signatureRef.current = transactionSignature;
  const timeoutMs = options?.timeoutMs ?? 30_000; // 30 second timeout for payment verification

  useEffect(() => {
    if (!transactionSignature) return;

    const channel = supabase.channel(`plays:${transactionSignature}`);
    let cleaned = false;

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      supabase.removeChannel(channel);
    };

    const timer = setTimeout(() => {
      // If we timeout waiting for verification, treat as verified (optimistic)
      // The finalize event will still come through
      console.warn(
        `[PaymentVerification] Timeout waiting for verification: ${transactionSignature}`
      );
      cleanup();
    }, timeoutMs);

    channel
      .on("broadcast", { event: "payment_verified" }, ({ payload }) => {
        try {
          console.log("[PaymentVerification] Received:", payload);
          onVerification(payload as PaymentVerificationPayload);
        } finally {
          clearTimeout(timer);
          cleanup();
        }
      })
      .subscribe();

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [transactionSignature, onVerification, timeoutMs]);
}

/**
 * Combined hook that listens for both payment verification AND finalize events.
 * Returns callbacks that fire once for each event type.
 * 
 * Uses refs for callbacks to avoid re-subscribing when callbacks change.
 */
export function usePlayEvents(
  transactionSignature: string | null | undefined,
  callbacks: {
    onPaymentVerified?: (payload: PaymentVerificationPayload) => void;
    onPaymentRejected?: (payload: PaymentVerificationPayload) => void;
    onFinalized?: (payload: {
      transactionSignature: string;
      status: "completed" | "failed";
      prizeId: number | null;
      nftMint: string | null;
    }) => void;
  },
  options?: { timeoutMs?: number }
) {
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const paymentHandledRef = useRef(false);
  const finalizedHandledRef = useRef(false);
  
  // Use refs for callbacks to avoid re-subscribing when callbacks change
  const onPaymentVerifiedRef = useRef(callbacks.onPaymentVerified);
  const onPaymentRejectedRef = useRef(callbacks.onPaymentRejected);
  const onFinalizedRef = useRef(callbacks.onFinalized);
  
  // Update refs when callbacks change
  useEffect(() => {
    onPaymentVerifiedRef.current = callbacks.onPaymentVerified;
    onPaymentRejectedRef.current = callbacks.onPaymentRejected;
    onFinalizedRef.current = callbacks.onFinalized;
  }, [callbacks.onPaymentVerified, callbacks.onPaymentRejected, callbacks.onFinalized]);

  useEffect(() => {
    if (!transactionSignature) return;

    // Reset refs when signature changes
    paymentHandledRef.current = false;
    finalizedHandledRef.current = false;

    const channel = supabase.channel(`plays:${transactionSignature}`);
    let cleaned = false;

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      supabase.removeChannel(channel);
    };

    const timer = setTimeout(() => {
      console.warn(`[PlayEvents] Timeout for: ${transactionSignature}`);
      cleanup();
    }, timeoutMs);

    channel
      .on("broadcast", { event: "payment_verified" }, ({ payload }) => {
        if (paymentHandledRef.current) return;
        paymentHandledRef.current = true;

        const p = payload as PaymentVerificationPayload;
        console.log("[PlayEvents] Payment verification:", p.status);

        if (p.status === "verified" && onPaymentVerifiedRef.current) {
          onPaymentVerifiedRef.current(p);
        } else if (p.status === "rejected" && onPaymentRejectedRef.current) {
          onPaymentRejectedRef.current(p);
          // On rejection, cleanup immediately - no finalize will come
          clearTimeout(timer);
          cleanup();
        }
      })
      .on("broadcast", { event: "finalized" }, ({ payload }) => {
        if (finalizedHandledRef.current) return;
        finalizedHandledRef.current = true;

        console.log("[PlayEvents] Finalized:", payload);
        if (onFinalizedRef.current) {
          onFinalizedRef.current(
            payload as {
              transactionSignature: string;
              status: "completed" | "failed";
              prizeId: number | null;
              nftMint: string | null;
            }
          );
        }

        clearTimeout(timer);
        cleanup();
      })
      .subscribe();

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [transactionSignature, timeoutMs]); // Only re-subscribe when signature or timeout changes
}
