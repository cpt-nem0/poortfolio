"use client";

import { usePixelTexture } from "../usePixelTexture";
import { GenkanOnly } from "../GenkanOnly";
import {
  GENKAN_ROOM as R,
  GENKAN_DOOR_LO,
  GENKAN_DOOR_HI,
  GENKAN_STOOL_RECT,
  FRONT_DOOR_LO,
  FRONT_DOOR_HI,
} from "@/threeam/world/layout";

const WALL_H = 2.8; // must match House.tsx

// LAYOUT V2 (Task 6): "real genkan step-down" — the plan's binding value.
// Player Y is fixed in this engine (no vertical movement), so the drop is
// purely visual: the floor PLANE sits 0.12m below the common area's y=0
// floor; nothing about collision/movement changes. A step-up trim beam
// (below) marks the level change at the inner doorway, where the player
// actually crosses it. NOTE (documented, not fixed this pass): the genkan's
// perimeter walls (GK_WALL_LO/HI, GK_FRONT_WALL — House.tsx, generic
// `a.walls` render — plus this file's own west/east fillers below) all sit
// on the universal y=0 wall baseline, like every other wall in the house.
// At 12cm, the sliver between their bottom edge and this recessed floor is
// a minor seam, not corrected here (would need a second geometry system —
// per-room wall baselines — that's out of scope for a 12cm reveal); worth
// an eyeball on the PR preview.
const FLOOR_Y = -0.12;

/** Genkan floor: reuses the existing stone-slab.png tile (32×32, designed
 *  tiling — see its generator comment in gen-variants.mjs) rather than
 *  cutting a new texture — it already reads as flat stone/concrete, the
 *  spec's ask, and the ONE-generator-agent-at-a-time constraint plus
 *  determinism proof are both moot if nothing new needs generating. */
const FLOOR_TEX = "/3am/tex/stone-slab.png";

// step-up trim ("agarikamachi" — the wood threshold beam a real genkan
// steps up over) — sits right at the inner doorway, spanting the walkable
// gap, bridging the recessed genkan floor (FLOOR_Y) up to the common
// area's floor (y=0).
const TRIM_H = -FLOOR_Y; // 0.12
const TRIM_D = 0.1;
const TRIM_Z = R.z + TRIM_D / 2 + 0.02; // just south of the shared wall's inner face (R.z=6.2)

// front door: wall (already solid, GK_FRONT_WALL — House.tsx's generic
// wall render) → frame (proud of the wall face) → leaf (recessed inside the
// frame's reveal) — same layered-offset idiom as the engawa's glass door
// and the bedroom mirror (each stacked layer ≥6mm/proud of the last).
const WALL_FACE = R.z + R.d; // 8.1, the front wall's genkan-facing inner face
const FRAME_COLOR = "#4a3a2e"; // matches CommonArea.tsx's door-frame trim color
const FRAME_BACK = WALL_FACE - 0.02; // 20mm proud of the wall
const FRAME_DEPTH = 0.05;
const FRAME_FRONT = FRAME_BACK - FRAME_DEPTH; // 8.03
const FRAME_THICK = 0.07;
const FRAME_Z = FRAME_BACK - FRAME_DEPTH / 2;
const LEAF_FRONT = FRAME_FRONT + 0.01; // 10mm recessed behind the frame's front edge
const LEAF_DEPTH = 0.04;
const LEAF_Z = LEAF_FRONT + LEAF_DEPTH / 2;
const LEAF_TOP = 2.3; // header band above the leaf, filled by the lintel
const LEAF_INSET = 0.03; // leaf sits inside the jambs by this much, each side

// ── NORTH-WALL DRESSING (owner ask, 2026-10-19: "do something about the
// north genkan wall … just fill that area a bit"). The common↔genkan
// divider (GK_WALL_LO/HI, layout.ts — z6..6.2, split by the inner doorway)
// is THIS room's north wall, and from the genkan the dollhouse camera looks
// straight north at it, so it reads face-on → detail wall (HANDOFF §6:
// "put the good stuff on north walls").
//
// Its genkan-facing face: both halves of that divider render centred on
// their rect (House.tsx — the `a.walls.map` lower stub at #57497a up to
// SOUTH_STUB_H, plus GenkanDividerUpper above it), so the south face lands
// exactly at rect.z + rect.d = 6.2, which is GENKAN_ROOM.z itself. Derived
// from the const rather than re-typed (HANDOFF §5). +z is south, toward the
// camera, so "proud" means LARGER z — same sense as TRIM_Z above.
const N_FACE = R.z; // 6.2 — the divider's genkan-side face
const N_PROUD = 0.008; // the ≥6mm anti-z-fight rule, with margin
const N_BACK = N_FACE + N_PROUD; // 6.208 — back plane of every wall piece

