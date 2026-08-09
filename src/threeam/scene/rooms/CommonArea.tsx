"use client";

import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { usePixelTexture } from "../usePixelTexture";
import { PottedTree } from "../models/Plants";

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

export function CommonArea() {
  const R = COMMON_AREA;
  const rootRef = useRef<THREE.Group>(null);

  useEffect(() => {
    rootRef.current?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, []);

  const floor = usePixelTexture("/3am/tex/floor-walnut.png", R.w, R.d);
  const wallN = usePixelTexture("/3am/tex/wall-midnight.png", R.w, WALL_H);
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
      {/* north wall */}
      <mesh position={[R.x + R.w / 2, WALL_H / 2, R.z + 0.01]}>
        <planeGeometry args={[R.w, WALL_H]} />
        <meshStandardMaterial map={wallN} />
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
      <mesh position={[R.x + R.w / 2, 0.09, R.z + 0.045]}>
        <boxGeometry args={[R.w, 0.18, 0.07]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>
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
      <Suspense fallback={null}>
        <PottedTree position={[10.3, 0, 5.65]} rotationY={1.0} />
      </Suspense>

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
          The center pendant (below) is now this room's shadow caster
          (owner override of the old "2 casters, both music nook" rule —
          discrete-room rendering means only this room's own caster is
          ever live while occupied); the other two stay real-light-only,
          no castShadow. Every light is a
          child of its own fixture's group, at the fixture's local origin/
          offset, so it's rotation-safe by construction (the "shipped 3x"
          bug class Global Constraints calls out) even though none of these
          three happen to need rotation themselves. Room real-light total:
          1 existing (House.tsx's stairs-approach sconce, same band 1) + 3
          here = 4, under the 5-light room cap. ── */}

      {/* floor lamp — west side, open pocket clear of the potted tree (SW,
          south wall) and the stairs footprint (NE) — same tripod/pole/
          open-cone-shade construction as Bedroom's south floor lamp. Decor
          only, no layout.ts collider (same convention Genkan.tsx's shoe
          rack/umbrella stand use for new dressing this plan — layout.ts is
          off-limits this task). */}
      <group position={[8.9, 0, 2.6]}>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.14, 0.16, 0.06, 10]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.88, 8]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[0, 1.02, 0]}>
          <cylinderGeometry args={[0.14, 0.19, 0.22, 10, 1, true]} />
          <meshStandardMaterial color="#ffb35c" emissive="#ffb35c" emissiveIntensity={0.85} side={2} />
        </mesh>
        <pointLight position={[0, 1.02, 0]} color="#ffd9a0" intensity={5} distance={4.5} decay={2} />
      </group>

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
        <pointLight castShadow shadow-mapSize={[256, 256]} shadow-bias={-0.0015} shadow-radius={3} shadow-intensity={0.85} position={[0, 1.92, 0]} color="#ffd9a0" intensity={4.5} distance={4.8} decay={2} />
      </group>

      {/* north wall sconce — brass half-dome, west end of the north wall
          (clear of the workstation doorway at x11.35-12.65 and the stair
          flight's footprint at x14.65-15.75). Mounted flush on a wall that
          already faces +z into the room, so no group rotation is needed —
          the shade/light still nest at the fixture's own local origin,
          same rotation-safe construction as every other sconce in the
          house (StairsApproach/Genkan/Roof), just with an identity
          rotation this time. */}
      <group position={[9.5, 0, 0.04]}>
        <mesh position={[0, 2.15, -0.02]}>
          <boxGeometry args={[0.1, 0.05, 0.06]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        <mesh position={[0, 2.15, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.11, 0.14, 8, 1, true]} />
          <meshStandardMaterial color="#ffcf8f" emissive="#ffcf8f" emissiveIntensity={0.8} side={2} />
        </mesh>
        <pointLight position={[0, 2.15, 0.05]} color="#ffcf8f" intensity={4} distance={3.8} decay={2} />
      </group>
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
