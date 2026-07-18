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

const BED_CENTER = { x: BED_RECT.x + BED_RECT.w / 2, z: BED_RECT.z + BED_RECT.d / 2 };
const NIGHTSTAND_CENTER = {
  x: NIGHTSTAND_RECT.x + NIGHTSTAND_RECT.w / 2,
  z: NIGHTSTAND_RECT.z + NIGHTSTAND_RECT.d / 2,
};
const PLANT_CENTER = { x: PLANT_RECT.x + PLANT_RECT.w / 2, z: PLANT_RECT.z + PLANT_RECT.d / 2 };

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
  { label: "walnut", path: "/3am/tex/floor-walnut.png" },
  { label: "oak", path: "/3am/tex/floor-oak.png" },
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

  useEffect(() => {
    rootRef.current?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
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