// Doorway keep-out. The inner doorway's trim (CommonArea's
// HorizontalDoorFrame, mounted by House.tsx at z6.1 with FRAME_THICK=0.07
// jambs centred on GENKAN_DOOR_LO/HI → x11.365-11.435 / 12.665-12.735) has
// to stay completely clear, as does the front-door↔doorway walk line
// (x11.4-12.7 at every z). Nothing below crosses these two x limits.
const N_WEST_X_MAX = GENKAN_DOOR_LO - 0.12; // 11.28
const N_EAST_X_MIN = GENKAN_DOOR_HI + 0.12; // 12.82

// Palette — the house's walnut-trim family (#4a3a2e, same as FRAME_COLOR
// above) for every wood surface, warm muted tones for everything else.
// NO new lights: the house is at its ≤19 point-light budget (HANDOFF §5),
// so the one hot accent here (the incense ember) is emissive-only.
const N_WOOD = "#4a3a2e";
const N_WOOD_DARK = "#3a2e24";
const N_WOOD_WARM = "#6b4128";
const N_CREAM = "#e8dcc4";
const N_BRASS = "#c9a158";

// Shelf surfaces. The two floating shelves are the only pieces carrying
// other objects, and every one of those objects sits at `top + ON` — kept
// in one place so the 6mm gap can't drift item by item.
const N_SHELF_TOP = 1.45; // west wall shelf
const N_CONSOLE_TOP = 0.95; // east console shelf
const ON = 0.006;

// Step-stool — the one piece of this pass with a real collider
// (GENKAN_STOOL_RECT, layout.ts). Every number below derives from that
// rect; nothing re-hardcodes it.
const ST = GENKAN_STOOL_RECT;
const STOOL_TOP = FLOOR_Y + 0.42;
const STOOL_SEAT_T = 0.06;
const STOOL_SEAT_D = ST.d - 0.016; // 0.324 — the rect hugs the render
const STOOL_SEAT_ZC = N_BACK + STOOL_SEAT_D / 2;

// Coat rail (west segment) and console shelf (east segment) are the two
// pieces that sit nearest the doorway, so both derive their doorway-side
// edge from the keep-out limits above rather than from a typed-in number.
const RAIL_W = 0.35;
const RAIL_XC = N_WEST_X_MAX - 0.03 - RAIL_W / 2; // 11.075 (rail x10.90-11.25)
const CONSOLE_X = N_EAST_X_MIN + 0.38; // 13.20 (console x13.20-15.00)

