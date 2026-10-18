"use client";

import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { usePixelTexture } from "../usePixelTexture";
import { BroadleafPlant, PottedTree } from "../models/Plants";
import { COMMON_RECTS, DOOR_HI, WS_DOOR_LO, WS_DOOR_HI } from "@/threeam/world/layout";
import { WORKSTATION_DOOR_HEIGHT } from "./WorkstationDoorway";
import { KotatsuSet } from "./Kotatsu";

const WALL_H = 2.8; // must match House.tsx
export const COMMON_AREA = { x: 8, z: 0, w: 8, d: 6 };

// LAYOUT V2 (Task 4, rename): this room was "Workspace" (RoomId stays
// "workspace" — layout.ts's LAYOUT V2 comment: Task 4 renames the room/file,
// not the RoomId). Its desk/EVA/coffee-corner identity already migrated
// out to the new Workstation.tsx (Task 3). This file keeps stairs dressing
// (rendered by House.tsx, not here) and plants, plus the framed-opening
// trim below. Its own relighting pass (3 fixture-nested lights, T8 finale)
// lives near the bottom of CommonArea().
//
// OWNER FEEDBACK WAVE (T4 review, this pass): two more things left —
// the basement stair stub (steps/rails/barrier dressing) is DELETED
// outright, "the blue box enclosure looks bad" (its proper entrance
// returns in the basement plan later); the katana + its floating shelf +
// picture-light MOVED to Workstation.tsx, mounted above the desk instead.
//
// T8 FINALE (owner feedback wave, item 10): the full-wall bookshelf also
// MOVED to Workstation.tsx (west-wall slot) — this file no longer keeps
// it, only the up-stairs dressing and plants remain from the original
// "common area keeps" list.

/* Interior locked by Rohan (2026-07 style gate): midnight walls, dark
   walnut floor. Alternatives are regenerable via
   `node scripts/pixelart/gen-variants.mjs` if the room is redecorated. */

/** One organic vine strand (wave E rework — the old stacked-box drape read
 *  as "jenga blocks falling"). Short thin stem segments chained along a
 *  curved droop: the tilt starts near-horizontal (spilling over the edge)
 *  and eases quadratically toward hanging straight down — a catenary-ish
 *  bend instead of a rigid diagonal. Small leaf pairs sprout at alternating
 *  joints. `dir` is the horizontal spill direction in the parent's xz
 *  plane; `phase` offsets the leaf pattern so neighboring strands don't
 *  look cloned. Strand length = `segments` (vary it per strand). */
