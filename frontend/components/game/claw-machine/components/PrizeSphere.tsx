"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { BallCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { useGrabContext } from "../contexts/GrabContext";
import type { SphereConfig } from "../types";

const SPHERE_MODEL_URL = "/models/claw-machine/Sphere_Rigged.glb";

// The model's mesh has radius ~0.08 in armature-local space
// The armature does NOT seem to apply its 0.01 scale when loaded via useGLTF
// So we use the raw mesh radius for scaling
const MODEL_MESH_RADIUS = 0.08;

type PrizeSphereProps = {
  config: SphereConfig;
  modelScale?: number;
};

export function PrizeSphere({ config, modelScale = 1.0 }: PrizeSphereProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const { registerBall, unregisterBall, grabbedBallId, gameOutcome } = useGrabContext();
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  // Load the GLB model
  const gltf = useGLTF(SPHERE_MODEL_URL);

  // Clone and prepare the scene for this instance
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(gltf.scene);

    // Scale to match desired radius, with manual adjustment via modelScale
    // The mesh radius is ~0.08 in its local space, we want config.radius (e.g., 0.06)
    const baseScale = config.radius / MODEL_MESH_RADIUS;
    const scale = baseScale * modelScale;
    clone.scale.setScalar(scale);

    // Center at origin - the mesh is centered around Y~1.0 in armature space
    // After scaling, offset by scaled center position
    const meshCenterY = 1.0; // Approximate center Y in armature space
    clone.position.set(0, -meshCenterY * scale, 0);

    // Fix texture glitching / z-fighting when viewed from distance
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Enable polygon offset to prevent z-fighting
        mesh.material = (mesh.material as THREE.Material).clone();
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = 1;
        mat.polygonOffsetUnits = 1;

        // Fix texture mipmapping for distant viewing
        if (mat.map) {
          mat.map.minFilter = THREE.LinearMipmapLinearFilter;
          mat.map.magFilter = THREE.LinearFilter;
          mat.map.anisotropy = 16;
          mat.map.needsUpdate = true;
        }
        if (mat.normalMap) {
          mat.normalMap.minFilter = THREE.LinearMipmapLinearFilter;
          mat.normalMap.magFilter = THREE.LinearFilter;
          mat.normalMap.anisotropy = 16;
          mat.normalMap.needsUpdate = true;
        }
        if (mat.roughnessMap) {
          mat.roughnessMap.minFilter = THREE.LinearMipmapLinearFilter;
          mat.roughnessMap.magFilter = THREE.LinearFilter;
          mat.roughnessMap.anisotropy = 16;
          mat.roughnessMap.needsUpdate = true;
        }

        mat.needsUpdate = true;
      }
    });

    return clone;
  }, [gltf.scene, config.radius, modelScale]);

  // Collect material references for animation
  useEffect(() => {
    const mats: THREE.MeshStandardMaterial[] = [];
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat) mats.push(mat);
      }
    });
    materialsRef.current = mats;
  }, [clonedScene]);

  // Animate glow effect for grabbed balls (especially on WIN)
  useFrame((state) => {
    const isGrabbed = grabbedBallId === config.id;
    const isWin = gameOutcome === "win";
    
    materialsRef.current.forEach((mat) => {
      if (isGrabbed && isWin) {
        // WIN: Pulsing rainbow glow for dopamine! 🌈
        const time = state.clock.elapsedTime;
        const hue = (time * 0.5) % 1; // Slow color cycle
        const pulse = 0.5 + Math.sin(time * 4) * 0.3; // Pulsing intensity
        
        mat.emissive.setHSL(hue, 1, 0.5);
        mat.emissiveIntensity = pulse;
      } else if (isGrabbed) {
        // Normal grab: subtle golden glow
        mat.emissive.setHex(0xffd700);
        mat.emissiveIntensity = 0.2;
      } else {
        // Not grabbed: no glow
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
  });

  useEffect(() => {
    registerBall(config.id, rigidBodyRef);
    return () => unregisterBall(config.id);
  }, [config.id, registerBall, unregisterBall]);

  const isGrabbed = grabbedBallId === config.id;

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={config.position}
      colliders={false}
      restitution={0.4}
      friction={0.6}
      linearDamping={0.3}
      angularDamping={0.3}
      type={isGrabbed ? "kinematicPosition" : "dynamic"}
    >
      <BallCollider args={[config.radius]} />
      <primitive object={clonedScene} />
    </RigidBody>
  );
}

// Preload the model
useGLTF.preload(SPHERE_MODEL_URL);
