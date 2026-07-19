"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { usePixelTexture } from "../usePixelTexture";

const WALL_H = 2.8; // must match House.tsx
export const BEDROOM = { x: 0, z: 0, w: 8, d: 6 };

/* ── furniture colliders (Task 3, layout.ts `// bedroom` section, verbatim)
   — every mesh in the furniture section below derives its position from
   these rect constants; the plan mandates no re-hardcoding a collider's
   numbers into a mesh position. ── */
const BED_RECT = { x: 0.35, z: 2.5, w: 2.1, d: 1.7 };
const NIGHTSTAND_RECT = { x: 0.35, z: 1.85, w: 0.55, d: 0.5 };
const PLANT_RECT = { x: 0.45, z: 5.1, w: 0.4, d: 0.4 };
const DRESSER_RECT = { x: 2.8, z: 0.3, w: 1.6, d: 0.55 };
const DRAGONSLAYER_RECT = { x: 5.6, z: 0.32, w: 0.85, d: 0.5 }; // lean-zone, not a furniture footprint

const BED_CENTER = { x: BED_RECT.x + BED_RECT.w / 2, z: BED_RECT.z + BED_RECT.d / 2 };
const NIGHTSTAND_CENTER = {
  x: NIGHTSTAND_RECT.x + NIGHTSTAND_RECT.w / 2,
  z: NIGHTSTAND_RECT.z + NIGHTSTAND_RECT.d / 2,
};
const PLANT_CENTER = { x: PLANT_RECT.x + PLANT_RECT.w / 2, z: PLANT_RECT.z + PLANT_RECT.d / 2 };
const DRESSER_CENTER = {
  x: DRESSER_RECT.x + DRESSER_RECT.w / 2,
  z: DRESSER_RECT.z + DRESSER_RECT.d / 2,
};

// bed — local-space layout (relative to BED_CENTER, +x toward the foot).
// Headboard sits flush on the rect's west edge (local x = -BED_HALF_W),
// i.e. world x = BED_RECT.x — the task-7 window mounts on that same wall
// face with sill y=1.0, so the headboard top is capped under it.
const BED_HALF_W = BED_RECT.w / 2;
const BED_HEAD_T = 0.09; // headboard slab thickness
const BED_HEAD_H = 0.86; // stays clear of the window sill (1.0)
const BED_HEAD_X = -BED_HALF_W + BED_HEAD_T / 2;
const BED_HB_EAST = -BED_HALF_W + BED_HEAD_T; // headboard's room-facing face
const BED_FRAME_H = 0.24;
const BED_FRAME_LEN = BED_RECT.w - BED_HEAD_T; // frame runs headboard→foot
const BED_FRAME_X = -BED_HALF_W + BED_HEAD_T + BED_FRAME_LEN / 2;
const BED_MATT_H = 0.2;
const BED_MATT_INSET = 0.03; // mattress reveal past the frame, each side
const BED_MATT_LEN = BED_FRAME_LEN - BED_MATT_INSET * 2;
const BED_MATT_TOP_Y = BED_FRAME_H + BED_MATT_H; // mattress top surface
const BED_PILLOW_W = 0.26;
const BED_PILLOW_D = 0.7;
const BED_PILLOW_H = 0.11;
const BED_PILLOW_X = BED_HB_EAST + 0.05 + BED_PILLOW_W / 2;
const BED_PILLOW_Z = BED_PILLOW_D / 2 + 0.03;
const BED_DUVET_OVERHANG = 0.035; // brief: 3-4cm overhang each side
const BED_DUVET_H = 0.05;
const BED_DUVET_X0 = BED_PILLOW_X + BED_PILLOW_W / 2 + 0.04; // west edge
const BED_DUVET_X1 = BED_HALF_W + BED_DUVET_OVERHANG; // overhangs the foot
const BED_DUVET_LEN = BED_DUVET_X1 - BED_DUVET_X0;
const BED_DUVET_X = (BED_DUVET_X0 + BED_DUVET_X1) / 2;
const BED_DUVET_Z = BED_RECT.d + BED_DUVET_OVERHANG * 2;

// nightstand + bedside lamp — all lamp heights stack off the nightstand's
// actual top surface (NS_TOP_Y), never a hand-guessed y.
const NS_BODY_H = 0.46;
const NS_TOP_T = 0.03;
const NS_TOP_Y = NS_BODY_H + NS_TOP_T; // top surface, world y = 0.49
const LAMP_BASE_H = 0.025;
const LAMP_NECK_H = 0.16;
const LAMP_SHADE_H = 0.15;
const LAMP_BASE_Y = NS_TOP_Y + LAMP_BASE_H / 2;
const LAMP_NECK_Y = NS_TOP_Y + LAMP_BASE_H + LAMP_NECK_H / 2;
const LAMP_SHADE_Y = NS_TOP_Y + LAMP_BASE_H + LAMP_NECK_H + LAMP_SHADE_H / 2 + 0.005;

