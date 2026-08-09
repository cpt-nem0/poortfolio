"use client";

import { usePixelTexture } from "../usePixelTexture";
import {
  GENKAN_ROOM as R,
  GENKAN_DOOR_LO,
  GENKAN_DOOR_HI,
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
        <pointLight castShadow shadow-mapSize={[256, 256]} shadow-bias={-0.0015} shadow-radius={3} shadow-intensity={0.85} color="#ffcf8f" intensity={3} distance={3.2} decay={2} />
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
    </group>
  );
}
