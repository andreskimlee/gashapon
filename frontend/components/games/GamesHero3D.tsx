/**
 * Games Hero 3D Component
 * 
 * Eye-catching 3D hero section with floating capsule balls
 * and animated claw. Uses static banner on mobile for performance.
 */

"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import { motion } from "framer-motion";
import { Suspense, useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

const CLAW_MACHINE_URL = "/models/claw-machine/test.glb";
const CAPSULE_URL = "/models/claw-machine/Sphere_Rigged.glb";

// Capsule ball with smooth floating animation
function CapsuleBall({ 
  position, 
  scale = 1,
}: { 
  position: [number, number, number]; 
  scale?: number;
}) {
  const gltf = useGLTF(CAPSULE_URL);
  const groupRef = useRef<THREE.Group>(null);
  
  // Random phase offsets for organic variation between capsules
  const offsets = useMemo(() => ({
    x: Math.random() * Math.PI * 2,
    y: Math.random() * Math.PI * 2,
    z: Math.random() * Math.PI * 2,
    rotX: Math.random() * Math.PI * 2,
    rotY: Math.random() * Math.PI * 2,
    rotZ: Math.random() * Math.PI * 2,
    speed: 0.8 + Math.random() * 0.4, // 0.8 to 1.2
  }), []);
  
  // Clone the scene for each instance (preserving original materials)
  const clonedScene = useMemo(() => {
    return SkeletonUtils.clone(gltf.scene);
  }, [gltf.scene]);
  
  // Smooth floating animation
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime * offsets.speed;
      
      // Gentle floating position movement
      groupRef.current.position.x = position[0] + Math.sin(time * 0.3 + offsets.x) * 0.4;
      groupRef.current.position.y = position[1] + Math.sin(time * 0.25 + offsets.y) * 0.5;
      groupRef.current.position.z = position[2] + Math.sin(time * 0.2 + offsets.z) * 0.3;
      
      // Gentle tumbling rotation
      groupRef.current.rotation.x = Math.sin(time * 0.2 + offsets.rotX) * 0.3;
      groupRef.current.rotation.y = Math.sin(time * 0.15 + offsets.rotY) * 0.4;
      groupRef.current.rotation.z = Math.sin(time * 0.18 + offsets.rotZ) * 0.25;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  );
}

// Preload the capsule model
useGLTF.preload(CAPSULE_URL);

// Animated claw using the actual game model
function AnimatedClaw() {
  const gltf = useGLTF(CLAW_MACHINE_URL);
  const groupRef = useRef<THREE.Group>(null);
  const nodesRef = useRef<Record<string, THREE.Object3D>>({});
  const initialClawRotations = useRef<Record<string, THREE.Euler>>({});
  
  // Clone and prepare the scene
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(gltf.scene);
    // The model uses ARMATURE_SCALE of 0.01, we want it bigger for the hero
    // Scale up to make claw visible (model coords are like -70 to 70)
    clone.scale.setScalar(0.025);
    return clone;
  }, [gltf.scene]);

  // Setup: find nodes and hide non-claw parts
  useEffect(() => {
    const nodes: Record<string, THREE.Object3D> = {};
    
    clonedScene.traverse((child) => {
      if (child?.name) {
        nodes[child.name] = child;
        
        // Store initial claw rotations
        if (["claw_1", "claw_2", "claw_3"].includes(child.name)) {
          initialClawRotations.current[child.name] = child.rotation.clone();
        }
      }
      
      // Hide non-claw meshes
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();
        // Only show claw parts: Tooth meshes and manip
        const isClawPart = name.includes("tooth") || name.includes("manip");
        mesh.visible = isClawPart;
        
        // Make materials more vibrant for hero
        if (isClawPart && mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.isMeshStandardMaterial) {
            mat.emissiveIntensity = 0.1;
            mat.needsUpdate = true;
          }
        }
      }
    });
    
    nodesRef.current = nodes;
  }, [clonedScene]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Swing the whole claw group
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(time * 1.2) * 0.12;
      groupRef.current.position.y = Math.sin(time * 1.5) * 0.15 + 3;
    }
    
    // Animate claw opening/closing
    const nodes = nodesRef.current;
    const openAmount = (Math.sin(time * 2) + 1) * 0.2; // 0 to 0.4 rad
    
    ["claw_1", "claw_2", "claw_3"].forEach((name) => {
      const node = nodes[name];
      const initial = initialClawRotations.current[name];
      if (node && initial) {
        node.rotation.z = initial.z - openAmount;
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, 3, 0]}>
      <primitive object={clonedScene} />
    </group>
  );
}

// Preload the claw model
useGLTF.preload(CLAW_MACHINE_URL);

