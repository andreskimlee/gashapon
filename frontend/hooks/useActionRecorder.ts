"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mobileControlsRef } from "@/components/game/claw-machine/useKeyboardControls";

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
 * Captures both keyboard inputs AND mobile touch controls.
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
  // Track keyboard state separately from mobile
  const keyboardStateRef = useRef<KeyState>({
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Key event handlers for keyboard input
  // Use e.code (not e.key) so Space bar maps to "Space" instead of " "
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code in keyboardStateRef.current) {
        keyboardStateRef.current[e.code as keyof KeyState] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code in keyboardStateRef.current) {
        keyboardStateRef.current[e.code as keyof KeyState] = false;
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
    keyboardStateRef.current = {
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
      k: { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false, Space: false },
    });

    // Start interval to capture key states from BOTH keyboard AND mobile controls
    intervalRef.current = setInterval(() => {
      const now = performance.now();
      const t = Math.round(now - startTimeRef.current);
      
      // Merge keyboard state with mobile controls (OR them together, like the game does)
      const currentCombined: KeyState = {
        ArrowLeft: keyboardStateRef.current.ArrowLeft || mobileControlsRef.current.ArrowLeft,
        ArrowRight: keyboardStateRef.current.ArrowRight || mobileControlsRef.current.ArrowRight,
        ArrowUp: keyboardStateRef.current.ArrowUp || mobileControlsRef.current.ArrowUp,
        ArrowDown: keyboardStateRef.current.ArrowDown || mobileControlsRef.current.ArrowDown,
        Space: keyboardStateRef.current.Space || mobileControlsRef.current.Space,
      };
      
      // Check for changes
      const changes: Partial<KeyState> = {};
      let hasChanges = false;
      
      for (const key of Object.keys(currentCombined) as (keyof KeyState)[]) {
        if (currentCombined[key] !== lastKeyStateRef.current[key]) {
          changes[key] = currentCombined[key];
          lastKeyStateRef.current[key] = currentCombined[key];
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
