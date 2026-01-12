"use client";

import { Environment, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useCallback, useRef, useState } from "react";
import * as THREE from "three";
import { PhysicsScene } from "./claw-machine/components/PhysicsScene";

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

const MODEL_URL = "/models/claw-machine/Claw_MachineGLB.glb";

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

/**
 * Main ClawMachine3D component.
 * Renders an interactive 3D claw machine game with physics.
 *
 * Controls:
 * - Arrow keys: Move the claw (X/Z directions)
 * - Space: Drop and grab
 * - Swipe left/right: Rotate camera view
 */
export default function ClawMachine3D() {
  const [cameraAngle, setCameraAngle] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Touch/swipe tracking
  const touchStartX = useRef<number | null>(null);
  const isDragging = useRef(false);
  const startAngle = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    startAngle.current = cameraAngle;
    isDragging.current = true;
  }, [cameraAngle]);

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
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    touchStartX.current = e.clientX;
    startAngle.current = cameraAngle;
    isDragging.current = true;
  }, [cameraAngle]);

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
      className="w-full h-[700px] rounded-lg overflow-hidden relative border border-white/10 cursor-grab active:cursor-grabbing"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Arcade background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/arcade-background.png')" }}
      />
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 1 }}
        gl={{ logarithmicDepthBuffer: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Environment preset="city" />
          <ambientLight intensity={1.0} />
          <directionalLight position={[5, 10, 5]} intensity={1.0} castShadow />
          <directionalLight position={[-5, 8, -5]} intensity={0.5} />
          <pointLight position={[0, 5, 10]} intensity={0.7} />

          <OrbitingCamera targetAngle={cameraAngle} />
          <PhysicsScene modelUrl={MODEL_URL} />
        </Suspense>
      </Canvas>

      {/* Control hints */}
      <div className="absolute bottom-3 left-3 text-xs text-white/60 pointer-events-none select-none bg-black/50 px-3 py-2 rounded-md font-mono">
        <div className="flex gap-4">
          <span>↑↓←→ Move</span>
          <span>Space Grab</span>
          <span>Drag to Rotate</span>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 text-xs text-white/40 pointer-events-none select-none bg-black/40 px-2 py-1 rounded">
        Interactive 3D Preview
      </div>
    </div>
  );
}

// Preload models
useGLTF.preload(MODEL_URL);
