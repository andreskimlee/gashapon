"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type {
  BackWallConfig,
  DropBoxConfig,
  FrontWallConfig,
  GlassAreaConfig,
  SideWallsConfig,
} from "../types";

type GlassBoundariesProps = {
  area: GlassAreaConfig;
  dropBox: DropBoxConfig;
  backWall: BackWallConfig;
  sideWalls: SideWallsConfig;
  frontWall: FrontWallConfig;
  showDebug?: boolean;
};

export function GlassBoundaries({
  area,
  dropBox,
  backWall,
  sideWalls,
  frontWall,
  showDebug = true,
}: GlassBoundariesProps) {
  const floorY = area.minY;
  const halfWidth = (area.maxX - area.minX) / 2;
  const halfDepth = (area.maxZ - area.minZ) / 2;
  const wallHeight = (area.maxY - area.minY) / 2;
  const centerY = (area.minY + area.maxY) / 2;
  const centerZ = (area.minZ + area.maxZ) / 2;
  const centerX = (area.minX + area.maxX) / 2;

  // Drop box opening calculations
  const dropBoxHalfWidth = dropBox.width / 2;
  const dropBoxHalfDepth = dropBox.depth / 2;
  const dropBoxLeft = dropBox.x - dropBoxHalfWidth;
  const dropBoxRight = dropBox.x + dropBoxHalfWidth;
  const dropBoxBack = dropBox.z - dropBoxHalfDepth;
  const dropBoxFront = dropBox.z + dropBoxHalfDepth;

  // Front wall segments (split around drop box opening)
  const leftSegmentWidth = Math.max(0, dropBoxLeft - area.minX);
  const leftSegmentCenterX = area.minX + leftSegmentWidth / 2;
  const rightSegmentWidth = Math.max(0, area.maxX - dropBoxRight);
  const rightSegmentCenterX = dropBoxRight + rightSegmentWidth / 2;

  // Floor segments (split around drop box hole)
  const backFloorDepth = Math.max(0, dropBoxBack - area.minZ);
  const backFloorCenterZ = area.minZ + backFloorDepth / 2;
  const frontFloorDepth = Math.max(0, area.maxZ - dropBoxFront);
  const frontFloorCenterZ = dropBoxFront + frontFloorDepth / 2;

  // Left/right floor strips (beside drop box)
  const leftFloorWidth = Math.max(0, dropBoxLeft - area.minX);
  const leftFloorCenterX = area.minX + leftFloorWidth / 2;
  const rightFloorWidth = Math.max(0, area.maxX - dropBoxRight);
  const rightFloorCenterX = dropBoxRight + rightFloorWidth / 2;

  return (
    <>
      {/* FLOOR - Back section (behind drop box) */}
      {backFloorDepth > 0.01 && (
        <RigidBody
          type="fixed"
          position={[centerX, floorY, backFloorCenterZ]}
          restitution={0.2}
          friction={0.8}
        >
          <CuboidCollider args={[halfWidth + 0.05, 0.01, backFloorDepth / 2]} />
          {showDebug && (
            <mesh>
              <boxGeometry
                args={[(halfWidth + 0.05) * 2, 0.02, backFloorDepth]}
              />
              <meshStandardMaterial color="#ff00ff" opacity={0.5} transparent />
            </mesh>
          )}
        </RigidBody>
      )}

      {/* FLOOR - Front section (in front of drop box) */}
      {frontFloorDepth > 0.01 && (
        <RigidBody
          type="fixed"
          position={[centerX, floorY, frontFloorCenterZ]}
          restitution={0.2}
          friction={0.8}
        >
          <CuboidCollider
            args={[halfWidth + 0.05, 0.01, frontFloorDepth / 2]}
          />
          {showDebug && (
            <mesh>
              <boxGeometry
                args={[(halfWidth + 0.05) * 2, 0.02, frontFloorDepth]}
              />
              <meshStandardMaterial color="#ff00ff" opacity={0.5} transparent />
            </mesh>
          )}
        </RigidBody>
      )}

      {/* FLOOR - Left strip (beside drop box hole) */}
      {leftFloorWidth > 0.01 && dropBox.depth > 0.01 && (
        <RigidBody
          type="fixed"
          position={[leftFloorCenterX, floorY, dropBox.z]}
          restitution={0.2}
          friction={0.8}
        >
          <CuboidCollider args={[leftFloorWidth / 2, 0.01, dropBoxHalfDepth]} />
          {showDebug && (
            <mesh>
              <boxGeometry args={[leftFloorWidth, 0.02, dropBox.depth]} />
              <meshStandardMaterial color="#ff00ff" opacity={0.5} transparent />
            </mesh>
          )}
        </RigidBody>
      )}

      {/* FLOOR - Right strip (beside drop box hole) */}
      {rightFloorWidth > 0.01 && dropBox.depth > 0.01 && (
        <RigidBody
          type="fixed"
          position={[rightFloorCenterX, floorY, dropBox.z]}
          restitution={0.2}
          friction={0.8}
        >
          <CuboidCollider
            args={[rightFloorWidth / 2, 0.01, dropBoxHalfDepth]}
          />
          {showDebug && (
            <mesh>
              <boxGeometry args={[rightFloorWidth, 0.02, dropBox.depth]} />
              <meshStandardMaterial color="#ff00ff" opacity={0.5} transparent />
            </mesh>
          )}
        </RigidBody>
      )}

      {/* Drop box hole indicator (green) */}
      {showDebug && (
        <mesh position={[dropBox.x, floorY - 0.02, dropBox.z]}>
          <boxGeometry args={[dropBox.width, 0.01, dropBox.depth]} />
          <meshStandardMaterial color="#00ff00" opacity={0.7} transparent />
        </mesh>
      )}

      {/* DROP BOX CHUTE WALLS - extend UPWARD to guide balls into the hole */}
      {/* Left wall of chute */}
      <RigidBody
        type="fixed"
        position={[dropBoxLeft - 0.01, floorY + dropBox.chuteHeight, dropBox.z]}
      >
        <CuboidCollider
          args={[0.01, dropBox.chuteHeight, dropBoxHalfDepth + 0.02]}
        />
        {showDebug && (
          <mesh>
            <boxGeometry
              args={[0.02, dropBox.chuteHeight * 2, dropBox.depth + 0.04]}
            />
            <meshStandardMaterial color="#ffff00" opacity={0.9} transparent />
          </mesh>
        )}
      </RigidBody>

      {/* Right wall of chute */}
      <RigidBody
        type="fixed"
        position={[
          dropBoxRight + 0.01,
          floorY + dropBox.chuteHeight,
          dropBox.z,
        ]}
      >
        <CuboidCollider
          args={[0.01, dropBox.chuteHeight, dropBoxHalfDepth + 0.02]}
        />
        {showDebug && (
          <mesh>
            <boxGeometry
              args={[0.02, dropBox.chuteHeight * 2, dropBox.depth + 0.04]}
            />
            <meshStandardMaterial color="#ff8800" opacity={0.9} transparent />
          </mesh>
        )}
      </RigidBody>

      {/* Back wall of chute */}
      <RigidBody
        type="fixed"
        position={[dropBox.x, floorY + dropBox.chuteHeight, dropBoxBack - 0.01]}
      >
        <CuboidCollider
          args={[dropBoxHalfWidth + 0.02, dropBox.chuteHeight, 0.01]}
        />
        {showDebug && (
          <mesh>
            <boxGeometry
              args={[dropBox.width + 0.04, dropBox.chuteHeight * 2, 0.02]}
            />
            <meshStandardMaterial color="#00ffff" opacity={0.9} transparent />
          </mesh>
        )}
      </RigidBody>

      {/* Left wall */}
      <RigidBody type="fixed" position={[area.minX - 0.02, centerY, centerZ]}>
        <CuboidCollider args={[0.02, wallHeight + 0.1, halfDepth + 0.05]} />
      </RigidBody>

      {/* Right wall */}
      <RigidBody type="fixed" position={[area.maxX + 0.02, centerY, centerZ]}>
        <CuboidCollider args={[0.02, wallHeight + 0.1, halfDepth + 0.05]} />
      </RigidBody>

      {/* Front wall - LEFT segment (before drop box opening) */}
      {leftSegmentWidth > 0.01 && (
        <RigidBody
          type="fixed"
          position={[leftSegmentCenterX, centerY, area.maxZ + 0.02]}
        >
          <CuboidCollider
            args={[leftSegmentWidth / 2, wallHeight + 0.1, 0.02]}
          />
        </RigidBody>
      )}

      {/* Front wall - RIGHT segment (after drop box opening) */}
      {rightSegmentWidth > 0.01 && (
        <RigidBody
          type="fixed"
          position={[rightSegmentCenterX, centerY, area.maxZ + 0.02]}
        >
          <CuboidCollider
            args={[rightSegmentWidth / 2, wallHeight + 0.1, 0.02]}
          />
        </RigidBody>
      )}

      {/* Back wall (Z-) - invisible collider */}
      <RigidBody type="fixed" position={[centerX, centerY, area.minZ - 0.02]}>
        <CuboidCollider args={[halfWidth + 0.05, wallHeight + 0.1, 0.02]} />
      </RigidBody>

      {/* BACK WALL ENCLOSURE - Pink visual wall */}
      {backWall.visible && (
        <RigidBody
          type="fixed"
          position={[0, backWall.offsetY, backWall.positionZ]}
        >
          <CuboidCollider
            args={[backWall.width / 2, backWall.height / 2, 0.02]}
          />
          {showDebug && (
            <mesh>
              <boxGeometry args={[backWall.width, backWall.height, 0.04]} />
              <meshStandardMaterial
                color="#ff69b4"
                roughness={0.3}
                metalness={0.1}
              />
            </mesh>
          )}
        </RigidBody>
      )}

      {/* LEFT WALL ENCLOSURE - Pink visual wall */}
      {sideWalls.leftVisible && (
        <RigidBody
          type="fixed"
          position={[sideWalls.leftX, sideWalls.offsetY, 0]}
        >
          <CuboidCollider
            args={[0.02, sideWalls.height / 2, sideWalls.depth / 2]}
          />
          {showDebug && (
            <mesh>
              <boxGeometry args={[0.04, sideWalls.height, sideWalls.depth]} />
              <meshStandardMaterial
                color="#ff69b4"
                roughness={0.3}
                metalness={0.1}
              />
            </mesh>
          )}
        </RigidBody>
      )}

      {/* RIGHT WALL ENCLOSURE - Pink visual wall */}
      {sideWalls.rightVisible && (
        <RigidBody
          type="fixed"
          position={[sideWalls.rightX, sideWalls.offsetY, 0]}
        >
          <CuboidCollider
            args={[0.02, sideWalls.height / 2, sideWalls.depth / 2]}
          />
          {showDebug && (
            <mesh>
              <boxGeometry args={[0.04, sideWalls.height, sideWalls.depth]} />
              <meshStandardMaterial
                color="#ff69b4"
                roughness={0.3}
                metalness={0.1}
              />
            </mesh>
          )}
        </RigidBody>
      )}

      {/* FRONT WALL ENCLOSURE - Pink visual wall */}
      {frontWall.visible && (
        <RigidBody
          type="fixed"
          position={[0, frontWall.offsetY, frontWall.positionZ]}
        >
          <CuboidCollider
            args={[frontWall.width / 2, frontWall.height / 2, 0.02]}
          />
          {showDebug && (
            <mesh>
              <boxGeometry args={[frontWall.width, frontWall.height, 0.04]} />
              <meshStandardMaterial
                color="#ff69b4"
                roughness={0.3}
                metalness={0.1}
              />
            </mesh>
          )}
        </RigidBody>
      )}
    </>
  );
}
