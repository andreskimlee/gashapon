"use client";

import { Physics } from "@react-three/rapier";
import { useControls } from "leva";
import { useMemo, useState } from "react";
import {
  DEFAULT_BACK_WALL,
  DEFAULT_DROP_BOX,
  DEFAULT_FRONT_WALL,
  DEFAULT_GLASS_AREA,
  DEFAULT_GLASS_OPACITY,
  DEFAULT_SIDE_WALLS,
} from "../constants";
import { GrabProvider } from "../contexts/GrabContext";
import type {
  BackWallConfig,
  ClawColliderConfig,
  DropBoxConfig,
  FrontWallConfig,
  GameOutcome,
  GlassAreaConfig,
  SideWallsConfig,
} from "../types";
import { generateSphereConfigs } from "../utils/sphereUtils";
import { ClawMachineRig } from "./ClawMachineRig";
import { GlassBoundaries } from "./GlassBoundaries";
import { PrizeSphere } from "./PrizeSphere";

type PhysicsSceneProps = {
  modelUrl: string;
  gameOutcome?: GameOutcome;
  onDropStart?: () => void;
};

/**
 * Physics-enabled scene wrapper.
 * Contains Leva controls for adjusting physics parameters.
 */
export function PhysicsScene({
  modelUrl,
  gameOutcome = null,
  onDropStart,
}: PhysicsSceneProps) {
  const [physicsKey, setPhysicsKey] = useState(0);

  // ====================================
  // Leva controls - Master Debug Toggle & Glass
  // ====================================
  const { devMode, glassOpacity } = useControls({
    devMode: {
      value: true,
      label: "🛠️ Dev Mode",
    },
    glassOpacity: {
      value: DEFAULT_GLASS_OPACITY,
      min: 0,
      max: 1,
      step: 0.05,
      label: "🪟 Glass Opacity",
    },
  });

  // ====================================
  // Leva controls - Glass Area
  // ====================================
  const {
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    sphereRadius,
    sphereCount,
    modelScale,
  } = useControls(
    "Glass Area 🎯",
    {
      minX: {
        value: DEFAULT_GLASS_AREA.minX,
        min: -2,
        max: 0,
        step: 0.01,
        label: "Left X",
      },
      maxX: {
        value: DEFAULT_GLASS_AREA.maxX,
        min: 0,
        max: 2,
        step: 0.01,
        label: "Right X",
      },
      minY: {
        value: DEFAULT_GLASS_AREA.minY,
        min: -2,
        max: 2,
        step: 0.01,
        label: "Floor Y",
      },
      maxY: {
        value: DEFAULT_GLASS_AREA.maxY,
        min: -2,
        max: 2,
        step: 0.01,
        label: "Ceiling Y",
      },
      minZ: {
        value: DEFAULT_GLASS_AREA.minZ,
        min: -3,
        max: 0,
        step: 0.01,
        label: "Back Z",
      },
      maxZ: {
        value: DEFAULT_GLASS_AREA.maxZ,
        min: -2,
        max: 1,
        step: 0.01,
        label: "Front Z",
      },
      sphereRadius: {
        value: DEFAULT_GLASS_AREA.sphereRadius,
        min: 0.01,
        max: 0.15,
        step: 0.005,
        label: "Ball Size",
      },
      sphereCount: {
        value: DEFAULT_GLASS_AREA.sphereCount,
        min: 1,
        max: 30,
        step: 1,
        label: "Ball Count",
      },
      modelScale: {
        value: 1.0,
        min: 0.001,
        max: 2.0,
        step: 0.001,
        label: "🎱 Model Scale",
      },
    },
    { collapsed: true }
  );

  // ====================================
  // Leva controls - Drop Box
  // ====================================
  const { dropBoxX, dropBoxZ, dropBoxWidth, dropBoxDepth, chuteHeight } =
    useControls(
      "Drop Box 📦",
      {
        dropBoxX: {
          value: DEFAULT_DROP_BOX.x,
          min: -1,
          max: 1,
          step: 0.01,
          label: "X Position",
        },
        dropBoxZ: {
          value: DEFAULT_DROP_BOX.z,
          min: -1,
          max: 1,
          step: 0.01,
          label: "Z Position",
        },
        dropBoxWidth: {
          value: DEFAULT_DROP_BOX.width,
          min: 0.05,
          max: 1.0,
          step: 0.01,
          label: "⬅️ Width (X) ➡️",
        },
        dropBoxDepth: {
          value: DEFAULT_DROP_BOX.depth,
          min: 0.05,
          max: 1.0,
          step: 0.01,
          label: "⬆️ Depth (Z) ⬇️",
        },
        chuteHeight: {
          value: DEFAULT_DROP_BOX.chuteHeight,
          min: 0.05,
          max: 0.5,
          step: 0.01,
          label: "📏 Chute Height",
        },
      },
      { collapsed: false }
    );

  // ====================================
  // Leva controls - Actions
  // ====================================
  useControls("Actions", {
    "Reset Spheres": {
      value: false,
      label: "🔄 Reset",
      transient: false,
      onChange: (v) => {
        if (v) setPhysicsKey((k) => k + 1);
      },
    },
  });

  // ====================================
  // Leva controls - Back Wall
  // ====================================
  const {
    showBackWall,
    backWallZ,
    backWallHeight,
    backWallWidth,
    backWallOffsetY,
  } = useControls(
    "Back Wall 🧱",
    {
      showBackWall: {
        value: true,
        label: "👁️ Visible",
      },
      backWallZ: {
        value: DEFAULT_BACK_WALL.positionZ,
        min: -2,
        max: 0,
        step: 0.01,
        label: "Z Position",
      },
      backWallHeight: {
        value: DEFAULT_BACK_WALL.height,
        min: 0.1,
        max: 3,
        step: 0.01,
        label: "📏 Height",
      },
      backWallWidth: {
        value: DEFAULT_BACK_WALL.width,
        min: 0.1,
        max: 3,
        step: 0.01,
        label: "⬅️ Width ➡️",
      },
      backWallOffsetY: {
        value: DEFAULT_BACK_WALL.offsetY,
        min: -1,
        max: 2,
        step: 0.01,
        label: "⬆️ Y Offset",
      },
    },
    { collapsed: false }
  );

  // ====================================
  // Leva controls - Side Walls
  // ====================================
  const {
    showLeftWall,
    showRightWall,
    sideWallLeftX,
    sideWallRightX,
    sideWallHeight,
    sideWallDepth,
    sideWallOffsetY,
  } = useControls(
    "Side Walls 🧱",
    {
      showLeftWall: {
        value: true,
        label: "👁️ Left Visible",
      },
      showRightWall: {
        value: true,
        label: "👁️ Right Visible",
      },
      sideWallLeftX: {
        value: DEFAULT_SIDE_WALLS.leftX,
        min: -2,
        max: 0,
        step: 0.01,
        label: "⬅️ Left X",
      },
      sideWallRightX: {
        value: DEFAULT_SIDE_WALLS.rightX,
        min: 0,
        max: 2,
        step: 0.01,
        label: "➡️ Right X",
      },
      sideWallHeight: {
        value: DEFAULT_SIDE_WALLS.height,
        min: 0.1,
        max: 3,
        step: 0.01,
        label: "📏 Height",
      },
      sideWallDepth: {
        value: DEFAULT_SIDE_WALLS.depth,
        min: 0.1,
        max: 3,
        step: 0.01,
        label: "↕️ Depth (Z)",
      },
      sideWallOffsetY: {
        value: DEFAULT_SIDE_WALLS.offsetY,
        min: -1,
        max: 2,
        step: 0.01,
        label: "⬆️ Y Offset",
      },
    },
    { collapsed: false }
  );

  // ====================================
  // Leva controls - Front Wall
  // ====================================
  const {
    showFrontWall,
    frontWallZ,
    frontWallHeight,
    frontWallWidth,
    frontWallOffsetY,
  } = useControls(
    "Front Wall 🧱",
    {
      showFrontWall: {
        value: true,
        label: "👁️ Visible",
      },
      frontWallZ: {
        value: DEFAULT_FRONT_WALL.positionZ,
        min: 0,
        max: 2,
        step: 0.01,
        label: "Z Position",
      },
      frontWallHeight: {
        value: DEFAULT_FRONT_WALL.height,
        min: 0.1,
        max: 3,
        step: 0.01,
        label: "📏 Height",
      },
      frontWallWidth: {
        value: DEFAULT_FRONT_WALL.width,
        min: 0.1,
        max: 3,
        step: 0.01,
        label: "⬅️ Width ➡️",
      },
      frontWallOffsetY: {
        value: DEFAULT_FRONT_WALL.offsetY,
        min: -1,
        max: 2,
        step: 0.01,
        label: "⬆️ Y Offset",
      },
    },
    { collapsed: false }
  );

  // ====================================
  // Leva controls - Claw Colliders
  // ====================================
  const { showClawDebug, rotationMultiplier } = useControls(
    "Claw Colliders 🦞",
    {
      showClawDebug: {
        value: true,
        label: "👁️ Show Collider Wireframe",
      },
      rotationMultiplier: {
        value: 1.0,
        min: -3,
        max: 3,
        step: 0.1,
        label: "🔄 Rotation Scale",
      },
    },
    { collapsed: false }
  );

  // ====================================
  // Memoized configs
  // ====================================
  const clawColliderConfig = useMemo<ClawColliderConfig>(
    () => ({
      showDebug: devMode && showClawDebug,
      rotationMultiplier,
    }),
    [devMode, showClawDebug, rotationMultiplier]
  );

  const glassArea = useMemo<GlassAreaConfig>(
    () => ({
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      maxZ,
      sphereRadius,
      sphereCount,
    }),
    [minX, maxX, minY, maxY, minZ, maxZ, sphereRadius, sphereCount]
  );

  const dropBox = useMemo<DropBoxConfig>(
    () => ({
      x: dropBoxX,
      z: dropBoxZ,
      width: dropBoxWidth,
      depth: dropBoxDepth,
      chuteHeight: chuteHeight,
    }),
    [dropBoxX, dropBoxZ, dropBoxWidth, dropBoxDepth, chuteHeight]
  );

  const backWall = useMemo<BackWallConfig>(
    () => ({
      visible: showBackWall,
      positionZ: backWallZ,
      height: backWallHeight,
      width: backWallWidth,
      offsetY: backWallOffsetY,
    }),
    [showBackWall, backWallZ, backWallHeight, backWallWidth, backWallOffsetY]
  );

  const sideWalls = useMemo<SideWallsConfig>(
    () => ({
      leftVisible: showLeftWall,
      rightVisible: showRightWall,
      leftX: sideWallLeftX,
      rightX: sideWallRightX,
      height: sideWallHeight,
      depth: sideWallDepth,
      offsetY: sideWallOffsetY,
    }),
    [
      showLeftWall,
      showRightWall,
      sideWallLeftX,
      sideWallRightX,
      sideWallHeight,
      sideWallDepth,
      sideWallOffsetY,
    ]
  );

  const frontWall = useMemo<FrontWallConfig>(
    () => ({
      visible: showFrontWall,
      positionZ: frontWallZ,
      height: frontWallHeight,
      width: frontWallWidth,
      offsetY: frontWallOffsetY,
    }),
    [
      showFrontWall,
      frontWallZ,
      frontWallHeight,
      frontWallWidth,
      frontWallOffsetY,
    ]
  );

  // Generate sphere configs (avoiding drop box and back wall)
  const sphereConfigs = useMemo(
    () =>
      generateSphereConfigs(
        sphereCount,
        glassArea,
        sphereRadius,
        dropBox,
        backWall
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      physicsKey,
      sphereCount,
      sphereRadius,
      minX,
      maxX,
      minZ,
      maxZ,
      dropBoxX,
      dropBoxWidth,
      dropBoxDepth,
      backWallZ,
    ]
  );

  return (
    <GrabProvider gameOutcome={gameOutcome}>
      <Physics gravity={[0, -9.81, 0]} key={physicsKey}>
        <ClawMachineRig
          modelUrl={modelUrl}
          clawColliderConfig={clawColliderConfig}
          glassOpacity={glassOpacity}
          onDropStart={onDropStart}
        />
        <GlassBoundaries
          area={glassArea}
          dropBox={dropBox}
          backWall={backWall}
          sideWalls={sideWalls}
          frontWall={frontWall}
          showDebug={devMode}
        />

        {/* Prize spheres */}
        {sphereConfigs.map((config) => (
          <PrizeSphere
            key={config.id}
            config={config}
            modelScale={modelScale}
          />
        ))}
      </Physics>
    </GrabProvider>
  );
}