// west window (Task 7) — surface-mounted unit on the west wall's interior
// face (x = R.x + 0.011, same plane as the wallW mesh). Sill (y=1.0) sits
// 0.14m above the headboard top (BED_HEAD_H=0.86) — same wall, same
// z-band as the bed, confirmed clear (see task-7 report for the table).
const WIN_Z0 = 2.55;
const WIN_Z1 = 3.95;
const WIN_W = WIN_Z1 - WIN_Z0; // 1.4
const WIN_ZC = (WIN_Z0 + WIN_Z1) / 2; // 3.25
const WIN_SILL_Y = 1.0;
const WIN_TOP_Y = 2.3;
const WIN_H = WIN_TOP_Y - WIN_SILL_Y; // 1.3
const WIN_YC = (WIN_SILL_Y + WIN_TOP_Y) / 2; // 1.65

// stack, +x outward from the wall plane (x = R.x + 0.011) — each layer
// ≥6mm clear of the previous (wall → frame → glass → curtain).
const WIN_FRAME_RAIL_T = 0.06; // jamb/rail thickness
const WIN_FRAME_NEAR_X = 0.02; // 9mm off the wall (0.02 - 0.011)
const WIN_FRAME_DEPTH = 0.05;
const WIN_FRAME_FAR_X = WIN_FRAME_NEAR_X + WIN_FRAME_DEPTH; // 0.07
const WIN_FRAME_CX = WIN_FRAME_NEAR_X + WIN_FRAME_DEPTH / 2; // 0.045
const WIN_GLASS_X = WIN_FRAME_FAR_X + 0.01; // 0.08 — 10mm off the frame's far face
const WIN_CURTAIN_X = WIN_GLASS_X + 0.012; // 0.092 — 12mm off the glass
const WIN_ROD_X = WIN_CURTAIN_X + 0.003; // same "curtain" layer as the fabric, just proud of it

// glass opening (inset inside the jambs/rails)
const WIN_GLASS_Z0 = WIN_Z0 + WIN_FRAME_RAIL_T;
const WIN_GLASS_Z1 = WIN_Z1 - WIN_FRAME_RAIL_T;
const WIN_GLASS_W = WIN_GLASS_Z1 - WIN_GLASS_Z0; // 1.28
const WIN_GLASS_Y0 = WIN_SILL_Y + WIN_FRAME_RAIL_T;
const WIN_GLASS_Y1 = WIN_TOP_Y - WIN_FRAME_RAIL_T;
const WIN_GLASS_H = WIN_GLASS_Y1 - WIN_GLASS_Y0; // 1.18

// curtain — covers ~40% of the window width, hung from the west (Z0) side;
// top/bottom pulled in 2cm from the rail/sill so it can't clip the frame.
const WIN_CURTAIN_W = WIN_W * 0.4; // 0.56
const WIN_CURTAIN_TOP = WIN_TOP_Y - 0.02; // 2.28
const WIN_CURTAIN_BOT = WIN_SILL_Y + 0.02; // 1.02
const WIN_CURTAIN_H = WIN_CURTAIN_TOP - WIN_CURTAIN_BOT; // 1.26
const WIN_CURTAIN_YC = (WIN_CURTAIN_TOP + WIN_CURTAIN_BOT) / 2; // 1.65
const WIN_CURTAIN_ZC = WIN_Z0 + WIN_CURTAIN_W / 2;

// faux moon floor patch — stays clear of the rug (mesh below, centered
// 2.9,3.9, half-extents 1.2×0.85 → rug's x-range starts at 1.7). Patch's
// x max (1.3) sits 0.4m short of that, so no z-fight risk at y=0.04.
const MOON_PATCH_X = 0.65;
const MOON_PATCH_W = 1.3;
const MOON_PATCH_D = 1.7;

// manga dresser (Task 8) — waist-high 2×2 drawer cabinet, cabinet-wood
// texture family. Top surface (DR_TOP_Y) is where every clutter item's y
// stacks from, same convention as NS_TOP_Y for the nightstand lamp.
const DR_BODY_H = 0.72;
const DR_TOP_T = 0.03;
const DR_TOP_Y = DR_BODY_H + DR_TOP_T; // 0.75
const DR_DRAWER_COL_X = 0.39; // ± column offset, 2 columns across the 1.6m width
const DR_DRAWER_ROW_Y = [DR_BODY_H * 0.28, DR_BODY_H * 0.72]; // bottom/top row centers
const DR_DRAWER_W = 0.68;
const DR_DRAWER_H = 0.26;
const DR_PANEL_Z = DRESSER_RECT.d / 2 - 0.03; // recessed 3cm off the south (room-facing) face
const DR_KNOB_Z = DRESSER_RECT.d / 2 - 0.008;

// spine-band palette for the manga stack — abstract color only, no titles.
const MANGA_COLORS = ["#4a3a8a", "#2e6e54", "#b3475f", "#c9a06a", "#3a5a8a", "#7a4a9e"];

