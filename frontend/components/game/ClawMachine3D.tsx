"use client";

import {
  Environment,
  PerspectiveCamera,
  useAnimations,
  useGLTF,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { button, useControls } from "leva";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

import Card from "@/components/ui/Card";
import CTAButton from "@/components/ui/CTAButton";
import { redemptionApi } from "@/services/api/redemption";
import { encryptShippingData, type ShippingData } from "@/utils/encryption";
import { PhysicsScene } from "./claw-machine/components/PhysicsScene";
import type { GameOutcome } from "./claw-machine/types";

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
const SPHERE_REVEAL_URL = "/models/claw-machine/Sphere_Animation_Open.glb";

// ============================================
// Intro Screen Component
// ============================================

type IntroScreenProps = {
  onPlay: () => void;
  isLoading: boolean;
  isConnected: boolean;
  isActive: boolean;
  costDisplay?: string;
  gameName?: string;
};

function IntroScreen({
  onPlay,
  isLoading,
  isConnected,
  isActive,
  costDisplay,
  gameName,
}: IntroScreenProps) {
  const [blinkVisible, setBlinkVisible] = useState(true);

  // Blinking "Press Start" effect
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkVisible((v) => !v);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const canPlay = isConnected && isActive && !isLoading;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden">
      {/* Pastel sky gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-pink-100" />

      {/* Floating clouds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[10%] -left-20 w-40 h-20 bg-white/70 rounded-full blur-sm"
          style={{ animation: "float-cloud 8s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[25%] -right-16 w-32 h-16 bg-white/60 rounded-full blur-sm"
          style={{ animation: "float-cloud 10s ease-in-out infinite 2s" }}
        />
        <div
          className="absolute top-[5%] left-[30%] w-24 h-12 bg-white/50 rounded-full blur-sm"
          style={{ animation: "float-cloud 12s ease-in-out infinite 4s" }}
        />
        <div
          className="absolute bottom-[30%] -left-10 w-28 h-14 bg-white/60 rounded-full blur-sm"
          style={{ animation: "float-cloud 9s ease-in-out infinite 1s" }}
        />
      </div>

      {/* Decorative sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[20%] left-[20%] text-2xl"
          style={{ animation: "sparkle 1.5s ease-in-out infinite" }}
        >
          ✨
        </div>
        <div
          className="absolute top-[15%] right-[25%] text-xl"
          style={{ animation: "sparkle 1.5s ease-in-out infinite 0.5s" }}
        >
          ⭐
        </div>
        <div
          className="absolute bottom-[25%] left-[15%] text-lg"
          style={{ animation: "sparkle 1.5s ease-in-out infinite 1s" }}
        >
          ✨
        </div>
        <div
          className="absolute bottom-[35%] right-[20%] text-2xl"
          style={{ animation: "sparkle 1.5s ease-in-out infinite 0.3s" }}
        >
          💫
        </div>
      </div>

      {/* Main content card - game card styling */}
      <Card
        variant="arcade"
        shadowColor="pink"
        borderColor="pink"
        hover
        padding="xl"
        className="relative z-10 mx-4 max-w-md text-center"
      >
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div style={{ animation: "bounce-gentle 2s ease-in-out infinite" }}>
            <Image
              src="/images/logo.png"
              alt="Gashapon Logo"
              width={80}
              height={80}
              className="drop-shadow-lg"
            />
          </div>
        </div>

        {/* Game title with outline shadow */}
        <div className="relative mb-4">
          <h2 className="font-display text-3xl md:text-4xl text-pastel-coral tracking-wide text-outline-xl">
            {gameName || "GASHAPON"}
          </h2>
          <div className="text-pastel-textLight text-sm font-bold tracking-widest mt-1">
            ★ CLAW MACHINE ★
          </div>
        </div>

        {/* Cost display - styled like wallet balance */}
        {costDisplay && (
          <div className="mb-6 inline-flex items-center gap-2 bg-pastel-yellow rounded-full px-4 py-2 border-2 border-yellow-400/50">
            <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-yellow-500">
              <span className="text-yellow-700 text-xs font-bold">$</span>
            </div>
            <span className="text-sm font-bold text-pastel-text">
              {costDisplay}
            </span>
          </div>
        )}

        {/* Play Button using CTAButton (same as game cards) */}
        <div className="mb-4">
          <CTAButton
            variant="orange"
            size="md"
            onClick={canPlay ? onPlay : undefined}
            disabled={!canPlay || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                LOADING...
              </span>
            ) : (
              <span
                className={
                  blinkVisible && canPlay ? "opacity-100" : "opacity-90"
                }
              >
                {canPlay
                  ? "PLAY NOW"
                  : !isConnected
                    ? "CONNECT WALLET"
                    : !isActive
                      ? "INACTIVE"
                      : "PLAY NOW"}
              </span>
            )}
          </CTAButton>
        </div>

        {/* Status messages - only show when not ready */}
        {(!isConnected || !isActive) && (
          <div className="text-center">
            {!isConnected && (
              <p className="text-pastel-coral text-sm font-medium animate-pulse">
                ⚠️ Connect your wallet to play
              </p>
            )}
            {isConnected && !isActive && (
              <p className="text-red-400 text-sm font-medium">
                ❌ This game is currently inactive
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Instructions at bottom */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-10">
        <div className="inline-flex gap-4 px-5 py-2 rounded-full bg-white/80 backdrop-blur-sm border-2 border-pastel-pink shadow-sm">
          <div className="text-pastel-text text-xs font-medium flex items-center gap-1">
            <span className="px-2 py-0.5 bg-pastel-pinkLight rounded text-[10px] text-pastel-coral">
              ↑↓←→
            </span>
            <span>Move</span>
          </div>
          <div className="text-pastel-text text-xs font-medium flex items-center gap-1">
            <span className="px-2 py-0.5 bg-pastel-pinkLight rounded text-[10px] text-pastel-coral">
              SPACE
            </span>
            <span>Grab</span>
          </div>
          <div className="text-pastel-text text-xs font-medium flex items-center gap-1">
            <span className="px-2 py-0.5 bg-pastel-pinkLight rounded text-[10px] text-pastel-coral">
              DRAG
            </span>
            <span>Rotate</span>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes float-cloud {
          0%,
          100% {
            transform: translateX(0) translateY(0);
          }
          50% {
            transform: translateX(20px) translateY(-10px);
          }
        }
        @keyframes sparkle {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }
        @keyframes bounce-gentle {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================
// Loading Screen Component (shown while waiting for result)
// Kawaii pastel arcade theme
// ============================================

type LoadingScreenProps = {
  gameName?: string;
  message?: string;
};

function LoadingScreen({ gameName, message }: LoadingScreenProps) {
  const [dots, setDots] = useState("");
  const [clawY, setClawY] = useState(0);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Claw bobbing animation
  useEffect(() => {
    const interval = setInterval(() => {
      setClawY((y) => (y === 0 ? 8 : 0));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden">
      {/* Pastel sky gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-pink-100" />

      {/* Floating clouds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[10%] -left-20 w-40 h-20 bg-white/70 rounded-full blur-sm"
          style={{ animation: "float-cloud 8s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[25%] -right-16 w-32 h-16 bg-white/60 rounded-full blur-sm"
          style={{ animation: "float-cloud 10s ease-in-out infinite 2s" }}
        />
        <div
          className="absolute top-[5%] left-[30%] w-24 h-12 bg-white/50 rounded-full blur-sm"
          style={{ animation: "float-cloud 12s ease-in-out infinite 4s" }}
        />
        <div
          className="absolute bottom-[30%] -left-10 w-28 h-14 bg-white/60 rounded-full blur-sm"
          style={{ animation: "float-cloud 9s ease-in-out infinite 1s" }}
        />
      </div>

      {/* Decorative sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[20%] left-[20%] text-2xl"
          style={{ animation: "sparkle 1.5s ease-in-out infinite" }}
        >
          ✨
        </div>
        <div
          className="absolute top-[15%] right-[25%] text-xl"
          style={{ animation: "sparkle 1.5s ease-in-out infinite 0.5s" }}
        >
          ⭐
        </div>
        <div
          className="absolute bottom-[25%] left-[15%] text-lg"
          style={{ animation: "sparkle 1.5s ease-in-out infinite 1s" }}
        >
          ✨
        </div>
        <div
          className="absolute bottom-[35%] right-[20%] text-2xl"
          style={{ animation: "sparkle 1.5s ease-in-out infinite 0.3s" }}
        >
          💫
        </div>
      </div>

      {/* Main content card */}
      <Card
        variant="arcade"
        shadowColor="pink"
        padding="xl"
        className="relative z-10 mx-4 max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div
            className="relative transition-transform duration-300"
            style={{ transform: `translateY(${clawY}px)` }}
          >
            <Image
              src="/images/logo.png"
              alt="Gashapon Logo"
              width={100}
              height={100}
              className="drop-shadow-lg"
            />
          </div>
        </div>

        {/* Title */}
        <h2 className="font-display text-2xl md:text-3xl text-center text-pastel-coral mb-2 tracking-wide text-outline-xl">
          {gameName || "GASHAPON"}
        </h2>

        {/* Loading text */}
        <div className="text-center mb-6">
          <p className="text-xl font-display text-pastel-text">
            Getting your prize{dots}
          </p>
          <p className="text-sm text-pastel-textLight mt-2 font-medium">
            {message || "Processing on Solana blockchain"}
          </p>
        </div>

        {/* Cute progress bar */}
        <div className="relative">
          <div className="w-full h-4 bg-pastel-pinkLight rounded-full overflow-hidden border-2 border-pastel-pink">
            <div
              className="h-full bg-gradient-to-r from-pastel-coral via-pastel-peach to-pastel-coral rounded-full"
              style={{
                animation: "progress-slide 1.5s ease-in-out infinite",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
          {/* Decorative dots on progress bar */}
          <div className="absolute top-1/2 -translate-y-1/2 left-2 w-2 h-2 bg-white/60 rounded-full" />
          <div className="absolute top-1/2 -translate-y-1/2 right-2 w-2 h-2 bg-white/60 rounded-full" />
        </div>

        {/* Bouncing coins decoration */}
        <div className="flex justify-center gap-3 mt-6">
          <span
            className="text-2xl"
            style={{ animation: "bounce-coin 0.6s ease-in-out infinite" }}
          >
            🪙
          </span>
          <span
            className="text-2xl"
            style={{ animation: "bounce-coin 0.6s ease-in-out infinite 0.2s" }}
          >
            🎀
          </span>
          <span
            className="text-2xl"
            style={{ animation: "bounce-coin 0.6s ease-in-out infinite 0.4s" }}
          >
            🪙
          </span>
        </div>
      </Card>

      {/* Bottom decoration */}
      <div className="absolute bottom-4 text-center z-10">
        <p className="text-pink-400/80 text-xs font-medium">✨ Good luck! ✨</p>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes float-cloud {
          0%,
          100% {
            transform: translateX(0) translateY(0);
          }
          50% {
            transform: translateX(20px) translateY(-10px);
          }
        }
        @keyframes sparkle {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }
        @keyframes wiggle {
          0%,
          100% {
            transform: translateX(-50%) rotate(-3deg);
          }
          50% {
            transform: translateX(-50%) rotate(3deg);
          }
        }
        @keyframes progress-slide {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        @keyframes bounce-coin {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================
// Win Screen Component (kawaii celebration!)
// ============================================

type ResultScreenProps = {
  gameName?: string;
  prizeName?: string;
  prizeImageUrl?: string;
  onPlayAgain?: () => void;
  onViewCollection?: () => void;
};

type WinFlowStep = "reveal" | "choice" | "redeem" | "saved";
type DebugStage = "intro" | "loading" | "playing" | "none";

type WinChoiceScreenProps = ResultScreenProps & {
  onRedeem?: () => void;
  onSaveForLater?: () => void;
};

function WinChoiceScreen({
  gameName,
  prizeName,
  prizeImageUrl,
  onViewCollection,
  onRedeem,
  onSaveForLater,
}: WinChoiceScreenProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-pastel-sky via-pastel-pinkLight to-pastel-lavender" />
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.3) 45%, rgba(248,149,158,0.08) 70%, transparent 85%)",
          }}
        />
        <div className="absolute top-8 left-10 h-24 w-24 rounded-full bg-pastel-yellow/40 blur-2xl" />
        <div className="absolute bottom-12 right-10 h-28 w-28 rounded-full bg-pastel-mint/40 blur-2xl" />
      </div>

      <div className="relative z-10 h-full w-full px-6 py-8 flex flex-col items-center justify-between text-center">
        <div className="space-y-2">
          <div className="text-xs tracking-[0.35em] uppercase text-pastel-textLight">
            Prize Unlocked
          </div>
          <h2 className="font-display text-4xl md:text-6xl text-pastel-coral text-outline-xl">
            YOU WIN
          </h2>
        </div>

        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-pastel-yellow/40 blur-3xl animate-pulse" />
            <div className="absolute -inset-4 rounded-full border border-white/60 animate-spin-slow" />
            <div className="h-52 w-52 md:h-60 md:w-60 rounded-full bg-white/85 border-2 border-pastel-pink shadow-card overflow-hidden flex items-center justify-center">
              {prizeImageUrl ? (
                <img
                  src={prizeImageUrl}
                  alt={prizeName ? `${prizeName} prize` : "Prize"}
                  className="h-full w-full object-contain p-6"
                />
              ) : (
                <div className="text-7xl text-pastel-coral">★</div>
              )}
            </div>
          </div>
          {prizeName && (
            <div className="px-6 py-2 rounded-full bg-white/80 border-2 border-pastel-pink/60 text-pastel-text font-semibold text-lg">
              {prizeName}
            </div>
          )}
        </div>

        <div className="w-full max-w-sm flex flex-col gap-2">
          {onRedeem && (
            <CTAButton
              variant="orange"
              size="xs"
              onClick={onRedeem}
              className="w-full"
            >
              REDEEM PRIZE
            </CTAButton>
          )}
          {onSaveForLater && (
            <CTAButton
              variant="pink"
              size="xs"
              onClick={onSaveForLater}
              className="w-full"
            >
              SAVE FOR LATER
            </CTAButton>
          )}
          {onViewCollection && (
            <CTAButton
              variant="pink"
              size="xs"
              onClick={onViewCollection}
              className="w-full"
            >
              VIEW COLLECTION
            </CTAButton>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 18s linear infinite;
        }
      `}</style>
    </div>
  );
}

function SphereRevealModel({
  onComplete,
  enableRevealControls = false,
  shouldComplete = true,
}: {
  onComplete: () => void;
  enableRevealControls?: boolean;
  shouldComplete?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(SPHERE_REVEAL_URL);
  const { actions, mixer } = useAnimations(animations, group);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const {
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    capsuleScale,
    animationStage,
  } = useControls(
    "Capsule Reveal",
    {
      positionX: { value: 0, min: -2, max: 2, step: 0.01 },
      positionY: { value: 0, min: -2, max: 2, step: 0.01 },
      positionZ: { value: 0, min: -2, max: 2, step: 0.01 },
      rotationX: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01 },
      rotationY: { value: 1.6, min: -Math.PI, max: Math.PI, step: 0.01 },
      rotationZ: { value: 1.55, min: -Math.PI, max: Math.PI, step: 0.01 },
      capsuleScale: { value: 0.5, min: 0.1, max: 2.5, step: 0.01 },
      animationStage: { value: 0.5, min: 0, max: 1, step: 0.001 },
    },
    { collapsed: true, render: () => enableRevealControls }
  );

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    scene.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      setFitScale(1.5 / maxDim);
    }
    scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.visible = true;
        const material = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) {
          material.forEach((mat) => {
            if ("transparent" in mat) mat.transparent = false;
            if ("opacity" in mat) mat.opacity = 1;
            if ("side" in mat) mat.side = THREE.DoubleSide;
          });
        } else if (material) {
          if ("transparent" in material) material.transparent = false;
          if ("opacity" in material) material.opacity = 1;
          if ("side" in material) material.side = THREE.DoubleSide;
        }
      }
    });
  }, [scene]);

  useEffect(() => {
    const action =
      Object.values(actions)[2] ||
      actions["Sphere_Animation_Open"] ||
      Object.values(actions)[0];
    if (!action) return;
    actionRef.current = action;
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;

    if (enableRevealControls) {
      action.play();
      action.paused = true;
      action.enabled = true;
      action.time = 0;
      mixer.setTime(0);
      return;
    }

    // Start at 50% of the animation and play to 100% over 4 seconds
    const clipDuration = action.getClip().duration || 1;
    action.time = clipDuration * 0.5; // Start at 50%
    action.play();
    action.paused = false;
    // Play remaining 50% over 4 seconds: timeScale = (0.5 * duration) / 4
    action.timeScale = (clipDuration * 0.5) / 4;
    mixer.timeScale = 1;

    const handleFinished = (event: THREE.Event) => {
      if (!shouldComplete) return;
      const finishedAction = (
        event as unknown as { action?: THREE.AnimationAction }
      ).action;
      if (event.type === "finished" && finishedAction === action) {
        onComplete();
      }
    };
    mixer.addEventListener("finished", handleFinished);
    return () => {
      mixer.removeEventListener("finished", handleFinished);
      action.stop();
    };
  }, [actions, mixer, onComplete, enableRevealControls, shouldComplete]);

  // Scrub animation when slider changes
  useFrame(() => {
    if (!enableRevealControls) return;
    const action = actionRef.current;
    if (!action) return;
    const duration = action.getClip().duration || 1;
    action.time = duration * animationStage;
    mixer.update(0); // Force apply the animation state
  });

  return (
    <group
      ref={group}
      position={[positionX, positionY, positionZ]}
      rotation={[rotationX, rotationY, rotationZ]}
      scale={capsuleScale * fitScale}
    >
      <primitive object={scene} />
      <PlasmaBall enableControls={enableRevealControls} />
    </group>
  );
}

// Rainbow glowing plasma ball inside the capsule
function PlasmaBall({ enableControls = false }: { enableControls?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hue, setHue] = useState(0);

  const { plasmaX, plasmaY, plasmaZ, plasmaScale } = useControls(
    "Plasma Ball",
    {
      plasmaX: { value: 0, min: -2, max: 2, step: 0.01 },
      plasmaY: { value: 0, min: -2, max: 2, step: 0.01 },
      plasmaZ: { value: 0, min: -2, max: 2, step: 0.01 },
      plasmaScale: { value: 0.15, min: 0.01, max: 1, step: 0.01 },
    },
    { collapsed: true, render: () => enableControls }
  );

  useFrame((_, delta) => {
    // Rotate the ball
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.rotation.x += delta * 0.3;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y -= delta * 0.3;
    }
    // Cycle through rainbow colors
    setHue((prev) => (prev + delta * 0.15) % 1);
  });

  const color = new THREE.Color().setHSL(hue, 0.9, 0.6);
  const glowColor = new THREE.Color().setHSL((hue + 0.1) % 1, 1, 0.7);

  return (
    <group position={[plasmaX, plasmaY, plasmaZ]} scale={plasmaScale}>
      {/* Core plasma ball */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Outer glow */}
      <mesh ref={glowRef} scale={1.4}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Inner bright core */}
      <mesh scale={0.5}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial color="white" transparent opacity={0.8} />
      </mesh>
      {/* Point light for glow effect */}
      <pointLight color={color} intensity={3} distance={2} />
    </group>
  );
}

function WinRevealScreen({
  onComplete,
  enableRevealControls = false,
}: {
  onComplete: () => void;
  enableRevealControls?: boolean;
}) {
  const handleComplete = useCallback(() => {
    if (enableRevealControls) return;
    onComplete();
  }, [enableRevealControls, onComplete]);
  useControls(
    "Capsule Reveal",
    {
      advanceToWin: button(() => {
        if (enableRevealControls) {
          onComplete();
        }
      }),
    },
    { collapsed: true, render: () => enableRevealControls }
  );

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-hidden bg-pastel-sky">
      <div className="absolute inset-0 bg-gradient-to-b from-pastel-sky via-pastel-lavender to-pastel-pinkLight" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.9),rgba(255,255,255,0.35)_35%,transparent_70%)] animate-reveal-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,229,160,0.55),transparent_55%)] animate-reveal-glow" />
        <div className="absolute -top-16 left-8 h-32 w-32 rounded-full bg-pastel-mint/40 blur-3xl animate-orb-float" />
        <div className="absolute bottom-8 right-10 h-28 w-28 rounded-full bg-pastel-coral/40 blur-3xl animate-orb-float-delayed" />
        <div className="absolute inset-0 opacity-70 animate-sparkle-burst">
          {"⭐✨💫🎀".split("").map((icon, index) => (
            <span
              key={`${icon}-${index}`}
              className="absolute text-xl"
              style={{
                left: `${20 + index * 18}%`,
                top: `${15 + (index % 2) * 35}%`,
              }}
            >
              {icon}
            </span>
          ))}
        </div>
      </div>
      <div className="absolute inset-0">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 4], fov: 35 }}
          gl={{ alpha: true, antialias: true }}
        >
          <Suspense fallback={null}>
            <SceneSetup />
            <ambientLight intensity={0.6} />
            <directionalLight position={[2, 4, 3]} intensity={1.2} />
            <pointLight position={[-2, -1, 2]} intensity={1.0} />
            <SphereRevealModel
              onComplete={handleComplete}
              enableRevealControls={enableRevealControls}
              shouldComplete={!enableRevealControls}
            />
          </Suspense>
        </Canvas>
      </div>
      {!enableRevealControls && (
        <div className="absolute inset-0 bg-pastel-sky opacity-0 animate-reveal-fade" />
      )}

      <style jsx>{`
        @keyframes reveal-pulse {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(0.95);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
        @keyframes reveal-glow {
          0% {
            opacity: 0.2;
          }
          60% {
            opacity: 0.6;
          }
          100% {
            opacity: 0.2;
          }
        }
        @keyframes reveal-fade {
          0% {
            opacity: 0;
          }
          70% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes orb-float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-12px) translateX(8px);
          }
        }
        @keyframes sparkle-burst {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          40% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0.2;
            transform: scale(1.1);
          }
        }
        .animate-reveal-pulse {
          animation: reveal-pulse 1.8s ease-in-out infinite;
        }
        .animate-reveal-glow {
          animation: reveal-glow 1.6s ease-in-out infinite;
        }
        .animate-reveal-fade {
          animation: reveal-fade 2.8s ease-in-out forwards;
        }
        .animate-orb-float {
          animation: orb-float 3s ease-in-out infinite;
        }
        .animate-orb-float-delayed {
          animation: orb-float 3s ease-in-out infinite 1.2s;
        }
        .animate-sparkle-burst {
          animation: sparkle-burst 1.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

type RedeemPrizeScreenProps = ResultScreenProps & {
  prizeMint?: string;
  userWallet?: string;
  onBack?: () => void;
};

function RedeemPrizeScreen({
  prizeMint,
  userWallet,
  onPlayAgain,
  onViewCollection,
  onBack,
}: RedeemPrizeScreenProps) {
  const [shipping, setShipping] = useState<ShippingData>({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    email: "",
  });
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateShipping = (field: keyof ShippingData, value: string) => {
    setShipping((prev) => ({ ...prev, [field]: value }));
  };

  const handleRedeem = async () => {
    if (!prizeMint || !userWallet) {
      setRedeemMessage("Connect your wallet to redeem this prize.");
      return;
    }
    if (
      !shipping.name ||
      !shipping.address ||
      !shipping.city ||
      !shipping.state ||
      !shipping.zip ||
      !shipping.country
    ) {
      setRedeemMessage("Please fill out all required shipping fields.");
      return;
    }

    setSubmitting(true);
    setRedeemMessage("Submitting redemption...");

    try {
      const encryptedShippingData = await encryptShippingData({
        name: shipping.name,
        address: shipping.address,
        city: shipping.city,
        state: shipping.state,
        zip: shipping.zip,
        country: shipping.country,
        email: shipping.email || undefined,
      });
      const signature = `redeem-${Date.now()}`;
      const res = await redemptionApi.redeemNft({
        nftMint: prizeMint,
        userWallet,
        signature,
        encryptedShippingData,
      });

      if (res.success) {
        setRedeemMessage(
          `Redemption submitted. Tracking ${res.trackingNumber || "TBD"}`
        );
      } else {
        setRedeemMessage(res.error || "Redemption failed");
      }
    } catch (error) {
      setRedeemMessage(
        error instanceof Error ? error.message : "Redemption failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

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
          Your shipping details are encrypted in your browser and used only to
          generate a label. We never store your address.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
          <input
            className="rounded-xl px-3 py-2 border-2 border-pastel-pink/30 focus:border-pastel-coral focus:outline-none text-sm bg-white text-pastel-text md:col-span-2"
            placeholder="Full Name *"
            value={shipping.name}
            onChange={(e) => updateShipping("name", e.target.value)}
          />
          <input
            className="rounded-xl px-3 py-2 border-2 border-pastel-pink/30 focus:border-pastel-coral focus:outline-none text-sm bg-white text-pastel-text md:col-span-2"
            placeholder="Address *"
            value={shipping.address}
            onChange={(e) => updateShipping("address", e.target.value)}
          />
          <input
            className="rounded-xl px-3 py-2 border-2 border-pastel-pink/30 focus:border-pastel-coral focus:outline-none text-sm bg-white text-pastel-text"
            placeholder="City *"
            value={shipping.city}
            onChange={(e) => updateShipping("city", e.target.value)}
          />
          <input
            className="rounded-xl px-3 py-2 border-2 border-pastel-pink/30 focus:border-pastel-coral focus:outline-none text-sm bg-white text-pastel-text"
            placeholder="State *"
            value={shipping.state}
            onChange={(e) => updateShipping("state", e.target.value)}
          />
          <input
            className="rounded-xl px-3 py-2 border-2 border-pastel-pink/30 focus:border-pastel-coral focus:outline-none text-sm bg-white text-pastel-text"
            placeholder="ZIP *"
            value={shipping.zip}
            onChange={(e) => updateShipping("zip", e.target.value)}
          />
          <input
            className="rounded-xl px-3 py-2 border-2 border-pastel-pink/30 focus:border-pastel-coral focus:outline-none text-sm bg-white text-pastel-text"
            placeholder="Country *"
            value={shipping.country}
            onChange={(e) => updateShipping("country", e.target.value)}
          />
          <input
            className="rounded-xl px-3 py-2 border-2 border-pastel-pink/30 focus:border-pastel-coral focus:outline-none text-sm bg-white text-pastel-text md:col-span-2"
            placeholder="Email (optional)"
            value={shipping.email}
            onChange={(e) => updateShipping("email", e.target.value)}
          />
        </div>

        {redeemMessage && (
          <div className="mt-3 text-sm text-pastel-textLight">
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
            {submitting ? "SUBMITTING..." : "SUBMIT REDEMPTION"}
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

function SavedScreen({ prizeName, onPlayAgain }: ResultScreenProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-pastel-yellow via-pastel-pinkLight to-pastel-lavender" />
      <Card
        variant="arcade"
        shadowColor="coral"
        padding="xl"
        className="relative z-10 mx-4 max-w-md text-center"
      >
        <h2 className="font-display text-3xl text-pastel-coral mb-2 text-outline-xl">
          SAVED FOR LATER
        </h2>
        {prizeName && (
          <p className="text-pastel-text text-sm mb-4">
            Your prize is waiting in your collection.
          </p>
        )}
        {onPlayAgain && (
          <CTAButton
            variant="orange"
            size="sm"
            onClick={onPlayAgain}
            className="w-full"
          >
            PLAY AGAIN
          </CTAButton>
        )}
      </Card>
    </div>
  );
}

// ============================================
// Lose Screen Component (kawaii encouragement!)
// ============================================

function LoseScreen({ gameName, onPlayAgain }: ResultScreenProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden">
      {/* Soft pastel gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-pastel-sky via-pastel-lavender to-pastel-pinkLight" />

      {/* Floating clouds (slower, calming) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[10%] -left-20 w-40 h-20 bg-white/60 rounded-full blur-sm"
          style={{ animation: "float-cloud-calm 10s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[30%] -right-16 w-32 h-16 bg-white/50 rounded-full blur-sm"
          style={{ animation: "float-cloud-calm 12s ease-in-out infinite 2s" }}
        />
        <div
          className="absolute bottom-[20%] left-[10%] w-24 h-12 bg-white/40 rounded-full blur-sm"
          style={{ animation: "float-cloud-calm 14s ease-in-out infinite 4s" }}
        />
      </div>

      {/* Gentle sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[25%] left-[20%] text-xl opacity-60"
          style={{ animation: "gentle-sparkle 2s ease-in-out infinite" }}
        >
          ✨
        </div>
        <div
          className="absolute top-[20%] right-[25%] text-lg opacity-50"
          style={{ animation: "gentle-sparkle 2s ease-in-out infinite 0.7s" }}
        >
          💫
        </div>
        <div
          className="absolute bottom-[30%] right-[20%] text-xl opacity-60"
          style={{ animation: "gentle-sparkle 2s ease-in-out infinite 1.4s" }}
        >
          ⭐
        </div>
      </div>

      {/* Main content card */}
      <Card
        variant="arcade"
        shadowColor="purple"
        padding="xl"
        className="relative z-10 mx-4 max-w-md text-center"
      >
        {/* Cute sad face that becomes encouraging */}
        <div className="flex justify-center mb-4">
          <div
            className="text-6xl"
            style={{ animation: "wiggle-sad 2s ease-in-out infinite" }}
          >
            🎰
          </div>
        </div>

        {/* Lose message - encouraging! */}
        <h2 className="font-display text-3xl text-pastel-coral mb-2 text-outline-xl">
          SO CLOSE!
        </h2>
        <p className="text-pastel-textLight text-base mb-2">
          The prize slipped away... 💨
        </p>
        <p className="text-pastel-coral text-sm mb-6 font-medium">
          ✨ Don't give up! Try again! ✨
        </p>

        {/* Encouraging message box */}
        <div className="mb-6 px-5 py-3 rounded-2xl bg-pastel-lavender/50 border-2 border-pastel-purple/30">
          <p className="text-sm text-pastel-textLight">
            🍀 Every try gets you closer to winning!
          </p>
        </div>

        {/* Play again button */}
        {onPlayAgain && (
          <CTAButton
            variant="orange"
            size="sm"
            onClick={onPlayAgain}
            className="w-full"
          >
            TRY AGAIN
          </CTAButton>
        )}

        {/* Hearts decoration */}
        <div className="flex justify-center gap-2 mt-4">
          <span className="text-pastel-pink text-lg">💕</span>
          <span className="text-pastel-purple text-lg">💜</span>
          <span className="text-pastel-sky text-lg">💙</span>
        </div>
      </Card>

      {/* Bottom encouragement */}
      <div className="absolute bottom-6 text-center z-10">
        <p className="text-pastel-textLight text-xs font-medium">
          🌟 Winners never quit! 🌟
        </p>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes float-cloud-calm {
          0%,
          100% {
            transform: translateX(0) translateY(0);
          }
          50% {
            transform: translateX(10px) translateY(-5px);
          }
        }
        @keyframes gentle-sparkle {
          0%,
          100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(0.9);
          }
        }
        @keyframes wiggle-sad {
          0%,
          100% {
            transform: rotate(-3deg);
          }
          50% {
            transform: rotate(3deg);
          }
        }
      `}</style>
    </div>
  );
}

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
      // Allow re-showing intro after game completes
      // setHasStarted(false); // Uncomment to re-show intro after each game
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
      {showResult &&
        gameOutcome === "win" &&
        effectiveWinFlowStep === "reveal" && (
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
useGLTF.preload(SPHERE_REVEAL_URL);
