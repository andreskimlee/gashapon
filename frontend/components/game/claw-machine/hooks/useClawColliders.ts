"use client";

import type { RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";
import {
  ARMATURE_SCALE,
  TOOTH_GEOMETRY_CENTERS,
  TOOTH_TO_BONE,
} from "../constants";
import type { ClawColliderConfig } from "../types";

type ToothName = "Tooth2" | "Tooth3" | "Tooth4";

/**
 * Hook to manage claw collider positioning and rotation.
 * Updates kinematic colliders to match the animated claw bones.
 */
export function useClawColliders() {
  // Refs for claw colliders (kinematic bodies using Tooth mesh geometry)
  const tooth2Ref = useRef<RapierRigidBody>(null);
  const tooth3Ref = useRef<RapierRigidBody>(null);
  const tooth4Ref = useRef<RapierRigidBody>(null);

  // Map Tooth meshes to their collider refs
  const toothColliderRefs = useRef({
    Tooth2: tooth2Ref,
    Tooth3: tooth3Ref,
    Tooth4: tooth4Ref,
  });

  // Temp vectors for world transforms
  const tempWorldPos = useRef(new THREE.Vector3());
  const tempWorldQuat = useRef(new THREE.Quaternion());

  // Store initial bone world positions for consistent pivot calculation
  const initialBoneWorldPosRef = useRef<Record<string, THREE.Vector3>>({});
  // Store the bind pose offset from bone to geometry (computed once at init)
  const boneToGeomOffsetRef = useRef<Record<string, THREE.Vector3>>({});

  /**
   * Update claw collider positions and rotations to match the animated claw bones.
   * Should be called every frame in useFrame.
   */
  function updateColliders(
    nodes: Record<string, THREE.Object3D>,
    initialClawRotations: Record<string, THREE.Euler>,
    moveX: number,
    moveY: number,
    moveZ: number,
    config: ClawColliderConfig
  ) {
    const { rotationMultiplier } = config;

    // Geometry centers in WORLD-SCALED coordinates (armature coords * ARMATURE_SCALE)
    const geomCentersWorld: Record<ToothName, THREE.Vector3> = {
      Tooth2: new THREE.Vector3(
        TOOTH_GEOMETRY_CENTERS.Tooth2.x,
        TOOTH_GEOMETRY_CENTERS.Tooth2.y,
        TOOTH_GEOMETRY_CENTERS.Tooth2.z
      ).multiplyScalar(ARMATURE_SCALE),
      Tooth3: new THREE.Vector3(
        TOOTH_GEOMETRY_CENTERS.Tooth3.x,
        TOOTH_GEOMETRY_CENTERS.Tooth3.y,
        TOOTH_GEOMETRY_CENTERS.Tooth3.z
      ).multiplyScalar(ARMATURE_SCALE),
      Tooth4: new THREE.Vector3(
        TOOTH_GEOMETRY_CENTERS.Tooth4.x,
        TOOTH_GEOMETRY_CENTERS.Tooth4.y,
        TOOTH_GEOMETRY_CENTERS.Tooth4.z
      ).multiplyScalar(ARMATURE_SCALE),
    };

    (["Tooth2", "Tooth3", "Tooth4"] as const).forEach((toothName) => {
      const colliderRef = toothColliderRefs.current[toothName];
      const boneName = TOOTH_TO_BONE[toothName];
      const clawBone = nodes[boneName];
      const initialRot = initialClawRotations[boneName];

      if (colliderRef?.current && clawBone && initialRot) {
        clawBone.updateMatrixWorld(true);

        // Capture initial bone world position once (on first frame)
        if (!initialBoneWorldPosRef.current[boneName]) {
          initialBoneWorldPosRef.current[boneName] = clawBone.getWorldPosition(
            new THREE.Vector3()
          );
          // Compute constant offset from bone to geometry center in bind pose
          const geomCenter = geomCentersWorld[toothName];
          boneToGeomOffsetRef.current[toothName] = geomCenter
            .clone()
            .sub(initialBoneWorldPosRef.current[boneName]);
        }

        const bindPoseOffset = boneToGeomOffsetRef.current[toothName];
        if (!bindPoseOffset) return;

        // Get the bone's LOCAL rotation delta (this is what matters for grab/release)
        const deltaZ = clawBone.rotation.z - initialRot.z;

        // Get the bone's world quaternion to transform the local rotation axis to world
        const boneWorldQuat = clawBone.getWorldQuaternion(
          new THREE.Quaternion()
        );

        // Extract the bone's local Z axis in world space
        // The bone rotates around its local Z axis for grab/release
        const localZ = new THREE.Vector3(0, 0, 1);
        const worldRotAxis = localZ.applyQuaternion(boneWorldQuat);

        // Create the delta rotation quaternion around this world axis
        const scaledDelta = deltaZ * rotationMultiplier;
        const deltaQuat = new THREE.Quaternion().setFromAxisAngle(
          worldRotAxis,
          scaledDelta
        );

        // Rotate the bind pose offset by the delta rotation
        const rotatedOffset = bindPoseOffset.clone().applyQuaternion(deltaQuat);

        // Displacement = how much the geometry center moved due to rotation
        const displacement = rotatedOffset.clone().sub(bindPoseOffset);

        // Final position = movement + rotation displacement
        tempWorldPos.current.set(
          moveX + displacement.x,
          moveY + displacement.y,
          moveZ + displacement.z
        );

        // Apply the delta rotation to the collider
        tempWorldQuat.current.copy(deltaQuat);

        colliderRef.current.setNextKinematicTranslation(tempWorldPos.current);
        colliderRef.current.setNextKinematicRotation(tempWorldQuat.current);
      } else if (colliderRef?.current) {
        tempWorldPos.current.set(moveX, moveY, moveZ);
        tempWorldQuat.current.identity();
        colliderRef.current.setNextKinematicTranslation(tempWorldPos.current);
        colliderRef.current.setNextKinematicRotation(tempWorldQuat.current);
      }
    });
  }

  return {
    tooth2Ref,
    tooth3Ref,
    tooth4Ref,
    updateColliders,
  };
}

