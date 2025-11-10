import { supabase } from "@/lib/supabase";
import { useEffect, useRef } from "react";

type FinalizeBroadcastPayload = {
  transactionSignature: string;
  status: "completed" | "failed";
  prizeId: number | null;
  nftMint: string | null;
};

/**
 * Subscribe to a one-shot broadcast for a single play by transaction signature.
 * Uses Supabase Realtime Broadcast (not Postgres replication) for scale.
 * Automatically unsubscribes on first message and after a safety timeout.
 */
export function usePlayRealtime(
  transactionSignature: string | null | undefined,
  onUpdate: (payload: FinalizeBroadcastPayload) => void,
  options?: { timeoutMs?: number }
) {
  const signatureRef = useRef<string | null | undefined>(null);
  signatureRef.current = transactionSignature;
  const timeoutMs = options?.timeoutMs ?? 60_000;

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
      cleanup();
    }, timeoutMs);

    channel
      .on("broadcast", { event: "finalized" }, ({ payload }) => {
        try {
          onUpdate(payload as FinalizeBroadcastPayload);
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
  }, [transactionSignature, onUpdate, timeoutMs]);
}
