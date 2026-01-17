import { SPHERE_COLORS } from "../constants";
import type {
  BackWallConfig,
  DropBoxConfig,
  GlassAreaConfig,
  SphereConfig,
} from "../types";

/**
 * Check if a point is in the drop box exclusion zone.
 */
export function isInDropBoxZone(
  x: number,
  z: number,
  dropBox: DropBoxConfig
): boolean {
  const halfWidth = dropBox.width / 2;
  const halfDepth = dropBox.depth / 2;
  const inXRange = x >= dropBox.x - halfWidth && x <= dropBox.x + halfWidth;
  const inZRange = z >= dropBox.z - halfDepth && z <= dropBox.z + halfDepth;
  return inXRange && inZRange;
}

/**
 * Generate random prize sphere configurations.
 * Avoids spawning spheres in the drop box area and behind the back wall.
 */
export function generateSphereConfigs(
  count: number,
  area: GlassAreaConfig,
  radius: number,
  dropBox: DropBoxConfig,
  backWall: BackWallConfig
): SphereConfig[] {
  const configs: SphereConfig[] = [];
  let attempts = 0;
  const maxAttempts = count * 10;

  // Clamp minZ to not spawn behind the back wall (add margin for sphere radius)
  const effectiveMinZ = Math.max(area.minZ, backWall.positionZ + radius + 0.02);

  while (configs.length < count && attempts < maxAttempts) {
    attempts++;
    const x = area.minX + Math.random() * (area.maxX - area.minX);
    const y = area.minY + 0.05 + Math.random() * 0.2; // Spawn above floor
    const z = effectiveMinZ + Math.random() * (area.maxZ - effectiveMinZ);

    // Skip if in drop box zone
    if (isInDropBoxZone(x, z, dropBox)) {
      continue;
    }

    const color = SPHERE_COLORS[configs.length % SPHERE_COLORS.length];
    configs.push({
      position: [x, y, z],
      radius,
      color,
      id: `sphere-${configs.length}`,
    });
  }

  return configs;
}
