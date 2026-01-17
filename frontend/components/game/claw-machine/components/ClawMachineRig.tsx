"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { MeshCollider, RigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import {
  ARMATURE_SCALE,
  BOUNDS,
  BUTTON_PRESS_DEPTH,
  CLAW_AXIS,
  CLAW_CLOSE_ANGLE,
  CLAW_CLOSE_ANGLE_LOSE,
  CLAW_CLOSE_ANGLE_WIN,
  CLAW_RELEASE_ANGLE,
  CLAW_SPEED,
  CLAW_WIDEN_ANGLE,
  DROP_BOX_POS,
  DROP_DEPTH,
  DROP_SPEED,
  GRAB_DURATION,
  JOYSTICK_MAX_ANGLE,
  LOSE_DROP_PROGRESS,
  LOSE_OPEN_DURATION,
  RETURN_SPEED,
  WIDEN_DURATION,
  WIN_GRAB_RANGE,
} from "../constants";
import { useGrabContext } from "../contexts/GrabContext";
import { useClawColliders } from "../hooks/useClawColliders";
import type { ClawColliderConfig, GamePhase } from "../types";
import { useKeyboardControls } from "../useKeyboardControls";

type ClawMachineRigProps = {
  modelUrl: string;
  clawColliderConfig: ClawColliderConfig;
  glassOpacity: number;
  onDropStart?: () => void;
};

/**
 * Main claw machine rig component.
 * Handles:
 * - Loading and displaying the 3D model
 * - Claw movement and animation state machine
 * - Physics colliders for claw fingers
 * - Grabbing/releasing prize balls
 */
