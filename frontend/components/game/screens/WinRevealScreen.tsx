"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { button, useControls } from "leva";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const SPHERE_REVEAL_URL = "/models/claw-machine/Sphere_Animation_Open.glb";

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

// Custom plasma shader for electric energy effect
const plasmaVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const plasmaFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  // Simplex noise functions
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }
  
  void main() {
    vec3 pos = vPosition * 3.0;
    
    // Multiple layers of animated noise for plasma effect
    float noise1 = fbm(pos + uTime * 0.8);
    float noise2 = fbm(pos * 2.0 - uTime * 1.2);
    float noise3 = fbm(pos * 0.5 + uTime * 0.5);
    
    // Electric tendrils effect
    float tendrils = pow(abs(snoise(pos * 4.0 + uTime * 2.0)), 0.3);
    
    // Combine noises for plasma pattern
    float plasma = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
    plasma = plasma * 0.5 + 0.5; // Normalize to 0-1
    
    // Add electric crackle
    plasma += tendrils * 0.4;
    
    // Fresnel effect for edge glow
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
    
    // Color mixing based on plasma intensity
    vec3 color = mix(uColor1, uColor2, plasma);
    color = mix(color, uColor3, fresnel * 0.6);
    color += vec3(1.0) * pow(plasma, 3.0) * 0.5; // Hot white core areas
    
    // Add bright spots for electric effect
    float sparks = pow(max(0.0, snoise(pos * 8.0 + uTime * 4.0)), 8.0);
    color += vec3(1.0, 1.0, 0.9) * sparks * 2.0;
    
    // Alpha based on plasma intensity and fresnel
    float alpha = 0.7 + plasma * 0.3 + fresnel * 0.2;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

// Generate a jagged lightning bolt path from origin to target
function generateLightningPath(
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments: number,
  jitter: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [start.clone()];
  const direction = end.clone().sub(start);
  const length = direction.length();
  direction.normalize();

  // Create perpendicular vectors for displacement
  const up = new THREE.Vector3(0, 1, 0);
  const perp1 = new THREE.Vector3().crossVectors(direction, up).normalize();
  if (perp1.length() < 0.1) {
    perp1.crossVectors(direction, new THREE.Vector3(1, 0, 0)).normalize();
  }
  const perp2 = new THREE.Vector3().crossVectors(direction, perp1).normalize();

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const basePoint = start
      .clone()
      .add(direction.clone().multiplyScalar(length * t));

    // Add jagged displacement that decreases toward the end
    const displacement = jitter * (1 - t * 0.5) * (Math.random() - 0.5) * 2;
    const displacement2 = jitter * (1 - t * 0.5) * (Math.random() - 0.5) * 2;

    basePoint.add(perp1.clone().multiplyScalar(displacement));
    basePoint.add(perp2.clone().multiplyScalar(displacement2));

    points.push(basePoint);
  }

  points.push(end.clone());
  return points;
}