// Mouse-reactive camera
function CameraRig() {
  const { camera, mouse } = useThree();
  
  useFrame(() => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.x * 2.5, 0.03);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, mouse.y * 1.5 + 1, 0.03);
    camera.lookAt(0, 0.5, 0);
  });

  return null;
}

// Main 3D Scene
function Scene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#F7ABAD" />
      <pointLight position={[5, -5, 5]} intensity={0.4} color="#A1E5CC" />
      <pointLight position={[0, 3, 5]} intensity={0.3} color="#FFE5A0" />
      
      <CameraRig />
      
      {/* Floating capsule balls - dispersed across full viewport */}
      {/* Top area */}
      <CapsuleBall position={[-5, 5, -2]} scale={5.5} />
      <CapsuleBall position={[4, 4.5, -1]} scale={6.5} />
      <CapsuleBall position={[0, 5.5, -3]} scale={4.5} />
      <CapsuleBall position={[6, 5, 0]} scale={5} />
      {/* Upper middle */}
      <CapsuleBall position={[-6, 2.5, 0]} scale={4.5} />
      <CapsuleBall position={[5.5, 2, -1.5]} scale={5} />
      <CapsuleBall position={[-3, 3, 1]} scale={4} />
      <CapsuleBall position={[2, 2.5, 2]} scale={4.5} />
      {/* Center area (around text - pushed to sides) */}
      <CapsuleBall position={[-6.5, 0, 0.5]} scale={5} />
      <CapsuleBall position={[7, -0.5, -1]} scale={5.5} />
      <CapsuleBall position={[-5, 0.5, 2]} scale={3.75} />
      <CapsuleBall position={[6, 0, 1.5]} scale={4.5} />
      {/* Lower middle */}
      <CapsuleBall position={[-6, -2.5, -1]} scale={5.5} />
      <CapsuleBall position={[4, -3, 0]} scale={6} />
      <CapsuleBall position={[-2.5, -2, 1.5]} scale={4} />
      <CapsuleBall position={[6.5, -2, -2]} scale={5} />
      {/* Bottom area */}
      <CapsuleBall position={[-4.5, -5, -1.5]} scale={5.25} />
      <CapsuleBall position={[3, -4.5, 0.5]} scale={4.75} />
      <CapsuleBall position={[0, -5, -2]} scale={3.5} />
      <CapsuleBall position={[-5.5, -4, 1]} scale={4} />
      <CapsuleBall position={[5, -5.5, -1]} scale={5} />
      {/* Extra bottom area */}
      <CapsuleBall position={[-3, -6, 0]} scale={4.5} />
      <CapsuleBall position={[2, -6.5, -1.5]} scale={5.5} />
      <CapsuleBall position={[-6, -6, -0.5]} scale={4} />
      <CapsuleBall position={[6, -6, 1]} scale={4.75} />
      <CapsuleBall position={[0, -7, 0.5]} scale={5} />
      {/* Far bottom */}
      <CapsuleBall position={[-4, -7.5, -1]} scale={4.5} />
      <CapsuleBall position={[4, -8, 0]} scale={5.25} />
      <CapsuleBall position={[-1, -8, 1]} scale={4} />
      
      {/* Animated claw from actual model */}
      <AnimatedClaw />
      
      {/* Environment for nice reflections */}
      <Environment preset="city" />
    </>
  );
}

