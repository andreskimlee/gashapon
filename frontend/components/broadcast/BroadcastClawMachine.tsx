"use client";

import { replayControlsRef } from "@/components/game/claw-machine/useKeyboardControls";
import { LoseScreen, WinChoiceScreen, WinRevealScreen } from "@/components/game/screens";
import { useActionReplayer } from "@/hooks/useActionReplayer";
import { decompressRecording, PlayRecording } from "@/hooks/useActionRecorder";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { PhysicsScene } from "@/components/game/claw-machine/components/PhysicsScene";
import type { GameOutcome } from "@/components/game/claw-machine/types";

// Scene setup component for proper tone mapping
function SceneSetup() {
  const { gl } = useThree();

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [gl]);

  return null;
}

const MODEL_URL = "/models/claw-machine/test.glb";

// Loading fallback
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#F7ABAD" />
    </mesh>
  );
}

// Auto-transition component - calls onComplete after delay
function AutoTransition({ delay, onComplete }: { delay: number; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, delay);
    return () => clearTimeout(timer);
  }, [delay, onComplete]);
  
  return null;
}

// Preload the model
useGLTF.preload(MODEL_URL);

interface BroadcastClawMachineProps {
  /** Compressed recording data (base64) */
  recordingData?: string | null;
  /** Game outcome to determine claw behavior */
  gameOutcome: GameOutcome;
  /** Called when replay completes */
  onReplayComplete?: () => void;
  /** Auto-start replay when component mounts */
  autoPlay?: boolean;
  /** Prize info for win screen */
  prizeName?: string | null;
  prizeImage?: string | null;
  prizeTier?: string | null;
  /** User wallet for win screen */
  userWallet?: string;
}

interface BroadcastClawMachineInnerProps {
  recordingData?: string | null;
  gameOutcome: GameOutcome;
  onReplayComplete?: () => void;
  autoPlay?: boolean;
  prizeName?: string | null;
  prizeImage?: string | null;
  prizeTier?: string | null;
  userWallet?: string;
}

/**
 * Inner component - memoized to prevent unnecessary re-renders
 */
