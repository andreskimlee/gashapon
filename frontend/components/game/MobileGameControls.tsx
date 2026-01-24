/**
 * Mobile Game Controls
 * 
 * Touch-friendly D-pad and grab button for mobile claw machine gameplay.
 * Injects control signals into the claw machine via mobileControlsRef.
 */

"use client";

import { useCallback } from "react";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Hand } from "lucide-react";
import { mobileControlsRef } from "./claw-machine/useKeyboardControls";
import type { KeyboardState } from "./claw-machine/types";

type ControlKey = keyof KeyboardState;

interface MobileGameControlsProps {
  visible?: boolean;
}

export default function MobileGameControls({ visible = true }: MobileGameControlsProps) {
  const handlePress = useCallback((key: ControlKey) => {
    mobileControlsRef.current[key] = true;
  }, []);

  const handleRelease = useCallback((key: ControlKey) => {
    mobileControlsRef.current[key] = false;
  }, []);

  if (!visible) return null;

  // Common button styles
  const buttonBase = "flex items-center justify-center rounded-xl border-2 border-[#111827] active:scale-95 transition-transform select-none touch-none";
  const dpadButton = `${buttonBase} w-12 h-12 bg-white/90 backdrop-blur-sm shadow-md active:bg-pastel-mint`;
  const grabButton = `${buttonBase} w-20 h-20 bg-pastel-coral text-white shadow-lg active:bg-pastel-coral/80`;

  return (
    <div className="absolute bottom-4 left-0 right-0 z-30 flex justify-between items-end px-4 pointer-events-none md:hidden">
      {/* D-Pad on left side */}
      <div className="pointer-events-auto flex flex-col items-center gap-1">
        {/* Up */}
        <button
          className={dpadButton}
          onTouchStart={() => handlePress("ArrowUp")}
          onTouchEnd={() => handleRelease("ArrowUp")}
          onMouseDown={() => handlePress("ArrowUp")}
          onMouseUp={() => handleRelease("ArrowUp")}
          onMouseLeave={() => handleRelease("ArrowUp")}
        >
          <ArrowUp className="w-6 h-6 text-[#111827]" />
        </button>
        
        {/* Left / Right row */}
        <div className="flex gap-8">
          <button
            className={dpadButton}
            onTouchStart={() => handlePress("ArrowLeft")}
            onTouchEnd={() => handleRelease("ArrowLeft")}
            onMouseDown={() => handlePress("ArrowLeft")}
            onMouseUp={() => handleRelease("ArrowLeft")}
            onMouseLeave={() => handleRelease("ArrowLeft")}
          >
            <ArrowLeft className="w-6 h-6 text-[#111827]" />
          </button>
          <button
            className={dpadButton}
            onTouchStart={() => handlePress("ArrowRight")}
            onTouchEnd={() => handleRelease("ArrowRight")}
            onMouseDown={() => handlePress("ArrowRight")}
            onMouseUp={() => handleRelease("ArrowRight")}
            onMouseLeave={() => handleRelease("ArrowRight")}
          >
            <ArrowRight className="w-6 h-6 text-[#111827]" />
          </button>
        </div>
        
        {/* Down */}
        <button
          className={dpadButton}
          onTouchStart={() => handlePress("ArrowDown")}
          onTouchEnd={() => handleRelease("ArrowDown")}
          onMouseDown={() => handlePress("ArrowDown")}
          onMouseUp={() => handleRelease("ArrowDown")}
          onMouseLeave={() => handleRelease("ArrowDown")}
        >
          <ArrowDown className="w-6 h-6 text-[#111827]" />
        </button>
      </div>

      {/* Grab button on right side */}
      <div className="pointer-events-auto">
        <button
          className={grabButton}
          onTouchStart={() => handlePress("Space")}
          onTouchEnd={() => handleRelease("Space")}
          onMouseDown={() => handlePress("Space")}
          onMouseUp={() => handleRelease("Space")}
          onMouseLeave={() => handleRelease("Space")}
        >
          <div className="flex flex-col items-center gap-1">
            <Hand className="w-8 h-8" />
            <span className="text-xs font-bold">GRAB</span>
          </div>
        </button>
      </div>
    </div>
  );
}
