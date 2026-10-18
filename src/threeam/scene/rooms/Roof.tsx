"use client";

import * as THREE from "three";
import {
  STAIR_ROOM,
  STAIR_ROOM_DOOR_LO,
  STAIR_ROOM_DOOR_HI,
  ROOF_SIGN_RECT,
  ROOF_CONE_RECT,
  ROOF_BRICKS_RECT,
  ROOF_SACKS_RECT,
  ROOF_BUCKET_RECT,
} from "@/threeam/world/layout";
import { usePixelTexture } from "../usePixelTexture";
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
 *
 * Plus (owner, 2026-10-19: "the text on that under construction sign is not
 * visible or readable, and add bricks, cement things there") the terrace's
 * construction-site dressing: a standing hoarding board, a brick pallet,
 * cement sacks, a mortar bucket, a caution-tape run and the original cone.
 * Every position derives from a rect in layout.ts — nothing is re-typed.
 */

// Shared materials/geometry — this corner alone is ~66 meshes, so the
// repeated bits (bricks, sacks, pallet boards) must not each allocate.
const MAT = {
  wood: new THREE.MeshStandardMaterial({ color: "#6b4a2e", roughness: 0.95 }),
  pallet: new THREE.MeshStandardMaterial({ color: "#a9834f", roughness: 1 }),
  metal: new THREE.MeshStandardMaterial({
    color: "#2a2a2e",
    metalness: 0.45,
    roughness: 0.6,
  }),
  steel: new THREE.MeshStandardMaterial({
    color: "#9aa0a6",
    metalness: 0.5,
    roughness: 0.5,
  }),
  sack: new THREE.MeshStandardMaterial({ color: "#cfc7b6", roughness: 1 }),
  sackBand: new THREE.MeshStandardMaterial({ color: "#3a342b", roughness: 1 }),
  powder: new THREE.MeshStandardMaterial({ color: "#bdb8a9", roughness: 1 }),
  mortar: new THREE.MeshStandardMaterial({ color: "#8d8a80", roughness: 1 }),
  bucket: new THREE.MeshStandardMaterial({ color: "#23282b", roughness: 0.85 }),
  tapeYellow: new THREE.MeshStandardMaterial({ color: "#e3b23c", roughness: 0.9 }),
  tapeBlack: new THREE.MeshStandardMaterial({ color: "#1d1a16", roughness: 0.9 }),
};
// four muted reds so no two neighbouring bricks read identical
const BRICK_MATS = ["#8c4a33", "#763d2b", "#9a553a", "#6b3626"].map(
  (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 })
);
const BRICK_GEO = new THREE.BoxGeometry(0.2, 0.06, 0.1);

const centre = (r: { x: number; z: number; w: number; d: number }) =>
  [r.x + r.w / 2, r.z + r.d / 2] as const;

/* ── HOARDING ───────────────────────────────────────────────────────────
   A standing site board, replacing the original A-frame: the A-frame's
   painted panel was 0.62m wide, which is a handful of screen pixels at the
   dollhouse camera, and the generator was writing its letters at alpha 0
   (see gen-variants.mjs). Panel is now 1.56m × 1.0m, bottom edge at y 0.6,
   on two 0.08m posts, standing against the stair-room's south wall east of
   the door. Width is capped by the stairs-down portal trigger, not by
   taste — see ROOF_SIGN_RECT's comment in layout.ts.
   The whole board tilts back 0.08 rad so its face catches the camera, which
   looks north and down; local z is measured from the post centres. */
const PANEL_W = 1.56;
const PANEL_H = 1.0;
const PANEL_Y = 1.1; // centre; bottom edge 0.6, top 1.6
const POST_H = 1.65;
const POST_Z = 0.06; // post centre, inside the rect once the lean is applied
const BOARD_Z = POST_Z + 0.06; // board centre: 40mm proud of the post faces
function Hoarding() {
  const tex = usePixelTexture("/3am/tex/sign-under-construction.png", 1, 1);
  const [cx, cz] = centre(ROOF_SIGN_RECT);
  const postX = PANEL_W / 2 - 0.12;
  return (
    <group position={[cx, 0, cz]} rotation={[-0.08, 0, 0]}>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * postX, POST_H / 2, POST_Z]}
          material={MAT.wood}
        >
          <boxGeometry args={[0.08, POST_H, 0.08]} />
        </mesh>
      ))}
      {/* plywood panel + the painted face 7mm proud of it */}
      <mesh position={[0, PANEL_Y, BOARD_Z]} material={MAT.wood}>
        <boxGeometry args={[PANEL_W, PANEL_H, 0.04]} />
      </mesh>
      <mesh position={[0, PANEL_Y, BOARD_Z + 0.027]}>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshStandardMaterial map={tex} roughness={1} />
      </mesh>
      {/* capping rail and a low cross-brace, so it reads as site carpentry */}
      <mesh position={[0, POST_H, POST_Z + 0.03]} material={MAT.wood}>
        <boxGeometry args={[1.64, 0.06, 0.1]} />
      </mesh>
      <mesh position={[0, 0.3, POST_Z]} material={MAT.wood}>
        <boxGeometry args={[PANEL_W - 0.24, 0.05, 0.05]} />
      </mesh>
      {/* clamp work-lamp centred on the top edge, hood tilted down onto the
          painted face — the terrace is otherwise unlit and the sign has to
          read. The pointLight is a CHILD of the rotated hood group at the
          bulb (HANDOFF §7 #1). This and the stair-room sconce are the only
          two lights on the roof, well inside the §5 budget. */}
      <group position={[0, POST_H + 0.05, POST_Z + 0.05]} rotation={[-0.5, 0, 0]}>
        <mesh position={[0, 0.08, 0]} material={MAT.metal}>
          <cylinderGeometry args={[0.013, 0.013, 0.16, 6]} />
        </mesh>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.085, 0.11, 10, 1, true]} />
          <meshStandardMaterial
            color="#d9d4c7"
            emissive="#ffb870"
            emissiveIntensity={0.35}
            side={THREE.DoubleSide}
            roughness={0.7}
          />
        </mesh>
        <pointLight color="#ffb870" intensity={1.8} distance={2.6} decay={2} />
      </group>
    </group>
  );
}