// Exported (T8 finale item 10): the bookshelf that used these lives in
// Workstation.tsx now (moved from this file's own east-divider spot to the
// workstation's west-wall slot, owner feedback wave) — these stay defined
// here since VineStrand/Spine/etc are otherwise CommonArea-only, but the
// bookshelf's own JSX needs them from across the file boundary.
export const VINE_LEAF_GREENS = ["#3f8f5a", "#3c8a68", "#2e6e54"];
export function VineStrand({
  dir,
  segments,
  segLen = 0.085,
  startTilt = 1.15,
  phase = 0,
}: {
  dir: [number, number];
  segments: number;
  segLen?: number;
  startTilt?: number;
  phase?: number;
}) {
  const yaw = -Math.atan2(dir[1], dir[0]);
  const joints: { x: number; y: number; tilt: number }[] = [];
  let px = 0;
  let py = 0;
  for (let i = 0; i < segments; i++) {
    const t = segments === 1 ? 1 : i / (segments - 1);
    const tilt = startTilt * (1 - t) * (1 - t); // quadratic ease → droop
    joints.push({
      x: px + (Math.sin(tilt) * segLen) / 2,
      y: py - (Math.cos(tilt) * segLen) / 2,
      tilt,
    });
    px += Math.sin(tilt) * segLen;
    py -= Math.cos(tilt) * segLen;
  }
  return (
    <group rotation={[0, yaw, 0]}>
      {joints.map((j, i) => {
        const leafSide = (i + phase) % 4 < 2 ? 1 : -1;
        return (
          <group key={i} position={[j.x, j.y, 0]} rotation={[0, 0, -j.tilt]}>
            {/* stem segment */}
            <mesh>
              <boxGeometry args={[0.02, segLen + 0.012, 0.016]} />
              <meshStandardMaterial color="#2e6e54" />
            </mesh>
            {/* leaf pair at alternating joints, sides swapping down the strand */}
            {(i + phase) % 2 === 0 && (
              <>
                <mesh
                  position={[0.018, 0, leafSide * 0.03]}
                  rotation={[leafSide * 0.55, 0, -0.4]}
                >
                  <boxGeometry args={[0.055, 0.075, 0.012]} />
                  <meshStandardMaterial color={VINE_LEAF_GREENS[(i + phase) % 3]} />
                </mesh>
                <mesh
                  position={[-0.012, -0.02, leafSide * -0.024]}
                  rotation={[leafSide * -0.45, 0, 0.35]}
                >
                  <boxGeometry args={[0.045, 0.06, 0.012]} />
                  <meshStandardMaterial color={VINE_LEAF_GREENS[(i + phase + 1) % 3]} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** One upright/leaning book spine — bookshelf filler. `y0` is the
 *  compartment's floor y; `z` is position along the shelf's width; `tilt`
 *  rotates about the depth axis so it leans sideways against a neighbor. */
export function Spine({
  y0,
  z,
  w,
  h,
  d,
  color,
  tilt = 0,
  x = -0.22,
}: {
  y0: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  tilt?: number;
  x?: number;
}) {
  return (
    <mesh position={[x, y0 + h / 2, z]} rotation={[tilt, 0, 0]}>
      <boxGeometry args={[d, h, w]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/** A book laid flat (part of a small stacked pile). */
export function FlatBook({
  y0,
  z,
  w,
  d,
  h = 0.035,
  color,
  x = -0.22,
  rotY = 0,
}: {
  y0: number;
  z: number;
  w: number;
  d: number;
  h?: number;
  color: string;
  x?: number;
  rotY?: number;
}) {
  return (
    <mesh position={[x, y0 + h / 2, z]} rotation={[0, rotY, 0]}>
      <boxGeometry args={[d, h, w]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/** Tiny decorative pieces scattered on the bookshelf — kept small and
 *  palette-consistent so they read as clutter, not focal objects. */
export function TinyPlant({ y0, z, x = -0.22 }: { y0: number; z: number; x?: number }) {
  return (
    <group position={[x, y0, z]}>
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.025, 0.02, 0.05, 8]} />
        <meshStandardMaterial color="#8a5a3d" />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <sphereGeometry args={[0.032, 8, 6]} />
        <meshStandardMaterial color="#3f8f5a" />
      </mesh>
    </group>
  );
}

export function Figurine({ y0, z, x = -0.2 }: { y0: number; z: number; x?: number }) {
  return (
    <group position={[x, y0, z]}>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.03, 0.04, 0.03]} />
        <meshStandardMaterial color="#c98a2e" />
      </mesh>
      <mesh position={[0, 0.065, 0]}>
        <sphereGeometry args={[0.02, 6, 5]} />
        <meshStandardMaterial color="#2e2a4d" />
      </mesh>
    </group>
  );
}

export function Hourglass({ y0, z, x = -0.2 }: { y0: number; z: number; x?: number }) {
  return (
    <group position={[x, y0, z]}>
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.022, 0.05, 8]} />
        <meshStandardMaterial color="#c9b088" transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.078, 0]}>
        <coneGeometry args={[0.022, 0.05, 8]} />
        <meshStandardMaterial color="#c9b088" transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.006, 6]} />
        <meshStandardMaterial color="#6b4128" />
      </mesh>
    </group>
  );
}

// Katana model + its floating shelf + picture-light — MOVED to
// Workstation.tsx this pass (owner feedback wave: mount it above the desk
// instead of on the common area's north wall). See KatanaModel there for
// the attribution + GLB notes, unchanged verbatim.

// ── COMMON KOTATSU PASS (owner-approved: this room becomes a Japanese
// kotatsu living room). The kotatsu set itself lives in Kotatsu.tsx; the
// three pieces below are the north-wall tokonoma alcove, the north-wall
// tansu chest, and the SE andon floor lantern. Every position derives from
// COMMON_RECTS (layout.ts) — the colliders are the source of truth and no
// rect's numbers are re-typed here.
//
// Camera note (HANDOFF §6): the dollhouse camera looks NORTH from the
// south, so the north wall reads face-on — that is where the readable
// detail goes (the scroll, the tansu's drawer faces and the maneki-neko).
// Nothing roofs anything over.

/** Hanging scroll — LOCKED (Rohan 2026-10-19: "that scroll with circle in
 *  middle"): the ensō. The ink-landscape alternative and the KeyJ style gate
 *  were stripped with the pick (precedent e545fd1 / 6347c04). */
const SCROLL_TEX = "/3am/tex/scroll-enso.png";

const TOK = COMMON_RECTS.tokonoma;
const TOK_CX = TOK.x + TOK.w / 2;
const TOK_PLINTH_D = TOK.d - 0.05; // 5cm shallower than the collider — camera-side stand-off (derived, not retyped)
const TOK_PLINTH_H = 0.2; // 2cm above the room's own 0.18 baseboard, which it hides
const TOK_PANEL_Z = 0.02; // 10mm proud of the wall's dressing plane (z = 0.01)
const TOK_SCROLL_Z = 0.03; // 10mm proud of the back panel
const TOK_PANEL_H = 2.2;

/** Ikebana: ceramic vase + three bent stems with a few leaf/blossom blobs. */
function Ikebana({ x, z }: { x: number; z: number }) {
  const stems: [number, number, number][] = [
    [0.0, 0.0, 0.34],
    [0.42, -0.5, 0.26],
    [-0.5, 0.7, 0.2],
  ]; // [leanX, leanZ, length]
  return (
    <group position={[x, TOK_PLINTH_H + 0.006, z]}>
      <mesh position={[0, 0.085, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.062, 0.17, 10]} />
        <meshStandardMaterial color="#4a5a55" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.175, 0]}>
        <cylinderGeometry args={[0.038, 0.045, 0.02, 10]} />
        <meshStandardMaterial color="#38433f" roughness={0.9} />
      </mesh>
      {stems.map(([lx, lz, len], i) => (
        <group key={i} position={[0, 0.18, 0]} rotation={[lz, 0, -lx]}>
          <mesh position={[0, len / 2, 0]}>
            <cylinderGeometry args={[0.006, 0.008, len, 5]} />
            <meshStandardMaterial color="#4d6b3c" roughness={0.95} />
          </mesh>
          <mesh position={[0.02, len * 0.72, 0.01]} rotation={[0.4, 0.3, 0.5]}>
            <boxGeometry args={[0.07, 0.012, 0.035]} />
            <meshStandardMaterial color="#56773f" roughness={0.95} />
          </mesh>
          <mesh position={[0, len + 0.015, 0]}>
            <sphereGeometry args={[0.032, 7, 6]} />
            <meshStandardMaterial color={i === 1 ? "#c4566a" : "#d8c6a8"} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Paper lantern standing on the alcove plinth — REPLACES the old
 *  north-wall brass sconce (deleted this pass). The pointLight is a CHILD
 *  of this group, sitting at the paper body's own bulb height, so it is
 *  rotation-safe by construction (HANDOFF §7 bug class 1 — a light that is
 *  a sibling of its fixture has shipped wrong three times). This group
 *  carries no rotation, so world bulb position = group position + local
 *  offset = (x, TOK_PLINTH_H + 0.236, z) exactly. No castShadow. */
function PlinthLantern({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, TOK_PLINTH_H + 0.006, z]}>
      {/* dark lacquer base */}
      <mesh position={[0, 0.018, 0]} castShadow>
        <cylinderGeometry args={[0.085, 0.095, 0.036, 10]} />
        <meshStandardMaterial color="#2a1d16" roughness={0.8} />
      </mesh>
      {/* cream paper body */}
      <mesh position={[0, 0.236, 0]} castShadow>
        <cylinderGeometry args={[0.135, 0.15, 0.4, 12]} />
        <meshStandardMaterial
          color="#f0e2c2"
          emissive="#ffc187"
          emissiveIntensity={0.5}
          roughness={1}
        />
      </mesh>
      {/* two bamboo rib bands, 8mm proud of the paper */}
      {[0.14, 0.33].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.152, 0.152, 0.014, 12]} />
          <meshStandardMaterial color="#6b4128" roughness={0.9} />
        </mesh>
      ))}
      {/* dark cap */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.07, 0.11, 0.03, 10]} />
        <meshStandardMaterial color="#2a1d16" roughness={0.8} />
      </mesh>
      <pointLight position={[0, 0.23, 0]} color="#ffc187" intensity={3.2} distance={3.6} decay={2} />
    </group>
  );
}

/** Tokonoma alcove: raised plinth, recessed-looking back panel, hanging
 *  scroll on a pair of dowels, ikebana east, paper lantern west. */