function BroadcastClawMachineInner({
  recordingData,
  gameOutcome,
  onReplayComplete,
  autoPlay = true,
  prizeName,
  prizeImage,
  prizeTier: _prizeTier,
  userWallet: _userWallet,
}: BroadcastClawMachineInnerProps) {
  // Suppress unused variable warnings
  void _prizeTier;
  void _userWallet;
  const [isReady, setIsReady] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [winFlowStep, setWinFlowStep] = useState<"reveal" | "prize" | null>(null);
  const [hasError, setHasError] = useState(false);
  const hasStartedRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const onReplayCompleteRef = useRef(onReplayComplete);
  
  // Keep callback ref updated
  useEffect(() => {
    onReplayCompleteRef.current = onReplayComplete;
  }, [onReplayComplete]);

  // Decompress recording once
  const recording = useMemo<PlayRecording | null>(() => {
    if (!recordingData) return null;
    try {
      const rec = decompressRecording(recordingData);
      // Debug: log recording details
      if (rec) {
        console.log("[BroadcastClawMachine] Recording loaded:", {
          frames: rec.frames.length,
          duration: rec.duration,
          // Check if Space is ever pressed
          hasSpacePress: rec.frames.some(f => f.k.Space === true),
          spaceFrames: rec.frames.filter(f => f.k.Space !== undefined).map(f => ({ t: f.t, space: f.k.Space })),
        });
      }
      return rec;
    } catch (e) {
      console.error("[BroadcastClawMachine] Failed to decompress recording:", e);
      return null;
    }
  }, [recordingData]);

  // Reset refs when recording changes
  useEffect(() => {
    hasStartedRef.current = false;
    hasCompletedRef.current = false;
    setHasError(false);
  }, [recordingData]);

  // Use replayer hook
  const { keys, isPlaying, play } = useActionReplayer(recording);

  // Inject replay keys into the global ref so PhysicsScene can read them
  // This needs to update synchronously with the replayer's animation frame
  useEffect(() => {
    if (isPlaying) {
      // Create a persistent object that we update in place
      // This ensures the ref always points to the latest values
      replayControlsRef.current = {
        ArrowLeft: false,
        ArrowRight: false,
        ArrowUp: false,
        ArrowDown: false,
        Space: false,
      };
    }
    
    return () => {
      replayControlsRef.current = null;
    };
  }, [isPlaying]);

  // Update the replay controls ref whenever keys change
  // This runs on every render to keep the ref in sync
  useEffect(() => {
    if (isPlaying && replayControlsRef.current) {
      replayControlsRef.current.ArrowLeft = keys.ArrowLeft;
      replayControlsRef.current.ArrowRight = keys.ArrowRight;
      replayControlsRef.current.ArrowUp = keys.ArrowUp;
      replayControlsRef.current.ArrowDown = keys.ArrowDown;
      replayControlsRef.current.Space = keys.Space;
      
      // Debug: log Space key state changes
      if (keys.Space) {
        console.log("[BroadcastClawMachine] Space key pressed in replay!");
      }
    }
  }, [isPlaying, keys]);

  // Handle starting replay
  const startReplay = useCallback(() => {
    if (!hasStartedRef.current) {
      console.log("[BroadcastClawMachine] Starting replay");
      hasStartedRef.current = true;
      play();
    }
  }, [play]);

  // Auto-play when ready
  useEffect(() => {
    if (autoPlay && recording && isReady && !hasStartedRef.current) {
      const timer = setTimeout(() => {
        startReplay();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, recording, isReady, startReplay]);

  // Handle replay completion
  // The replay inputs finish, but the claw animation continues for several more seconds
  // (drop animation ~3s, grab ~1s, rise ~3s, result ~2s = ~9s total)
  useEffect(() => {
    if (hasStartedRef.current && !isPlaying && !hasCompletedRef.current) {
      console.log("[BroadcastClawMachine] Replay inputs finished, waiting for claw animation...");
      hasCompletedRef.current = true;
      
      // Wait for the claw animation to complete before showing result
      // This accounts for: drop (~3s) + grab (~1s) + rise (~3s) + settle (~1s) = ~8s
      const clawAnimationDelay = 8000;
      
      setTimeout(() => {
        console.log("[BroadcastClawMachine] Showing result screen");
        setShowResult(true);
        
        // For wins, start the capsule reveal flow
        if (gameOutcome === "win") {
          setWinFlowStep("reveal");
        } else {
          // For losses, show lose screen then transition after 5 seconds
          setTimeout(() => {
            onReplayCompleteRef.current?.();
          }, 5000);
        }
      }, clawAnimationDelay);
    }
  }, [isPlaying]);

  const hasRecording = recording && recording.frames.length > 0;

  // If there was an error, show a fallback
  if (hasError) {
    return (
      <div className="w-full h-full min-h-[500px] relative flex items-center justify-center bg-gradient-to-b from-sky-200 via-sky-100 to-pink-100">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 text-center">
          <p className="text-pastel-text font-medium">Unable to load 3D view</p>
          <p className="text-pastel-text/60 text-sm">
            {gameOutcome === "win" ? "Winner!" : "Better luck next time!"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[500px] relative" style={{ minHeight: "500px" }}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-pink-100" />
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[8%] -left-20 w-40 h-20 bg-white/70 rounded-full blur-sm animate-cloud-slow" />
        <div
          className="absolute top-[20%] -right-16 w-32 h-16 bg-white/60 rounded-full blur-sm animate-cloud-slow"
          style={{ animationDelay: "3s" }}
        />
      </div>

      {/* 3D Canvas with full PhysicsScene for proper replay */}
      <Canvas
        shadows
        dpr={[1, 1.5]}
        // Camera positioned for optimal broadcast view
        camera={{ 
          position: [-0.1, 1.1, 4.4], 
          fov: 50, 
          near: 0.1, 
          far: 100 
        }}
        gl={{
          powerPreference: "high-performance",
          alpha: true,
          antialias: true,
          preserveDrawingBuffer: true,
        }}
        style={{ background: "transparent" }}
        onCreated={({ gl, camera }) => {
          // Set up fixed camera looking at the claw machine
          camera.lookAt(-0.0, 1.0, 0.1);
          
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            console.warn("[BroadcastClawMachine] WebGL context lost!", e);
            e.preventDefault();
            setHasError(true);
          });
          gl.domElement.addEventListener("webglcontextrestored", () => {
            console.log("[BroadcastClawMachine] WebGL context restored!");
            setHasError(false);
          });
          setIsReady(true);
        }}
        onError={() => {
          console.error("[BroadcastClawMachine] Canvas error");
          setHasError(true);
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <SceneSetup />
          <Environment preset="city" />
          
          {/* OrbitControls - locked to fixed position for broadcast */}
          <OrbitControls 
            target={[-0.0, 1.0, 0.1]}
            enablePan={false}
            enableZoom={false}
            enableRotate={false}
          />
          
          {/* Lighting */}
          <ambientLight intensity={0.8} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-5, 5, -5]} intensity={1.2} />
          <pointLight position={[0, 3, 8]} intensity={1.2} />
          
          {/* Full physics scene with replay controls */}
          <PhysicsScene
            modelUrl={MODEL_URL}
            gameOutcome={hasRecording ? gameOutcome : null}
          />
        </Suspense>
      </Canvas>

      {/* Replay indicator - shown during replay */}
      {isPlaying && hasRecording && !showResult && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-medium text-pastel-text">LIVE REPLAY</span>
        </div>
      )}

      {/* Win Flow - Step 1: Capsule opening animation */}
      {showResult && gameOutcome === "win" && winFlowStep === "reveal" && (
        <WinRevealScreen 
          onComplete={() => {
            // After capsule animation completes, show prize screen
            setWinFlowStep("prize");
          }} 
        />
      )}

      {/* Win Flow - Step 2: Prize display screen */}
      {showResult && gameOutcome === "win" && winFlowStep === "prize" && (
        <>
          <WinChoiceScreen 
            prizeName={prizeName || undefined}
            prizeImageUrl={prizeImage || undefined}
            // No action buttons for broadcast - just showing the prize
          />
          {/* Auto-transition after 5 seconds on prize screen */}
          <AutoTransition 
            delay={5000} 
            onComplete={() => onReplayCompleteRef.current?.()} 
          />
        </>
      )}

      {/* Lose Screen */}
      {showResult && gameOutcome === "lose" && (
        <LoseScreen />
      )}
    </div>
  );
}

/**
 * Claw machine component for broadcast replay.
 * Uses PhysicsScene with replay controls injected via replayControlsRef.
 */
export const BroadcastClawMachine = memo(function BroadcastClawMachine(props: BroadcastClawMachineProps) {
  return <BroadcastClawMachineInner {...props} />;
});