// dragonslayer (Task 8) — leans against the north wall inside the lean
// zone. DS_BASE is deliberately NOT the rect center: it's biased toward the
// zone's near (wall-side) edge so the ~12°-tilted blade reads as leaning
// back onto the wall rather than floating mid-room. See task-8 report for
// the corner-clearance arithmetic that confirms the tip still clears the
// wall plane (z≈0.011) by comfortably more than the 6mm minimum.
const DS_BASE_X = DRAGONSLAYER_RECT.x + 0.4; // 6.0
const DS_BASE_Z = DRAGONSLAYER_RECT.z + 0.18; // 0.5
const DS_TILT = -Math.PI * (12 / 180); // -12°; negative rotation.x walks the
// tip toward -z (north wall) under three.js's X-rotation convention
// (z' = y·sinθ + z·cosθ) — see report for the signed derivation.
const DS_POMMEL_H = 0.04;
const DS_GRIP_LEN = 0.16;
const DS_GUARD_H = 0.04;
const DS_HILT_LEN = DS_POMMEL_H + DS_GRIP_LEN + DS_GUARD_H; // 0.24, floor → blade root
const DS_BLADE_LEN = 1.9;
const DS_TOTAL_LEN = DS_HILT_LEN + DS_BLADE_LEN; // 2.14, floor → tip, unrotated
const DS_BLADE_W = 0.28;
const DS_BLADE_THICK = 0.055;
const DS_GUARD_W = 0.4;

/* ── style-gate tuning toggles (temp code, stripped once Rohan picks —
   precedent commits e545fd1/6347c04). Key 1 cycles walls, key 2 cycles
   floors. Both lists start at the owner's current best guess (sand walls,
   walnut floor); keys 1/2 are free again since the workspace strip. ── */
const WALL_VARIANTS = [
  { label: "sand", path: "/3am/tex/wall-sand.png" },
  { label: "sage", path: "/3am/tex/wall-sage.png" },
  { label: "dusk", path: "/3am/tex/wall-dusk.png" },
  { label: "midnight", path: "/3am/tex/wall-midnight.png" },
];
const FLOOR_VARIANTS = [
  // oak (parallel lining) default per Rohan 2026-07-19; walnut on toggle
  { label: "oak", path: "/3am/tex/floor-oak.png" },
  { label: "walnut", path: "/3am/tex/floor-walnut.png" },
];

/**
 * The bedroom — painted surfaces + temp style toggles (task 5 of the
 * bedroom plan). Renders INSIDE the gray-box shell: textured surfaces sit a
 * few cm off House geometry; colliders live in layout.ts. Follows
 * Workspace.tsx's surface section verbatim as the pattern (floor, north
 * wall, divider faces, south stub band, baseboards, shadow traverse), with
 * two differences: the divider this room shares is on its EAST side (x=8,
 * facing west into the room) instead of straddling both sides like
 * Workspace, and this room also owns a full exterior wall (west, x=0) that
 * Workspace never had to paint — the window (task 7) mounts ON that face,
 * so it's left fully painted here, no cutout.
 */