function Tokonoma() {
  const scroll = usePixelTexture(
    SCROLL_TEX,
    1,
    1
  );
  const plinthZ = TOK_PLINTH_D / 2;

  return (
    <group>
      {/* back panel — plum/charcoal, reads as the recessed alcove wall.
          Bottom sits just above the room's 0.18 baseboard (which the
          plinth in front of it hides entirely). */}
      <mesh position={[TOK_CX, TOK_PLINTH_H - 0.01 + TOK_PANEL_H / 2, TOK_PANEL_Z]}>
        <planeGeometry args={[TOK.w, TOK_PANEL_H]} />
        <meshStandardMaterial color="#2b1d2e" roughness={1} />
      </mesh>
      {/* thin trim posts down the alcove's two sides, proud of the panel */}
      {[TOK.x + 0.03, TOK.x + TOK.w - 0.03].map((px) => (
        <mesh key={px} position={[px, TOK_PLINTH_H + TOK_PANEL_H / 2, TOK_PANEL_Z + 0.03]}>
          <boxGeometry args={[0.06, TOK_PANEL_H, 0.04]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
      ))}
      {/* alcove head rail (kamoi), closing the top of the recess */}
      <mesh position={[TOK_CX, TOK_PLINTH_H + TOK_PANEL_H - 0.04, TOK_PANEL_Z + 0.035]}>
        <boxGeometry args={[TOK.w, 0.08, 0.05]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>

      {/* hanging scroll (kakejiku) — 10mm proud of the back panel, with a
          thin dowel rod top and bottom, each another 10mm proud again */}
      <mesh position={[TOK_CX, 1.5, TOK_SCROLL_Z]}>
        <planeGeometry args={[0.45, 1.35]} />
        <meshStandardMaterial map={scroll} roughness={1} />
      </mesh>
      {[1.5 + 0.675, 1.5 - 0.675].map((y) => (
        <mesh key={y} position={[TOK_CX, y, TOK_SCROLL_Z + 0.012]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.014, 0.014, 0.5, 8]} />
          <meshStandardMaterial color="#3b2a1d" roughness={0.85} />
        </mesh>
      ))}

      {/* raised plinth (jifloor), dark polished wood */}
      <mesh position={[TOK_CX, TOK_PLINTH_H / 2, plinthZ]} castShadow receiveShadow>
        <boxGeometry args={[TOK.w, TOK_PLINTH_H, TOK_PLINTH_D]} />
        <meshStandardMaterial color="#35221a" roughness={0.45} />
      </mesh>
      {/* nosing: a slim lighter lip 8mm proud of the plinth's south face */}
      <mesh position={[TOK_CX, TOK_PLINTH_H - 0.025, plinthZ]}>
        <boxGeometry args={[TOK.w + 0.016, 0.03, TOK_PLINTH_D + 0.016]} />
        <meshStandardMaterial color="#5a3b28" roughness={0.5} />
      </mesh>

      <PlinthLantern x={TOK.x + TOK.w / 6} z={plinthZ} />
      <Ikebana x={TOK.x + (TOK.w * 5) / 6} z={plinthZ} />
    </group>
  );
}

const TAN = COMMON_RECTS.tansu;
const TAN_D = TAN.d - 0.05; // 0.45 — chest depth; the collider's extra 5cm is stand-off
const TAN_TIER_W = TAN.w / 3; // 0.5
const TAN_TIER_H = [1.05, 0.75, 0.45]; // stepping DOWN toward the east
const TAN_FACE_Z = TAN_D + 0.008; // drawer fronts, 8mm proud of the carcass
const TAN_PULL_Z = TAN_FACE_Z + 0.014;
const TAN_SLAB_T = 0.03; // tier top slab thickness
// REVIEW FIX: the slab used to be centred at `h - TAN_SLAB_T / 2`, i.e. its
// top face landed exactly ON the carcass top (0mm) — a coplanar pair the
// house's ≥6mm rule exists to prevent. Raised so the slab's top sits 6mm
// PROUD of the carcass top as well as 8mm proud on all four sides.
const TAN_SLAB_PROUD = 0.006;
/** World y of a tier's slab top — what anything standing on that tier
 *  measures its own ≥6mm clearance from (never the carcass top). */
const tanSlabTop = (h: number) => h + TAN_SLAB_PROUD;

/** Maneki-neko — white body, round head, red collar, one raised paw. */
function ManekiNeko({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.055, 0]} castShadow>
        <cylinderGeometry args={[0.052, 0.068, 0.11, 10]} />
        <meshStandardMaterial color="#f2efe6" roughness={0.85} />
      </mesh>
      {/* red collar band, 8mm proud of the body */}
      <mesh position={[0, 0.105, 0]}>
        <cylinderGeometry args={[0.056, 0.056, 0.022, 10]} />
        <meshStandardMaterial color="#b3303a" roughness={0.8} />
      </mesh>
      {/* little gold bell */}
      <mesh position={[0, 0.1, 0.05]}>
        <sphereGeometry args={[0.014, 6, 5]} />
        <meshStandardMaterial color="#d6a233" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.165, 0]} castShadow>
        <sphereGeometry args={[0.058, 10, 8]} />
        <meshStandardMaterial color="#f2efe6" roughness={0.85} />
      </mesh>
      {/* ears */}
      {[-0.034, 0.034].map((dx) => (
        <mesh key={dx} position={[dx, 0.212, 0]} rotation={[0, 0, dx > 0 ? -0.3 : 0.3]}>
          <coneGeometry args={[0.019, 0.04, 5]} />
          <meshStandardMaterial color="#f2efe6" roughness={0.85} />
        </mesh>
      ))}
      {/* tiny black eyes + nose, on the camera-facing (south) side */}
      {[-0.022, 0.022].map((dx) => (
        <mesh key={dx} position={[dx, 0.175, 0.05]}>
          <sphereGeometry args={[0.007, 5, 4]} />
          <meshStandardMaterial color="#16161c" />
        </mesh>
      ))}
      <mesh position={[0, 0.157, 0.055]}>
        <sphereGeometry args={[0.006, 5, 4]} />
        <meshStandardMaterial color="#c4566a" />
      </mesh>
      {/* raised paw (west side, up) + resting paw */}
      <mesh position={[-0.06, 0.125, 0.02]} rotation={[0, 0, 0.5]} castShadow>
        <capsuleGeometry args={[0.016, 0.055, 3, 6]} />
        <meshStandardMaterial color="#f2efe6" roughness={0.85} />
      </mesh>
      <mesh position={[0.055, 0.03, 0.03]}>
        <sphereGeometry args={[0.021, 6, 5]} />
        <meshStandardMaterial color="#f2efe6" roughness={0.85} />
      </mesh>
    </group>
  );
}

/** Stepped tansu chest, three tiers stepping down toward the east. Drawer
 *  faces and brass pulls go on the SOUTH faces — the camera-facing side. */