// Lightning bolt component using primitive for Three.js Line
function LightningBolt({
  startRadius,
  endRadius,
  theta,
  phi,
  segments,
  jitter,
  color,
  opacity,
}: {
  startRadius: number;
  endRadius: number;
  theta: number;
  phi: number;
  segments: number;
  jitter: number;
  color: THREE.Color;
  opacity: number;
}) {
  const lineRef = useRef<THREE.Line>(null);

  // Calculate start and end points on sphere
  const start = useMemo(() => {
    return new THREE.Vector3(
      startRadius * Math.sin(phi) * Math.cos(theta),
      startRadius * Math.sin(phi) * Math.sin(theta),
      startRadius * Math.cos(phi)
    );
  }, [startRadius, theta, phi]);

  const end = useMemo(() => {
    return new THREE.Vector3(
      endRadius * Math.sin(phi) * Math.cos(theta),
      endRadius * Math.sin(phi) * Math.sin(theta),
      endRadius * Math.cos(phi)
    );
  }, [endRadius, theta, phi]);

  // Create initial line object
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const path = generateLightningPath(start, end, segments, jitter);
    const positions = new Float32Array(path.length * 3);
    path.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Line(geometry, material);
  }, [start, end, segments, jitter, color, opacity]);

  // Regenerate lightning path periodically for flicker
  useFrame(() => {
    if (!lineRef.current) return;

    // Regenerate path randomly for flickering effect
    if (Math.random() < 0.12) {
      const path = generateLightningPath(start, end, segments, jitter);
      const positions = lineRef.current.geometry.attributes.position
        .array as Float32Array;
      path.forEach((p, i) => {
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
      });
      lineRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  useEffect(() => {
    if (lineRef.current) {
      lineRef.current.geometry = line.geometry;
      lineRef.current.material = line.material;
    }
  }, [line]);

  return <primitive ref={lineRef} object={line} />;
}

function PlasmaBall({ enableControls = false }: { enableControls?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const outerShaderRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

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

  // Golden/yellow plasma colors
  const color1 = new THREE.Color(0xffa500); // Orange
  const color2 = new THREE.Color(0xffdd00); // Golden yellow
  const color3 = new THREE.Color(0xffffaa); // Bright yellow/white

  // Generate lightning bolt configurations
  const lightningBolts = useMemo(() => {
    const bolts = [];
    const numBolts = 12;
    for (let i = 0; i < numBolts; i++) {
      bolts.push({
        theta: (i / numBolts) * Math.PI * 2 + Math.random() * 0.5,
        phi: Math.PI * 0.3 + Math.random() * Math.PI * 0.4,
        segments: 8 + Math.floor(Math.random() * 6),
        jitter: 0.08 + Math.random() * 0.06,
        color: new THREE.Color().lerpColors(color2, color3, Math.random()),
        opacity: 0.6 + Math.random() * 0.4,
      });
    }
    return bolts;
  }, []);

  // Secondary layer of smaller bolts
  const secondaryBolts = useMemo(() => {
    const bolts = [];
    const numBolts = 8;
    for (let i = 0; i < numBolts; i++) {
      bolts.push({
        theta: (i / numBolts) * Math.PI * 2 + Math.random() * 0.8,
        phi: Math.PI * 0.2 + Math.random() * Math.PI * 0.6,
        segments: 5 + Math.floor(Math.random() * 4),
        jitter: 0.05 + Math.random() * 0.04,
        color: new THREE.Color(0xffffff),
        opacity: 0.4 + Math.random() * 0.3,
      });
    }
    return bolts;
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Update shader uniforms
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = time;
    }
    if (outerShaderRef.current) {
      outerShaderRef.current.uniforms.uTime.value = time;
    }

    // Rotate the plasma
    if (meshRef.current) {
      meshRef.current.rotation.y = time * 0.3;
      meshRef.current.rotation.x = time * 0.2;
    }
    if (outerRef.current) {
      outerRef.current.rotation.y = -time * 0.2;
      outerRef.current.rotation.z = time * 0.15;
    }

    // Slowly rotate the lightning group
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.1;
      groupRef.current.rotation.x = Math.sin(time * 0.2) * 0.1;
    }
  });

  return (
    <group position={[plasmaX, plasmaY, plasmaZ]} scale={plasmaScale}>
      {/* Core plasma sphere with custom shader */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.28, 64, 64]} />
        <shaderMaterial
          ref={shaderRef}
          vertexShader={plasmaVertexShader}
          fragmentShader={plasmaFragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uColor1: { value: color1 },
            uColor2: { value: color2 },
            uColor3: { value: color3 },
          }}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Outer plasma layer */}
      <mesh ref={outerRef} scale={1.3}>
        <sphereGeometry args={[0.28, 48, 48]} />
        <shaderMaterial
          ref={outerShaderRef}
          vertexShader={plasmaVertexShader}
          fragmentShader={plasmaFragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uColor1: { value: color1 },
            uColor2: { value: color2 },
            uColor3: { value: color3 },
          }}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Lightning bolts radiating outward */}
      <group ref={groupRef}>
        {lightningBolts.map((bolt, i) => (
          <LightningBolt
            key={`bolt-${i}`}
            startRadius={0.15}
            endRadius={0.55}
            theta={bolt.theta}
            phi={bolt.phi}
            segments={bolt.segments}
            jitter={bolt.jitter}
            color={bolt.color}
            opacity={bolt.opacity}
          />
        ))}
        {/* Secondary smaller lightning arcs */}
        {secondaryBolts.map((bolt, i) => (
          <LightningBolt
            key={`bolt2-${i}`}
            startRadius={0.2}
            endRadius={0.45}
            theta={bolt.theta}
            phi={bolt.phi}
            segments={bolt.segments}
            jitter={bolt.jitter}
            color={bolt.color}
            opacity={bolt.opacity}
          />
        ))}
      </group>

      {/* Bright white-hot core */}
      <mesh scale={0.4}>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshBasicMaterial
          color={0xffffff}
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner yellow core */}
      <mesh scale={0.55}>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshBasicMaterial
          color={0xffffcc}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Volumetric glow layers */}
      <mesh scale={1.6}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshBasicMaterial
          color={0xffaa00}
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh scale={2.0}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshBasicMaterial
          color={0xff8800}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Dynamic point lights for illumination */}
      <pointLight color={0xffdd00} intensity={4} distance={3} />
      <pointLight
        color={0xffaa00}
        intensity={2}
        distance={2}
        position={[0.1, 0.1, 0]}
      />
    </group>
  );
}

