"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface KeyState {
  ArrowLeft: boolean;
  ArrowRight: boolean;
  ArrowUp: boolean;
  ArrowDown: boolean;
  Space: boolean;
}

export interface RecordedFrame {
  /** Milliseconds from recording start */
  t: number;
  /** Key states (only includes keys that changed) */
  k: Partial<KeyState>;
}

export interface PlayRecording {
  /** Recording version for future compatibility */
  v: 1;
  /** Total duration in ms */
  duration: number;
  /** Compressed frames (only changes are recorded) */
  frames: RecordedFrame[];
}

const RECORD_INTERVAL = 50; // Record key states every 50ms

/**
 * Hook to record player actions during claw machine gameplay.
 * Returns functions to start/stop recording and get the recording data.
 */
export function useActionRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<RecordedFrame[]>([]);
  const startTimeRef = useRef<number>(0);
  const lastKeyStateRef = useRef<KeyState>({
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false,
  });
  const currentKeyStateRef = useRef<KeyState>({
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Key event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in currentKeyStateRef.current) {
        currentKeyStateRef.current[e.key as keyof KeyState] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in currentKeyStateRef.current) {
        currentKeyStateRef.current[e.key as keyof KeyState] = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    recordingRef.current = [];
    startTimeRef.current = performance.now();
    lastKeyStateRef.current = {
      ArrowLeft: false,
      ArrowRight: false,
      ArrowUp: false,
      ArrowDown: false,
      Space: false,
    };
    currentKeyStateRef.current = {
      ArrowLeft: false,
      ArrowRight: false,
      ArrowUp: false,
      ArrowDown: false,
      Space: false,
    };
    setIsRecording(true);

    // Record initial state
    recordingRef.current.push({
      t: 0,
      k: { ...currentKeyStateRef.current },
    });

    // Start interval to capture key states
    intervalRef.current = setInterval(() => {
      const now = performance.now();
      const t = Math.round(now - startTimeRef.current);
      
      // Check for changes
      const changes: Partial<KeyState> = {};
      let hasChanges = false;
      
      for (const key of Object.keys(currentKeyStateRef.current) as (keyof KeyState)[]) {
        if (currentKeyStateRef.current[key] !== lastKeyStateRef.current[key]) {
          changes[key] = currentKeyStateRef.current[key];
          lastKeyStateRef.current[key] = currentKeyStateRef.current[key];
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        recordingRef.current.push({ t, k: changes });
      }
    }, RECORD_INTERVAL);
  }, []);

  // Stop recording and return the data
  const stopRecording = useCallback((): PlayRecording | null => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsRecording(false);

    if (recordingRef.current.length === 0) {
      return null;
    }

    const duration = Math.round(performance.now() - startTimeRef.current);
    
    return {
      v: 1,
      duration,
      frames: recordingRef.current,
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}

/**
 * Compress a recording for network transmission.
 * Returns a base64-encoded JSON string.
 */
export function compressRecording(recording: PlayRecording): string {
  const json = JSON.stringify(recording);
  // Use btoa for simple base64 encoding (works in browser)
  return btoa(json);
}

/**
 * Decompress a recording from base64.
 */
export function decompressRecording(compressed: string): PlayRecording | null {
  try {
    const json = atob(compressed);
    return JSON.parse(json) as PlayRecording;
  } catch {
    return null;
  }
}