/* ── BRICK PALLET ───────────────────────────────────────────────────────
   Two bearers + four deck slats (pallet top at y 0.1), then three courses
   of eight bricks in alternating bond, one brick fallen off beside it and a
   shovel laid across the deck. */
const BRICK_XS = [-0.35, -0.15, 0.05, 0.25];
const BRICK_ZS = [-0.06, 0.06];
function BrickStack() {
  const [cx, cz] = centre(ROOF_BRICKS_RECT);
  return (
    <group position={[cx, 0, cz]}>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.035, 0]} material={MAT.pallet}>
          <boxGeometry args={[0.1, 0.07, 0.8]} />
        </mesh>
      ))}
      {[-0.3, -0.1, 0.1, 0.3].map((z) => (
        <mesh key={z} position={[0, 0.085, z]} material={MAT.pallet}>
          <boxGeometry args={[1, 0.03, 0.12]} />
        </mesh>
      ))}
      {[0, 1, 2].map((course) =>
        BRICK_XS.map((bx, i) =>
          BRICK_ZS.map((bz, j) => (
            <mesh
              key={`${course}-${i}-${j}`}
              geometry={BRICK_GEO}
              material={BRICK_MATS[(course * 3 + i * 2 + j) % BRICK_MATS.length]}
              position={[bx + (course % 2 ? 0.1 : 0), 0.13 + course * 0.06, bz]}
            />
          ))
        )
      )}
      {/* one knocked off, lying on the terrace west of the pallet */}
      <mesh
        geometry={BRICK_GEO}
        material={BRICK_MATS[2]}
        position={[-0.62, 0.03, 0.25]}
        rotation={[0, 0.7, 0]}
      />
      {/* shovel laid across the deck, blade overhanging the west end */}
      <group position={[-0.08, 0.115, 0.3]} rotation={[0, 0.12, 0]}>
        <mesh position={[0.28, 0.01, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.wood}>
          <cylinderGeometry args={[0.018, 0.018, 0.95, 6]} />
        </mesh>
        <mesh position={[-0.33, 0, 0]} rotation={[0, 0, 0.08]} material={MAT.steel}>
          <boxGeometry args={[0.22, 0.015, 0.17]} />
        </mesh>
      </group>
    </group>
  );
}

/* ── CEMENT SACKS ───────────────────────────────────────────────────────
   Three laid flat, one leaning on the stack's south face, each with a dark
   printed band across it; plus a torn-open one on the floor south of the
   rect, spilling a flat grey powder blob (no emissive, no light). */