function Tansu() {
  return (
    <group>
      {TAN_TIER_H.map((h, tier) => {
        const cx = TAN.x + TAN_TIER_W * (tier + 0.5);
        // 3 drawers on the tall tier, 2 on each of the shorter ones
        const drawers = tier === 0 ? 3 : 2;
        return (
          <group key={tier}>
            <mesh position={[cx, h / 2, TAN_D / 2]} castShadow receiveShadow>
              <boxGeometry args={[TAN_TIER_W, h, TAN_D]} />
              <meshStandardMaterial color="#3a2419" roughness={0.6} />
            </mesh>
            {/* top slab: 8mm proud of the carcass on all four sides, and
                its top face 6mm above the carcass top — never coplanar */}
            <mesh position={[cx, h - TAN_SLAB_T / 2 + TAN_SLAB_PROUD, TAN_D / 2]}>
              <boxGeometry args={[TAN_TIER_W + 0.016, TAN_SLAB_T, TAN_D + 0.016]} />
              <meshStandardMaterial color="#51331f" roughness={0.55} />
            </mesh>
            {Array.from({ length: drawers }, (_, d) => {
              const band = (h - 0.08) / drawers;
              const cy = 0.04 + band * (d + 0.5);
              return (
                <group key={d}>
                  <mesh position={[cx, cy, TAN_FACE_Z]}>
                    <boxGeometry args={[TAN_TIER_W - 0.06, band - 0.035, 0.016]} />
                    <meshStandardMaterial color="#4a2f20" roughness={0.65} />
                  </mesh>
                  {[-0.1, 0.1].map((dx) => (
                    <mesh key={dx} position={[cx + dx, cy, TAN_PULL_Z]}>
                      <boxGeometry args={[0.05, 0.016, 0.014]} />
                      <meshStandardMaterial color="#b58a3c" roughness={0.35} metalness={0.6} />
                    </mesh>
                  ))}
                </group>
              );
            })}
          </group>
        );
      })}

      {/* 8mm above each tier's own top SLAB face (not the carcass top) —
          never coplanar with it */}
      <ManekiNeko
        x={TAN.x + TAN_TIER_W * 0.5}
        y={tanSlabTop(TAN_TIER_H[0]) + 0.008}
        z={TAN_D / 2}
      />
      {/* small potted plant on the middle tier — the real broadleaf GLB,
          scaled right down (native ~1.16m tall → ~0.35m). Own Suspense so
          the fetch never blocks the room's first paint. */}
      <Suspense fallback={null}>
        <BroadleafPlant
          position={[TAN.x + TAN_TIER_W * 1.5, tanSlabTop(TAN_TIER_H[1]) + 0.008, TAN_D / 2]}
          scale={0.3}
          rotationY={-0.6}
        />
      </Suspense>
    </group>
  );
}

const AND = COMMON_RECTS.andon;
const BASE_AND_FRAME = AND.w - 0.05; // 0.35 — outer footprint of the wooden frame (collider keeps 5cm stand-off)
const BASE_AND_H = 0.9;

/** Andon floor lantern: dark wooden frame, cream paper panels, pointLight
 *  nested INSIDE at mid-height (HANDOFF §7 bug class 1 — child of the
 *  fixture group, not a sibling; this group carries no rotation so world
 *  bulb = group pos + local y).
 *
 *  SE-WALL LIGHTING PASS: parameterised instead of duplicated, so the new
 *  SW-corner sibling is this same component at `scale` 0.8. Every number
 *  still derives from a layout.ts rect — `rect` is the collider the lantern
 *  stands in, and at scale 1 the outer cap footprint (AND_FRAME + 0.06) is
 *  0.41 inside the 0.4 x-stand-off rect, at 0.8 it is exactly the 0.34 rect.
 *  `intensity`/`distance` default to the SE lantern's own tuned values. */
function Andon({
  rect = AND,
  scale = 1,
  intensity = 3.4,
  distance = 3.9,
  lit = true,
}: {
  rect?: { x: number; z: number; w: number; d: number };
  scale?: number;
  intensity?: number;
  distance?: number;
  /** false = fixture glows by emissive only, no point light (perf budget) */
  lit?: boolean;
} = {}) {
  const AND_FRAME = BASE_AND_FRAME * scale;
  const AND_H = BASE_AND_H * scale;
  const half = AND_FRAME / 2;
  return (
    <group position={[rect.x + rect.w / 2, 0, rect.z + rect.d / 2]}>
      {/* base + cap */}
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[AND_FRAME + 0.04, 0.06, AND_FRAME + 0.04]} />
        <meshStandardMaterial color="#2a1d16" roughness={0.8} />
      </mesh>
      <mesh position={[0, AND_H - 0.03, 0]} castShadow>
        <boxGeometry args={[AND_FRAME + 0.06, 0.05, AND_FRAME + 0.06]} />
        <meshStandardMaterial color="#2a1d16" roughness={0.8} />
      </mesh>
      {/* cream paper box, inset 10mm from the posts so they read separately */}
      <mesh position={[0, AND_H / 2, 0]}>
        <boxGeometry args={[AND_FRAME - 0.03, AND_H - 0.18, AND_FRAME - 0.03]} />
        <meshStandardMaterial
          color="#efe0bf"
          emissive="#ffc187"
          emissiveIntensity={lit ? 0.4 : 0.5}
          roughness={1}
        />
      </mesh>
      {/* four corner posts */}
      {[
        [-half + 0.015, -half + 0.015],
        [half - 0.015, -half + 0.015],
        [-half + 0.015, half - 0.015],
        [half - 0.015, half - 0.015],
      ].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, AND_H / 2, dz]} castShadow>
          <boxGeometry args={[0.03, AND_H, 0.03]} />
          <meshStandardMaterial color="#33231a" roughness={0.85} />
        </mesh>
      ))}
      {/* one horizontal rail per face, mid-height */}
      {[0, Math.PI / 2].map((ry) => (
        <group key={ry} rotation={[0, ry, 0]}>
          {[-half + 0.004, half - 0.004].map((dz) => (
            <mesh key={dz} position={[0, AND_H * 0.52, dz]}>
              <boxGeometry args={[AND_FRAME, 0.028, 0.016]} />
              <meshStandardMaterial color="#33231a" roughness={0.85} />
            </mesh>
          ))}
        </group>
      ))}
      {lit && (
        <pointLight
        position={[0, AND_H * 0.5, 0]}
        color="#ffb870"
        intensity={intensity}
        distance={distance}
        decay={2}
      />
      )}
    </group>
  );
}

// ── SE WALL DRESSING + CHOCHIN LANTERNS (owner feedback: "we need more
// lighting and something on the south-east wall, it's way too bland/
// plain"). The east wall reads at a steep raking angle from the dollhouse
// camera (HANDOFF §6), so this is volumes + colour + light, never fine
// detail: a slatted cedar panel for texture, a bamboo pole, and three
// lit chochin paper lanterns.
//
// X GEOMETRY (all of it hangs off one plane). The structural east divider
// is WALL_T-thick at x 15.9–16.1, and this room's own wall dressing plane
// (the `segs` loop below) sits at x = 15.89. Everything here is measured
// from that dressing plane:
//   * slats span x 15.859–15.884 — 6mm clear of the dressing plane at the
//     back, 31mm proud of it at the front.
//   * the lantern bodies' east edge is 15.728 (0.14 radius + the 8mm rib
//     rings), 0.131m clear of the slat face and 0.123m clear of the cap
//     rail — both over the 0.1m stand-off the plan asks for. The pole sits
//     at x 15.58 rather than the spec'd 15.62 for exactly that reason:
//     15.62 + 0.148 = 15.768 would leave only 0.091m.
// Z GEOMETRY: the stretch SOUTH of the music doorway only — z from
// DOOR_HI + 0.15 to 5.9, so nothing ever enters the doorway gap
// (z DOOR_LO–DOOR_HI) or the east–west walk band.
// COLLIDERS: none. The panel is flush wall dressing and every lantern
// hangs with its underside at y 1.91, well over head height; nothing
// touches the floor.
const SE_WALL_FACE = 15.89; // this room's east wall dressing plane
const SE_Z0 = DOOR_HI + 0.15; // 3.95 — clear of the music doorway gap
const SE_Z1 = 5.9;
const SE_SLAT_W = 0.06; // slat width, along z
const SE_SLAT_GAP = 0.04;
const SE_SLAT_D = 0.025; // depth: how far a slat stands off the wall
const SE_SLAT_BACK = SE_WALL_FACE - 0.006; // 15.884, 6mm clear of the dressing plane
const SE_SLAT_FACE = SE_SLAT_BACK - SE_SLAT_D; // 15.859
const SE_SLAT_Y0 = 0.2; // 20mm above the room's 0.18 baseboard
const SE_SLAT_Y1 = 2.3;
const SE_POLE_X = 15.58;
const SE_POLE_Y = 2.35;
const SE_LANTERN_Z = [4.15, 4.85, 5.55];
const SE_LANTERN_R = 0.14;
const SE_LANTERN_H = 0.38;
const SE_LANTERN_CY = 2.1; // body centre: top 2.29 (4cm of cord), bottom 1.91