// Mobile-friendly static hero (no 3D)
function MobileHero() {
  return (
    <div className="relative h-[220px] overflow-hidden border-b-4 border-[#111827]">
      {/* Animated gradient background */}
      <motion.div 
        className="absolute inset-0"
        animate={{
          background: [
            "linear-gradient(135deg, #A1E5CC 0%, #B8E4F0 25%, #DDA0DD 50%, #F7ABAD 75%, #FFE5A0 100%)",
            "linear-gradient(135deg, #FFE5A0 0%, #A1E5CC 25%, #B8E4F0 50%, #DDA0DD 75%, #F7ABAD 100%)",
            "linear-gradient(135deg, #F7ABAD 0%, #FFE5A0 25%, #A1E5CC 50%, #B8E4F0 75%, #DDA0DD 100%)",
            "linear-gradient(135deg, #A1E5CC 0%, #B8E4F0 25%, #DDA0DD 50%, #F7ABAD 75%, #FFE5A0 100%)",
          ]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Floating CSS circles for decoration */}
      <motion.div
        className="absolute w-20 h-20 rounded-full bg-white/40 blur-sm"
        style={{ top: "10%", left: "5%" }}
        animate={{ y: [0, -10, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-16 h-16 rounded-full bg-pastel-coral/50 blur-sm"
        style={{ top: "20%", right: "10%" }}
        animate={{ y: [0, 10, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.div
        className="absolute w-12 h-12 rounded-full bg-pastel-yellow/50 blur-sm"
        style={{ bottom: "25%", left: "15%" }}
        animate={{ y: [0, -8, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute w-14 h-14 rounded-full bg-pastel-mint/50 blur-sm"
        style={{ bottom: "15%", right: "20%" }}
        animate={{ y: [0, 12, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />
      <motion.div
        className="absolute w-10 h-10 rounded-full bg-white/30 blur-sm"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Text Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 
            className="font-display text-4xl text-white drop-shadow-lg"
            style={{
              textShadow: "0 3px 0 #F7ABAD, 0 6px 0 rgba(0,0,0,0.15)"
            }}
          >
            BROWSE GAMES
          </h1>
          <p 
            className="mt-3 text-sm text-white font-bold max-w-xs mx-auto px-4"
            style={{
              textShadow: "1px 1px 0 #111827, -1px -1px 0 #111827, 1px -1px 0 #111827, -1px 1px 0 #111827"
            }}
          >
            Explore our claw machines and win amazing prizes!
          </p>
        </motion.div>
      </div>
      
      {/* Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.1) 100%)"
      }} />
    </div>
  );
}

// Desktop 3D hero
function DesktopHero() {
  return (
    <div className="relative h-[350px] overflow-hidden border-b-4 border-[#111827]">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <motion.div 
          className="absolute inset-0"
          animate={{
            background: [
              "linear-gradient(135deg, #A1E5CC 0%, #B8E4F0 25%, #DDA0DD 50%, #F7ABAD 75%, #FFE5A0 100%)",
              "linear-gradient(135deg, #FFE5A0 0%, #A1E5CC 25%, #B8E4F0 50%, #DDA0DD 75%, #F7ABAD 100%)",
              "linear-gradient(135deg, #F7ABAD 0%, #FFE5A0 25%, #A1E5CC 50%, #B8E4F0 75%, #DDA0DD 100%)",
              "linear-gradient(135deg, #DDA0DD 0%, #F7ABAD 25%, #FFE5A0 50%, #A1E5CC 75%, #B8E4F0 100%)",
              "linear-gradient(135deg, #B8E4F0 0%, #DDA0DD 25%, #F7ABAD 50%, #FFE5A0 75%, #A1E5CC 100%)",
              "linear-gradient(135deg, #A1E5CC 0%, #B8E4F0 25%, #DDA0DD 50%, #F7ABAD 75%, #FFE5A0 100%)",
            ]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Floating blob shapes in background */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full bg-white/20 blur-3xl"
          style={{ top: "-200px", left: "-100px" }}
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full bg-pastel-coral/30 blur-3xl"
          style={{ bottom: "-150px", right: "-100px" }}
          animate={{
            x: [0, -80, 0],
            y: [0, -60, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full bg-pastel-yellow/25 blur-3xl"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 1, 10], fov: 50 }}
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>
      
      {/* Text Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <motion.h1 
            className="font-display text-7xl lg:text-8xl text-white drop-shadow-lg"
            style={{
              textShadow: "0 4px 0 #F7ABAD, 0 8px 0 rgba(0,0,0,0.15), 0 0 40px rgba(247,171,173,0.5)"
            }}
            animate={{ 
              textShadow: [
                "0 4px 0 #F7ABAD, 0 8px 0 rgba(0,0,0,0.15), 0 0 30px rgba(247,171,173,0.5)",
                "0 4px 0 #F7ABAD, 0 8px 0 rgba(0,0,0,0.15), 0 0 60px rgba(247,171,173,0.8)",
                "0 4px 0 #F7ABAD, 0 8px 0 rgba(0,0,0,0.15), 0 0 30px rgba(247,171,173,0.5)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            BROWSE GAMES
          </motion.h1>
          <motion.p 
            className="mt-4 text-xl text-white font-bold max-w-xl mx-auto px-4"
            style={{
              textShadow: "2px 2px 0 #111827, -1px -1px 0 #111827, 1px -1px 0 #111827, -1px 1px 0 #111827"
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Explore our collection of claw machines and win amazing prizes!
          </motion.p>
        </motion.div>
      </div>
      
      {/* Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.15) 100%)"
      }} />
    </div>
  );
}

export default function GamesHero3D() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for mobile based on screen width and touch capability
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isTouchDevice || isSmallScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show nothing during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="relative h-[220px] md:h-[350px] overflow-hidden border-b-4 border-[#111827] bg-gradient-to-r from-pastel-mint via-pastel-sky to-pastel-coral" />
    );
  }

  return isMobile ? <MobileHero /> : <DesktopHero />;
}
