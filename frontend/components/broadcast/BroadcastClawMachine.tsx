"use client";

import { replayControlsRef } from "@/components/game/claw-machine/useKeyboardControls";
import { useActionReplayer } from "@/hooks/useActionReplayer";
import { decompressRecording, PlayRecording } from "@/hooks/useActionRecorder";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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

// Camera for broadcast view - slightly zoomed out for better viewing
const CAMERA_DISTANCE = 160;
const CAMERA_HEIGHT = 20;
const CAMERA_TARGET = new THREE.Vector3(0, 1, 0);

function BroadcastCamera({ autoRotate = true }: { autoRotate?: boolean }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const angleRef = useRef(0);

  useFrame((_, delta) => {
    if (!cameraRef.current) return;

    // Slow auto-rotation for broadcast view
    if (autoRotate) {
      angleRef.current += delta * 0.1;
    }

    const x = Math.sin(angleRef.current) * CAMERA_DISTANCE;
    const z = Math.cos(angleRef.current) * CAMERA_DISTANCE;

    cameraRef.current.position.set(x, CAMERA_HEIGHT, z);
    cameraRef.current.lookAt(CAMERA_TARGET);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={[0, CAMERA_HEIGHT, CAMERA_DISTANCE]}
      fov={1}
      near={1}
      far={1000}
    />
  );
}

const MODEL_URL = "/models/claw-machine/test.glb";

interface BroadcastClawMachineProps {
  /** Compressed recording data (base64) */
  recordingData?: string | null;
  /** Game outcome to determine claw behavior */
  gameOutcome: GameOutcome;
  /** Called when replay completes */
  onReplayComplete?: () => void;
  /** Auto-start replay when component mounts */
  autoPlay?: boolean;
}

/**
 * Claw machine component for broadcast replay.
 * Takes recorded player actions and replays them.
 */
export function BroadcastClawMachine({
  recordingData,
  gameOutcome,
  onReplayComplete,
  autoPlay = true,
}: BroadcastClawMachineProps) {
  const [isReady, setIsReady] = useState(false);
  
  // Decompress recording
  const recording = useMemo<PlayRecording | null>(() => {
    if (!recordingData) return null;
    return decompressRecording(recordingData);
  }, [recordingData]);

  // Use replayer hook
  const { keys, isPlaying, play, duration } = useActionReplayer(recording);

  // Inject replay keys into the global ref
  useEffect(() => {
    if (isPlaying) {
      replayControlsRef.current = keys;
    } else {
      replayControlsRef.current = null;
    }
    
    return () => {
      replayControlsRef.current = null;
    };
  }, [isPlaying, keys]);

  // Auto-play when ready
  useEffect(() => {
    if (autoPlay && recording && isReady && !isPlaying) {
      // Small delay to ensure physics is initialized
      const timer = setTimeout(() => {
        play();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, recording, isReady, isPlaying, play]);

  // Handle replay completion
  useEffect(() => {
    if (recording && !isPlaying && duration > 0) {
      // Replay just finished
      onReplayComplete?.();
    }
  }, [isPlaying, duration, recording, onReplayComplete]);

  // If no recording, show a placeholder animation
  const hasRecording = recording && recording.frames.length > 0;

  return (
    <div className="w-full h-full relative">
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

      {/* 3D Canvas */}
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
        onCreated={() => setIsReady(true)}
      >
        <Suspense fallback={null}>
          <SceneSetup />
          <Environment preset="city" />
          
          <ambientLight intensity={0.8} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight position={[-5, 5, -5]} intensity={1.2} />
          <pointLight position={[0, 3, 8]} intensity={1.2} />

          <BroadcastCamera autoRotate={!isPlaying} />
          
          <PhysicsScene
            modelUrl={MODEL_URL}
            gameOutcome={hasRecording ? gameOutcome : null}
          />
        </Suspense>
      </Canvas>

      {/* Replay status overlay */}
      {!hasRecording && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 text-center">
            <p className="text-pastel-text font-medium">No recording available</p>
            <p className="text-pastel-text/60 text-sm">Showing idle machine</p>
          </div>
        </div>
      )}

      {/* Playing indicator */}
      {isPlaying && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-medium text-pastel-text">Replaying...</span>
        </div>
      )}
    </div>
  );
}