const STACKED_SACKS: [number, number][] = [
  [0.07, 0.05],
  [0.21, -0.07],
  [0.35, 0.03],
];
function CementSacks() {
  const [cx, cz] = centre(ROOF_SACKS_RECT);
  return (
    <group position={[cx, 0, cz]}>
      {STACKED_SACKS.map(([y, yaw]) => (
        <group key={y} position={[0, y, 0]} rotation={[0, yaw, 0]}>
          <mesh material={MAT.sack}>
            <boxGeometry args={[0.6, 0.14, 0.35]} />
          </mesh>
          <mesh material={MAT.sackBand}>
            <boxGeometry args={[0.14, 0.154, 0.364]} />
          </mesh>
        </group>
      ))}
      <group position={[0.02, 0.26, 0.2]} rotation={[1.15, 0.12, 0]}>
        <mesh material={MAT.sack}>
          <boxGeometry args={[0.6, 0.14, 0.35]} />
        </mesh>
        <mesh material={MAT.sackBand}>
          <boxGeometry args={[0.14, 0.154, 0.364]} />
        </mesh>
      </group>
      <mesh position={[0, 0.05, 0.46]} rotation={[0, 0.5, 0.1]} material={MAT.sack}>
        <boxGeometry args={[0.42, 0.1, 0.26]} />
      </mesh>
      {([
        [0.1, 0.62, 0.22],
        [-0.12, 0.54, 0.1],
      ] as const).map(([px, pz, r]) => (
        <mesh
          key={px}
          position={[px, 0.004, pz]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={MAT.powder}
        >
          <circleGeometry args={[r, 12]} />
        </mesh>
      ))}
    </group>
  );
}

/* ── MORTAR BUCKET + TROWEL ─────────────────────────────────────────────
   West side of the terrace beside the cone, clear of the door's exit line. */
function MortarBucket() {
  const [cx, cz] = centre(ROOF_BUCKET_RECT);
  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[0, 0.15, 0]} material={MAT.bucket}>
        <cylinderGeometry args={[0.15, 0.12, 0.3, 12]} />
      </mesh>
      <mesh position={[0, 0.295, 0]} material={MAT.bucket}>
        <cylinderGeometry args={[0.155, 0.155, 0.03, 12]} />
      </mesh>
      {/* mortar surface, sunk below the rim so it never fights with it */}
      <mesh position={[0, 0.258, 0]} material={MAT.mortar}>
        <cylinderGeometry args={[0.138, 0.138, 0.012, 12]} />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation={[0, 0.4, 0]} material={MAT.steel}>
        <torusGeometry args={[0.15, 0.008, 5, 12, Math.PI]} />
      </mesh>
      {/* trowel leaning in it: diamond plate + handle */}
      <group position={[0.07, 0.3, 0.04]} rotation={[0.45, Math.PI / 4, 0.35]}>
        <mesh position={[0, -0.05, 0]} material={MAT.steel}>
          <boxGeometry args={[0.1, 0.01, 0.1]} />
        </mesh>
        <mesh position={[0, 0.11, 0]} material={MAT.wood}>
          <cylinderGeometry args={[0.014, 0.014, 0.17, 6]} />
        </mesh>
      </group>
    </group>
  );
}

/* ── CAUTION TAPE ───────────────────────────────────────────────────────
   One run at y 0.9, strung between a stake at the brick pallet's SW corner
   and one at the sacks' SE corner — i.e. across the FRONT of both piles,
   where the camera sees it. Deliberately nowhere near the door's exit line
   (x 11.4–12.6): it starts at x 13.45. Both stakes stand inside existing
   colliders and the 0.3m gap the tape spans is narrower than the player's
   0.7m diameter, so the tape needs no collider of its own. */
const TAPE_A: [number, number] = [ROOF_BRICKS_RECT.x + 0.05, ROOF_BRICKS_RECT.z + ROOF_BRICKS_RECT.d - 0.05];
const TAPE_B: [number, number] = [
  ROOF_SACKS_RECT.x + ROOF_SACKS_RECT.w - 0.05,
  ROOF_SACKS_RECT.z + ROOF_SACKS_RECT.d - 0.08,
];
const TAPE_LEN = Math.hypot(TAPE_B[0] - TAPE_A[0], TAPE_B[1] - TAPE_A[1]);
function CautionTape() {
  return (
    <group>
      {[TAPE_A, TAPE_B].map(([px, pz]) => (
        <mesh key={px} position={[px, 0.5, pz]} material={MAT.metal}>
          <cylinderGeometry args={[0.022, 0.022, 1, 6]} />
        </mesh>
      ))}
      <group
        position={[(TAPE_A[0] + TAPE_B[0]) / 2, 0.9, (TAPE_A[1] + TAPE_B[1]) / 2]}
        rotation={[0, -Math.atan2(TAPE_B[1] - TAPE_A[1], TAPE_B[0] - TAPE_A[0]), 0]}
      >
        <mesh material={MAT.tapeYellow}>
          <boxGeometry args={[TAPE_LEN, 0.06, 0.012]} />
        </mesh>
        {[-0.62, -0.31, 0, 0.31, 0.62].map((x) => (
          <mesh key={x} position={[x, 0, 0]} material={MAT.tapeBlack}>
            <boxGeometry args={[0.08, 0.072, 0.024]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function TrafficCone() {
  const r = ROOF_CONE_RECT;
  const cx = r.x + r.w / 2;
  const cz = r.z + r.d / 2;
  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[r.w, 0.024, r.d]} />
        <meshStandardMaterial color="#1d1a16" roughness={1} />
      </mesh>
      <mesh position={[0, 0.024 + 0.19, 0]} castShadow>
        <coneGeometry args={[0.1, 0.38, 10]} />
        <meshStandardMaterial color="#e2602a" roughness={0.9} />
      </mesh>
      {/* reflective band, 6mm proud of the cone surface at its height */}
      <mesh position={[0, 0.024 + 0.2, 0]}>
        <cylinderGeometry args={[0.058, 0.07, 0.05, 10, 1, true]} />
        <meshStandardMaterial color="#f2ecd8" roughness={0.6} side={2} />
      </mesh>
    </group>
  );
}

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

      {/* terrace: construction site (owner ask 2026-10-19) */}
      <Hoarding />
      <TrafficCone />
      <BrickStack />
      <CementSacks />
      <MortarBucket />
      <CautionTape />
    </group>
  );
}
