import type { RapierRigidBody } from "@react-three/rapier";

// ============================================
// Game State Types
// ============================================

export type GamePhase =
  | "IDLE"
  | "DROPPING"
  | "WIDENING"
  | "GRABBING"
  | "RISING"
  | "RETURNING"
  | "RELEASING"
  | "RESETTING";

/**
 * Game outcome determines claw behavior:
 * - null: Dev mode - normal physics-based grab
 * - "win": Magnetize nearest prize to claw for guaranteed capture
 * - "lose": Weak grip that releases during rising phase
 */
export type GameOutcome = "win" | "lose" | null;

export type KeyboardState = {
  ArrowUp: boolean;
  ArrowDown: boolean;
  ArrowLeft: boolean;
  ArrowRight: boolean;
  Space: boolean;
};

// ============================================
// Physics Types
// ============================================

export type SphereConfig = {
  position: [number, number, number];
  radius: number;
  color: string;
  id: string;
};

export type GlassAreaConfig = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  sphereRadius: number;
  sphereCount: number;
};

export type DropBoxConfig = {
  x: number;
  z: number;
  width: number;
  depth: number;
  chuteHeight: number;
};

export type BackWallConfig = {
  visible: boolean;
  positionZ: number;
  height: number;
  width: number;
  offsetY: number;
};

export type SideWallsConfig = {
  leftVisible: boolean;
  rightVisible: boolean;
  leftX: number;
  rightX: number;
  height: number;
  depth: number;
  offsetY: number;
};

export type FrontWallConfig = {
  visible: boolean;
  positionZ: number;
  height: number;
  width: number;
  offsetY: number;
};

export type ClawColliderConfig = {
  showDebug: boolean;
  rotationMultiplier: number;
};

// ============================================
// Context Types
// ============================================

export type GrabContextType = {
  registerBall: (
    id: string,
    ref: React.RefObject<RapierRigidBody | null>
  ) => void;
  unregisterBall: (id: string) => void;
  grabbedBallId: string | null;
  setGrabbedBallId: (id: string | null) => void;
  getBallRefs: () => Map<string, React.RefObject<RapierRigidBody | null>>;
  gameOutcome: GameOutcome;
  setGameOutcome: (outcome: GameOutcome) => void;
};
