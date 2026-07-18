"use client";

import { Suspense } from "react";
import { useThreeAm } from "@/threeam/state/store";
import { HOUSE } from "@/threeam/world/layout";
import type { Rect, RoomId } from "@/threeam/world/layout";
import { usePixelTexture } from "./usePixelTexture";

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
 *  not a see-through frame. Ten shallow steps (rise:run ≈ 1.1, was 1.57 —
 *  the owner found the old flight "really upright") stretch the run along
 *  the floor so the flight clearly parallels the east divider wall it
 *  climbs beside. The tallest block sits flush against the wall (4mm off
 *  its face, per convention) and rises to just under WALL_H, so the flight
 *  reads as actually arriving at the floor above — no gap. No handrail
 *  (it poked out of the follow-camera frame). The whole footprint is
 *  solid: a matching furniture rect in layout.ts blocks the player, and
 *  the portal trigger sits south of it at the base. Small potted plants
 *  sit on a few tread edges, alternating sides. */
const STAIR_STEPS = 10;
const STAIR_RISE = 0.276; // per-step height (10 * 0.276 = 2.76m ≈ WALL_H 2.8)
const STAIR_RUN = 0.25; // per-step depth (10 * 0.25 = 2.5m total run)
const STAIR_WIDTH = 1.0;

/** Potted plants on tread edges — step index counts from the top (i=0 at
 *  the wall). Offsets alternate sides and vary so it doesn't read gridded. */
const STEP_PLANTS: { step: number; dx: number; dz: number; s: number }[] = [
  { step: 3, dx: -0.34, dz: 0.02, s: 1.0 },
  { step: 6, dx: 0.33, dz: -0.03, s: 0.82 },
  { step: 8, dx: -0.3, dz: 0.05, s: 1.12 },
];

function StepPlant({ s }: { s: number }) {
  return (
    <group scale={s}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.045, 0.1, 8]} />
        <meshStandardMaterial color="#a04b3a" />
      </mesh>
      <mesh position={[0, 0.105, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.02, 8]} />
        <meshStandardMaterial color="#6e3325" />
      </mesh>
      {/* foliage: a few offset blobs, not a perfect sphere */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <sphereGeometry args={[0.075, 8, 6]} />
        <meshStandardMaterial color="#2e6e54" />
      </mesh>
      <mesh position={[0.045, 0.23, 0.02]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshStandardMaterial color="#3c8a68" />
      </mesh>
      <mesh position={[-0.04, 0.22, -0.03]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color="#3c8a68" />
      </mesh>
    </group>
  );
}

function Stairs({ x, z }: { x: number; z: number }) {
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

      {/* potted plants riding a few tread edges */}
      {STEP_PLANTS.map((p) => (
        <group
          key={p.step}
          position={[
            p.dx,
            (STAIR_STEPS - p.step) * STAIR_RISE + 0.05,
            p.step * STAIR_RUN + STAIR_RUN / 2 + p.dz,
          ]}
        >
          <StepPlant s={p.s} />
        </group>
      ))}
    </group>
  );
}

/** Framed family-ish photos climbing the stairwell wall. Positions are on
 *  the east divider's WEST face (x=15.9, the side the desk/battlestation
 *  looks at), in the triangle of wall left visible above the descending
 *  stringer — each (z, y) clears the stringer height at that z. Contents
 *  are tiny abstract pixel compositions, no text. */
