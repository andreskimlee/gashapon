// Main claw machine exports
// ============================================

// Components
export { PhysicsScene } from "./components/PhysicsScene";
export { ClawMachineRig } from "./components/ClawMachineRig";
export { GlassBoundaries } from "./components/GlassBoundaries";
export { PrizeSphere } from "./components/PrizeSphere";

// Context
export { GrabProvider, useGrabContext } from "./contexts/GrabContext";

// Hooks
export { useClawColliders } from "./hooks/useClawColliders";
export { useKeyboardControls } from "./useKeyboardControls";

// Types
export type {
  ClawColliderConfig,
  DropBoxConfig,
  GamePhase,
  GlassAreaConfig,
  GrabContextType,
  KeyboardState,
  SphereConfig,
} from "./types";

// Constants
export {
  ARMATURE_SCALE,
  BOUNDS,
  BUTTON_PRESS_DEPTH,
  CLAW_AXIS,
  CLAW_CLOSE_ANGLE,
  CLAW_SPEED,
  CLAW_WIDEN_ANGLE,
  DEFAULT_DROP_BOX,
  DEFAULT_GLASS_AREA,
  DROP_BOX_POS,
  DROP_DEPTH,
  DROP_SPEED,
  GRAB_DURATION,
  JOYSTICK_MAX_ANGLE,
  RETURN_SPEED,
  SPHERE_COLORS,
  TOOTH_GEOMETRY_CENTERS,
  TOOTH_TO_BONE,
  WIDEN_DURATION,
} from "./constants";

// Utils
export { generateSphereConfigs, isInDropBoxZone } from "./utils/sphereUtils";

