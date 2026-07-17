"use client";

import { useThreeAm } from "@/threeam/state/store";
import { HOUSE } from "@/threeam/world/layout";
import type { Rect, RoomId } from "@/threeam/world/layout";

const WALL_H = 2.8; // raised from 2.5 at the style gate: wall art needs the headroom
const ROOM_TINTS: Record<RoomId, string> = {
  bedroom: "#4a3f70",
  workspace: "#3f4a70",
  music: "#5a3f70",
  rooftop: "#2e3a55",
};

/** A box extruded up from a floor-plan rect. */
function WallBox({
  rect,
  color = "#6b5f8f",
  height = WALL_H,
}: {
  rect: Rect;
  color?: string;
  height?: number;
}) {
  return (
    <mesh
      position={[rect.x + rect.w / 2, height / 2, rect.z + rect.d / 2]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[rect.w, height, rect.d]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/**
 * Dollhouse cutaway: the camera-side (south) wall renders as a low stub so
 * the character is never occluded. Collision still uses the full wall.
 */
const SOUTH_STUB_H = 0.55;

/** Rooms with their own art-passed surfaces skip the debug tint patch. */
const ART_PASSED = new Set<string>(["music", "workspace"]);

/** Chunky pixel-art stairs standing in for a portal (replaces the old
 *  ladder — the owner found the ladder "weird"). The flight is anchored
 *  flush against the north wall and climbs *toward* the room: each step is
 *  drawn as one solid block from the floor up to its own tread, so from the
 *  side the whole run reads as a single solid stringer (Eastward-style),
 *  not a see-through frame. The tallest block sits flush against the wall
 *  (4mm off its face, per convention) and rises to just under WALL_H, so
 *  the flight reads as actually arriving at the floor above — no gap. The
 *  whole footprint is solid: a matching furniture rect in layout.ts blocks
 *  the player, and the portal trigger sits south of it at the base. No
 *  floor marker — the HUD [E] prompt is the affordance. */
const STAIR_STEPS = 8;
const STAIR_RISE = 0.345; // per-step height (8 * 0.345 = 2.76m ≈ WALL_H 2.8)
const STAIR_RUN = 0.22; // per-step depth (8 * 0.22 = 1.76m total run)
const STAIR_WIDTH = 1.0;
const STAIR_TOTAL_RUN = STAIR_STEPS * STAIR_RUN;
const STAIR_TOTAL_RISE = STAIR_STEPS * STAIR_RISE;

function Stairs({ x, z }: { x: number; z: number }) {
  // Rail runs from just above the top block (near the wall) down to just
  // above the base (near the room) — rotated to follow the slope.
  const railLift = 0.85;
  const railDx = STAIR_WIDTH / 2 + 0.05;
  const railLen = Math.hypot(STAIR_TOTAL_RISE, STAIR_TOTAL_RUN);
  const railAngle = Math.atan2(STAIR_TOTAL_RUN, -STAIR_TOTAL_RISE);

  return (
    <group position={[x, 0, z]}>
      {Array.from({ length: STAIR_STEPS }, (_, i) => {
        // i=0 is flush against the wall (tallest, nearly full height);
        // i=STAIR_STEPS-1 is the lowest single step, out in the room.
        const height = (STAIR_STEPS - i) * STAIR_RISE;
        const zNear = i * STAIR_RUN;
        return (
          <group key={i}>
            {/* solid block: floor up to this step's tread — the stringer */}
            <mesh position={[0, height / 2, zNear + STAIR_RUN / 2]} castShadow receiveShadow>
              <boxGeometry args={[STAIR_WIDTH, height, STAIR_RUN]} />
              <meshStandardMaterial color="#6b4128" />
            </mesh>
            {/* tread cap: lighter plank, nosing proud toward the room */}
            <mesh
              position={[0, height + 0.025, zNear + STAIR_RUN / 2 + 0.02]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[STAIR_WIDTH + 0.04, 0.05, STAIR_RUN + 0.06]} />
              <meshStandardMaterial color="#9c6b42" />
            </mesh>
          </group>
        );
      })}

      {/* slim handrail along one side, following the slope */}
      <mesh
        position={[railDx, STAIR_TOTAL_RISE / 2 + railLift, STAIR_TOTAL_RUN / 2]}
        rotation={[railAngle, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.03, 0.03, railLen, 6]} />
        <meshStandardMaterial color="#8a5a3b" />
      </mesh>
      {[0, STAIR_TOTAL_RUN].map((zPost) => {
        const yTop =
          (STAIR_TOTAL_RISE * (1 - zPost / STAIR_TOTAL_RUN)) + railLift;
        return (
          <mesh key={zPost} position={[railDx, yTop / 2, zPost]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, yTop, 6]} />
            <meshStandardMaterial color="#8a5a3b" />
          </mesh>
        );
      })}
    </group>
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
        receiveShadow
      >
        <planeGeometry args={[b.w, b.d]} />
        <meshStandardMaterial color="#3f3560" />
      </mesh>

      {/* room tint patches: visually confirms room detection boundaries */}
      {a.rooms.filter((r) => !ART_PASSED.has(r.id)).map((r) => (
        <mesh
          key={r.id}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[r.rect.x + r.rect.w / 2, 0.01, r.rect.z + r.rect.d / 2]}
        >
          <planeGeometry args={[r.rect.w - 0.4, r.rect.d - 0.4]} />
          <meshStandardMaterial color={ROOM_TINTS[r.id]} />
        </mesh>
      ))}

      {/* roof: low parapets all around (it's open sky); ground: full walls
          except the camera-side south stub */}
      {perimeter.map((rect, i) => (
        <WallBox
          key={`p${i}`}
          rect={rect}
          height={area === "roof" || i === 1 ? SOUTH_STUB_H : WALL_H}
          color={i === 1 ? "#57497a" : undefined}
        />
      ))}
      {a.walls.map((rect, i) => (
        <WallBox key={`w${i}`} rect={rect} color="#7d6fa8" />
      ))}

      {/* portal stairs: anchored flush against the north wall (4mm off its
          face, both areas); the flight runs toward the room, and the portal
          trigger sits just south of the base where the player presses E. */}
      {HOUSE.portals
        .filter((p) => p.area === area)
        .map((p) => (
          <Stairs key={p.id} x={p.trigger.x + p.trigger.w / 2} z={0.004} />
        ))}
    </group>
  );
}
