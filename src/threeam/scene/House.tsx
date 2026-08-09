"use client";

import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import type { Group } from "three";
import { useThreeAm } from "@/threeam/state/store";
import {
  HOUSE,
  WORKSTATION_ROOM,
  WS_DOOR_LO,
  WS_DOOR_HI,
  GENKAN_DOOR_LO,
  GENKAN_DOOR_HI,
  STAIR_ROOM,
} from "@/threeam/world/layout";
import type { Rect, RoomId } from "@/threeam/world/layout";
import {
  isBandVisible,
  BEDROOM_WORKSPACE_BOUNDARY,
  WORKSPACE_MUSIC_BOUNDARY,
  GENKAN_BAND,
  type RoomBand,
} from "@/threeam/world/runtime";
import { usePixelTexture } from "./usePixelTexture";
import { Workstation } from "./rooms/Workstation";
import { Genkan } from "./rooms/Genkan";
import { Roof } from "./rooms/Roof";
import { VerticalDoorFrame, HorizontalDoorFrame } from "./rooms/CommonArea";

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

/** A floor plane sized to a rect. Factored out of House() so the ground
 *  floor can be split into 3 per-room slabs (see StructureBand) while roof
 *  keeps a single full-bounds slab, both sharing one implementation. */
function FloorSlab({ rect }: { rect: Rect }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[rect.x + rect.w / 2, 0, rect.z + rect.d / 2]}
      receiveShadow
    >
      <planeGeometry args={[rect.w, rect.d]} />
      <meshStandardMaterial color="#3f3560" />
    </mesh>
  );
}

/**
 * Gates a chunk of House's structural shell (a room's floor slab, its
 * skeleton walls, or the stairs) to the ground-floor room band(s) it
 * belongs to — reads the SAME `visibleBands` Scene's RoomCull reads (see
 * runtime.ts), so structure and content can never disagree about which
 * rooms are visible. `bands === null` means "always visible" (used for
 * roof, which is a single room with no per-room culling). A tagged rect
 * shows as soon as ANY of its bands is visible — so a rect spanning TWO
 * bands (a shared divider wall between two rooms, tagged via
 * `overlappingBands` below) renders whenever either neighbour is current OR
 * approaching, same as a single-band rect renders when its one band is
 * current or approaching. Never leaves a gap while a room that needs it is
 * showing.
 */
function StructureBand({
  bands,
  children,
}: {
  bands: RoomBand[] | null;
  children: React.ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current || !bands) return;
    ref.current.visible = bands.some(isBandVisible);
  });
  return <group ref={ref}>{children}</group>;
}

/** Which room band(s) a rect's x-extent touches — used to tag House's
 *  structural rects (floor slabs, skeleton walls) with the band(s) that
 *  should show them. A rect that straddles a boundary (the short 0.2m-wide
 *  divider walls at x≈8/x≈16) belongs to BOTH neighbouring bands, so it
 *  keeps rendering for whichever one is current — no gap when a shared
 *  wall vanishes mid-room. A rect that spans multiple bands entirely (the
 *  old single-mesh perimeter walls/floor) isn't handled here — those are
 *  geometrically SPLIT into one rect per band instead (see the floor/
 *  perimeter rendering below), since tagging a single all-spanning mesh
 *  with every band would make it permanently visible. */
function overlappingBands(rect: Rect): RoomBand[] {
  const bands: RoomBand[] = [];
  if (rect.x < BEDROOM_WORKSPACE_BOUNDARY) bands.push(0);
  if (rect.x + rect.w > BEDROOM_WORKSPACE_BOUNDARY && rect.x < WORKSPACE_MUSIC_BOUNDARY) {
    bands.push(1);
  }
  if (rect.x + rect.w > WORKSPACE_MUSIC_BOUNDARY) bands.push(2);
  return bands;
}

/**
 * Dollhouse cutaway: the camera-side (south) wall renders as a low stub so
 * the character is never occluded. Collision still uses the full wall.
 */
const SOUTH_STUB_H = 0.55;

/**
 * T8 finale (owner correction, post-item-11): splits an x-span into 1-2
 * segments around an optional door gap, so a wall strip that happens to
 * share its z-band with a doorway doesn't render solid straight across the
 * opening. Bug this fixes: the ns-band loop below draws band 1's own
 * north/south walls as ONE continuous box across its whole x8-16 span —
 * that span happens to also be the z-band both the workstation door
 * (north, WS_DOOR_LO/HI) and the genkan inner door (south, GENKAN_DOOR_LO/
 * HI) sit in, so both doorways rendered fully blocked (confirmed live: a
 * scene-graph query found a single w=8 h=2.8 box dead-center on the
 * workstation door, and a screenshot showed a solid knee-high bar across
 * the genkan doorway) — "walking into a wall" wasn't just a lighting
 * problem, the opening had no visual gap at all. Every OTHER wall in the
 * house that crosses a door gap (the x=8/x=16 dividers, WS_WALL_LO/HI,
 * GK_WALL_LO/HI, SR_WALL_S_LO/HI) is already pre-split into two rects in
 * layout.ts or derived from live wall data — this is the one spot that
 * synthesizes a single un-split rect per band. If the gap doesn't actually
 * fall inside [x0,x1) (bands 0/2, which have no doors on their own north/
 * south edges), returns the whole span unsplit — same as before.
 */