function ShoePair({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[-0.08, 0.03, 0]} rotation={[0, 0.15, 0]}>
        <boxGeometry args={[0.1, 0.05, 0.24]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.08, 0.03, 0.02]} rotation={[0, -0.1, 0]}>
        <boxGeometry args={[0.1, 0.05, 0.24]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function Umbrella({ x, z, tilt, color }: { x: number; z: number; tilt: number; color: string }) {
  return (
    <group position={[x, 0.34, z]} rotation={[0, 0, tilt]}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.44, 6]} />
        <meshStandardMaterial color="#5a5266" />
      </mesh>
      <mesh position={[0, 0.44, 0]}>
        <coneGeometry args={[0.16, 0.14, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

/**
 * Genkan — the entry strip south of the common area. Renders inside
 * House.tsx's ground shell (mounted band[1], since GENKAN_ROOM's x-span
 * matches the common room's own x8-16 band). Dressing (shoe rack, doormat,
 * umbrella stand, sconce) is DECOR ONLY — no `layout.ts` colliders (that
 * file is off-limits this task); every piece sits well clear of the
 * inner↔front-door walking lane (x≈11.4-12.7) so it never visually blocks
 * the path even without a physical collider forcing it.
 */
export function Genkan() {
  const floor = usePixelTexture(FLOOR_TEX, R.w, R.d);
  // North-wall dressing textures — both existing, whole-image 1x1, the
  // same convention every poster/photo in the house already uses. No new
  // texture was generated for this pass.
  const printTex = usePixelTexture("/3am/tex/poster-wave-arc.png", 1, 1);
  const photoTex = usePixelTexture("/3am/tex/corkboard-photo-polaroid.png", 1, 1);

  return (
    <group>
      {/* floor, 0.12m below the common area's y=0 — see FLOOR_Y's comment */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[R.x + R.w / 2, FLOOR_Y, R.z + R.d / 2]} receiveShadow>
        <planeGeometry args={[R.w, R.d]} />
        <meshStandardMaterial map={floor} />
      </mesh>

      {/* west/east perimeter fillers: GK_VOID_W/E (layout.ts) already block
          collision here, but they're tagged band0/band2 (bedroom/music) —
          within band1 (the only band a player actually sees the genkan
          from), the strip's own flanks had no wall mesh at all. Plain color
          matches GK_WALL_LO/HI/GK_FRONT_WALL's own generic render
          (House.tsx's `a.walls.map`, "#7d6fa8"). Kept FULL height on
          purpose (coordinator's black-lid check, T6 walk finding) —
          unlike GK_FRONT_WALL (House.tsx's own comment on that fix), these
          run north-south, roughly PARALLEL to the camera's own look
          direction (camera trails due south of the target, no x offset —
          FollowCamera.tsx), not perpendicular across it, so they don't sit
          between the camera and the interior the way a south-facing wall
          does. Same convention every other room's own west/east walls
          already use (MusicNook/Bedroom/Workstation: full height, never
          low-stubbed) — "Camera law: east/west = mass/light" (Global
          Constraints), only north/south get the detail/occlusion
          treatment. */}
      <mesh position={[R.x, WALL_H / 2, R.z + R.d / 2]} castShadow receiveShadow>
        <boxGeometry args={[0.2, WALL_H, R.d]} />
        <meshStandardMaterial color="#7d6fa8" />
      </mesh>
      <mesh position={[R.x + R.w, WALL_H / 2, R.z + R.d / 2]} castShadow receiveShadow>
        <boxGeometry args={[0.2, WALL_H, R.d]} />
        <meshStandardMaterial color="#7d6fa8" />
      </mesh>

      {/* step-up trim (agarikamachi) at the inner doorway */}
      <mesh position={[(GENKAN_DOOR_LO + GENKAN_DOOR_HI) / 2, FLOOR_Y / 2, TRIM_Z]}>
        <boxGeometry args={[GENKAN_DOOR_HI - GENKAN_DOOR_LO, TRIM_H, TRIM_D]} />
        <meshStandardMaterial color="#6b4128" />
      </mesh>

      {/* shoe rack — low shelf + 4 shoe pairs, NW corner (clear of the
          inner↔front-door walking lane, which sits at x 11.4-12.7) */}
      <group>
        <mesh position={[8.8, FLOOR_Y + 0.12, 6.55]}>
          <boxGeometry args={[1.0, 0.06, 0.35]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        {/* legs */}
        {[8.36, 9.24].map((x, i) => (
          <mesh key={i} position={[x, FLOOR_Y + 0.06, 6.42]}>
            <boxGeometry args={[0.04, 0.12, 0.04]} />
            <meshStandardMaterial color="#3a2e24" />
          </mesh>
        ))}
        {[8.36, 9.24].map((x, i) => (
          <mesh key={`b${i}`} position={[x, FLOOR_Y + 0.06, 6.68]}>
            <boxGeometry args={[0.04, 0.12, 0.04]} />
            <meshStandardMaterial color="#3a2e24" />
          </mesh>
        ))}
        <group position={[0, FLOOR_Y + 0.15, 0]}>
          <ShoePair x={8.55} z={6.55} color="#b3475f" />
          <ShoePair x={8.85} z={6.55} color="#3f4a70" />
          <ShoePair x={9.1} z={6.55} color="#c98a2e" />
        </group>
      </group>

      {/* doormat, centered on the front door's own midpoint */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[(FRONT_DOOR_LO + FRONT_DOOR_HI) / 2, FLOOR_Y + 0.01, 7.6]}
      >
        <planeGeometry args={[1.0, 0.5]} />
        <meshStandardMaterial color="#2e6e54" />
      </mesh>

      {/* umbrella stand — cylinder pot + 2 umbrellas, SE corner (clear of
          both the walking lane and the doormat) */}
      <group>
        <mesh position={[14.6, FLOOR_Y + 0.17, 7.5]}>
          <cylinderGeometry args={[0.14, 0.12, 0.34, 10]} />
          <meshStandardMaterial color="#3a3244" />
        </mesh>
        <mesh position={[14.6, FLOOR_Y + 0.35, 7.5]}>
          <cylinderGeometry args={[0.15, 0.15, 0.02, 10]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <Umbrella x={14.56} z={7.46} tilt={0.12} color="#b3475f" />
        <Umbrella x={14.65} z={7.54} tilt={-0.08} color="#4a736c" />
      </group>

      {/* entry wall sconce — brass half-dome, east wall near the front
          door. The pointLight is a SIBLING of the fixture meshes inside the
          SAME rotated group (no independent world-position offset), so it
          stays glued to the fixture regardless of the group's own rotation
          — the exact bug class Global Constraints calls out ("shipped 3x").
          FLUSH-MOUNT FIX (T8 finale, T6 review finding): the east wall's
          inner face sits at x15.9 (R.x+R.w=16, wall box centered there,
          0.2 thick — House.tsx's generic `a.walls` render). The bracket
          mesh below (local [0,-0.09,-0.02], group rotation Y=-π/2) maps to
          a world x of `groupX + 0.02` — at the old groupX=15.94 that put
          the bracket at x15.96, INSIDE the wall's solid volume (15.9-16.1),
          buried. groupX=15.87 puts it at x15.89, ~10mm proud of the 15.9
          face into the room; the shade/light (local origin, no offset) sit
          at groupX itself (15.87), further into the room than the bracket
          — correct, a shade should stick out past its own mounting
          bracket. Shade/light keep their exact relative nesting; only the
          group's own position moved. */}
      <group position={[15.87, 2.15, 6.9]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, -0.09, -0.02]}>
          <boxGeometry args={[0.1, 0.05, 0.06]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.11, 0.14, 8, 1, true]} />
          <meshStandardMaterial color="#ffcf8f" emissive="#ffcf8f" emissiveIntensity={0.8} side={2} />
        </mesh>
        {/* reach raised 2026-10-19 (was 3/3.2) so the new north-wall dressing isn't in blue shadow — a second genkan light would push the two-band total past the ≤19 point-light cliff (HANDOFF §5) */}
          <pointLight castShadow shadow-mapSize={[256, 256]} shadow-bias={-0.0015} shadow-radius={3} shadow-intensity={0.85} color="#ffcf8f" intensity={4.4} distance={5.2} decay={2} />
      </group>

      {/* front door — frame proud of the (already-solid) wall, leaf
          recessed inside the frame's reveal. Blocked by Task 1's collider
          (GK_FRONT_WALL); the [E] toast lives in Hud.tsx, which owns the
          proximity check + prompt (see its LAYOUT V2 comment for why —
          stations.ts/layout.ts aren't this task's files). */}
      <group position={[0, 0, FRAME_Z]}>
        {[FRONT_DOOR_LO, FRONT_DOOR_HI].map((x, i) => (
          <mesh key={i} position={[x, (FLOOR_Y + WALL_H) / 2, 0]}>
            <boxGeometry args={[FRAME_THICK, WALL_H - FLOOR_Y, FRAME_DEPTH]} />
            <meshStandardMaterial color={FRAME_COLOR} />
          </mesh>
        ))}
        <mesh position={[(FRONT_DOOR_LO + FRONT_DOOR_HI) / 2, WALL_H - FRAME_THICK / 2, 0]}>
          <boxGeometry args={[FRONT_DOOR_HI - FRONT_DOOR_LO + FRAME_THICK, FRAME_THICK, FRAME_DEPTH]} />
          <meshStandardMaterial color={FRAME_COLOR} />
        </mesh>
      </group>
      <group position={[0, 0, LEAF_Z]}>
        <mesh
          position={[(FRONT_DOOR_LO + FRONT_DOOR_HI) / 2, (FLOOR_Y + LEAF_TOP) / 2, 0]}
        >
          <boxGeometry
            args={[FRONT_DOOR_HI - FRONT_DOOR_LO - 2 * LEAF_INSET, LEAF_TOP - FLOOR_Y, LEAF_DEPTH]}
          />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {/* raised panel detail + handle, proud of the leaf's own face */}
        <mesh position={[(FRONT_DOOR_LO + FRONT_DOOR_HI) / 2, 1.5, -(LEAF_DEPTH / 2 + 0.006)]}>
          <boxGeometry
            args={[FRONT_DOOR_HI - FRONT_DOOR_LO - 2 * LEAF_INSET - 0.12, 1.3, 0.012]}
          />
          <meshStandardMaterial color="#9c6b42" />
        </mesh>
        <mesh position={[FRONT_DOOR_HI - LEAF_INSET - 0.08, 1.0, -(LEAF_DEPTH / 2 + 0.014)]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#d8b26a" metalness={0.6} roughness={0.35} />
        </mesh>
      </group>

      {/* ───────────────── NORTH-WALL DRESSING ─────────────────
          See the N_FACE / N_BACK block at the top of this file for the
          wall-face derivation and the doorway keep-out. Two segments,
          split by the inner doorway: WEST (x8-11.28) and EAST
          (x12.82-16). Everything hangs ≥8mm proud of the divider's
          genkan-side face, every stacked surface is ≥6mm off the one
          under it, and NO lights are added (point-light budget, §5) —
          the incense ember is emissive-only. Hung decor carries no
          collider (the doormat / shoe-rack precedent); the step-stool,
          the only piece that meets the floor, does — GENKAN_STOOL_RECT. */}

      {/* Visible only while the player is IN the genkan (GenkanOnly) — from
          the common area this wall is camera-side and everything hung on
          it would float over the knee-wall stub in front of the kotatsu;
          it flips together with the divider's upper band (House.tsx). */}
      <GenkanOnly>
      {/* ── WEST SEGMENT ── */}

      {/* floating wall shelf (x8.6-10.8) + two brackets */}
      <mesh position={[9.7, N_SHELF_TOP - 0.025, N_BACK + 0.11]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.05, 0.22]} />
        <meshStandardMaterial color={N_WOOD} />
      </mesh>
      {[9.0, 10.4].map((x) => (
        <mesh key={`shbr${x}`} position={[x, N_SHELF_TOP - 0.12, N_BACK + 0.08]}>
          <boxGeometry args={[0.05, 0.14, 0.16]} />
          <meshStandardMaterial color={N_WOOD_DARK} />
        </mesh>
      ))}

      {/* 3-book stack, spines facing the camera (muted brick / slate /
          ochre). Stacked bottom-up from the shelf top + ON, each layer
          clearing the one below it. */}
      <mesh position={[8.86, N_SHELF_TOP + ON + 0.0225, N_BACK + 0.114]}>
        <boxGeometry args={[0.17, 0.045, 0.2]} />
        <meshStandardMaterial color="#7a4f4f" />
      </mesh>
      <mesh position={[8.885, N_SHELF_TOP + ON + 0.065, N_BACK + 0.118]} rotation={[0, 0.05, 0]}>
        <boxGeometry args={[0.155, 0.04, 0.185]} />
        <meshStandardMaterial color="#4f5f6b" />
      </mesh>
      <mesh position={[8.845, N_SHELF_TOP + ON + 0.107, N_BACK + 0.11]} rotation={[0, -0.04, 0]}>
        <boxGeometry args={[0.165, 0.044, 0.195]} />
        <meshStandardMaterial color="#7a6b4a" />
      </mesh>

      {/* potted succulent */}
      <mesh position={[9.42, N_SHELF_TOP + ON + 0.045, N_BACK + 0.11]}>
        <cylinderGeometry args={[0.055, 0.045, 0.09, 8]} />
        <meshStandardMaterial color="#9c6b52" />
      </mesh>
      <mesh position={[9.39, N_SHELF_TOP + ON + 0.108, N_BACK + 0.095]} scale={[1, 0.75, 1]}>
        <sphereGeometry args={[0.042, 7, 5]} />
        <meshStandardMaterial color="#4f7a5a" />
      </mesh>
      <mesh position={[9.452, N_SHELF_TOP + ON + 0.118, N_BACK + 0.122]} scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.038, 7, 5]} />
        <meshStandardMaterial color="#3f6b4c" />
      </mesh>
      <mesh position={[9.42, N_SHELF_TOP + ON + 0.155, N_BACK + 0.108]} scale={[1, 0.85, 1]}>
        <sphereGeometry args={[0.03, 7, 5]} />
        <meshStandardMaterial color="#5c8a63" />
      </mesh>

      {/* tiny framed photo, leaning on the shelf against the wall —
          picture plane 8mm proud of the frame's own front face */}
      <mesh position={[9.92, N_SHELF_TOP + ON + 0.095, N_BACK + 0.018]}>
        <boxGeometry args={[0.16, 0.19, 0.012]} />
        <meshStandardMaterial color={N_WOOD_DARK} />
      </mesh>
      <mesh position={[9.92, N_SHELF_TOP + ON + 0.1, N_BACK + 0.032]}>
        <planeGeometry args={[0.125, 0.15]} />
        <meshStandardMaterial map={photoTex} />
      </mesh>

      {/* incense holder — dark tray, one stick at an angle, ember tip.
          Emissive only (intensity 0.45), no light: §5 budget. */}
      <mesh position={[10.3, N_SHELF_TOP + ON + 0.007, N_BACK + 0.112]}>
        <boxGeometry args={[0.2, 0.014, 0.05]} />
        <meshStandardMaterial color="#2e2a33" />
      </mesh>
      <mesh position={[10.31, N_SHELF_TOP + ON + 0.109, N_BACK + 0.11]} rotation={[0, 0, 0.45]}>
        <cylinderGeometry args={[0.004, 0.004, 0.2, 5]} />
        <meshStandardMaterial color="#6b5a4a" />
      </mesh>
      <mesh position={[10.2665, N_SHELF_TOP + ON + 0.199, N_BACK + 0.11]}>
        <sphereGeometry args={[0.009, 6, 5]} />
        <meshStandardMaterial color="#ff6a3a" emissive="#ff6a3a" emissiveIntensity={0.45} />
      </mesh>

      {/* daruma trinket — red body, cream face patch proud of its front */}
      <mesh position={[10.64, N_SHELF_TOP + ON + 0.055, N_BACK + 0.112]} scale={[1, 0.95, 1]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshStandardMaterial color="#a8352f" />
      </mesh>
      <mesh position={[10.64, N_SHELF_TOP + ON + 0.065, N_BACK + 0.16]} scale={[1, 1, 0.4]}>
        <sphereGeometry args={[0.034, 8, 6]} />
        <meshStandardMaterial color={N_CREAM} />
      </mesh>

      {/* step-stool for putting shoes on — the only collidered piece of
          this pass. Seat/legs derive from GENKAN_STOOL_RECT (ST). */}
      <mesh position={[ST.x + ST.w / 2, STOOL_TOP - STOOL_SEAT_T / 2, STOOL_SEAT_ZC]} castShadow receiveShadow>
        <boxGeometry args={[ST.w, STOOL_SEAT_T, STOOL_SEAT_D]} />
        <meshStandardMaterial color={N_WOOD_WARM} />
      </mesh>
      {[ST.x + 0.05, ST.x + ST.w - 0.05].flatMap((x) =>
        [N_BACK + 0.037, N_BACK + STOOL_SEAT_D - 0.037].map((z) => (
          <mesh
            key={`stleg${x}-${z}`}
            position={[x, (FLOOR_Y + STOOL_TOP - STOOL_SEAT_T) / 2, z]}
          >
            <boxGeometry args={[0.06, STOOL_TOP - STOOL_SEAT_T - FLOOR_Y, 0.06]} />
            <meshStandardMaterial color={N_WOOD_DARK} />
          </mesh>
        ))
      )}
      {/* folded cloth on the stool */}
      <mesh position={[ST.x + 0.58, STOOL_TOP + ON + 0.025, STOOL_SEAT_ZC + 0.004]}>
        <boxGeometry args={[0.26, 0.05, 0.2]} />
        <meshStandardMaterial color="#6e7f8c" />
      </mesh>
      <mesh position={[ST.x + 0.58, STOOL_TOP + ON + 0.071, STOOL_SEAT_ZC + 0.02]}>
        <boxGeometry args={[0.24, 0.03, 0.12]} />
        <meshStandardMaterial color="#5c6d7a" />
      </mesh>

      {/* coat rail + 3 hooks, on the doorway side of the west segment
          (x-max derived from the doorway keep-out, never hardcoded) */}
      <mesh position={[RAIL_XC, 1.65, N_BACK + 0.015]}>
        <boxGeometry args={[RAIL_W, 0.04, 0.03]} />
        <meshStandardMaterial color={N_WOOD} />
      </mesh>
      {[RAIL_XC - 0.115, RAIL_XC, RAIL_XC + 0.115].map((x, i) => (
        <mesh key={`hook${i}`} position={[x, 1.628, N_BACK + 0.04]}>
          <boxGeometry args={[0.022, 0.055, 0.05]} />
          <meshStandardMaterial color={N_BRASS} metalness={0.5} roughness={0.45} />
        </mesh>
      ))}
      {/* tote bag hanging on the west hook */}
      <mesh position={[RAIL_XC - 0.115, 1.44, N_BACK + 0.06]} castShadow>
        <boxGeometry args={[0.22, 0.3, 0.055]} />
        <meshStandardMaterial color="#2f3440" />
      </mesh>
      <mesh position={[RAIL_XC - 0.115, 1.62, N_BACK + 0.064]}>
        <boxGeometry args={[0.025, 0.16, 0.018]} />
        <meshStandardMaterial color="#454c5c" />
      </mesh>
      {/* keyring on the east hook — brass ring + 2 key slivers */}
      <mesh position={[RAIL_XC + 0.115, 1.6, N_BACK + 0.05]}>
        <torusGeometry args={[0.022, 0.005, 6, 12]} />
        <meshStandardMaterial color={N_BRASS} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[RAIL_XC + 0.107, 1.553, N_BACK + 0.05]} rotation={[0, 0, 0.16]}>
        <boxGeometry args={[0.012, 0.05, 0.004]} />
        <meshStandardMaterial color={N_BRASS} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[RAIL_XC + 0.123, 1.556, N_BACK + 0.054]} rotation={[0, 0, -0.22]}>
        <boxGeometry args={[0.011, 0.045, 0.004]} />
        <meshStandardMaterial color="#b08f4e" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* ── EAST SEGMENT ── */}

      {/* framed print (poster-wave-arc, 32x40 portrait — unused elsewhere
          in the house, so it doesn't echo an existing wall). Picture plane
          8mm proud of the frame's front face. */}
      <mesh position={[14.0, 1.7, N_BACK + 0.0175]} castShadow>
        <boxGeometry args={[0.9, 1.1, 0.035]} />
        <meshStandardMaterial color={N_WOOD} />
      </mesh>
      <mesh position={[14.0, 1.7, N_BACK + 0.043]}>
        <planeGeometry args={[0.8, 1.0]} />
        <meshStandardMaterial map={printTex} />
      </mesh>

      {/* slim floating console shelf under the print + two brackets */}
      <mesh position={[CONSOLE_X + 0.9, N_CONSOLE_TOP - 0.025, N_BACK + 0.12]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.05, 0.24]} />
        <meshStandardMaterial color={N_WOOD} />
      </mesh>
      {[CONSOLE_X + 0.3, CONSOLE_X + 1.5].map((x) => (
        <mesh key={`cobr${x}`} position={[x, N_CONSOLE_TOP - 0.12, N_BACK + 0.09]}>
          <boxGeometry args={[0.05, 0.14, 0.18]} />
          <meshStandardMaterial color={N_WOOD_DARK} />
        </mesh>
      ))}

      {/* shallow ceramic key bowl + 2 brass keys resting on its rim */}
      <mesh position={[CONSOLE_X + 0.32, N_CONSOLE_TOP + ON + 0.0225, N_BACK + 0.122]}>
        <cylinderGeometry args={[0.09, 0.065, 0.045, 12]} />
        <meshStandardMaterial color="#8f9bab" />
      </mesh>
      <mesh position={[CONSOLE_X + 0.3, N_CONSOLE_TOP + ON + 0.057, N_BACK + 0.117]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.012, 0.004, 0.055]} />
        <meshStandardMaterial color={N_BRASS} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[CONSOLE_X + 0.345, N_CONSOLE_TOP + ON + 0.057, N_BACK + 0.132]} rotation={[0, -0.4, 0]}>
        <boxGeometry args={[0.011, 0.004, 0.05]} />
        <meshStandardMaterial color="#b08f4e" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* stack of 3 letters, slightly fanned, 8mm apart */}
      {[
        [0.83, 0.006, 0.06],
        [0.85, 0.022, -0.05],
        [0.82, 0.038, 0.12],
      ].map(([dx, dy, yaw], i) => (
        <mesh
          key={`letter${i}`}
          position={[CONSOLE_X + dx, N_CONSOLE_TOP + ON + dy, N_BACK + 0.12]}
          rotation={[0, yaw, 0]}
        >
          <boxGeometry args={[0.22, 0.008, 0.15]} />
          <meshStandardMaterial color={i === 1 ? "#ddd0b6" : N_CREAM} />
        </mesh>
      ))}

      {/* small potted plant */}
      <mesh position={[CONSOLE_X + 1.35, N_CONSOLE_TOP + ON + 0.05, N_BACK + 0.122]}>
        <cylinderGeometry args={[0.05, 0.04, 0.1, 8]} />
        <meshStandardMaterial color="#8a5f4a" />
      </mesh>
      <mesh position={[CONSOLE_X + 1.32, N_CONSOLE_TOP + ON + 0.125, N_BACK + 0.112]} scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.05, 7, 5]} />
        <meshStandardMaterial color="#4a7a58" />
      </mesh>
      <mesh position={[CONSOLE_X + 1.38, N_CONSOLE_TOP + ON + 0.14, N_BACK + 0.13]} scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.042, 7, 5]} />
        <meshStandardMaterial color="#3d6b4b" />
      </mesh>

      {/* tiny folded paper crane — body + two tilted wings */}
      <mesh position={[CONSOLE_X + 1.67, N_CONSOLE_TOP + ON + 0.012, N_BACK + 0.122]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.09, 0.012, 0.06]} />
        <meshStandardMaterial color={N_CREAM} />
      </mesh>
      <mesh
        position={[CONSOLE_X + 1.655, N_CONSOLE_TOP + ON + 0.039, N_BACK + 0.114]}
        rotation={[0.5, 0.4, 0.35]}
      >
        <boxGeometry args={[0.085, 0.01, 0.05]} />
        <meshStandardMaterial color="#f0e7d4" />
      </mesh>
      <mesh
        position={[CONSOLE_X + 1.688, N_CONSOLE_TOP + ON + 0.039, N_BACK + 0.132]}
        rotation={[-0.5, 0.4, -0.35]}
      >
        <boxGeometry args={[0.085, 0.01, 0.05]} />
        <meshStandardMaterial color="#f0e7d4" />
      </mesh>

      {/* noren-style indigo fabric strip between the print and the
          umbrella stand corner — rod, cloth, one pale brush stroke */}
      <mesh position={[15.5, 2.27, N_BACK + 0.014]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.4, 6]} />
        <meshStandardMaterial color={N_WOOD_DARK} />
      </mesh>
      <mesh position={[15.5, 1.76, N_BACK + 0.01]} castShadow>
        <boxGeometry args={[0.3, 1.0, 0.012]} />
        <meshStandardMaterial color="#2f3a63" />
      </mesh>
      <mesh position={[15.5, 1.82, N_BACK + 0.026]}>
        <boxGeometry args={[0.11, 0.36, 0.008]} />
        <meshStandardMaterial color="#b9c2d8" />
      </mesh>
      </GenkanOnly>
    </group>
  );
}
