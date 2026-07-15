"use client";

import { useThreeAm } from "@/threeam/state/store";
import { HOUSE } from "@/threeam/world/layout";
import type { Rect, RoomId } from "@/threeam/world/layout";

const WALL_H = 2.5;
const ROOM_TINTS: Record<RoomId, string> = {
  bedroom: "#4a3f70",
  workspace: "#3f4a70",
  music: "#5a3f70",
  rooftop: "#2e3a55",
};

/** A box extruded up from a floor-plan rect. */
function WallBox({ rect, color = "#6b5f8f" }: { rect: Rect; color?: string }) {
  return (
    <mesh
      position={[rect.x + rect.w / 2, WALL_H / 2, rect.z + rect.d / 2]}
    >
      <boxGeometry args={[rect.w, WALL_H, rect.d]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export function House() {
  const area = useThreeAm((s) => s.area);
  const a = HOUSE.areas[area];
  const b = a.bounds;
  const T = 0.2; // perimeter wall thickness (drawn just outside bounds)

  const perimeter: Rect[] = [
    { x: b.x - T, z: b.z - T, w: b.w + 2 * T, d: T }, // north
    { x: b.x - T, z: b.z + b.d, w: b.w + 2 * T, d: T }, // south
    { x: b.x - T, z: b.z, w: T, d: b.d }, // west
    { x: b.x + b.w, z: b.z, w: T, d: b.d }, // east
  ];

  return (
    <group>
      {/* floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[b.x + b.w / 2, 0, b.z + b.d / 2]}
      >
        <planeGeometry args={[b.w, b.d]} />
        <meshStandardMaterial color="#3f3560" />
      </mesh>

      {/* room tint patches: visually confirms room detection boundaries */}
      {a.rooms.map((r) => (
        <mesh
          key={r.id}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[r.rect.x + r.rect.w / 2, 0.01, r.rect.z + r.rect.d / 2]}
        >
          <planeGeometry args={[r.rect.w - 0.4, r.rect.d - 0.4]} />
          <meshStandardMaterial color={ROOM_TINTS[r.id]} />
        </mesh>
      ))}

      {perimeter.map((rect, i) => (
        <WallBox key={`p${i}`} rect={rect} />
      ))}
      {a.walls.map((rect, i) => (
        <WallBox key={`w${i}`} rect={rect} color="#7d6fa8" />
      ))}

      {/* portal markers */}
      {HOUSE.portals
        .filter((p) => p.area === area)
        .map((p) => (
          <mesh
            key={p.id}
            position={[
              p.trigger.x + p.trigger.w / 2,
              0.05,
              p.trigger.z + p.trigger.d / 2,
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[p.trigger.w, p.trigger.d]} />
            <meshStandardMaterial
              color="#7cffb2"
              emissive="#7cffb2"
              emissiveIntensity={0.8}
            />
          </mesh>
        ))}
    </group>
  );
}