/** One chochin paper lantern hanging off the bamboo pole: red-orange paper
 *  body, three thin black rings, a short cord up to the pole, and ONE
 *  pointLight nested INSIDE the body at its centre (HANDOFF §7 bug class 1
 *  — the light is a child of the fixture group, never a sibling; this group
 *  carries no rotation, so world bulb = (SE_POLE_X, SE_LANTERN_CY, z)).
 *  The light casts no shadows. Emissive stays under Bloom's 0.6 threshold. */
// PERF (coordinator, in-page frame counter at the bedroom-door end of the
// room, x9.6): every point light in this band costs ~1.7–3.6 fps against the
// room's ~290 meshes (forward cost = lights × meshes). Three chochin lights
// read as one warm wash anyway, so only the MIDDLE lantern carries a real
// light (boosted to cover its neighbours); the outer two glow by emissive
// alone. Measured: 41 → 48.5 fps for this change alone.
function Chochin({ z, lit }: { z: number; lit: boolean }) {
  return (
    <group position={[SE_POLE_X, SE_LANTERN_CY, z]}>
      {/* cord up to the pole */}
      <mesh position={[0, SE_LANTERN_H / 2 + 0.03, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.07, 5]} />
        <meshStandardMaterial color="#1b1512" roughness={0.9} />
      </mesh>
      {/* paper body */}
      <mesh castShadow>
        <cylinderGeometry args={[SE_LANTERN_R, SE_LANTERN_R, SE_LANTERN_H, 12]} />
        <meshStandardMaterial
          color="#d9553a"
          emissive="#ff7a3c"
          emissiveIntensity={0.42}
          roughness={1}
        />
      </mesh>
      {/* three thin black rings, 8mm proud of the paper */}
      {[-0.12, 0, 0.12].map((dy) => (
        <mesh key={dy} position={[0, dy, 0]}>
          <cylinderGeometry args={[SE_LANTERN_R + 0.008, SE_LANTERN_R + 0.008, 0.012, 12]} />
          <meshStandardMaterial color="#16161c" roughness={0.9} />
        </mesh>
      ))}
      {/* dark caps top and bottom, sunk 10mm into the body's own ends */}
      {[SE_LANTERN_H / 2 - 0.01, -SE_LANTERN_H / 2 + 0.01].map((dy) => (
        <mesh key={dy} position={[0, dy, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.03, 10]} />
          <meshStandardMaterial color="#1b1512" roughness={0.85} />
        </mesh>
      ))}
      {lit && <pointLight color="#ffb070" intensity={3.2} distance={4.2} decay={2} />}
    </group>
  );
}

/** Washi box sconce for the WEST wall (Rohan 2026-10-18: "we still need some
 *  lighting on the west wall"). The bedroom divider's room face sits at
 *  R.x + 0.11 (see `segs`); the sconce's back plate stands 6mm proud of it
 *  and the box reaches 0.13m into the room. Dark wood frame, a cream washi
 *  front and side panels (emissive under the Bloom threshold), and the
 *  pointLight nested at the box's own centre — a child of this un-rotated
 *  group, so world bulb = group position (HANDOFF §7 #1). One per wall
 *  segment, centred on the segment (z 1.1 / 4.9), at a hand-height 1.6m.
 *  That wall reads at a steep angle from the dollhouse camera, so the box
 *  is a volume with a glowing face rather than a flat plate. */
const WS_FACE_OFF = 0.006;
const WS_W = 0.32; // along z
const WS_H = 0.42;
const WS_D = 0.13; // into the room (+x)
const WS_Y = 1.6;
// PERF (coordinator A/B, in-page counter at x9.6, two rounds): BOTH sconce
// lights on = 42 fps, both off = 54–55. A point light here is paid by every
// mesh in bedroom+common, so only the NORTH sconce (by the doorway, where
// the wall pool matters) carries a real light; the south one glows by
// emissive alone — the SW andon already pools that corner.
function WashiSconce({ faceX, z, lit = true, intensity = 2.4, distance = 3.2 }: { faceX: number; z: number; lit?: boolean; intensity?: number; distance?: number }) {
  const x0 = faceX + WS_FACE_OFF; // back plate
  return (
    <group position={[x0 + WS_D / 2, WS_Y, z]}>
      {/* back plate + top/bottom caps + two end posts: dark wood frame */}
      <mesh position={[-WS_D / 2 + 0.01, 0, 0]}>
        <boxGeometry args={[0.02, WS_H, WS_W]} />
        <meshStandardMaterial color="#2a1d14" roughness={0.9} />
      </mesh>
      {[1, -1].map((sy) => (
        <mesh key={sy} position={[0, sy * (WS_H / 2 - 0.012), 0]}>
          <boxGeometry args={[WS_D, 0.024, WS_W]} />
          <meshStandardMaterial color="#3a2a1c" roughness={0.9} />
        </mesh>
      ))}
      {[1, -1].map((sz) => (
        <mesh key={sz} position={[0, 0, sz * (WS_W / 2 - 0.012)]}>
          <boxGeometry args={[WS_D, WS_H - 0.048, 0.024]} />
          <meshStandardMaterial color="#3a2a1c" roughness={0.9} />
        </mesh>
      ))}
      {/* washi panels: front (+x) and the two ends, 6mm inside the frame */}
      <mesh position={[WS_D / 2 - 0.006, 0, 0]}>
        <boxGeometry args={[0.008, WS_H - 0.06, WS_W - 0.06]} />
        <meshStandardMaterial color="#f1e3c4" emissive="#ffc187" emissiveIntensity={lit ? 0.5 : 0.56} roughness={1} />
      </mesh>
      {/* thin lattice bar across the front panel */}
      <mesh position={[WS_D / 2 - 0.001, 0, 0]}>
        <boxGeometry args={[0.006, 0.018, WS_W - 0.06]} />
        <meshStandardMaterial color="#2a1d14" roughness={0.9} />
      </mesh>
      {lit && <pointLight color="#ffc187" intensity={intensity} distance={distance} decay={2} />}
    </group>
  );
}

