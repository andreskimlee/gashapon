"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyState, PlayRecording, RecordedFrame } from "./useActionRecorder";

export interface ReplayState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  keys: KeyState;
}

/**
 * Hook to replay recorded player actions.
 * Returns the current key state that should be fed to the claw machine.
 */
export function useActionReplayer(recording: PlayRecording | null) {
  const [state, setState] = useState<ReplayState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    keys: {
      ArrowLeft: false,
      ArrowRight: false,
      ArrowUp: false,
      ArrowDown: false,
      Space: false,
    },
  });

  const startTimeRef = useRef<number>(0);
  const frameIndexRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const keysRef = useRef<KeyState>({
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false,
  });

  // Process frames and update key state
  const processFrame = useCallback((frames: RecordedFrame[], currentTime: number) => {
    // Process all frames up to current time
    while (frameIndexRef.current < frames.length) {
      const frame = frames[frameIndexRef.current];
      if (frame.t > currentTime) {
        break;
      }
      
      // Apply key changes from this frame
      for (const [key, value] of Object.entries(frame.k)) {
        if (key in keysRef.current && value !== undefined) {
          keysRef.current[key as keyof KeyState] = value;
        }
      }
      
      frameIndexRef.current++;
    }
    
    return { ...keysRef.current };
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    if (!recording) return;

    const elapsed = performance.now() - startTimeRef.current;
    
    if (elapsed >= recording.duration) {
      // Replay complete
      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: recording.duration,
        keys: {
          ArrowLeft: false,
          ArrowRight: false,
          ArrowUp: false,
          ArrowDown: false,
          Space: false,
        },
      }));
      rafRef.current = null;
      return;
    }

    const keys = processFrame(recording.frames, elapsed);
    
    setState(prev => ({
      ...prev,
      currentTime: elapsed,
      keys,
    }));

    rafRef.current = requestAnimationFrame(animate);
  }, [recording, processFrame]);

  // Start replay
  const play = useCallback(() => {
    if (!recording || recording.frames.length === 0) return;

    // Reset state
    frameIndexRef.current = 0;
    keysRef.current = {
      ArrowLeft: false,
      ArrowRight: false,
      ArrowUp: false,
      ArrowDown: false,
      Space: false,
    };
    startTimeRef.current = performance.now();

    setState({
      isPlaying: true,
      currentTime: 0,
      duration: recording.duration,
      keys: { ...keysRef.current },
    });

    rafRef.current = requestAnimationFrame(animate);
  }, [recording, animate]);

  // Stop replay
  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    keysRef.current = {
      ArrowLeft: false,
      ArrowRight: false,
      ArrowUp: false,
      ArrowDown: false,
      Space: false,
    };

    setState(prev => ({
      ...prev,
      isPlaying: false,
      keys: { ...keysRef.current },
    }));
  }, []);

  // Reset when recording changes
  useEffect(() => {
    stop();
    if (recording) {
      setState(prev => ({
        ...prev,
        duration: recording.duration,
      }));
    }
  }, [recording, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    ...state,
    play,
    stop,
  };
}
