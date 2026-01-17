import type {
  BackWallConfig,
  DropBoxConfig,
  FrontWallConfig,
  GlassAreaConfig,
  SideWallsConfig,
} from "./types";

// ============================================
// Animation Configuration
// ============================================

export const CLAW_SPEED = 50;
export const DROP_SPEED = 50;
export const RETURN_SPEED = 20;
export const DROP_DEPTH = -70; // How far down the claw goes
export const GRAB_DURATION = 1000; // ms
export const WIDEN_DURATION = 500; // ms

// Where the claw returns to before releasing the prize (XZ only)
export const DROP_BOX_POS = { x: -26, z: 26 }; // Bottom Left

// Game Bounds for player-controlled movement (XZ)
export const BOUNDS = {
  minX: -26,
  maxX: 26,
  minZ: -26,
  maxZ: 26,
};

// Claw Animation Configuration
export const CLAW_WIDEN_ANGLE = 0.5;
export const CLAW_CLOSE_ANGLE = -0.2;
export const CLAW_AXIS = "z" as const;
export const JOYSTICK_MAX_ANGLE = 0.2;
export const BUTTON_PRESS_DEPTH = 2;

// ============================================
// Game Outcome Behavior Configuration
// ============================================

// On LOSS: Grab ball with same grip as win, then claw opens during rising to drop it
export const CLAW_CLOSE_ANGLE_LOSE = -0.35; // Same tight grip as win (grabs the ball)
export const LOSE_DROP_PROGRESS = 0.25; // Start opening claw at 25% of rising
export const LOSE_OPEN_DURATION = 0.15; // Claw opens over 15% of rising distance
export const CLAW_RELEASE_ANGLE = 0.3; // How much the claw opens to release (wider than widen)

// On WIN: Strong grip + magnetize prize to claw
export const CLAW_CLOSE_ANGLE_WIN = -0.35; // Extra tight grip
export const WIN_MAGNETIZE_SPEED = 3.0; // Speed at which prize moves toward claw
export const WIN_GRAB_RANGE = 0.5; // Larger grab range for guaranteed catch

// ============================================
// Physics Configuration
// ============================================

// The armature in the GLB has a global scale of 0.01
export const ARMATURE_SCALE = 0.01;

// Glass opacity (0 = fully transparent, 1 = fully opaque)
export const DEFAULT_GLASS_OPACITY = 0.3;

// Default values for glass area (controlled by Leva)
export const DEFAULT_GLASS_AREA: GlassAreaConfig = {
  minX: -0.4,
  maxX: 0.4,
  minY: 0.55,
  maxY: 0.6,
  minZ: -0.4,
  maxZ: 0.2,
  sphereRadius: 0.08,
  sphereCount: 15,
};

// Drop box configuration (prize chute area)
// DROP_BOX_POS from constants is { x: -26, z: 26 } in local coords
// With 0.01 scale: { x: -0.26, z: 0.26 }
export const DEFAULT_DROP_BOX: DropBoxConfig = {
  x: -0.32, // Center X of the drop box opening
  z: 0.2, // Z position (front side)
  width: 0.35, // Width of the opening (X direction)
  depth: 0.34, // Depth of the opening (Z direction)
  chuteHeight: 0.15, // Height of the chute walls below the floor
};

// Back wall enclosure configuration
export const DEFAULT_BACK_WALL: BackWallConfig = {
  visible: true,
  positionZ: -0.36, // Z position (behind the glass area)
  height: 1.17, // Height of the wall
  width: 1.08, // Width of the wall
  offsetY: 1.1, // Y offset from floor
};

// Side walls (left and right) configuration
export const DEFAULT_SIDE_WALLS: SideWallsConfig = {
  leftVisible: true,
  rightVisible: true,
  leftX: -0.49, // X position of left wall
  rightX: 0.49, // X position of right wall
  height: 1.17, // Height of the walls
  depth: 0.8, // Depth of the walls (Z direction)
  offsetY: 1.1, // Y offset from floor
};

// Front wall enclosure configuration
export const DEFAULT_FRONT_WALL: FrontWallConfig = {
  visible: true,
  positionZ: 0.34, // Z position (in front of the glass area)
  height: 1.17, // Height of the wall
  width: 1.08, // Width of the wall
  offsetY: 1.1, // Y offset from floor
};

// Sphere colors for prizes
export const SPHERE_COLORS = [
  "#ff4757",
  "#2ed573",
  "#1e90ff",
  "#ffa502",
  "#ff6b81",
  "#7bed9f",
  "#70a1ff",
  "#eccc68",
  "#a55eea",
  "#ff7f50",
  "#00d2d3",
  "#ff9ff3",
];

// ============================================
// Claw Geometry Data (from GLB analysis)
// ============================================

// Mapping: Tooth mesh -> claw bone (for rotation tracking)
export const TOOTH_TO_BONE: Record<string, string> = {
  Tooth2: "claw_2",
  Tooth3: "claw_3",
  Tooth4: "claw_1",
};

// Geometry centers in armature space (before ARMATURE_SCALE)
// From mesh bounds analysis: Tooth2=[0, 1.234, -0.093], etc.
export const TOOTH_GEOMETRY_CENTERS = {
  Tooth2: { x: 0, y: 1.234, z: -0.093 },
  Tooth3: { x: 0.075, y: 1.234, z: 0.036 },
  Tooth4: { x: -0.075, y: 1.234, z: 0.036 },
} as const;