/** Slatted cedar panel + bamboo pole + the three chochin. */
function SouthEastWall() {
  const span = SE_Z1 - SE_Z0;
  const pitch = SE_SLAT_W + SE_SLAT_GAP;
  const count = Math.floor((span + SE_SLAT_GAP) / pitch);
  const run = count * pitch - SE_SLAT_GAP; // real covered length
  const z0 = SE_Z0 + (span - run) / 2; // centre the run in the stretch
  const slatCY = (SE_SLAT_Y0 + SE_SLAT_Y1) / 2;
  const poleLen = span - 0.1;
  const poleCZ = (SE_Z0 + SE_Z1) / 2;

  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          position={[(SE_SLAT_FACE + SE_SLAT_BACK) / 2, slatCY, z0 + SE_SLAT_W / 2 + i * pitch]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[SE_SLAT_D, SE_SLAT_Y1 - SE_SLAT_Y0, SE_SLAT_W]} />
          <meshStandardMaterial color="#8a5a34" roughness={0.85} />
        </mesh>
      ))}
      {/* slightly lighter cap rail across the slat tops — spans y
          2.25-2.31, so it swallows the slats' top 50mm (a solid
          intersection, no coplanar faces) and stands 8mm further proud
          than they do so it reads as its own piece */}
      <mesh position={[SE_SLAT_BACK - (SE_SLAT_D + 0.008) / 2, SE_SLAT_Y1 - 0.02, poleCZ]}>
        <boxGeometry args={[SE_SLAT_D + 0.008, 0.06, run + 0.04]} />
        <meshStandardMaterial color="#a8703f" roughness={0.8} />
      </mesh>

      {/* bamboo pole, running north-south: centre y 2.35, r 0.02, so its
          underside (2.33) clears the cap rail's top (2.31) by 20mm */}
      <mesh position={[SE_POLE_X, SE_POLE_Y, poleCZ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, poleLen, 8]} />
        <meshStandardMaterial color="#c2a062" roughness={0.9} />
      </mesh>
      {/* two small dark brackets, pole back to the slats' BACK plane —
          they run the slats' full depth rather than butting flush on the
          face, so a bracket landing on a 40mm slat gap still reads as
          anchored instead of floating */}
      {[SE_Z0 + 0.12, SE_Z1 - 0.12].map((bz) => (
        <mesh key={bz} position={[(SE_SLAT_BACK + SE_POLE_X) / 2, SE_POLE_Y, bz]}>
          <boxGeometry args={[SE_SLAT_BACK - SE_POLE_X, 0.028, 0.028]} />
          <meshStandardMaterial color="#2a1d16" roughness={0.85} />
        </mesh>
      ))}

      {SE_LANTERN_Z.map((z, i) => (
        <Chochin key={z} z={z} lit={i === 1} />
      ))}
    </group>
  );
}