function splitByGap(
  x0: number,
  x1: number,
  gapLo: number | null,
  gapHi: number | null
): [number, number][] {
  if (gapLo === null || gapHi === null || gapHi <= x0 || gapLo >= x1) return [[x0, x1]];
  const segs: [number, number][] = [];
  if (gapLo > x0) segs.push([x0, gapLo]);
  if (gapHi < x1) segs.push([gapHi, x1]);
  return segs;
}

/**
 * True for an `a.walls` rect that is the SOUTH-facing wall of an interior
 * room whose own camera trails further south still (T8 finale, coordinator
 * finding): rendering it at the generic full WALL_H black-lids that room's
 * interior, same bug class as the front-row's own south stubs (the ns-band
 * loop below) and the engawa's south rail solve for their rooms. Ground:
 * genkan's front/south wall (GK_FRONT_WALL, z=8.1 — genkan is itself south
 * of the front row, camera trails further south still). Roof: the
 * stair-room's south wall segments flanking its door (SR_WALL_S_LO/HI, z =
 * STAIR_ROOM.z + STAIR_ROOM.d = 2.75 — same shape, one interior room whose
 * south wall sits between its own interior and the camera). Matched
 * generically by z per area since each has exactly one such wall today; a
 * third instance should extend this rather than copy-pasting another
 * isXFrontWall check. Collision is untouched — this only ever gates the
 * VISUAL height/color passed to WallBox.
 */
function isCameraSideWall(rect: Rect, area: "ground" | "roof"): boolean {
  if (area === "ground") return Math.abs(rect.z - 8.1) < 1e-6;
  return Math.abs(rect.z - (STAIR_ROOM.z + STAIR_ROOM.d)) < 1e-6;
}

/** Rooms with their own art-passed surfaces skip the debug tint patch. */
const ART_PASSED = new Set<string>(["music", "workspace", "bedroom"]);

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
          (fixture-attached light, no shadows — matches the nook's sconce).
          The pointLight lives INSIDE the group at the shade's origin so the
          glow provably originates at the fixture (rotation-safe by
          construction — same bug class as the f765bae picture-light fix). */}
      <group position={[WALL_FACE - 0.02, 2.32, 1.12]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, -0.09, -0.02]}>
          <boxGeometry args={[0.1, 0.05, 0.06]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.11, 0.14, 8, 1, true]} />
          <meshStandardMaterial color="#ffcf8f" emissive="#ffcf8f" emissiveIntensity={0.8} side={2} />
        </mesh>
        <pointLight color="#ffcf8f" intensity={3} distance={3.2} decay={2} />
      </group>
    </group>
  );
}

/**
 * T8 finale item 16 (owner ask): the workstation doorway "reads invisible"
 * from the common area — "walking into a wall." Two generated, unlit
 * (meshBasicMaterial) glow textures — no new real light, matching the
 * "sanctioned painted-light pattern" every neon sign in this house already
 * uses:
 * (a) a warm gradient quad RECESSED in the door gap itself (centered in
 *     the shared wall's own z-thickness, -0.2..0), filling most of the
 *     clear opening — brightest near the floor, dimming toward the top —
 *     reads as light spilling out of the room beyond.
 * (b) a soft floor-spill patch on the common-area side, flat ON the floor
 *     (y=0.006, ≥6mm per the house's stacked-surface convention — flat is
 *     fine, it's the VERTICAL fake-shaft pattern that's banned, and this
 *     is neither vertical nor a shaft).
 * Radially-symmetric spill texture (see gen-variants.mjs's floorSpill) so
 * the flat quad's own rotation can't put the gradient backwards.
 */
function WorkstationDoorGlow() {
  const glowTex = usePixelTexture("/3am/tex/door-glow.png", 1, 1);
  const spillTex = usePixelTexture("/3am/tex/floor-spill.png", 1, 1);
  const doorCX = (WS_DOOR_LO + WS_DOOR_HI) / 2;
  const doorW = WS_DOOR_HI - WS_DOOR_LO;
  return (
    <group>
      <mesh position={[doorCX, (WALL_H - 0.1) / 2, -0.1]}>
        <planeGeometry args={[doorW - 0.05, WALL_H - 0.1]} />
        <meshBasicMaterial map={glowTex} transparent />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[doorCX, 0.006, 0.7]}>
        <planeGeometry args={[1.8, 1.3]} />
        <meshBasicMaterial map={spillTex} transparent />
      </mesh>
    </group>
  );
}

