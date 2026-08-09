"use client";

import {
  STAIR_ROOM,
  STAIR_ROOM_DOOR_LO,
  STAIR_ROOM_DOOR_HI,
} from "@/threeam/world/layout";
import { HorizontalDoorFrame } from "./CommonArea";

const WALL_H = 2.8; // must match House.tsx

/**
 * Rooftop stair-room (Task 7) — dressing for the enclosure whose walls
 * (layout.ts's SR_WALL_*, derived from STAIR_ROOM/STAIR_ROOM_DOOR_LO/HI)
 * are already rendered generically by House.tsx's existing roof `a.walls`
 * loop (full height, same as every other interior divider — no change
 * needed there for the walls themselves). This file adds the two things
 * that need real geometry beyond a plain box: the door's frame trim (south
 * wall, opening onto the terrace) and a small wall lamp. Deliberately no
 * ceiling/roof mesh anywhere in this file — the enclosure's top stays open
 * so the roof's own top-down camera looks straight down into it, same as
 * every ground-floor room (the black-lid bug class Global Constraints
 * calls out).
 */
export function Roof() {
  const doorZ = STAIR_ROOM.z + STAIR_ROOM.d; // south wall's z (matches SR_WALL_S_LO/HI)

  return (
    <group>
      {/* door frame trim, south wall — reuses the same generic component
          the ground floor's door gaps use (CommonArea.tsx), height-matched
          to this room's own walls. */}
      <HorizontalDoorFrame
        z={doorZ}
        xLo={STAIR_ROOM_DOOR_LO}
        xHi={STAIR_ROOM_DOOR_HI}
        height={WALL_H}
      />

      {/* wall lamp — small brass sconce on the room's west wall, mid-depth,
          facing east into the interior (toward the arrival point). The
          pointLight is a SIBLING of the fixture meshes inside this SAME
          rotated group (no independent world-position offset), so it stays
          glued to the fixture regardless of the group's own rotation — the
          bug class Global Constraints calls out ("shipped 3x"). No shadow
          casting (shadow budget stays exactly the music nook's 2 casters,
          per Global Constraints). */}
      <group
        position={[STAIR_ROOM.x + 0.02, 2.15, STAIR_ROOM.z + STAIR_ROOM.d / 2]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <mesh position={[0, -0.09, -0.02]}>
          <boxGeometry args={[0.1, 0.05, 0.06]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.11, 0.14, 8, 1, true]} />
          <meshStandardMaterial
            color="#ffcf8f"
            emissive="#ffcf8f"
            emissiveIntensity={0.8}
            side={2}
          />
        </mesh>
        <pointLight color="#ffcf8f" intensity={3} distance={3.2} decay={2} />
      </group>
    </group>
  );
}
