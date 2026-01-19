"use client";

import { Environment, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { PhysicsScene } from "./claw-machine/components/PhysicsScene";
import type { GameOutcome } from "./claw-machine/types";
import {
  IntroScreen,
  LoadingScreen,
  LoseScreen,
  RedeemPrizeScreen,
  SavedScreen,
  WinChoiceScreen,
  WinRevealScreen,
} from "./screens";

// Scene setup component for proper tone mapping and color management
function SceneSetup() {
  const { gl } = useThree();

  useEffect(() => {
    // Use ACES Filmic tone mapping for better color reproduction
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0; // Balanced exposure
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [gl]);

  return null;
}

// Base camera position (captured from user's preferred view)
const BASE_CAMERA_DISTANCE = 146.89;
const BASE_CAMERA_HEIGHT = 16.87;
const CAMERA_TARGET = new THREE.Vector3(0, 1, 0);

// Rotation constraints (in radians) - limit to 90 degrees each side
const MAX_ROTATION_ANGLE = Math.PI / 2;
const MIN_ROTATION_ANGLE = -Math.PI / 2;

// Swipe sensitivity and animation
const SWIPE_SENSITIVITY = 0.003;
const ROTATION_LERP_SPEED = 0.08;

const MODEL_URL = "/models/claw-machine/test.glb";

type WinFlowStep = "reveal" | "choice" | "redeem" | "saved";
type DebugStage = "intro" | "loading" | "playing" | "none";

/**
 * Animated camera that orbits around the target based on rotation angle
 */
function OrbitingCamera({ targetAngle }: { targetAngle: number }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const currentAngle = useRef(0);

  useFrame(() => {
    if (!cameraRef.current) return;

    // Smoothly interpolate to target angle
    currentAngle.current = THREE.MathUtils.lerp(
      currentAngle.current,
      targetAngle,
      ROTATION_LERP_SPEED
    );

    // Calculate camera position on circular orbit around target
    const x = Math.sin(currentAngle.current) * BASE_CAMERA_DISTANCE;
    const z = Math.cos(currentAngle.current) * BASE_CAMERA_DISTANCE;

    cameraRef.current.position.set(x, BASE_CAMERA_HEIGHT, z);
    cameraRef.current.lookAt(CAMERA_TARGET);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={[0, BASE_CAMERA_HEIGHT, BASE_CAMERA_DISTANCE]}
      fov={1}
      near={1}
      far={1000}
    />
  );
}

type ClawMachine3DProps = {
  /**
   * Game outcome determines claw behavior:
   * - undefined/null: Dev mode - normal physics-based grab
   * - "win": Magnetize nearest prize to claw for guaranteed capture
   * - "lose": Weak grip that releases during rising phase
   */
  gameOutcome?: GameOutcome;
  /**
   * Callback triggered when user clicks "Press Start" on intro screen
   */
  onPlay?: () => void;
  /**
   * Whether the play action is currently loading
   */
  isPlaying?: boolean;
  /**
   * Whether wallet is connected
   */
  isConnected?: boolean;
  /**
   * Whether the game is active/playable
   */
  isActive?: boolean;
  /**
   * Display string for the cost (e.g., "100 TOKENS")
   */
  costDisplay?: string;
  /**
   * Game name to display on intro screen
   */
  gameName?: string;
  /**
   * Whether to show the intro screen (defaults to true)
   */
  showIntro?: boolean;
  /**
   * Optional loading message to display
   */
  loadingMessage?: string;
  /**
   * Whether to show the claw machine animation (set after wallet approves tx)
   */
  animationStarted?: boolean;
  /**
   * Whether to show the result screen (win/lose)
   */
  showResult?: boolean;
  /**
   * Prize name to show on win screen
   */
  prizeName?: string;
  /**
   * Prize image URL to show on win screen
   */
  prizeImageUrl?: string;
  /**
   * NFT mint address for the won prize (used for redemption)
   */
  prizeMint?: string;
  /**
   * User wallet address (used for redemption)
   */
  userWallet?: string;
  /**
   * Wallet adapter's signMessage function - REQUIRED for secure redemption
   */
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
  /**
   * Callback when user clicks "Play Again"
   */
  onPlayAgain?: () => void;
  /**
   * Callback when user clicks "View Collection" (win only)
   */
  onViewCollection?: () => void;
  /**
   * Callback when the player drops the claw (spacebar)
   */
  onDropStart?: () => void;
  /**
   * Debug-only stage override (Storybook/testing)
   */
  debugStage?: DebugStage;
  /**
   * Debug-only win step override (Storybook/testing)
   */
  debugWinFlowStep?: WinFlowStep;
  /**
   * Debug-only reveal controls (Storybook/testing)
   */
  enableRevealControls?: boolean;
};

/**
 * Main ClawMachine3D component.
 * Renders an interactive 3D claw machine game with physics.
 *
 * Controls:
 * - Arrow keys: Move the claw (X/Z directions)
 * - Space: Drop and grab
 * - Swipe left/right: Rotate camera view
 */
export default function ClawMachine3D({
  gameOutcome = null,
  onPlay,
  isPlaying = false,
  isConnected = false,
  isActive = true,
  costDisplay,
  gameName,
  showIntro = true,
  loadingMessage,
  animationStarted = false,
  showResult = false,
  prizeName,
  prizeImageUrl,
  prizeMint,
  userWallet,
  signMessage,
  onPlayAgain,
  onViewCollection,
  onDropStart,
  debugStage,
  debugWinFlowStep,
  enableRevealControls,
}: ClawMachine3DProps) {
  const [cameraAngle, setCameraAngle] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [winFlowStep, setWinFlowStep] = useState<WinFlowStep | null>(null);
  const effectiveWinFlowStep = debugWinFlowStep ?? winFlowStep;
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle play button click
  const handlePlay = useCallback(() => {
    if (onPlay) {
      onPlay();
      setHasStarted(true);
    }
  }, [onPlay]);

  // Reset intro when game outcome changes back to null (new game)
  useEffect(() => {
    if (gameOutcome === null && !isPlaying) {
      // Re-show intro after game completes (Play Again)
      setHasStarted(false);
    }
  }, [gameOutcome, isPlaying]);

  useEffect(() => {
    if (showResult && gameOutcome === "win") {
      setWinFlowStep("reveal");
    } else {
      setWinFlowStep(null);
    }
  }, [showResult, gameOutcome]);

  // Determine which screen to show:
  // 1. Intro screen: before user presses start
  // 2. Loading screen: after pressing start, until animation starts (wallet approved)
  // 3. Claw machine: after wallet approves transaction (animationStarted = true)
  const shouldShowIntro = debugStage
    ? debugStage === "intro"
    : showIntro && !hasStarted && !animationStarted;
  const shouldShowLoading = debugStage
    ? debugStage === "loading"
    : hasStarted && !animationStarted;
  const shouldShowClawMachine = debugStage
    ? debugStage === "playing"
    : animationStarted;

  // Touch/swipe tracking
  const touchStartX = useRef<number | null>(null);
  const isDragging = useRef(false);
  const startAngle = useRef(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      startAngle.current = cameraAngle;
      isDragging.current = true;
    },
    [cameraAngle]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || !isDragging.current) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const newAngle = startAngle.current - deltaX * SWIPE_SENSITIVITY;

    // Clamp to min/max rotation
    const clampedAngle = Math.max(
      MIN_ROTATION_ANGLE,
      Math.min(MAX_ROTATION_ANGLE, newAngle)
    );

    setCameraAngle(clampedAngle);
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchStartX.current = null;
    isDragging.current = false;
  }, []);

  // Mouse drag support for desktop
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      touchStartX.current = e.clientX;
      startAngle.current = cameraAngle;
      isDragging.current = true;
    },
    [cameraAngle]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (touchStartX.current === null || !isDragging.current) return;

    const deltaX = e.clientX - touchStartX.current;
    const newAngle = startAngle.current - deltaX * SWIPE_SENSITIVITY;

    // Clamp to min/max rotation
    const clampedAngle = Math.max(
      MIN_ROTATION_ANGLE,
      Math.min(MAX_ROTATION_ANGLE, newAngle)
    );

    setCameraAngle(clampedAngle);
  }, []);

  const handleMouseUp = useCallback(() => {
    touchStartX.current = null;
    isDragging.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    touchStartX.current = null;
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-[700px] rounded-lg overflow-hidden relative border border-pink-200 cursor-grab active:cursor-grabbing"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Pastel sky gradient background - kawaii theme */}
      {shouldShowClawMachine && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-pink-100" />
          {/* Floating clouds */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute top-[8%] -left-20 w-40 h-20 bg-white/70 rounded-full blur-sm"
              style={{ animation: "float-cloud-slow 12s ease-in-out infinite" }}
            />
            <div
              className="absolute top-[20%] -right-16 w-32 h-16 bg-white/60 rounded-full blur-sm"
              style={{
                animation: "float-cloud-slow 15s ease-in-out infinite 3s",
              }}
            />
            <div
              className="absolute top-[5%] left-[40%] w-24 h-12 bg-white/50 rounded-full blur-sm"
              style={{
                animation: "float-cloud-slow 18s ease-in-out infinite 6s",
              }}
            />
            <div
              className="absolute bottom-[15%] -left-10 w-28 h-14 bg-white/60 rounded-full blur-sm"
              style={{
                animation: "float-cloud-slow 14s ease-in-out infinite 2s",
              }}
            />
            <div
              className="absolute bottom-[25%] right-[10%] w-20 h-10 bg-white/50 rounded-full blur-sm"
              style={{
                animation: "float-cloud-slow 16s ease-in-out infinite 4s",
              }}
            />
          </div>
          {/* Sparkles */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div
              className="absolute top-[15%] left-[10%] text-xl"
              style={{ animation: "sparkle 2s ease-in-out infinite" }}
            >
              ✨
            </div>
            <div
              className="absolute top-[10%] right-[15%] text-lg"
              style={{ animation: "sparkle 2s ease-in-out infinite 0.7s" }}
            >
              ⭐
            </div>
            <div
              className="absolute bottom-[20%] left-[8%] text-lg"
              style={{ animation: "sparkle 2s ease-in-out infinite 1.4s" }}
            >
              💫
            </div>
          </div>
          {/* Animation styles */}
          <style jsx>{`
            @keyframes float-cloud-slow {
              0%,
              100% {
                transform: translateX(0) translateY(0);
              }
              50% {
                transform: translateX(15px) translateY(-8px);
              }
            }
            @keyframes sparkle {
              0%,
              100% {
                opacity: 1;
                transform: scale(1);
              }
              50% {
                opacity: 0.4;
                transform: scale(0.7);
              }
            }
          `}</style>
        </>
      )}

      {/* 3D Claw Machine - only render when animation starts (wallet approved) */}
      {shouldShowClawMachine && (
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ fov: 1 }}
          gl={{
            logarithmicDepthBuffer: true,
            alpha: true,
            antialias: true,
          }}
          style={{ background: "transparent" }}
        >
          <Suspense fallback={null}>
            {/* Scene setup for proper color management */}
            <SceneSetup />

            {/* City environment - balanced lighting */}
            <Environment preset="city" />

            {/* Balanced lighting */}
            <ambientLight intensity={0.8} />
            {/* Key light */}
            <directionalLight
              position={[5, 8, 5]}
              intensity={1.2}
              castShadow
              shadow-mapSize={[2048, 2048]}
            />
            {/* Fill light */}
            <directionalLight position={[-5, 5, -5]} intensity={1.2} />
            {/* Soft front light */}
            <pointLight position={[0, 3, 8]} intensity={1.2} />

            <OrbitingCamera targetAngle={cameraAngle} />
            <PhysicsScene
              modelUrl={MODEL_URL}
              gameOutcome={gameOutcome}
              onDropStart={onDropStart}
            />
          </Suspense>
        </Canvas>
      )}

      {/* Intro Screen - before pressing start */}
      {shouldShowIntro && (
        <IntroScreen
          onPlay={handlePlay}
          isLoading={isPlaying}
          isConnected={isConnected}
          isActive={isActive}
          costDisplay={costDisplay}
          gameName={gameName}
        />
      )}

      {/* Loading Screen - after pressing start, waiting for wallet approval */}
      {shouldShowLoading && (
        <LoadingScreen gameName={gameName} message={loadingMessage} />
      )}

      {/* Win Flow */}
      {/* Keep WinRevealScreen mounted during "choice" step to prevent flash */}
      {showResult &&
        gameOutcome === "win" &&
        (effectiveWinFlowStep === "reveal" || effectiveWinFlowStep === "choice") && (
          <WinRevealScreen
            onComplete={() => setWinFlowStep("choice")}
            enableRevealControls={enableRevealControls}
          />
        )}
      {showResult &&
        gameOutcome === "win" &&
        effectiveWinFlowStep === "choice" && (
          <WinChoiceScreen
            gameName={gameName}
            prizeName={prizeName}
            prizeImageUrl={prizeImageUrl}
            onRedeem={() => setWinFlowStep("redeem")}
            onSaveForLater={() => setWinFlowStep("saved")}
            onViewCollection={onViewCollection}
          />
        )}
      {showResult &&
        gameOutcome === "win" &&
        effectiveWinFlowStep === "redeem" && (
          <RedeemPrizeScreen
            gameName={gameName}
            prizeName={prizeName}
            prizeMint={prizeMint}
            userWallet={userWallet}
            signMessage={signMessage}
            onBack={() => setWinFlowStep("choice")}
            onPlayAgain={onPlayAgain}
            onViewCollection={onViewCollection}
          />
        )}
      {showResult &&
        gameOutcome === "win" &&
        effectiveWinFlowStep === "saved" && (
          <SavedScreen prizeName={prizeName} onPlayAgain={onPlayAgain} />
        )}

      {/* Lose Screen */}
      {showResult && gameOutcome === "lose" && (
        <LoseScreen gameName={gameName} onPlayAgain={onPlayAgain} />
      )}

      {/* Control hints - only show when claw machine is visible and not showing result */}
      {shouldShowClawMachine && !showResult && (
        <div className="absolute bottom-3 left-3 z-20 text-xs text-gray-600 pointer-events-none select-none bg-white/80 backdrop-blur-sm px-3 py-2 rounded-full border border-pink-200 font-medium">
          <div className="flex gap-4">
            <span>↑↓←→ Move</span>
            <span>Space Grab</span>
            <span>Drag to Rotate</span>
          </div>
        </div>
      )}

      {shouldShowClawMachine && !showResult && (
        <div className="absolute bottom-3 right-3 z-20 text-xs text-pink-400 pointer-events-none select-none bg-white/70 px-2 py-1 rounded-full">
          ✨ Interactive 3D
        </div>
      )}
    </div>
  );
}

// Preload models
useGLTF.preload(MODEL_URL);
