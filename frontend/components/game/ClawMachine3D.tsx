"use client";

import { Environment, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import { PhysicsScene } from "./claw-machine/components/PhysicsScene";

// Locked camera position (captured from user's preferred view)
const CAMERA_POSITION: [number, number, number] = [0.92, 16.87, 146.89];
const CAMERA_TARGET = new THREE.Vector3(0, 1, 0);

const MODEL_URL = "/models/claw-machine/Claw_MachineGLB.glb";

/**
 * Main ClawMachine3D component.
 * Renders an interactive 3D claw machine game with physics.
 *
 * Controls:
 * - Arrow keys: Move the claw (X/Z directions)
 * - Space: Drop and grab
 */
export default function ClawMachine3D() {
  return (
    <div className="w-full h-[700px] rounded-lg overflow-hidden relative border border-white/10">
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

          <PerspectiveCamera
            makeDefault
            position={CAMERA_POSITION}
            fov={1}
            near={1}
            far={1000}
            onUpdate={(camera) => camera.lookAt(CAMERA_TARGET)}
          />
          <PhysicsScene modelUrl={MODEL_URL} />
        </Suspense>
      </Canvas>

      {/* Control hints */}
      <div className="absolute bottom-3 left-3 text-xs text-white/60 pointer-events-none select-none bg-black/50 px-3 py-2 rounded-md font-mono">
        <div className="flex gap-4">
          <span>↑↓←→ Move</span>
          <span>Space Grab</span>
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