export function CommonArea() {
  const R = COMMON_AREA;
  const rootRef = useRef<THREE.Group>(null);

  // Style gates (KeyK futon / KeyJ scroll) STRIPPED 2026-10-19 after the
  // owner's picks: deep-red futon, ensō scroll.

  useEffect(() => {
    rootRef.current?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = false; // PERF: no shadow caster lives in this room any more (pendant rig removed); casting into the genkan sconce's cube map cost ~1.5 fps for no visible gain
        obj.receiveShadow = true;
      }
    });
  }, []);

  const floor = usePixelTexture("/3am/tex/floor-walnut.png", R.w, R.d);
  const wallNW = usePixelTexture("/3am/tex/wall-midnight.png", WS_DOOR_LO - R.x, WALL_H);
  const wallNE = usePixelTexture("/3am/tex/wall-midnight.png", R.x + R.w - WS_DOOR_HI, WALL_H, WS_DOOR_HI - R.x);
  const wallHeader = usePixelTexture("/3am/tex/wall-midnight.png", WS_DOOR_HI - WS_DOOR_LO, WALL_H - WORKSTATION_DOOR_HEIGHT, WS_DOOR_LO - R.x, WORKSTATION_DOOR_HEIGHT);
  const wallSegW = usePixelTexture("/3am/tex/wall-midnight.png", 2.2, WALL_H);
  const wallSegE = usePixelTexture("/3am/tex/wall-midnight.png", 2.2, WALL_H);
  const wallStub = usePixelTexture("/3am/tex/wall-midnight.png", R.w, 0.2, 0, 0.5);

  const segs: Array<{ x: number; rotY: number }> = [
    { x: R.x + 0.11, rotY: Math.PI / 2 }, // west divider, workspace face
    { x: R.x + R.w - 0.11, rotY: -Math.PI / 2 }, // east divider, workspace face
  ];

  return (
    <group ref={rootRef}>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[R.x + R.w / 2, 0.02, R.z + R.d / 2]}>
        <planeGeometry args={[R.w, R.d]} />
        <meshStandardMaterial map={floor} />
      </mesh>
      {/* Surface dressing must leave the same opening as the structural
          wall. A continuous plane here used to hide the entire doorway. */}
      <mesh position={[(R.x + WS_DOOR_LO) / 2, WALL_H / 2, R.z + 0.01]}>
        <planeGeometry args={[WS_DOOR_LO - R.x, WALL_H]} />
        <meshStandardMaterial map={wallNW} />
      </mesh>
      <mesh position={[(WS_DOOR_HI + R.x + R.w) / 2, WALL_H / 2, R.z + 0.01]}>
        <planeGeometry args={[R.x + R.w - WS_DOOR_HI, WALL_H]} />
        <meshStandardMaterial map={wallNE} />
      </mesh>
      {/* Match the exposed structural wall cap; midnight wallpaper belongs
          only on the room-facing surface, not the top of the lintel. */}
      <mesh position={[(WS_DOOR_LO + WS_DOOR_HI) / 2, (WALL_H + WORKSTATION_DOOR_HEIGHT) / 2, R.z - 0.1]} castShadow receiveShadow>
        <boxGeometry args={[WS_DOOR_HI - WS_DOOR_LO, WALL_H - WORKSTATION_DOOR_HEIGHT, 0.2]} />
        <meshStandardMaterial color="#7d6fa8" />
      </mesh>
      <mesh position={[(WS_DOOR_LO + WS_DOOR_HI) / 2, (WALL_H + WORKSTATION_DOOR_HEIGHT) / 2, R.z + 0.01]}>
        <planeGeometry args={[WS_DOOR_HI - WS_DOOR_LO, WALL_H - WORKSTATION_DOOR_HEIGHT]} />
        <meshStandardMaterial map={wallHeader} />
      </mesh>
      {/* divider faces, two segments each (flanking the doors) */}
      {segs.map((seg, i) => (
        <group key={i}>
          <mesh rotation={[0, seg.rotY, 0]} position={[seg.x, WALL_H / 2, 1.1]}>
            <planeGeometry args={[2.2, WALL_H]} />
            <meshStandardMaterial map={i === 0 ? wallSegW : wallSegE} />
          </mesh>
          <mesh rotation={[0, seg.rotY, 0]} position={[seg.x, WALL_H / 2, 4.9]}>
            <planeGeometry args={[2.2, WALL_H]} />
            <meshStandardMaterial map={i === 0 ? wallSegW : wallSegE} />
          </mesh>
        </group>
      ))}
      {/* south stub band */}
      <mesh rotation={[0, Math.PI, 0]} position={[R.x + R.w / 2, 0.275, R.z + R.d - 0.015]}>
        <planeGeometry args={[R.w, 0.55]} />
        <meshStandardMaterial map={wallStub} />
      </mesh>
      {/* baseboards (north + both divider faces) */}
      {[[R.x, WS_DOOR_LO], [WS_DOOR_HI, R.x + R.w]].map(([lo, hi]) => (
        <mesh key={lo} position={[(lo + hi) / 2, 0.09, R.z + 0.045]}>
          <boxGeometry args={[hi - lo, 0.18, 0.07]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
      ))}
      {[R.x + 0.145, R.x + R.w - 0.145].map((bx) => (
        <group key={bx}>
          <mesh position={[bx, 0.09, 1.1]}>
            <boxGeometry args={[0.07, 0.18, 2.2]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
          <mesh position={[bx, 0.09, 4.9]}>
            <boxGeometry args={[0.07, 0.18, 2.2]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
        </group>
      ))}

      {/* ── PLANT PASS (owner ask: place the newly-prepared plant GLBs
          around the house) — a real potted-tree GLB (see
          scene/models/Plants.tsx), collider {9.97,5.32,0.66,0.66} in
          layout.ts. Sits on the south wall. LAYOUT V2 (Task 3): its old
          neighbors, the EVA shrine and coffee counter, migrated out to the
          new workstation room — this plant stays here per the plan's
          "common area keeps: ... plants" list. Own Suspense so the fetch
          never blocks the room's first paint. ── */}
      {/* COMMON KOTATSU PASS: MOVED from [10.3,0,5.65] (south wall) — that
          spot is inside the kotatsu set's footprint now. New home is the
          room's SE corner, derived from COMMON_RECTS.seTree, clear of the
          stair-approach rug and the music doorway band. */}
      <Suspense fallback={null}>
        <PottedTree
          position={[
            COMMON_RECTS.seTree.x + COMMON_RECTS.seTree.w / 2,
            0,
            COMMON_RECTS.seTree.z + COMMON_RECTS.seTree.d / 2,
          ]}
          rotationY={-0.8}
        />
      </Suspense>

      {/* ── COMMON KOTATSU PASS: the room's new identity. Kotatsu set (SW
          quadrant, Kotatsu.tsx), tokonoma alcove (north wall, west of the
          workstation door), tansu chest (north wall, east of it), andon
          floor lantern (SE, by the genkan door's east jamb). Each gets its
          own Suspense so a texture fetch never blanks the whole room (the
          tokonoma's is a first-paint guard only). ── */}
      <Suspense fallback={null}>
        <KotatsuSet />
      </Suspense>
      <Suspense fallback={null}>
        <Tokonoma />
      </Suspense>
      <Tansu />
      {/* SE andon: emissive-only since 2026-10-19 — its light budget slot went
          to the kotatsu table lamp (owner ask); the lit middle chochin
          (15.58,2.1,4.85, distance 4.2) still pools this corner. */}
      <Andon lit={false} />
      {/* SE-WALL LIGHTING PASS (owner: "more lighting, and something on
          the south-east wall — way too bland/plain"). The slatted panel +
          bamboo pole + three lit chochin dress the east wall south of the
          music door; the second andon is the same fixture at 0.8 scale in
          the SW corner, standing in its own layout.ts collider. */}
      <SouthEastWall />
      {/* PERF (coordinator, light-count sweep at x9.6 / x12): the two rendered
          bands together reached 20 visible point lights and the renderer
          fell off a cliff (42 → 55 fps at x9.6, 53 → 60 at centre, by
          removing ANY one light; flat below 19). Budget: ≤19 visible point
          lights across the two bands. The SW andon therefore glows by
          emissive only — the kotatsu is lit by its hem glow, the pendant and
          the north washi sconce. */}
      <Andon rect={COMMON_RECTS.andon2} scale={0.8} lit={false} />
      {/* west wall: a washi sconce per divider segment, centred on each */}
      <WashiSconce faceX={segs[0].x} z={1.1} intensity={2.8} distance={3.6} />
      <WashiSconce faceX={segs[0].x} z={4.9} lit={false} />

      {/* full-wall bookshelf — MOVED to Workstation.tsx (T8 finale item 10,
          owner feedback wave): the west-wall-middle slot (z-4.2..-2.1) the
          Geometry Reference reserved as TBD is the owner's pick for it. Its
          collider moved in layout.ts too (was {15.45,3.85,0.44,2.1} here,
          now {8,-4.2,0.44,2.1}). Spine/FlatBook/TinyPlant/Figurine/
          Hourglass/VineStrand (above) are exported so Workstation.tsx's
          copy of this JSX can still use them from across the file
          boundary. */}

      {/* ── COMMON RELIGHTING PASS (T8 finale — coordinator's T4 walk
          finding: this room read near-black post-migration, since its old
          desk/EVA/coffee-corner lighting all moved out to Workstation.tsx
          with the furniture; only the katana picture-light [moved to
          Workstation too] and the bookshelf's own emissive-only corner
          [above, no real light] were left). Three new warm fixture-nested
          pointLights, values matched to the bedroom's own warm-pool
          convention (#ffd9a0/#ffcf8f, intensity ~4-5, distance ~3.5-4.8,
          decay 2 — see Bedroom.tsx's south floor lamp/nightstand lamps).
          The center pendant's castShadow is GONE again (B5, this pass):
          measured at ~9fps on the heavy bedroom-door end and ~6 at room
          centre, and HANDOFF §5's "exactly 2 casters, both music nook"
          lock stands. No light in this room casts shadows. Every light is a
          child of its own fixture's group, at the fixture's local origin/
          offset, so it's rotation-safe by construction (the "shipped 3x"
          bug class Global Constraints calls out) even though none of these
          three happen to need rotation themselves.

          SE-WALL LIGHTING PASS (owner: "we need more lighting"): the room
          light count grows to 8 in this file — plinth lantern, SE andon,
          the new SW andon, floor lamp, pendant, and three chochin on the
          east wall — plus House.tsx's stairs-approach sconce and cupboard
          lamp in the same band, 10 total. That is well past the old
          "5-light room cap" note; it is a deliberate owner call, and the
          pendant's shadow rig was dropped (B5) to pay part of the cost.
          Forward-render cost is lights x meshes, so if this room ever
          regresses on fps the three chochin are the first thing to merge
          down to one shared pool light. ── */}

      {/* west floor lamp — REMOVED (Rohan 2026-10-18: "that awkward lamp
          which is on the way of bedroom"). It stood at (8.9, 2.6), in the
          mouth of the bedroom doorway's E–W path. Decor-only, so no collider
          to drop. Its light is also one fewer in this band (perf). The
          tokonoma lantern, pendant and SW andon cover that side now. */}

      {/* ceiling pendant — room center, cord dropping from the WALL_H
          ceiling to a warm open-cone shade, lighting the room broadly
          (biggest `distance` of the three — this is the general room fill,
          the other two are corner/wall pools). */}
      <group position={[12, 0, 3]}>
        <mesh position={[0, (WALL_H + 2.0) / 2, 0]}>
          <cylinderGeometry args={[0.012, 0.012, WALL_H - 2.0, 6]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[0, 2.0, 0]}>
          <coneGeometry args={[0.24, 0.18, 12, 1, true]} />
          <meshStandardMaterial color="#ffcf8f" emissive="#ffcf8f" emissiveIntensity={0.75} side={2} />
        </mesh>
        {/* No castShadow (B5): the shadow rig here measured ~9fps at the
            bedroom-door end and ~6 at room centre, and HANDOFF §5 locks the
            house to exactly 2 casters, both in the music nook. */}
        <pointLight position={[0, 1.92, 0]} color="#ffd9a0" intensity={5.5} distance={5.4} decay={2} />
      </group>

      {/* north wall sconce — DELETED (COMMON KOTATSU PASS): it sat at
          (9.5, 2.15, 0.04), which is inside the tokonoma alcove's back
          panel now. Its warm pool on this stretch of north wall is carried
          by the alcove's own paper lantern (PlinthLantern above), which is
          a real visible fixture standing on the plinth. Net light delta for
          this room this pass: -1 (sconce) +3 (plinth lantern, andon,
          cupboard lamp in House.tsx) = +2. */}
    </group>
  );
}

// ── LAYOUT V2 (Task 4): framed door openings ─────────────────────────────
// Decorative trim only (2 jambs + a lintel per opening) — colliders are
// untouched, the door gaps themselves stay exactly as layout.ts defines
// them. Colored in the same walnut-trim family as every room's baseboards
// (#4a3a2e) so every opening in the house reads as one consistent finish
// ("wall-material family colors" — this house's one established trim
// material, not a per-room palette). 0.08m deep, centered in the 0.2m wall
// thickness (WALL_T in layout.ts) — a 0.06m clearance on each face, well
// past the house's 6mm-offset convention. Runs floor-to-ceiling because the
// wall rects these openings cut through are genuinely absent above the
// door gap (no header wall segment exists in layout.ts to hang a
// door-height lintel from) — the frame is a full outline around the whole
// opening, jambs meeting a lintel flush with the ceiling line.
//
// House.tsx is the only file that can mount these on both faces of the
// common↔workstation opening (it alone renders both the ground tree and
// the workstation's own separate structural tree) — it derives every
// opening's x/z bounds from layout.ts's exported door consts, or (for the
// bedroom↔common and common↔music dividers, whose own door-gap consts
// aren't exported) from the live `ground.walls` rects, and mounts these two
// generic shapes.
const FRAME_COLOR = "#4a3a2e";
const FRAME_THICK = 0.07; // jamb/lintel cross-section along the opening
const FRAME_DEPTH = 0.08; // protrusion into the wall thickness
// REVIEW FIX (T4 verdicts, finding 4): how far a `bias`-ed frame's center
// sits off the wall's centerline when biased fully onto one side — half
// the frame's own depth, plus a safety margin so the far edge stops short
// of the centerline (never crosses into the neighbouring room) and the
// near edge stays clear of the wall's outer face. With FRAME_DEPTH=0.08 and
// the 0.2m wall thickness (WALL_T in layout.ts), the half-wall a biased
// frame lives in is 0.1m deep — 0.08 of frame + 2×0.01 margin fills it
// exactly, each margin comfortably over the house's 6mm-offset convention.
const FRAME_BIAS_CLEAR = 0.01;

/** Frame for an opening in a wall that runs north-south at a fixed x (the
 *  opening spans z) — e.g. the x=8/x=16 dividers. `bias` shifts the frame's
 *  full depth onto one side of `x` instead of straddling it: -1 = entirely
 *  at x < the given `x`, +1 = entirely at x > it, 0 (default) keeps the old
 *  symmetric straddle. Needed at x=8/x=16 (House.tsx passes bias toward the
 *  common area) so trim never renders inside the bedroom or the
 *  style-locked music nook — see House.tsx's REVIEW FIX comment at its
 *  VerticalDoorFrame mounts for the full reasoning. */
export function VerticalDoorFrame({
  x,
  zLo,
  zHi,
  height,
  bias = 0,
}: {
  x: number;
  zLo: number;
  zHi: number;
  height: number;
  bias?: -1 | 0 | 1;
}) {
  const dx = bias * (FRAME_DEPTH / 2 + FRAME_BIAS_CLEAR);
  return (
    <group position={[x + dx, 0, 0]}>
      {[zLo, zHi].map((z, i) => (
        <mesh key={i} position={[0, height / 2, z]}>
          <boxGeometry args={[FRAME_DEPTH, height, FRAME_THICK]} />
          <meshStandardMaterial color={FRAME_COLOR} />
        </mesh>
      ))}
      <mesh position={[0, height - FRAME_THICK / 2, (zLo + zHi) / 2]}>
        <boxGeometry args={[FRAME_DEPTH, FRAME_THICK, zHi - zLo + FRAME_THICK]} />
        <meshStandardMaterial color={FRAME_COLOR} />
      </mesh>
    </group>
  );
}

/** Frame for an opening in a wall that runs east-west at a fixed z (the
 *  opening spans x) — e.g. the workstation/genkan shared walls. */
export function HorizontalDoorFrame({
  z,
  xLo,
  xHi,
  height,
  color = FRAME_COLOR,
}: {
  z: number;
  xLo: number;
  xHi: number;
  height: number;
  /** T8 finale item 16: optional per-mount override — defaults to the
   *  house's usual FRAME_COLOR (every existing caller unaffected). The
   *  workstation door's common-side face passes a warmer tone so the
   *  frame "pops" against the dark wall (owner ask: it "reads invisible"
   *  from the common side). */
  color?: string;
}) {
  return (
    <group position={[0, 0, z]}>
      {[xLo, xHi].map((x, i) => (
        <mesh key={i} position={[x, height / 2, 0]}>
          <boxGeometry args={[FRAME_THICK, height, FRAME_DEPTH]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <mesh position={[(xLo + xHi) / 2, height - FRAME_THICK / 2, 0]}>
        <boxGeometry args={[xHi - xLo + FRAME_THICK, FRAME_THICK, FRAME_DEPTH]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