// Duration in seconds for the capsule opening animation (from 50% to 100%)
const CAPSULE_ANIMATION_DURATION = 2;

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
  const sceneRef = useRef<THREE.Group>(null);
  const { scene: originalScene, animations } = useGLTF(SPHERE_REVEAL_URL);

  // Clone the scene using SkeletonUtils to properly handle animated/skinned meshes
  const clonedScene = useMemo(() => {
    const cloned = SkeletonUtils.clone(originalScene);
    // Ensure all meshes are visible and materials are properly set
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.visible = true;
        child.frustumCulled = false; // Prevent culling issues
      }
    });
    return cloned;
  }, [originalScene]);

  // Use the ref for animations - this ensures proper binding
  const { actions, mixer } = useAnimations(animations, sceneRef);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const hasStartedRef = useRef(false); // Prevent animation restart on re-renders
  const [fitScale, setFitScale] = useState(1);
  const [centerOffset, setCenterOffset] = useState<THREE.Vector3>(
    new THREE.Vector3()
  );

  // Calculate scale and center from ORIGINAL scene (which has proper geometry)
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(originalScene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    setCenterOffset(center.clone().negate());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      setFitScale(1.5 / maxDim);
    }
  }, [originalScene]);

  // Update the ref when clonedScene changes
  useEffect(() => {
    if (sceneRef.current) {
      // Clear old children
      while (sceneRef.current.children.length > 0) {
        sceneRef.current.remove(sceneRef.current.children[0]);
      }
      // Add cloned scene
      sceneRef.current.add(clonedScene);

      // Force update visibility and materials
      clonedScene.visible = true;
      clonedScene.traverse((child) => {
        child.visible = true;
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
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
    }
  }, [clonedScene]);
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

  // Store onComplete in a ref to avoid dependency changes resetting the animation
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const action =
      Object.values(actions)[2] ||
      actions["Sphere_Animation_Open"] ||
      Object.values(actions)[0];
    if (!action) return;

    // For debug controls mode, allow scrubbing
    if (enableRevealControls) {
      actionRef.current = action;
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      action.paused = true;
      action.enabled = true;
      action.time = 0;
      mixer.setTime(0);
      return;
    }

    // Prevent animation restart on re-renders
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    actionRef.current = action;
    
    // Configure animation to play ONCE and stop at end
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.repetitions = 1;

    // Start at 50% of the animation and play to 100%
    const clipDuration = action.getClip().duration || 1;
    action.time = clipDuration * 0.5; // Start at 50%
    action.play();
    action.paused = false;
    action.enabled = true;
    
    // Play remaining 50% over CAPSULE_ANIMATION_DURATION seconds
    action.timeScale = (clipDuration * 0.5) / CAPSULE_ANIMATION_DURATION;
    mixer.timeScale = 1;

    const handleFinished = (event: THREE.Event) => {
      if (!shouldComplete) return;
      const finishedAction = (
        event as unknown as { action?: THREE.AnimationAction }
      ).action;
      if (event.type === "finished" && finishedAction === action) {
        // Use ref to get latest callback without causing re-renders
        onCompleteRef.current();
      }
    };
    mixer.addEventListener("finished", handleFinished);
    
    return () => {
      mixer.removeEventListener("finished", handleFinished);
    };
  }, [actions, mixer, enableRevealControls, shouldComplete]);

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
      {/* Offset group to center the cloned model */}
      <group position={[centerOffset.x, centerOffset.y, centerOffset.z]}>
        <group ref={sceneRef} />
      </group>
      <PlasmaBall enableControls={enableRevealControls} />
    </group>
  );
}

export type WinRevealScreenProps = {
  onComplete: () => void;
  enableRevealControls?: boolean;
};

export function WinRevealScreen({
  onComplete,
  enableRevealControls = false,
}: WinRevealScreenProps) {
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
          60% {
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
          animation: reveal-fade 2s ease-in-out forwards;
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

// Preload the model
useGLTF.preload(SPHERE_REVEAL_URL);
