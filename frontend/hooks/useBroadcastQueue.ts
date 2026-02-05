"use client";

import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

export interface PlayEvent {
  id: string;
  transactionSignature: string;
  userWallet: string;
  gameId: number;
  gameName: string;
  gameImage: string | null;
  outcome: "win" | "lose";
  prizeName: string | null;
  prizeTier: string | null;
  prizeImage: string | null;
  playedAt: string;
  /** Base64-encoded recording of player actions (optional) */
  recording: string | null;
}

interface BroadcastQueueState {
  queue: PlayEvent[];
  currentPlay: PlayEvent | null;
  isShowingCommercial: boolean;
  commercialIndex: number;
  recentWins: PlayEvent[];
}

interface UseBroadcastQueueOptions {
  /** Duration to show each play in milliseconds (default: 8000) */
  playDisplayDuration?: number;
  /** Duration to show each commercial in milliseconds (default: 10000) */
  commercialDuration?: number;
  /** Maximum number of plays to keep in queue */
  maxQueueSize?: number;
  /** Number of recent wins to track */
  recentWinsCount?: number;
}

// Track if current commercial is a video (managed externally)
let isShowingVideoRef = false;

export function useBroadcastQueue(options: UseBroadcastQueueOptions = {}) {
  const {
    playDisplayDuration = 8000,
    commercialDuration = 10000,
    maxQueueSize = 50,
    recentWinsCount = 20,
  } = options;

  const [state, setState] = useState<BroadcastQueueState>({
    queue: [],
    currentPlay: null,
    isShowingCommercial: true,
    commercialIndex: 0,
    recentWins: [],
  });

  const displayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Add a play to the queue
  const addToQueue = useCallback(
    (play: PlayEvent) => {
      setState((prev) => {
        const newQueue = [...prev.queue, play].slice(-maxQueueSize);

        // Track wins for the ticker
        const newRecentWins =
          play.outcome === "win"
            ? [play, ...prev.recentWins].slice(0, recentWinsCount)
            : prev.recentWins;

        return {
          ...prev,
          queue: newQueue,
          recentWins: newRecentWins,
        };
      });
    },
    [maxQueueSize, recentWinsCount],
  );

  // Process the next item in the queue
  const processNext = useCallback(() => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setState((prev) => {
      if (prev.queue.length > 0) {
        // Show next play from queue
        const [nextPlay, ...remainingQueue] = prev.queue;
        return {
          ...prev,
          queue: remainingQueue,
          currentPlay: nextPlay,
          isShowingCommercial: false,
        };
      } else {
        // No plays in queue, show commercial
        return {
          ...prev,
          currentPlay: null,
          isShowingCommercial: true,
          commercialIndex: (prev.commercialIndex + 1) % 5, // Cycle through 5 commercial slots
        };
      }
    });

    isProcessingRef.current = false;
  }, []);

  // Advance to next commercial
  const advanceCommercial = useCallback(() => {
    setState((prev) => ({
      ...prev,
      commercialIndex: (prev.commercialIndex + 1) % 5,
    }));
  }, []);

  // Set if currently showing a video (pauses auto-advance)
  const setIsShowingVideo = useCallback((isVideo: boolean) => {
    isShowingVideoRef = isVideo;
    // If switching away from video, clear any existing timer and let the normal flow continue
    if (!isVideo && displayTimerRef.current) {
      clearTimeout(displayTimerRef.current);
      displayTimerRef.current = setTimeout(() => {
        processNext();
      }, commercialDuration);
    }
  }, [commercialDuration, processNext]);

  // Called when video ends - advance to next
  const onVideoComplete = useCallback(() => {
    isShowingVideoRef = false;
    if (displayTimerRef.current) {
      clearTimeout(displayTimerRef.current);
    }
    processNext();
  }, [processNext]);

  // Set up display timer
  useEffect(() => {
    // Don't set timer if showing video - wait for video to complete
    if (state.isShowingCommercial && isShowingVideoRef) {
      return;
    }

    const duration = state.isShowingCommercial
      ? commercialDuration
      : playDisplayDuration;

    displayTimerRef.current = setTimeout(() => {
      processNext();
    }, duration);

    return () => {
      if (displayTimerRef.current) {
        clearTimeout(displayTimerRef.current);
      }
    };
  }, [
    state.currentPlay,
    state.isShowingCommercial,
    state.commercialIndex,
    playDisplayDuration,
    commercialDuration,
    processNext,
  ]);

  // Subscribe to Supabase broadcast channel for play completions with recordings
  useEffect(() => {
    const channel = supabase.channel("plays:broadcast");

    channel
      .on("broadcast", { event: "play_completed" }, ({ payload }) => {
        // Only process plays that have recordings
        if (!payload.recording) {
          return;
        }

        const playEvent: PlayEvent = {
          id: `${payload.transactionSignature}-${Date.now()}`,
          transactionSignature: payload.transactionSignature,
          userWallet: payload.userWallet,
          gameId: payload.gameId,
          gameName: payload.gameName,
          gameImage: payload.gameImage,
          outcome: payload.outcome,
          prizeName: payload.prizeName,
          prizeTier: payload.prizeTier,
          prizeImage: payload.prizeImage,
          playedAt: payload.playedAt,
          recording: payload.recording,
        };

        addToQueue(playEvent);

        // If we're showing a commercial and a play comes in, interrupt it
        setState((prev) => {
          if (prev.isShowingCommercial && prev.queue.length === 1) {
            // Clear timer and process immediately
            if (displayTimerRef.current) {
              clearTimeout(displayTimerRef.current);
            }
            const [nextPlay, ...remainingQueue] = prev.queue;
            return {
              ...prev,
              queue: remainingQueue,
              currentPlay: nextPlay,
              isShowingCommercial: false,
            };
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addToQueue]);

  // Skip to next play or commercial
  const skip = useCallback(() => {
    if (displayTimerRef.current) {
      clearTimeout(displayTimerRef.current);
    }
    processNext();
  }, [processNext]);

  return {
    currentPlay: state.currentPlay,
    queue: state.queue,
    queueLength: state.queue.length,
    isShowingCommercial: state.isShowingCommercial,
    commercialIndex: state.commercialIndex,
    recentWins: state.recentWins,
    skip,
    advanceCommercial,
    setIsShowingVideo,
    onVideoComplete,
  };
}