const STAIR_PHOTOS: {
  z: number;
  y: number;
  w: number;
  h: number;
  frame: string;
  paper: string;
  blobs: { x: number; y: number; w: number; h: number; c: string }[];
}[] = [
  {
    z: 0.9, y: 2.42, w: 0.3, h: 0.34, frame: "#8a5a3b", paper: "#f2ecd8",
    blobs: [
      { x: 0, y: -0.07, w: 0.24, h: 0.1, c: "#c98a2e" }, // dune
      { x: 0.05, y: 0.07, w: 0.08, h: 0.08, c: "#b3475f" }, // low sun
    ],
  },
  {
    z: 1.32, y: 2.06, w: 0.34, h: 0.27, frame: "#c98a2e", paper: "#e8ddc4",
    blobs: [
      { x: -0.07, y: 0.0, w: 0.09, h: 0.15, c: "#2e6e54" }, // two figures?
      { x: 0.06, y: -0.02, w: 0.09, h: 0.11, c: "#7d729e" },
    ],
  },
  {
    z: 1.72, y: 1.7, w: 0.27, h: 0.31, frame: "#b3475f", paper: "#f2ecd8",
    blobs: [
      { x: 0, y: 0.06, w: 0.18, h: 0.08, c: "#4a736c" }, // sea band
      { x: -0.05, y: -0.06, w: 0.07, h: 0.07, c: "#a04b3a" },
    ],
  },
  {
    z: 2.0, y: 1.36, w: 0.3, h: 0.24, frame: "#6e3325", paper: "#e8ddc4",
    blobs: [
      { x: 0.03, y: 0.02, w: 0.14, h: 0.09, c: "#655073" }, // hills
      { x: -0.09, y: -0.05, w: 0.06, h: 0.06, c: "#c98a2e" },
    ],
  },
];

/** Casual hanging yaw: frames turn a touch toward the room (south) so the
 *  walking camera, which sees this west-facing wall obliquely, catches
 *  them. The wall-side corner tucks invisibly into the divider. */
const PHOTO_YAW = 0.16;

/** Ground-floor-only dressing for the stairs approach: a rectangle rug at
 *  the foot (where the old green marker sat), the photo wall, and a small
 *  brass sconce (music-nook style) pooling warm light over the corner.
 *  Rug texture reuses the committed style-gate variant rug-persian.png
 *  (JOBS entry lives in scripts/pixelart/gen-variants.mjs). */
function StairsApproach() {
  const rugTex = usePixelTexture("/3am/tex/rug-persian.png", 1, 1);
  const WALL_FACE = 15.9; // east divider, west face

  return (
    <group>
      {/* rug at the foot of the flight (visual only, walkable) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[15.2, 0.035, 3.18]} receiveShadow>
        <planeGeometry args={[1.15, 0.85]} />
        <meshStandardMaterial map={rugTex} />
      </mesh>

      {/* framed photos climbing the stairwell wall */}
      {STAIR_PHOTOS.map((p) => (
        <group
          key={p.z}
          position={[WALL_FACE - 0.016, p.y, p.z]}
          rotation={[0, -Math.PI / 2 + PHOTO_YAW, 0]}
        >
          <mesh castShadow>
            <boxGeometry args={[p.w + 0.04, p.h + 0.04, 0.028]} />
            <meshStandardMaterial color={p.frame} />
          </mesh>
          {/* photo paper, 4mm proud of the frame face */}
          <mesh position={[0, 0, 0.018]}>
            <planeGeometry args={[p.w, p.h]} />
            <meshStandardMaterial color={p.paper} />
          </mesh>
          {p.blobs.map((b, i) => (
            <mesh key={i} position={[b.x, b.y, 0.022]}>
              <planeGeometry args={[b.w, b.h]} />
              <meshStandardMaterial color={b.c} />
            </mesh>
          ))}
        </group>
      ))}

      {/* wall sconce — brass half-dome over the mid-flight, warm low pool
          (fixture-attached light, no shadows — matches the nook's sconce) */}
      <group position={[WALL_FACE - 0.02, 2.32, 1.12]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, -0.09, -0.02]}>
          <boxGeometry args={[0.1, 0.05, 0.06]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.11, 0.14, 8, 1, true]} />
          <meshStandardMaterial color="#ffcf8f" emissive="#ffcf8f" emissiveIntensity={0.8} side={2} />
        </mesh>
      </group>
      <pointLight position={[15.68, 2.18, 1.12]} color="#ffcf8f" intensity={3} distance={3.2} decay={2} />
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
      {/* stairs-approach dressing (rug, photo wall, sconce) is a ground-
          floor thing — the roof side is open parapet, no divider wall.
          Own Suspense boundary: House sits OUTSIDE Scene's boundary, and
          the rug texture must not suspend the whole canvas. */}
      {area === "ground" && (
        <Suspense fallback={null}>
          <StairsApproach />
        </Suspense>
      )}
    </group>
  );
}