export function ClawMachineRig({
  modelUrl,
  clawColliderConfig,
  glassOpacity,
  onDropStart,
}: ClawMachineRigProps) {
  const gltf = useGLTF(modelUrl);
  const { getBallRefs, grabbedBallId, setGrabbedBallId, gameOutcome } =
    useGrabContext();

  const scene = useMemo(
    () =>
      SkeletonUtils.clone((gltf as unknown as { scene: THREE.Object3D }).scene),
    [gltf]
  );

  const nodeMapRef = useRef<Record<string, THREE.Object3D>>({});
  const keysRef = useKeyboardControls();

  // State to trigger re-render once nodes are ready (needed for collider rendering)
  const [nodesReady, setNodesReady] = useState(false);

  // Animation state machine refs
  const phaseRef = useRef<GamePhase>("IDLE");
  const timerRef = useRef<number>(0);
  const initialYRef = useRef<number | null>(null);
  const initialClawRotationsRef = useRef<Record<string, THREE.Euler>>({});
  const initialJoystickRotationRef = useRef<THREE.Euler | null>(null);
  const initialButtonPositionRef = useRef<THREE.Vector3 | null>(null);
  const spaceHandledRef = useRef<boolean>(false);
  const dropTriggeredRef = useRef<boolean>(false);

  // For tracking claw world position during grab
  const clawWorldPos = useRef(new THREE.Vector3());
  const grabOffsetRef = useRef(new THREE.Vector3(0, -0.05, 0));

  // For win magnetization - track the target ball to pull toward claw
  const magnetizeTargetRef = useRef<string | null>(null);
  // For lose early drop - track rising progress
  const risingStartYRef = useRef<number | null>(null);

  // Claw collider hook
  const { tooth2Ref, tooth3Ref, tooth4Ref, updateColliders } =
    useClawColliders();

  // Capture initial transforms + fix materials
  useEffect(() => {
    const map: Record<string, THREE.Object3D> = {};
    scene.traverse((child) => {
      if (child?.name) map[child.name] = child;

      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.envMapIntensity = 1;
          mesh.material.needsUpdate = true;
        }
      }
    });
    nodeMapRef.current = map;

    ["claw_1", "claw_2", "claw_3"].forEach((name) => {
      const n = map[name];
      if (n && !initialClawRotationsRef.current[name]) {
        initialClawRotationsRef.current[name] = n.rotation.clone();
      }
    });

    if (map.lever_1 && !initialJoystickRotationRef.current) {
      initialJoystickRotationRef.current = map.lever_1.rotation.clone();
    }

    if (map.button_1 && !initialButtonPositionRef.current) {
      initialButtonPositionRef.current = map.button_1.position.clone();
    }

    // Trigger re-render so colliders can access the Tooth meshes
    setNodesReady(true);
  }, [scene]);

  // Update glass opacity when it changes
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (
          mat &&
          (mesh.name.toLowerCase().includes("glass") || mat.transparent)
        ) {
          mat.opacity = glassOpacity;
          mat.transparent = glassOpacity < 1;
          mat.needsUpdate = true;
        }
      }
    });
  }, [glassOpacity, scene]);

  useFrame((_, delta) => {
    const keys = keysRef.current;
    const nodes = nodeMapRef.current;

    // ====================================
    // Input handling
    // ====================================
    if (keys.Space && !spaceHandledRef.current) {
      spaceHandledRef.current = true;
      if (phaseRef.current === "IDLE") {
        phaseRef.current = "DROPPING";
        if (!dropTriggeredRef.current) {
          dropTriggeredRef.current = true;
          onDropStart?.();
        }
        if (nodes.manip && initialYRef.current == null) {
          initialYRef.current = nodes.manip.position.y;
        }
      }
    } else if (!keys.Space && spaceHandledRef.current) {
      spaceHandledRef.current = false;
    }

    // ====================================
    // Joystick animation
    // ====================================
    if (nodes.lever_1 && initialJoystickRotationRef.current) {
      const targetX =
        initialJoystickRotationRef.current.x +
        (keys.ArrowUp ? -JOYSTICK_MAX_ANGLE : 0) +
        (keys.ArrowDown ? JOYSTICK_MAX_ANGLE : 0);

      const targetZ =
        initialJoystickRotationRef.current.z +
        (keys.ArrowLeft ? -JOYSTICK_MAX_ANGLE : 0) +
        (keys.ArrowRight ? JOYSTICK_MAX_ANGLE : 0);

      nodes.lever_1.rotation.x = THREE.MathUtils.lerp(
        nodes.lever_1.rotation.x,
        targetX,
        0.2
      );
      nodes.lever_1.rotation.z = THREE.MathUtils.lerp(
        nodes.lever_1.rotation.z,
        targetZ,
        0.2
      );
    }

    // ====================================
    // Button animation
    // ====================================
    if (nodes.button_1 && initialButtonPositionRef.current) {
      const targetY =
        initialButtonPositionRef.current.y -
        (keys.Space ? BUTTON_PRESS_DEPTH : 0);
      nodes.button_1.position.y = THREE.MathUtils.lerp(
        nodes.button_1.position.y,
        targetY,
        0.3
      );
    }

    // ====================================
    // Update claw colliders
    // ====================================
    const sideScroll = nodes.side_scroll;
    const verticalScroll = nodes.vertical_scroll;
    const manip = nodes.manip;

    if (sideScroll && verticalScroll && manip) {
      const moveX = sideScroll.position.x * ARMATURE_SCALE;
      const moveZ = verticalScroll.position.z * ARMATURE_SCALE;
      const moveY =
        (manip.position.y - (initialYRef.current ?? manip.position.y)) *
        ARMATURE_SCALE;

      updateColliders(
        nodes,
        initialClawRotationsRef.current,
        moveX,
        moveY,
        moveZ,
        clawColliderConfig
      );
    }

    // ====================================
    // Game state machine
    // ====================================
    const speed = CLAW_SPEED * delta;

    // Manual movement only while IDLE
    if (phaseRef.current === "IDLE") {
      if (nodes.side_scroll) {
        if (keys.ArrowLeft) nodes.side_scroll.position.x -= speed;
        if (keys.ArrowRight) nodes.side_scroll.position.x += speed;
        nodes.side_scroll.position.x = THREE.MathUtils.clamp(
          nodes.side_scroll.position.x,
          BOUNDS.minX,
          BOUNDS.maxX
        );
      }

      if (nodes.vertical_scroll) {
        if (keys.ArrowUp) nodes.vertical_scroll.position.z -= speed;
        if (keys.ArrowDown) nodes.vertical_scroll.position.z += speed;
        nodes.vertical_scroll.position.z = THREE.MathUtils.clamp(
          nodes.vertical_scroll.position.z,
          BOUNDS.minZ,
          BOUNDS.maxZ
        );
      }
      return;
    }

    const dropSpeed = DROP_SPEED * delta;

    // DROPPING phase
    if (phaseRef.current === "DROPPING" && nodes.manip) {
      if (nodes.manip.position.y > DROP_DEPTH) {
        nodes.manip.position.y -= dropSpeed;

        // WIN: Pre-select which ball will be grabbed (no physics movement)
        // Just lock onto nearest ball - the grab will use larger range to ensure success
        if (gameOutcome === "win" && !magnetizeTargetRef.current) {
          nodes.manip.getWorldPosition(clawWorldPos.current);
          const ballRefs = getBallRefs();

          let nearestId: string | null = null;
          let nearestDist = WIN_GRAB_RANGE;

          ballRefs.forEach((ref, id) => {
            if (ref.current) {
              const ballPos = ref.current.translation();
              const dist = Math.sqrt(
                Math.pow(ballPos.x - clawWorldPos.current.x, 2) +
                  Math.pow(ballPos.z - clawWorldPos.current.z, 2)
              );
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestId = id;
              }
            }
          });

          if (nearestId) {
            magnetizeTargetRef.current = nearestId;
            console.log(
              `[CLAW] WIN: Pre-selected ball ${nearestId} for guaranteed grab`
            );
          }
        }
      } else {
        phaseRef.current = "WIDENING";
        timerRef.current = performance.now();
      }
      return;
    }

    // WIDENING phase
    if (phaseRef.current === "WIDENING") {
      const progress = Math.min(
        1,
        (performance.now() - timerRef.current) / WIDEN_DURATION
      );

      ["claw_1", "claw_2", "claw_3"].forEach((name) => {
        const n = nodes[name];
        const initial = initialClawRotationsRef.current[name];
        if (!n || !initial) return;

        const startAngle = initial.z;
        const endAngle = initial.z - CLAW_WIDEN_ANGLE;
        if (CLAW_AXIS === "z") {
          n.rotation.z = THREE.MathUtils.lerp(startAngle, endAngle, progress);
        }
      });

      if (progress >= 1) {
        phaseRef.current = "GRABBING";
        timerRef.current = performance.now();
      }
    }

    // GRABBING phase
    if (phaseRef.current === "GRABBING") {
      const progress = Math.min(
        1,
        (performance.now() - timerRef.current) / GRAB_DURATION
      );

      // Determine close angle based on game outcome
      const closeAngle =
        gameOutcome === "win"
          ? CLAW_CLOSE_ANGLE_WIN // Extra tight for guaranteed win
          : gameOutcome === "lose"
            ? CLAW_CLOSE_ANGLE_LOSE // Weak grip for guaranteed loss
            : CLAW_CLOSE_ANGLE; // Normal for dev mode

      // Debug log at start of grab
      if (progress < 0.05) {
        console.log(
          `[CLAW] gameOutcome: ${gameOutcome}, closeAngle: ${closeAngle}`
        );
        console.log(
          `[CLAW] WIN=${CLAW_CLOSE_ANGLE_WIN}, LOSE=${CLAW_CLOSE_ANGLE_LOSE}, NORMAL=${CLAW_CLOSE_ANGLE}`
        );
      }

      ["claw_1", "claw_2", "claw_3"].forEach((name) => {
        const n = nodes[name];
        const initial = initialClawRotationsRef.current[name];
        if (!n || !initial) return;

        const startAngle = initial.z - CLAW_WIDEN_ANGLE;
        const endAngle = initial.z - closeAngle;
        if (CLAW_AXIS === "z") {
          n.rotation.z = THREE.MathUtils.lerp(startAngle, endAngle, progress);
        }
      });

      // At end of grab, try to grab ONE ball
      if (progress >= 1) {
        if (nodes.manip) {
          nodes.manip.getWorldPosition(clawWorldPos.current);

          const ballRefs = getBallRefs();
          let targetId: string | null = null;

          // WIN: ONLY grab the magnetized ball (ignore any others)
          if (gameOutcome === "win") {
            if (magnetizeTargetRef.current) {
              targetId = magnetizeTargetRef.current;
              console.log(
                `[CLAW] WIN: Grabbing magnetized ball ONLY: ${targetId}`
              );
            }
          }
          // LOSE/DEV: Find nearest ball within range
          else {
            let nearestDist = 0.15;
            ballRefs.forEach((ref, id) => {
              if (ref.current) {
                const ballPos = ref.current.translation();
                const dist = Math.sqrt(
                  Math.pow(ballPos.x - clawWorldPos.current.x, 2) +
                    Math.pow(ballPos.y - clawWorldPos.current.y, 2) +
                    Math.pow(ballPos.z - clawWorldPos.current.z, 2)
                );
                if (dist < nearestDist) {
                  nearestDist = dist;
                  targetId = id;
                }
              }
            });
          }

          console.log(
            `[CLAW] Grab check - targetId: ${targetId}, gameOutcome: ${gameOutcome}`
          );

          // Grab the single target ball (if any)
          if (targetId) {
            console.log(`[CLAW] ✅ GRABBING ball: ${targetId}`);
            setGrabbedBallId(targetId);
            const ballRef = ballRefs.get(targetId);
            if (ballRef?.current) {
              // Always use actual ball position for natural grab
              const ballPos = ballRef.current.translation();
              grabOffsetRef.current.set(
                ballPos.x - clawWorldPos.current.x,
                ballPos.y - clawWorldPos.current.y,
                ballPos.z - clawWorldPos.current.z
              );
            }
          } else {
            console.log("[CLAW] ⚠️ No ball to grab");
          }
        }
        phaseRef.current = "RISING";
        risingStartYRef.current = nodes.manip?.position.y ?? null;
      }
      return;
    }

    // RISING phase
    if (phaseRef.current === "RISING" && nodes.manip) {
      const initialY = initialYRef.current ?? nodes.manip.position.y;
      const risingStartY = risingStartYRef.current ?? DROP_DEPTH;

      if (nodes.manip.position.y < initialY) {
        nodes.manip.position.y += dropSpeed;

        // LOSE: Animate claw opening during rising to drop the ball
        if (gameOutcome === "lose") {
          const totalRiseDistance = initialY - risingStartY;
          const currentRiseDistance = nodes.manip.position.y - risingStartY;
          const risingProgress =
            totalRiseDistance > 0 ? currentRiseDistance / totalRiseDistance : 0;

          // Log progress periodically
          if (
            Math.floor(risingProgress * 10) !==
            Math.floor((risingProgress - 0.1) * 10)
          ) {
            console.log(
              `[CLAW] RISING progress: ${(risingProgress * 100).toFixed(0)}%, open at ${LOSE_DROP_PROGRESS * 100}%`
            );
          }

          // Animate claw opening when it's time to drop
          if (risingProgress >= LOSE_DROP_PROGRESS) {
            // Calculate how far into the opening animation we are
            const openProgress = Math.min(
              1,
              (risingProgress - LOSE_DROP_PROGRESS) / LOSE_OPEN_DURATION
            );

            // Animate claw from closed position to release position
            ["claw_1", "claw_2", "claw_3"].forEach((name) => {
              const n = nodes[name];
              const initial = initialClawRotationsRef.current[name];
              if (!n || !initial) return;

              // Lerp from tight grip to open (release) position
              const closedAngle = initial.z - CLAW_CLOSE_ANGLE_LOSE; // Tight grip
              const openAngle = initial.z - CLAW_RELEASE_ANGLE; // Wide open
              if (CLAW_AXIS === "z") {
                n.rotation.z = THREE.MathUtils.lerp(
                  closedAngle,
                  openAngle,
                  openProgress
                );
              }
            });

            // Release the ball once claw is open enough
            if (openProgress >= 0.5 && grabbedBallId) {
              console.log(
                `[CLAW] 💨 DROPPING ball! Claw opened at ${(risingProgress * 100).toFixed(0)}%`
              );
              setGrabbedBallId(null);
            }
          }
        }
      } else {
        nodes.manip.position.y = initialY;
        phaseRef.current = "RETURNING";
      }

      // Update grabbed ball position (if still holding)
      if (grabbedBallId) {
        nodes.manip.getWorldPosition(clawWorldPos.current);
        const ballRefs = getBallRefs();
        const ballRef = ballRefs.get(grabbedBallId);
        if (ballRef?.current) {
          ballRef.current.setNextKinematicTranslation({
            x: clawWorldPos.current.x + grabOffsetRef.current.x,
            y: clawWorldPos.current.y + grabOffsetRef.current.y,
            z: clawWorldPos.current.z + grabOffsetRef.current.z,
          });
        }
      }
      return;
    }

    // RETURNING phase
    if (phaseRef.current === "RETURNING") {
      const moveSpeed = RETURN_SPEED * delta;
      let arrived = true;

      if (nodes.side_scroll) {
        const dx = DROP_BOX_POS.x - nodes.side_scroll.position.x;
        if (Math.abs(dx) > 0.1) {
          nodes.side_scroll.position.x += Math.sign(dx) * moveSpeed;
          arrived = false;
        }
      }

      if (nodes.vertical_scroll) {
        const dz = DROP_BOX_POS.z - nodes.vertical_scroll.position.z;
        if (Math.abs(dz) > 0.1) {
          nodes.vertical_scroll.position.z += Math.sign(dz) * moveSpeed;
          arrived = false;
        }
      }

      // Update grabbed ball position during return
      if (grabbedBallId && nodes.manip) {
        nodes.manip.getWorldPosition(clawWorldPos.current);
        const ballRefs = getBallRefs();
        const ballRef = ballRefs.get(grabbedBallId);
        if (ballRef?.current) {
          ballRef.current.setNextKinematicTranslation({
            x: clawWorldPos.current.x + grabOffsetRef.current.x,
            y: clawWorldPos.current.y + grabOffsetRef.current.y,
            z: clawWorldPos.current.z + grabOffsetRef.current.z,
          });
        }
      }

      if (arrived) {
        phaseRef.current = "RELEASING";
        timerRef.current = performance.now();
      }
      return;
    }

    // RELEASING phase
    if (phaseRef.current === "RELEASING") {
      const duration = 500;
      const elapsed = performance.now() - timerRef.current;
      const progress = Math.min(1, elapsed / duration);

      // On LOSE, claw is already open from the drop - just stay open
      // On WIN/normal, animate from closed to open
      const isLose = gameOutcome === "lose";

      ["claw_1", "claw_2", "claw_3"].forEach((name) => {
        const n = nodes[name];
        const initial = initialClawRotationsRef.current[name];
        if (!n || !initial) return;

        if (isLose) {
          // Claw already open from drop - keep it at release angle
          if (CLAW_AXIS === "z") {
            n.rotation.z = initial.z - CLAW_RELEASE_ANGLE;
          }
        } else {
          // Normal release animation
          const startAngle = initial.z - CLAW_CLOSE_ANGLE;
          const endAngle = initial.z - CLAW_WIDEN_ANGLE;
          if (CLAW_AXIS === "z") {
            n.rotation.z = THREE.MathUtils.lerp(startAngle, endAngle, progress);
          }
        }
      });

      // Release the ball when claw opens (at ~50% progress) - only needed for win
      if (progress > 0.5 && grabbedBallId) {
        setGrabbedBallId(null);
      }

      if (elapsed > 1000) {
        phaseRef.current = "RESETTING";
        timerRef.current = performance.now();
      }
      return;
    }

    // RESETTING phase
    if (phaseRef.current === "RESETTING") {
      const duration = 500;
      const progress = Math.min(
        1,
        (performance.now() - timerRef.current) / duration
      );

      // On LOSE, claw is at CLAW_RELEASE_ANGLE, on WIN it's at CLAW_WIDEN_ANGLE
      const isLose = gameOutcome === "lose";

      ["claw_1", "claw_2", "claw_3"].forEach((name) => {
        const n = nodes[name];
        const initial = initialClawRotationsRef.current[name];
        if (!n || !initial) return;

        const startAngle = isLose
          ? initial.z - CLAW_RELEASE_ANGLE
          : initial.z - CLAW_WIDEN_ANGLE;
        const endAngle = initial.z;
        if (CLAW_AXIS === "z") {
          n.rotation.z = THREE.MathUtils.lerp(startAngle, endAngle, progress);
        }
      });

      if (progress >= 1) {
        phaseRef.current = "IDLE";
        dropTriggeredRef.current = false;
        // Reset magnetize target for next play
        magnetizeTargetRef.current = null;
        risingStartYRef.current = null;
      }
    }
  });

  // Get Tooth mesh geometries for colliders (only after nodes are ready)
  const { showDebug } = clawColliderConfig;
  const tooth2Mesh = nodesReady
    ? (nodeMapRef.current.Tooth2 as THREE.Mesh | undefined)
    : undefined;
  const tooth3Mesh = nodesReady
    ? (nodeMapRef.current.Tooth3 as THREE.Mesh | undefined)
    : undefined;
  const tooth4Mesh = nodesReady
    ? (nodeMapRef.current.Tooth4 as THREE.Mesh | undefined)
    : undefined;

  return (
    <>
      <primitive object={scene} />

      {/* Claw finger colliders using actual Tooth mesh geometry */}
      {/* Tooth4 -> claw_1 (negative X direction) */}
      {nodesReady && tooth4Mesh?.geometry && (
        <RigidBody
          ref={tooth4Ref}
          type="kinematicPosition"
          colliders={false}
          position={[0, 0, 0]}
        >
          <MeshCollider type="hull">
            <mesh geometry={tooth4Mesh.geometry} visible={showDebug}>
              <meshStandardMaterial
                color="#ff0000"
                opacity={0.5}
                transparent
                wireframe
              />
            </mesh>
          </MeshCollider>
        </RigidBody>
      )}

      {/* Tooth2 -> claw_2 (negative Z direction) */}
      {nodesReady && tooth2Mesh?.geometry && (
        <RigidBody
          ref={tooth2Ref}
          type="kinematicPosition"
          colliders={false}
          position={[0, 0, 0]}
        >
          <MeshCollider type="hull">
            <mesh geometry={tooth2Mesh.geometry} visible={showDebug}>
              <meshStandardMaterial
                color="#00ff00"
                opacity={0.5}
                transparent
                wireframe
              />
            </mesh>
          </MeshCollider>
        </RigidBody>
      )}

      {/* Tooth3 -> claw_3 (positive X direction) */}
      {nodesReady && tooth3Mesh?.geometry && (
        <RigidBody
          ref={tooth3Ref}
          type="kinematicPosition"
          colliders={false}
          position={[0, 0, 0]}
        >
          <MeshCollider type="hull">
            <mesh geometry={tooth3Mesh.geometry} visible={showDebug}>
              <meshStandardMaterial
                color="#0000ff"
                opacity={0.5}
                transparent
                wireframe
              />
            </mesh>
          </MeshCollider>
        </RigidBody>
      )}
    </>
  );
}