export function Bedroom() {
  const R = BEDROOM;
  const rootRef = useRef<THREE.Group>(null);
  const moonPatchRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    rootRef.current?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, []);

  // faux moon patch (Task 7) must not receive shadows (brief: "receiveShadow
  // false" — a fake light pool getting a real shadow cast across it reads as
  // a bug). The traverse effect above runs first (declared earlier) and
  // blanket-sets every descendant mesh to receiveShadow=true, so re-assert
  // false here, after it, same single-mount-only pattern.
  useEffect(() => {
    if (moonPatchRef.current) moonPatchRef.current.receiveShadow = false;
  }, []);

  const [wallIdx, setWallIdx] = useState(0);
  const [floorIdx, setFloorIdx] = useState(0);
  const wallV = WALL_VARIANTS[wallIdx];
  const floorV = FLOOR_VARIANTS[floorIdx];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Digit1") setWallIdx((i) => (i + 1) % WALL_VARIANTS.length);
      if (e.code === "Digit2") setFloorIdx((i) => (i + 1) % FLOOR_VARIANTS.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const floor = usePixelTexture(floorV.path, R.w, R.d);
  const wallN = usePixelTexture(wallV.path, R.w, WALL_H);
  const wallW = usePixelTexture(wallV.path, R.d, WALL_H); // west exterior wall, full span (window mounts ON this face later)
  const wallSegN = usePixelTexture(wallV.path, 2.2, WALL_H); // east divider, north-of-door segment
  const wallSegS = usePixelTexture(wallV.path, 2.2, WALL_H); // east divider, south-of-door segment
  const wallStub = usePixelTexture(wallV.path, R.w, 0.2, 0, 0.5);
  // duvet — tiled once per meter, same convention as the floor/wall calls
  // above (BED_DUVET_LEN/BED_DUVET_Z are derived from BED_RECT, see consts).
  const quilt = usePixelTexture("/3am/tex/linen-quilt.png", BED_DUVET_LEN, BED_DUVET_Z);
  // rug — single alpha-cutout image (oval shape baked into the PNG), same
  // repeat(1,1) + transparent convention as MusicNook's rugKilim.
  const rugTex = usePixelTexture("/3am/tex/rug-bedroom.png", 1, 1);
  // curtain — tiled once per meter, same convention as quilt/floor/wall.
  const curtainTex = usePixelTexture("/3am/tex/curtain-weave.png", WIN_CURTAIN_W, WIN_CURTAIN_H);
  // dresser cabinet — cabinet-wood texture family, same tile RecordConsole
  // uses for its console body, repeat scaled down for the dresser's size.
  const dresserWood = usePixelTexture("/3am/tex/cabinet-wood.png", 2, 1);

  return (
    <group ref={rootRef}>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[R.x + R.w / 2, 0.02, R.z + R.d / 2]}>
        <planeGeometry args={[R.w, R.d]} />
        <meshStandardMaterial map={floor} />
      </mesh>

      {/* north wall (inner face of the perimeter wall at z=0) */}
      <mesh position={[R.x + R.w / 2, WALL_H / 2, R.z + 0.01]}>
        <planeGeometry args={[R.w, WALL_H]} />
        <meshStandardMaterial map={wallN} />
      </mesh>

      {/* west wall (inner face of the perimeter wall at x=0) — full span,
          no door: window unit (task 7) mounts on this face, so it's left
          fully painted here. +x normal (rotY=π/2) faces into the room. */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[R.x + 0.011, WALL_H / 2, R.z + R.d / 2]}>
        <planeGeometry args={[R.d, WALL_H]} />
        <meshStandardMaterial map={wallW} />
      </mesh>

      {/* east divider face (shared wall with Workspace at x=8), two
          segments flanking the door gap (z 2.2–3.8). Bedroom-facing side
          sits at x≈7.89, -x normal (rotY=-π/2) faces west into this room —
          mirrors Workspace's own west-divider face on its side of x=8. */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[R.x + R.w - 0.11, WALL_H / 2, 1.1]}>
        <planeGeometry args={[2.2, WALL_H]} />
        <meshStandardMaterial map={wallSegN} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[R.x + R.w - 0.11, WALL_H / 2, 4.9]}>
        <planeGeometry args={[2.2, WALL_H]} />
        <meshStandardMaterial map={wallSegS} />
      </mesh>

      {/* south stub band (dollhouse cutaway — House.tsx renders the south
          perimeter wall as a low stub so the camera never gets occluded) */}
      <mesh rotation={[0, Math.PI, 0]} position={[R.x + R.w / 2, 0.275, R.z + R.d - 0.015]}>
        <planeGeometry args={[R.w, 0.55]} />
        <meshStandardMaterial map={wallStub} />
      </mesh>

      {/* baseboards (north, west, both divider segments) */}
      <mesh position={[R.x + R.w / 2, 0.09, R.z + 0.045]}>
        <boxGeometry args={[R.w, 0.18, 0.07]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>
      <mesh position={[R.x + 0.045, 0.09, R.z + R.d / 2]}>
        <boxGeometry args={[0.07, 0.18, R.d]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>
      <mesh position={[R.x + R.w - 0.145, 0.09, 1.1]}>
        <boxGeometry args={[0.07, 0.18, 2.2]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>
      <mesh position={[R.x + R.w - 0.145, 0.09, 4.9]}>
        <boxGeometry args={[0.07, 0.18, 2.2]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>

      {/* ── west window (Task 7) — surface-mounted night-window unit on the
          wall's interior face (x = R.x + 0.011). +x outward stack: wall →
          frame → jamb far face → glass → curtain, each ≥6mm clear (see
          task-7 report table). Sits directly above the bed headboard
          (top 0.86) with a 14cm clear gap to the sill (1.0) — same wall
          face, same z-band, non-overlapping by construction. The glass is
          an emissive SURFACE only (moon ≤0.8 intensity, tiny star dots,
          Bloom threshold 0.6) — zero new lights, no-invisible-lights rule
          stays intact. ── */}
      {/* frame — dark wood border box set: two jambs + top rail + inner
          sill trim, all WIN_FRAME_DEPTH deep, centered on WIN_FRAME_CX */}
      <mesh position={[R.x + WIN_FRAME_CX, WIN_YC, R.z + WIN_Z0 + WIN_FRAME_RAIL_T / 2]}>
        <boxGeometry args={[WIN_FRAME_DEPTH, WIN_H, WIN_FRAME_RAIL_T]} />
        <meshStandardMaterial color="#3a2a1e" />
      </mesh>
      <mesh position={[R.x + WIN_FRAME_CX, WIN_YC, R.z + WIN_Z1 - WIN_FRAME_RAIL_T / 2]}>
        <boxGeometry args={[WIN_FRAME_DEPTH, WIN_H, WIN_FRAME_RAIL_T]} />
        <meshStandardMaterial color="#3a2a1e" />
      </mesh>
      <mesh position={[R.x + WIN_FRAME_CX, WIN_TOP_Y - WIN_FRAME_RAIL_T / 2, R.z + WIN_ZC]}>
        <boxGeometry args={[WIN_FRAME_DEPTH, WIN_FRAME_RAIL_T, WIN_W]} />
        <meshStandardMaterial color="#3a2a1e" />
      </mesh>
      <mesh position={[R.x + WIN_FRAME_CX, WIN_SILL_Y + WIN_FRAME_RAIL_T / 2, R.z + WIN_ZC]}>
        <boxGeometry args={[WIN_FRAME_DEPTH, WIN_FRAME_RAIL_T, WIN_W]} />
        <meshStandardMaterial color="#3a2a1e" />
      </mesh>

      {/* protruding sill ledge — top surface flush at WIN_SILL_Y, sticks
          out past the frame's far face (0.07) for a real windowsill read */}
      <mesh position={[R.x + 0.06, WIN_SILL_Y - 0.015, R.z + WIN_ZC]}>
        <boxGeometry args={[0.1, 0.03, WIN_W + 0.1]} />
        <meshStandardMaterial color="#2e2116" />
      </mesh>

      {/* glass — night-sky base plane (flat unlit color, no texture) plus
          a tiny emissive moon disc and 3 star dots layered a sub-mm in
          front to dodge z-fighting (not a new stack layer — see report).
          moon emissiveIntensity 0.7 (≤0.8 ceiling); stars 0.55, radius
          0.008 — tiny enough that neither clips under Bloom (thresh 0.6). */}
      <mesh position={[R.x + WIN_GLASS_X, WIN_YC, R.z + WIN_ZC]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[WIN_GLASS_W, WIN_GLASS_H]} />
        <meshBasicMaterial color="#101830" />
      </mesh>
      <mesh
        position={[R.x + WIN_GLASS_X + 0.002, 1.95, R.z + 3.65]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <circleGeometry args={[0.11, 20]} />
        <meshStandardMaterial color="#dfe6ff" emissive="#dfe6ff" emissiveIntensity={0.7} />
      </mesh>
      {[
        { y: 1.85, z: 2.75 },
        { y: 2.1, z: 2.9 },
        { y: 1.75, z: 3.35 },
      ].map(({ y, z }) => (
        <mesh
          key={`star-${y}-${z}`}
          position={[R.x + WIN_GLASS_X + 0.002, y, R.z + z]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <circleGeometry args={[0.008, 8]} />
          <meshStandardMaterial color="#f0f4ff" emissive="#f0f4ff" emissiveIntensity={0.55} />
        </mesh>
      ))}

      {/* curtain rod — thin bar above the frame top, slight overhang past
          the jambs each side */}
      <mesh
        position={[R.x + WIN_ROD_X, WIN_TOP_Y + 0.06, R.z + WIN_ZC]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.012, 0.012, WIN_W + 0.2, 8]} />
        <meshStandardMaterial color="#2e2a4d" />
      </mesh>

      {/* curtain — curtain-weave texture, hung from the rod covering ~40%
          of the window from the west side. Small added z-rotation on top
          of the wall-facing y-rotation so it reads as hanging fabric, not
          a flat board. transparent:false per brief — a solid drape, not a
          cutout like the rug. */}
      <mesh
        position={[R.x + WIN_CURTAIN_X, WIN_CURTAIN_YC, R.z + WIN_CURTAIN_ZC]}
        rotation={[0, Math.PI / 2, 0.05]}
      >
        <planeGeometry args={[WIN_CURTAIN_W, WIN_CURTAIN_H]} />
        <meshStandardMaterial map={curtainTex} transparent={false} side={2} />
      </mesh>

      {/* faux moon floor patch — barely-visible cool overlay sloping from
          the window into the room. Zero lights added (fake light pool
          only); stays clear of the rug in x (see MOON_PATCH_W comment
          above), so no z-fight risk at y=0.04. receiveShadow re-forced
          false in the effect above (mount traverse otherwise flips every
          descendant mesh back to true). Delete this one mesh if it reads
          wrong at the gate. */}
      <mesh
        ref={moonPatchRef}
        name="moon-floor-patch"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[R.x + MOON_PATCH_X, 0.04, R.z + WIN_ZC]}
        receiveShadow={false}
      >
        <planeGeometry args={[MOON_PATCH_W, MOON_PATCH_D]} />
        <meshBasicMaterial color="#26304d" transparent opacity={0.18} />
      </mesh>

      {/* ── bed — collider {0.35,2.5,2.1,1.7}. Low walnut-family frame,
          headboard flush on the west wall face (local x = -BED_HALF_W,
          world x = BED_RECT.x), top capped at 0.86 to clear the task-7
          window sill (1.0) that lands on the same wall face, same z-band.
          linen-quilt duvet overhangs the frame 3.5cm each side + a rolled
          fold-back band where the pillows peek out. No emissive anywhere
          in this group (Bloom threshold 0.6 — see brief). ── */}
      <group position={[BED_CENTER.x, 0, BED_CENTER.z]}>
        {/* headboard slab */}
        <mesh position={[BED_HEAD_X, BED_HEAD_H / 2, 0]}>
          <boxGeometry args={[BED_HEAD_T, BED_HEAD_H, BED_RECT.d]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>

        {/* low frame */}
        <mesh position={[BED_FRAME_X, BED_FRAME_H / 2, 0]}>
          <boxGeometry args={[BED_FRAME_LEN, BED_FRAME_H, BED_RECT.d]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>

        {/* mattress box */}
        <mesh position={[BED_FRAME_X, BED_FRAME_H + BED_MATT_H / 2, 0]}>
          <boxGeometry
            args={[BED_MATT_LEN, BED_MATT_H, BED_RECT.d - BED_MATT_INSET * 2]}
          />
          <meshStandardMaterial color="#e8e2d3" />
        </mesh>

        {/* two pillows, slight random yaw */}
        {[
          { z: BED_PILLOW_Z, yaw: 0.06 },
          { z: -BED_PILLOW_Z, yaw: -0.05 },
        ].map(({ z, yaw }) => (
          <mesh
            key={z}
            position={[BED_PILLOW_X, BED_MATT_TOP_Y + BED_PILLOW_H / 2, z]}
            rotation={[0, yaw, 0]}
          >
            <boxGeometry args={[BED_PILLOW_W, BED_PILLOW_H, BED_PILLOW_D]} />
            <meshStandardMaterial color="#f0e9da" />
          </mesh>
        ))}

        {/* rolled fold-back band — where the duvet turns down before the
            pillows; solid cream (no texture distortion on the cylinder) */}
        <mesh
          position={[BED_DUVET_X0, BED_MATT_TOP_Y + 0.05, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.05, 0.05, BED_DUVET_Z - 0.05, 10]} />
          <meshStandardMaterial color="#e8ddc4" />
        </mesh>

        {/* duvet slab, linen-quilt texture, overhangs frame + foot */}
        <mesh position={[BED_DUVET_X, BED_MATT_TOP_Y + BED_DUVET_H / 2, 0]}>
          <boxGeometry args={[BED_DUVET_LEN, BED_DUVET_H, BED_DUVET_Z]} />
          <meshStandardMaterial map={quilt} />
        </mesh>
      </group>

      {/* ── nightstand + bedside lamp — collider {0.35,1.85,0.55,0.5}, north
          of the bed head. Two-tone cabinet (dark body / warm top slab) with
          one recessed drawer + knob. The lamp is the room's hero light: the
          pointLight is nested INSIDE the shade group at the bulb position
          (local [0,0,0]), so it inherits the shade's world transform by
          construction — same rotation-safe pattern as House.tsx's stairwell
          sconce, avoiding the hand-computed-world-position fixture-offset
          bug that shipped twice in P3. No castShadow (fixture-attached
          point light, matches every other bedside/table lamp in the
          house). ── */}
      <group position={[NIGHTSTAND_CENTER.x, 0, NIGHTSTAND_CENTER.z]}>
        {/* body */}
        <mesh position={[0, NS_BODY_H / 2, 0]}>
          <boxGeometry
            args={[NIGHTSTAND_RECT.w - 0.04, NS_BODY_H, NIGHTSTAND_RECT.d - 0.04]}
          />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        {/* top slab — lighter walnut tone, slight overhang. Top face lands
            exactly at NS_TOP_Y (= NS_BODY_H + NS_TOP_T). */}
        <mesh position={[0, NS_BODY_H + NS_TOP_T / 2, 0]}>
          <boxGeometry args={[NIGHTSTAND_RECT.w, NS_TOP_T, NIGHTSTAND_RECT.d]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {/* drawer front — recessed panel + knob, east (room-facing) face */}
        <mesh position={[NIGHTSTAND_RECT.w / 2 - 0.03, NS_BODY_H * 0.54, 0]}>
          <boxGeometry args={[0.02, 0.19, 0.32]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[NIGHTSTAND_RECT.w / 2 - 0.008, NS_BODY_H * 0.54, 0]}>
          <sphereGeometry args={[0.014, 8, 6]} />
          <meshStandardMaterial color="#c9a06a" />
        </mesh>

        {/* bedside lamp — base + neck stack off NS_TOP_Y (the nightstand's
            actual top face, not a guessed constant) */}
        <group position={[0.02, 0, -0.06]}>
          <mesh position={[0, LAMP_BASE_Y, 0]}>
            <cylinderGeometry args={[0.05, 0.055, LAMP_BASE_H, 10]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, LAMP_NECK_Y, 0]}>
            <cylinderGeometry args={[0.012, 0.012, LAMP_NECK_H, 8]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          {/* shade group — the fixture; pointLight lives INSIDE it at the
              bulb position so it moves/rotates with the shade by
              construction (rotation-safe, no hand-computed world coords) */}
          <group position={[0, LAMP_SHADE_Y, 0]}>
            <mesh>
              <cylinderGeometry args={[0.075, 0.1, LAMP_SHADE_H, 10, 1, true]} />
              <meshStandardMaterial color="#f2c98a" side={2} />
            </mesh>
            <pointLight color="#ffcf9e" intensity={7} distance={4.5} decay={2} />
          </group>
        </group>
      </group>

      {/* ── manga dresser — collider {2.8,0.3,1.6,0.55}. Waist-high 2×2
          drawer cabinet, cabinet-wood texture, east of the nightstand along
          the north wall. Back face sits at world z=DRESSER_RECT.z=0.3,
          ~0.29m clear of the north wall plane (z≈0.011) — comfortably past
          the 6mm minimum. Clutter on top (DR_TOP_Y=0.75) is asymmetric: the
          manga stack anchors the west/back corner, figurines and the cactus
          step east and toward the room, reading toward the southeast where
          the about-station camera frames this piece
          ([5.4,3.3,3.2] → [3.0,1.35,0.4]). No real titles, logos, or IP
          anywhere — spine color is an abstract band only. ── */}
      <group position={[DRESSER_CENTER.x, 0, DRESSER_CENTER.z]}>
        {/* body */}
        <mesh position={[0, DR_BODY_H / 2, 0]}>
          <boxGeometry args={[DRESSER_RECT.w - 0.04, DR_BODY_H, DRESSER_RECT.d - 0.04]} />
          <meshStandardMaterial map={dresserWood} />
        </mesh>
        {/* top slab */}
        <mesh position={[0, DR_BODY_H + DR_TOP_T / 2, 0]}>
          <boxGeometry args={[DRESSER_RECT.w, DR_TOP_T, DRESSER_RECT.d]} />
          <meshStandardMaterial map={dresserWood} />
        </mesh>

        {/* 2×2 drawer faces + knobs, south (room-facing) side — recessed
            panel + knob pattern matches the nightstand's single drawer */}
        {DR_DRAWER_ROW_Y.map((rowY) =>
          [-DR_DRAWER_COL_X, DR_DRAWER_COL_X].map((colX) => (
            <group key={`drawer-${rowY}-${colX}`}>
              <mesh position={[colX, rowY, DR_PANEL_Z]}>
                <boxGeometry args={[DR_DRAWER_W, DR_DRAWER_H, 0.02]} />
                <meshStandardMaterial color="#2e2a4d" />
              </mesh>
              <mesh position={[colX, rowY, DR_KNOB_Z]}>
                <sphereGeometry args={[0.016, 8, 6]} />
                <meshStandardMaterial color="#c9a06a" />
              </mesh>
            </group>
          ))
        )}

        {/* manga stack — 5 volumes lying flat + 1 leaning upright, spines
            (south face) reading as abstract color bands only. Slight
            per-volume jitter so the stack reads lived-in, not laser-aligned. */}
        <group position={[-0.35, DR_TOP_Y, -0.03]}>
          {MANGA_COLORS.map((color, i) => (
            <mesh
              key={color}
              position={[((i % 3) - 1) * 0.012, 0.008 + i * 0.017, ((i % 2) - 0.5) * 0.02]}
              rotation={[0, ((i % 3) - 1) * 0.04, 0]}
            >
              <boxGeometry args={[0.125, 0.016, 0.178]} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}
          {/* one volume standing, leaning on the stack's east side */}
          <mesh position={[0.11, 0.1, 0.02]} rotation={[0, 0.1, -0.42]}>
            <boxGeometry args={[0.016, 0.178, 0.125]} />
            <meshStandardMaterial color="#c9784a" />
          </mesh>
        </group>

        {/* humanoid figurine — chunky blocky silhouette, ~12cm, distinct
            two-tone body/head so it doesn't read as a monolith */}
        <group position={[0.12, DR_TOP_Y, 0.04]}>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.05, 0.08, 0.035]} />
            <meshStandardMaterial color="#57b6e8" />
          </mesh>
          <mesh position={[0, 0.095, 0]}>
            <boxGeometry args={[0.04, 0.035, 0.04]} />
            <meshStandardMaterial color="#f0e0c8" />
          </mesh>
          <mesh position={[0, 0.006, 0]}>
            <boxGeometry args={[0.052, 0.014, 0.037]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
        </group>

        {/* round critter figurine — sphere body + ear nubs, silhouette
            unmistakably different from the humanoid alongside it */}
        <group position={[0.32, DR_TOP_Y, 0.07]}>
          <mesh position={[0, 0.04, 0]}>
            <sphereGeometry args={[0.042, 10, 8]} />
            <meshStandardMaterial color="#f2b84a" />
          </mesh>
          {[-0.022, 0.022].map((ex) => (
            <mesh key={ex} position={[ex, 0.075, 0.01]}>
              <sphereGeometry args={[0.012, 6, 5]} />
              <meshStandardMaterial color="#f2b84a" />
            </mesh>
          ))}
          <mesh position={[0, 0.035, 0.04]}>
            <sphereGeometry args={[0.006, 5, 4]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
        </group>

        {/* tiny cactus — terracotta pot, matching the house's established
            cactus/snake-plant pot color (see corner-plant comment below) */}
        <group position={[0.58, DR_TOP_Y, -0.06]}>
          <mesh position={[0, 0.015, 0]}>
            <cylinderGeometry args={[0.022, 0.018, 0.03, 8]} />
            <meshStandardMaterial color="#a04b3a" />
          </mesh>
          <mesh position={[0, 0.05, 0]} scale={[1, 1.15, 1]}>
            <sphereGeometry args={[0.024, 8, 6]} />
            <meshStandardMaterial color="#3f8f5a" />
          </mesh>
        </group>
      </group>

      {/* ── the dragonslayer — lean zone {5.6,0.32,0.85,0.5}, no collider
          footprint of its own (it's a wall-leaning prop, not a walk-into
          obstacle). Deliberately oversized Berserk-slab silhouette: a
          1.9m×0.28m×5.5cm iron slab on a simple hilt, tilted 12° off
          vertical so the tip leans back toward the north wall (z≈0.011)
          without clipping it — see task-8 report for the corner-clearance
          math. Flat iron grays + one lighter edge-highlight strip; no
          emissive anywhere (Bloom threshold 0.6 stays intact). NO
          interaction this task — the eclipse wires it up later. ── */}
      <group position={[DS_BASE_X, 0, DS_BASE_Z]} rotation={[DS_TILT, 0, 0]}>
        {/* pommel cap */}
        <mesh position={[0, DS_POMMEL_H / 2, 0]}>
          <cylinderGeometry args={[0.028, 0.022, DS_POMMEL_H, 8]} />
          <meshStandardMaterial color="#3a2a1e" />
        </mesh>
        {/* wrapped grip */}
        <mesh position={[0, DS_POMMEL_H + DS_GRIP_LEN / 2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, DS_GRIP_LEN, 8]} />
          <meshStandardMaterial color="#3a2a1e" />
        </mesh>
        {[0.06, 0.12, 0.18].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <cylinderGeometry args={[0.023, 0.023, 0.012, 8]} />
            <meshStandardMaterial color="#221a14" />
          </mesh>
        ))}
        {/* simple crossguard */}
        <mesh position={[0, DS_POMMEL_H + DS_GRIP_LEN + DS_GUARD_H / 2, 0]}>
          <boxGeometry args={[DS_GUARD_W, DS_GUARD_H, 0.07]} />
          <meshStandardMaterial color="#4a4a52" />
        </mesh>
        {/* the slab blade — flat iron gray, thick */}
        <mesh position={[0, DS_HILT_LEN + DS_BLADE_LEN / 2, 0]}>
          <boxGeometry args={[DS_BLADE_W, DS_BLADE_LEN, DS_BLADE_THICK]} />
          <meshStandardMaterial color="#7d7d88" />
        </mesh>
        {/* edge highlight band, one long edge, sat proud of the flat face */}
        <mesh
          position={[DS_BLADE_W / 2 - 0.02, DS_HILT_LEN + DS_BLADE_LEN / 2, 0]}
        >
          <boxGeometry args={[0.03, DS_BLADE_LEN - 0.04, DS_BLADE_THICK + 0.004]} />
          <meshStandardMaterial color="#c7c7d4" />
        </mesh>
      </group>

      {/* floor contact shadow — dark oval decal, NOT nested in the tilted
          sword group above (it must stay flat on the floor). Offset slightly
          toward the wall from the base point since the blade's mass leans
          that way. */}
      {/* eclipse trigger lands here (plan 8) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[DS_BASE_X, 0.036, DS_BASE_Z - 0.05]}
      >
        <planeGeometry args={[0.5, 0.35]} />
        <meshBasicMaterial color="#0a0a0f" transparent opacity={0.3} />
      </mesh>

      {/* ── rug (no collider — visual only, walkable) — rug-bedroom is a
          single alpha-cutout oval image, same repeat(1,1) + transparent
          convention as MusicNook's kilim rug. Centered under the foot-of-bed
          walkway, per brief. ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.9, 0.035, 3.9]}>
        <planeGeometry args={[2.4, 1.7]} />
        <meshStandardMaterial map={rugTex} transparent />
      </mesh>

      {/* ── corner plant — collider {0.45,5.1,0.4,0.4}. MusicNook's
          potted-plant idiom (pot cylinder + leaf blades), pot color
          "#55677a" (slate blue-gray) — distinct from every other pot in the
          house (snake plant / cactus / staircase use terracotta "#a04b3a";
          pothos + shelf vine pots use tan "#c9b088"). ── */}
      <group position={[PLANT_CENTER.x, 0, PLANT_CENTER.z]}>
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.14, 0.1, 0.26, 8]} />
          <meshStandardMaterial color="#55677a" />
        </mesh>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 + 0.4;
          const h = 0.34 + (i % 2) * 0.14;
          const r = 0.03 + (i % 2) * 0.02;
          return (
            <mesh
              key={i}
              position={[Math.sin(a) * r, 0.26 + h / 2, Math.cos(a) * r]}
              rotation={[((i % 2) - 0.5) * 0.15, a, 0.12]}
            >
              <boxGeometry args={[0.06, h, 0.02]} />
              <meshStandardMaterial color={i % 2 ? "#3f8f5a" : "#2e6e54"} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