export function House() {
  const area = useThreeAm((s) => s.area);
  // LAYOUT V2 (Task 3): "workstation" is a camera-only area — it isn't a
  // `HOUSE.areas` entry (its floor space is already part of GROUND's own
  // bounds/walls, see layout.ts's LAYOUT V2 comment), so it can't fall
  // through to the `HOUSE.areas[area]` lookup below (that indexes ground/
  // roof only) or the roof-shaped else-branch that depends on it. Instead
  // it gets its own small, self-contained structural shell here — a floor
  // slab + a generic-color perimeter (same plain-`WallBox` idiom the roof
  // branch below uses: full-height north/west/east, since this room has no
  // interior dividers) — plus the real room content (<Workstation/>, the
  // migrated desk/EVA/corkboard/polaroid/coffee-corner/neon furniture).
  // The shared wall back to the common area (with its door gap) is pulled
  // straight from GROUND's own `walls` array — WS_WALL_LO/WS_WALL_HI
  // aren't individually exported, so filtering by z (they're the only two
  // wall rects at z=-0.2) is how this stays derived from Task 1's collider
  // rather than re-hardcoding the door gap's bounds. Low stub height,
  // same "camera-side wall doesn't occlude the player" convention every
  // other room's south wall uses — this room's own camera sits south of
  // it, looking north, same as ground's.
  if (area === "workstation") {
    const b = WORKSTATION_ROOM;
    const T = 0.2;
    const sharedWall = HOUSE.areas.ground.walls.filter((w) => w.z === -0.2);
    return (
      <group>
        <FloorSlab rect={b} />
        <WallBox rect={{ x: b.x - T, z: b.z - T, w: b.w + 2 * T, d: T }} />
        <WallBox rect={{ x: b.x - T, z: b.z, w: T, d: b.d }} />
        <WallBox rect={{ x: b.x + b.w, z: b.z, w: T, d: b.d }} />
        {/* CAMERA-SIDE WALLS (T8 finale, owner feedback wave item 8, then
            item 11 correction): this room's own shared wall back to
            common (WS_WALL_LO/HI, `ground.walls` filtered by z=-0.2) is
            the camera-side wall for this room the same way genkan's front
            wall is for genkan — the workstation's own camera trails south
            past it (AREA_CAMERA.workstation offset z=+9.5, FollowCamera.tsx
            — lands the camera well south of z=-0.2, in common's own
            territory). Item 8 first tried rendering NOTHING here; the
            owner's correction (item 11) is the standard SOUTH_STUB_H/
            "#57497a" dollhouse-cutaway stub every other camera-side wall
            in the house uses — "the illusion this is the bottom part of
            the wall," matching main's original treatment (verified via
            `git show main:src/threeam/scene/House.tsx`). Collider
            (WS_WALL_LO/HI in layout.ts) is untouched either way. */}
        {sharedWall.map((rect, i) => (
          <WallBox key={`ws${i}`} rect={rect} height={SOUTH_STUB_H} color="#57497a" />
        ))}
        {/* framed opening (Task 4): the workstation-side face of the
            common↔workstation door. The common-side face is mounted from
            the "ground" branch below — this room's own structural tree
            never renders alongside it, so both faces need their own
            mount. */}
        <HorizontalDoorFrame z={-0.1} xLo={WS_DOOR_LO} xHi={WS_DOOR_HI} height={WALL_H} />
        {/* PRELOAD REGRESSION FIX (T8 finale, T3 review carry-forward):
            Workstation's 5 GLBs (EVA, coffee machine, pixar lamp, gaming
            chair, katana) only ever mount HERE, inside this branch — House
            returns this branch exclusively while `area === "workstation"`,
            so on ground (where Scene.tsx's own `<Preload all/>` lives,
            gated to `area === "ground"`) these materials don't exist in the
            scene graph yet and that Preload can't touch them; first entry
            into the workstation always paid the GPU shader-compile hitch on
            whatever frame the Suspense first resolved. Same fix as Scene's
            own ground Preload, applied locally: mounted as a SIBLING inside
            this Suspense, so its layout effect can't fire until Workstation
            itself has resolved (React holds the whole boundary until every
            suspending descendant is ready) — meaning gl.compile() runs on
            the very commit that adds these materials to the scene, before
            the browser paints that frame. Preload's own traversal walks the
            WHOLE r3f scene (`useThree(s => s.scene)`, not just its own
            subtree — see node_modules/@react-three/drei/core/Preload.js),
            so this is safe to have alongside Scene's; redundant gl.compile
            calls on already-compiled programs are a cheap no-op. */}
        <Suspense fallback={null}>
          <Workstation />
          <Preload all />
        </Suspense>
      </group>
    );
  }
  const a = HOUSE.areas[area];
  const b = a.bounds;
  const T = 0.2; // perimeter wall thickness (drawn just outside bounds)

  // ground: bounds.x reaches -2.9 to cover the bedroom's engawa deck (P4
  // engawa rework), but the deck's own north/south edges are NOT house
  // walls — they're open railing (Bedroom.tsx's RailFence, on top of
  // layout.ts's ENGAWA_RAIL_N/S colliders), same as the deck's west edge
  // (already skipped below, i===2). Pre-fix, the naive `b.x - T` origin
  // dragged the north/south perimeter boxes west with it, so they silently
  // grew to span the deck's own width too — a full-height solid wall over
  // the deck's north end (invisible before the deck ran its FULL length,
  // z 0-6, right up against that wall) and a redundant low stub doubling
  // up on the south rail. `northSouthX0` clips both to the "core" house's
  // own x=0 edge (unaffected for the roof area, whose bounds.x=8 was never
  // negative) so the deck's open edges stay open — collision is untouched,
  // isBlocked reads straight from `bounds`/`walls`/`furniture` (layout.ts),
  // never from this purely-visual perimeter.
  const northSouthX0 = area === "ground" ? 0 : b.x - T;
  const perimeter: Rect[] = [
    { x: northSouthX0, z: b.z - T, w: b.x + b.w + T - northSouthX0, d: T }, // north
    { x: northSouthX0, z: b.z + b.d, w: b.x + b.w + T - northSouthX0, d: T }, // south
    { x: b.x - T, z: b.z, w: T, d: b.d }, // west
    { x: b.x + b.w, z: b.z, w: T, d: b.d }, // east
  ];

  // REVIEW FIX (T4 verdicts, finding 5): the front row (bedroom/common/
  // music) only ever occupies z0-6 (Geometry Reference: "Ground front row
  // (unchanged): ... z0–6") — `b.z`/`b.d` are GROUND.bounds' full span,
  // which T1 grew to -6.2/14.5 so the workstation (north) and genkan
  // (south) attachments fit. Using `b.z`/`b.d` for the front row's own
  // floor slabs AND its north/south/east perimeter walls (below) silently
  // stretched all of them across that whole range too — floors extending
  // under the workstation/genkan void, and the north/south/east walls
  // landing 6+ meters from where the room actually is (the workstation and
  // genkan draw their own floors/walls; nothing here needs to reach that
  // far). Front row z is a fixed structural constant, not something that
  // should track `bounds`' growth — hence the plain 0/6 literals instead of
  // deriving from `b`.
  const FRONT_ROW_Z0 = 0;
  const FRONT_ROW_D = 6;

  // LAYOUT V2 (Task 4): the bedroom↔common and common↔music door gaps
  // don't have their own exported consts (unlike WS_DOOR_LO/HI and
  // GENKAN_DOOR_LO/HI) — they're the shared DOOR_LO/DOOR_HI dividerWithDoor
  // was called with, never exported. Derived instead from the live
  // `ground.walls` rects (same "never re-hardcode" idiom `sharedWall`
  // above already uses for the workstation's own shared wall): each
  // divider is two wall segments at the same x, split by the gap — the
  // gap's z-bounds are just the space between them.
  const groundWalls = HOUSE.areas.ground.walls;
  const bedroomCommonWalls = groundWalls
    .filter((w) => Math.abs(w.x - 7.9) < 1e-6)
    .sort((p, q) => p.z - q.z);
  const commonMusicWalls = groundWalls
    .filter((w) => Math.abs(w.x - 15.9) < 1e-6)
    .sort((p, q) => p.z - q.z);

  return (
    <group>
      {/* floor: ground splits into 3 discrete room slabs, geometrically
          split at the same x=8/x=16 boundaries Scene's RoomCull uses (the
          bedroom slab absorbs the engawa's -2.9..0 strip — same "one unit"
          treatment RoomCull gives Bedroom.tsx), each gated to its own
          roomBand so a non-current room's floor doesn't show through the
          dark void. Roof is a single room — one full-bounds slab, always
          on, same as before. */}
      {area === "ground" ? (
        <>
          <StructureBand bands={[0]}>
            <FloorSlab
              rect={{ x: b.x, z: FRONT_ROW_Z0, w: BEDROOM_WORKSPACE_BOUNDARY - b.x, d: FRONT_ROW_D }}
            />
          </StructureBand>
          <StructureBand bands={[1]}>
            <FloorSlab
              rect={{
                x: BEDROOM_WORKSPACE_BOUNDARY,
                z: FRONT_ROW_Z0,
                w: WORKSPACE_MUSIC_BOUNDARY - BEDROOM_WORKSPACE_BOUNDARY,
                d: FRONT_ROW_D,
              }}
            />
          </StructureBand>
          <StructureBand bands={[2]}>
            <FloorSlab
              rect={{
                x: WORKSPACE_MUSIC_BOUNDARY,
                z: FRONT_ROW_Z0,
                w: b.x + b.w - WORKSPACE_MUSIC_BOUNDARY,
                d: FRONT_ROW_D,
              }}
            />
          </StructureBand>
        </>
      ) : (
        <FloorSlab rect={b} />
      )}

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
          except the camera-side south stub. Ground's west perimeter (i=2)
          is skipped entirely: bounds.x now reaches -2.9 to cover the
          bedroom's engawa deck (P4 engawa rework, renamed from "balcony"),
          so the naive `bounds.x - T` box would land behind the deck,
          closing off the void the railing is supposed to open onto. The
          real x=0 boundary (the proper thick wall flanking the engawa's
          door gap) is now built explicitly from `area.walls` rects
          (rendered generically below, as real full-height boxes — same
          idiom as every interior divider) and painted on both faces by
          the bedroom's own wall meshes (Bedroom.tsx) — see layout.ts's
          ENGAWA_* comment for the full reasoning.

          ENGAWA NORTH-WALL FIX (this pass): the north (i=0) and south
          (i=1) perimeter rects have the same "dragged west by bounds.x"
          problem the west edge already had — `northSouthX0` (above)
          clips their west end to x=0, so they no longer extend a
          full-height wall (north) or a redundant low stub (south) over
          the deck. The deck's own north/south edges are railing only
          (Bedroom.tsx's RailFence + layout.ts's ENGAWA_RAIL_N/S), same
          open-edge treatment as the west edge below. */}
      {area === "ground" ? (
        <>
          {/* north/south perimeter, split into 3 per-room segments at the
              same x=8/x=16 boundaries as the floor above — the OLD code
              drew these as two single boxes spanning the whole house
              width, which is exactly why every room's skeleton wall showed
              regardless of which room was current. East (i=3, the music
              nook's own outer wall) is a single short rect already scoped
              to one room, so it's tagged rather than split. West (i=2) is
              still skipped — bedroom/layout own that edge (engawa). Z uses
              FRONT_ROW_Z0/D (not `b.z`/`b.d`) for the same reason the floor
              slabs above do — see the REVIEW FIX comment.

              CAMERA-SIDE WALLS (T8 finale, owner feedback wave item 8, then
              item 11 correction): the SOUTH segment briefly rendered
              NOTHING at all (item 8's "so we can see what's behind them"
              take); the owner's correction (item 11) is back to the
              standard SOUTH_STUB_H/"#57497a" dollhouse-cutaway stub — what
              main (`git show main:src/threeam/scene/House.tsx`) has always
              shown here, "the illusion this is the bottom part of the
              wall." Collision is untouched either way — the collider that
              backs this stub lives entirely in layout.ts's `walls`/
              `bounds`, never in this purely-visual perimeter.

              DOOR-GAP AWARENESS (owner correction, post-item-11): band 1
              is the only band whose north/south edge crosses a real
              doorway — the workstation's shared-wall door (north,
              WS_DOOR_LO/HI) and genkan's inner door (south, GENKAN_DOOR_LO/
              HI). `splitByGap` renders each side as 1 rect (bands 0/2, no
              door) or 2 rects flanking the gap (band 1) — see its own doc
              for the bug this replaces (both doorways rendered fully
              solid before this). */}
          {([0, 1, 2] as const).map((band) => {
            const segX0 =
              band === 0 ? northSouthX0 : band === 1 ? BEDROOM_WORKSPACE_BOUNDARY : WORKSPACE_MUSIC_BOUNDARY;
            const segX1 =
              band === 0 ? BEDROOM_WORKSPACE_BOUNDARY : band === 1 ? WORKSPACE_MUSIC_BOUNDARY : b.x + b.w + T;
            const northGap: [number, number] | [null, null] =
              band === 1 ? [WS_DOOR_LO, WS_DOOR_HI] : [null, null];
            const southGap: [number, number] | [null, null] =
              band === 1 ? [GENKAN_DOOR_LO, GENKAN_DOOR_HI] : [null, null];
            return (
              <StructureBand key={`ns${band}`} bands={[band]}>
                {splitByGap(segX0, segX1, northGap[0], northGap[1]).map(([gx0, gx1], gi) => (
                  <WallBox
                    key={`n${gi}`}
                    rect={{ x: gx0, z: FRONT_ROW_Z0 - T, w: gx1 - gx0, d: T }}
                    height={WALL_H}
                  />
                ))}
                {splitByGap(segX0, segX1, southGap[0], southGap[1]).map(([gx0, gx1], gi) => (
                  <WallBox
                    key={`s${gi}`}
                    rect={{ x: gx0, z: FRONT_ROW_Z0 + FRONT_ROW_D, w: gx1 - gx0, d: T }}
                    height={SOUTH_STUB_H}
                    color="#57497a"
                  />
                ))}
              </StructureBand>
            );
          })}
          <StructureBand bands={[2]}>
            <WallBox rect={{ x: b.x + b.w, z: FRONT_ROW_Z0, w: T, d: FRONT_ROW_D }} />
          </StructureBand>
          {/* interior dividers: the x=8/x=16 doorway dividers straddle a
              boundary, so overlappingBands tags them with BOTH neighbouring
              rooms — they keep rendering for whichever one is current, no
              gap mid-room. The engawa's own divider (x≈-0.1) only touches
              band 0 (bedroom+engawa is one unit).

              CAMERA-SIDE WALLS (T8 finale, owner feedback wave item 8,
              then item 11 correction): GK_FRONT_WALL (genkan's own south/
              front wall, z8.1-8.3, the one wall in this array below
              `bounds.z+bounds.d` — front-row south walls are never in
              `a.walls`, they're the ns-band segments above) sits directly
              between the camera and the genkan's interior once the player
              is inside it (genkan is SOUTH of the front row, and the
              camera always trails further south still — same "camera-side
              wall occludes" situation the ns-band loop above already
              solves for the front row, and the engawa's south rail solves
              for the deck). T6 originally dropped it to a SOUTH_STUB_H
              stub; item 8 briefly tried rendering nothing; the owner's
              correction (item 11) is back to the SOUTH_STUB_H stub — main's
              own treatment for every camera-side wall, "the illusion this
              is the bottom part of the wall." The front door assembly
              (Genkan.tsx: frame + solid leaf, full height) stands proud of
              this low wall regardless. Collision is untouched — GK_FRONT_
              WALL itself never changes, only this VISUAL height.

              GK DIVIDER UPPER BAND (T6 review finding, reinstated for item
              11): GK_WALL_LO/HI (the common↔genkan divider, z6-6.2) shares
              its y0-0.55 footprint with the ns-band loop's own restored
              south stub above — rendering both there full-height z-fights
              (two colors on coplanar faces). The stub owns y0-0.55 for the
              whole band-1 width (8-16, including the door gap, as a low
              threshold sill); GK_WALL_LO/HI renders ONLY its upper band
              (SOUTH_STUB_H..WALL_H) here, matched by z=6 and d=0.2
              (distinct from GK_FRONT_WALL's z=8.1 and from the void
              backstops' much larger w/d — see below).

              WALL-THICKNESS DEDUPE (T8 finale, owner feedback wave item 9,
              corrected per item 12): GK_VOID_W/E and WS_VOID_W/E
              (layout.ts's LAYOUT V2 void backstops — collision-only by
              original design, same idiom as the old ENGAWA_WALL_BLOCK_N/S
              which were explicitly "invisible collision") were swept into
              this GENERIC render along with every real wall when T1 added
              them to `a.walls` for collision purposes, with no render-time
              exclusion. That put a full-height solid box at genkan's own
              east/west seam (e.g. GK_VOID_E spans x16-22 z6-8.3, directly
              overlapping Genkan.tsx's own dedicated east-wall filler at
              x15.9-16.1 z6.2-8.1) — a real double-thickness wall mass at
              exactly the "genkan/common junction and east perimeter" the
              owner flagged.

              FIRST FIX WAS WRONG (item 12 finding): matched by `rect.d > 1`
              alone — but `d` is a rect's Z-SPAN, and for a north-south-
              running wall (fixed x, like the x=8/x=16/engawa dividers)
              `d` is the wall's LENGTH along z, which is routinely >1
              (dividerWithDoor's own segments are 2.2-2.4m long) while its
              THICKNESS is `w` (always WALL_T=0.2). That single-dimension
              check silently deleted the x=8/x=16 dividers AND the engawa
              wall too — the exact "wall line between rooms... vanished"
              regression the owner caught. Void backstops are wide boxes in
              BOTH dimensions (GK_VOID: w10.9/6 × d2.3; WS_VOID: w10.9/6 ×
              d6.2) — no real wall in this array has `w > 1` (every real
              wall here is WALL_T-thin on at least one axis) — so `rect.w >
              1 && rect.d > 1` is the precise discriminator: true only for
              the 4 void backstops, false for every divider/GK_WALL/
              WS_WALL/GK_FRONT_WALL regardless of length. Collision is
              unaffected either way; `isBlocked` reads `a.walls` directly,
              never this render loop. */}
          {a.walls.map((rect, i) => {
            const isVoidBackstop = rect.w > 1 && rect.d > 1;
            if (isVoidBackstop) return null;
            const isGenkanFrontWall = isCameraSideWall(rect, "ground");
            const isGKDivider = Math.abs(rect.z - 6) < 1e-6 && Math.abs(rect.d - 0.2) < 1e-6;
            if (isGKDivider) {
              const upperH = WALL_H - SOUTH_STUB_H;
              return (
                <StructureBand key={`w${i}`} bands={overlappingBands(rect)}>
                  <mesh
                    position={[rect.x + rect.w / 2, SOUTH_STUB_H + upperH / 2, rect.z + rect.d / 2]}
                    castShadow
                    receiveShadow
                  >
                    <boxGeometry args={[rect.w, upperH, rect.d]} />
                    <meshStandardMaterial color="#7d6fa8" />
                  </mesh>
                </StructureBand>
              );
            }
            return (
              <StructureBand key={`w${i}`} bands={overlappingBands(rect)}>
                <WallBox
                  rect={rect}
                  color={isGenkanFrontWall ? "#57497a" : "#7d6fa8"}
                  height={isGenkanFrontWall ? SOUTH_STUB_H : WALL_H}
                />
              </StructureBand>
            );
          })}
          {/* framed openings (Task 4): decorative door-frame trim, derived
              from the door consts / live wall rects above — see
              CommonArea.tsx's VerticalDoorFrame/HorizontalDoorFrame for the
              geometry. Cross-boundary openings (bedroom↔common,
              common↔music) are tagged with BOTH neighbouring bands, same
              `overlappingBands` convention the divider walls themselves use
              above, so the frame doesn't vanish mid-room. The genkan
              opening and this common-side face of the workstation opening
              are single-band (workspace only) — the workstation's own
              structural tree (above) mounts that opening's other face.

              REVIEW FIX (T4 verdicts, finding 4): both `VerticalDoorFrame`
              mounts used to straddle the wall's centerline symmetrically,
              which put real geometry inside the NEIGHBOURING room — a hard
              violation at x=16 (the music nook is style-locked, "no
              changes," Global Constraints) and, for consistency, fixed the
              same way at x=8 even though the bedroom isn't locked. `bias`
              (CommonArea.tsx) shifts the frame's full depth onto the
              common area's own side of each wall instead — the bedroom
              (x<8) and the music nook (x>16) both stay geometry-free. */}
          <StructureBand bands={[0, 1]}>
            <VerticalDoorFrame
              x={8}
              zLo={bedroomCommonWalls[0].z + bedroomCommonWalls[0].d}
              zHi={bedroomCommonWalls[1].z}
              height={WALL_H}
              bias={1}
            />
          </StructureBand>
          <StructureBand bands={[1, 2]}>
            <VerticalDoorFrame
              x={16}
              zLo={commonMusicWalls[0].z + commonMusicWalls[0].d}
              zHi={commonMusicWalls[1].z}
              height={WALL_H}
              bias={-1}
            />
          </StructureBand>
          <StructureBand bands={[1]}>
            <HorizontalDoorFrame z={6.1} xLo={GENKAN_DOOR_LO} xHi={GENKAN_DOOR_HI} height={WALL_H} />
          </StructureBand>
          <StructureBand bands={[1]}>
            {/* T8 finale item 16: warmer/lighter frame color on this face
                only (color prop, CommonArea.tsx — default FRAME_COLOR
                everywhere else) so it pops from the dark wall; see
                WorkstationDoorGlow above for the glow quad + floor spill
                that fill the opening itself. */}
            <HorizontalDoorFrame
              z={-0.1}
              xLo={WS_DOOR_LO}
              xHi={WS_DOOR_HI}
              height={WALL_H}
              color="#6e5238"
            />
          </StructureBand>
          <StructureBand bands={[1]}>
            <Suspense fallback={null}>
              <WorkstationDoorGlow />
            </Suspense>
          </StructureBand>
        </>
      ) : (
        <>
          {perimeter.map((rect, i) => (
            <WallBox
              key={`p${i}`}
              rect={rect}
              height={SOUTH_STUB_H}
              color={i === 1 ? "#57497a" : undefined}
            />
          ))}
          {a.walls.map((rect, i) => {
            // T8 finale (coordinator finding, routed off T7 review; item 8,
            // then item 11 correction): this generic full-height render
            // used to black-lid the stair-room's own interior — SR_WALL_S_
            // LO/HI (its south wall, flanking the door onto the terrace)
            // sat directly in the roof camera's sightline, same "camera-
            // side wall occludes" case genkan's front wall already solves
            // for the ground branch — see isCameraSideWall's doc. Settled
            // on the standard SOUTH_STUB_H/"#57497a" stub (item 11: the
            // owner wants the main-branch dollhouse-cutaway look
            // everywhere, not a fully open wall) — same treatment every
            // other camera-side wall in the house uses. Collision
            // (SR_WALL_S_LO/HI in layout.ts) is untouched.
            const isStairRoomSouthWall = isCameraSideWall(rect, "roof");
            return (
              <WallBox
                key={`w${i}`}
                rect={rect}
                color={isStairRoomSouthWall ? "#57497a" : "#7d6fa8"}
                height={isStairRoomSouthWall ? SOUTH_STUB_H : WALL_H}
              />
            );
          })}
          {/* stair-room dressing (Task 7): door frame trim + wall lamp for
              the STAIR_ROOM enclosure above (its walls are the plain
              `a.walls.map` boxes just above — this only adds the two
              pieces that need real geometry beyond a plain box). No band
              gating needed — roof has one room, same as the stairs flight
              above. Own Suspense boundary, same idiom as every other room
              dressing mount in this file. PRELOAD REGRESSION check (T8
              finale): unlike Workstation/Genkan, Roof.tsx has no
              `useTexture`/`useGLTF` calls — every material here is a plain
              color, no async resource, so this Suspense never actually
              suspends and there's no shader-compile hitch to precompile
              away. No local `<Preload all/>` added here on purpose. */}
          <Suspense fallback={null}>
            <Roof />
          </Suspense>
        </>
      )}

      {/* portal stairs: anchored flush against the north wall (4mm off its
          face, both areas); the flight runs toward the room, and the portal
          trigger sits just south of the base where the player presses E.
          On ground the flight sits at x≈15.2 — inside the workspace band —
          so it's gated to band 1: it doesn't show while in the bedroom or
          music nook, only in the workspace. Roof has one room; its own
          stairs-down flight is never band-gated (nothing to disagree with,
          and gating it here risked a stale-band flicker right after a
          portal teleport lands the player mid-workspace-x-range on roof). */}
      {HOUSE.portals
        .filter((p) => p.area === area)
        .map((p) => {
          const flight = (
            <Stairs key={p.id} x={p.trigger.x + p.trigger.w / 2} z={0.004} />
          );
          return area === "ground" ? (
            <StructureBand key={p.id} bands={[1]}>
              {flight}
            </StructureBand>
          ) : (
            flight
          );
        })}
      {/* stairs-approach dressing (rug, photo wall, sconce) is a ground-
          floor thing — the roof side is open parapet, no divider wall. It
          sits in the workspace band (x≈15.2-15.9), same as the stairs
          themselves, so it's gated the same way. Own Suspense boundary:
          House sits OUTSIDE Scene's boundary, and the rug texture must not
          suspend the whole canvas. */}
      {area === "ground" && (
        <StructureBand bands={[1]}>
          <Suspense fallback={null}>
            <StairsApproach />
          </Suspense>
        </StructureBand>
      )}
      {/* genkan (Task 6): entry strip south of the front row (GENKAN_ROOM,
          layout.ts). Its x-span (8-16) sits entirely inside band 1, same as
          the common area it opens off of — no cross-band handling needed
          (see Genkan.tsx's own comment on why). `GENKAN_BAND` (runtime.ts,
          T8 finale) documents that decision as a single source of truth —
          it's genkan's ONLY room-detection mechanism, since it has no x-band
          of its own the way bedroom/common/music do — and this is the one
          place that consumes it, so `GENKAN_BAND !== 1` would visibly
          orphan the room (see runtime.test.ts's coverage). Own Suspense
          boundary, same reason StairsApproach gets one: its floor texture
          must not suspend the whole canvas. PRELOAD REGRESSION FIX (T8
          finale): this Suspense boundary is a SIBLING of Scene.tsx's own
          ground Preload (House mounts outside Scene's Suspense entirely —
          see Scene.tsx), so genkan's texture load races Bedroom/CommonArea/
          MusicNook's GLBs independently; a local `<Preload all/>` here
          closes that race the same way the workstation branch's does,
          rather than relying on genkan's one small texture happening to
          resolve first. */}
      {area === "ground" && (
        <StructureBand bands={[GENKAN_BAND]}>
          <Suspense fallback={null}>
            <Genkan />
            <Preload all />
          </Suspense>
        </StructureBand>
      )}
    </group>
  );
}
