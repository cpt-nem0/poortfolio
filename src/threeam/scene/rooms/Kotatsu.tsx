"use client";

import { usePixelTexture } from "../usePixelTexture";
import { COMMON_RECTS } from "@/threeam/world/layout";

/* ── COMMON KOTATSU PASS (owner-approved: the common area becomes a
   Japanese kotatsu living room). Split out of CommonArea.tsx purely for
   size — this file owns the SW-quadrant kotatsu set only (tatami rug,
   table + futon skirt + heater glow, four zabuton, tabletop props).

   EVERY position derives from COMMON_RECTS.kotatsu (layout.ts), per the
   house rule that colliders are the single source of truth. The rect's
   z-band is doubly pinned (see its comment in layout.ts): the north
   zabuton's own edge must stay 0.05m south of the divider doorway gap's
   DOOR_HI, and the south zabuton must stay north of the room's south
   wall — 2.1m total, which is exactly `rect.d`. So the cushions sit a
   little tighter to the table than a textbook 0.3m stand-off and tuck
   under the futon's drape instead; that's how a real kotatsu is used
   anyway (you sit on the zabuton with your legs under the quilt).

   No light source lives in here. The heater is an EMISSIVE-ONLY plane
   under the skirt (house rule: no invisible light sources — a point light
   here would have no visible fixture to live inside), sized slightly
   larger than the futon so a soft orange line bleeds out at the hem. ── */

const RECT = COMMON_RECTS.kotatsu;
const CX = RECT.x + RECT.w / 2; // 9.75
const CZ = RECT.z + RECT.d / 2; // 4.90

const TABLE = 1.1; // table top, square
const TOP_T = 0.04; // top thickness
const TOP_Y = 0.38; // top's CENTER height (kotatsu height ≈ 0.38m)
const TOP_FACE = TOP_Y + TOP_T / 2; // 0.40 — props sit ≥6mm above this
const PROP_Y = TOP_FACE + 0.008;

const SKIRT = 1.45; // quilted futon, draping past the top on all sides
const SKIRT_Y0 = 0.16;
const SKIRT_Y1 = 0.35; // 10mm under the table top — no coplanar fight

const ZAB = 0.55; // zabuton cushion, square
const ZAB_H = 0.07;
const ZAB_Y0 = 0.042; // cushions rest ON the tatami: 7mm above the rug plane (0.035), over the house's 6mm rule — 0.038 was only 3mm
const ZAB_CLEAR = 0.025; // cushion edge → collider edge (N/S), see layout.ts
const ZAB_CLEAR_X = 0.125; // cushion edge → collider edge (W/E)

const RUG_W = 2.7;
const RUG_D = 2.0;
const RUG_Y = 0.035; // house convention for floor rugs (floor plane is 0.02)
const HEATER_Y = 0.05; // 15mm above the rug, 110mm below the skirt's hem

const WOOD_DARK = "#3b2418"; // table top / legs — dark stained wood
const WOOD_EDGE = "#4d3121";

/** Futon quilt — LOCKED deep red (Rohan 2026-10-19: "red color futon");
 *  tints the shared linen-quilt texture via material color. The indigo /
 *  ochre variants and the KeyK style gate were stripped with the pick. */
const FUTON_COLOR = "#8f3338";

const ZABUTON_COLORS = ["#2f3f6e", "#a8762c", "#8d4a48", "#2f3f6e"]; // N, S, W, E — indigo / ochre / dusty red

/** One zabuton: a squat rounded-ish box with a tufted button on top. */
function Zabuton({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, ZAB_Y0, z]}>
      <mesh position={[0, ZAB_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[ZAB, ZAB_H, ZAB]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* piped edge band, 8mm proud of the cushion's sides */}
      <mesh position={[0, ZAB_H / 2, 0]}>
        <boxGeometry args={[ZAB + 0.016, ZAB_H * 0.45, ZAB + 0.016]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      {/* centre tuft, 8mm above the cushion face */}
      <mesh position={[0, ZAB_H + 0.008, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.012, 8]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
    </group>
  );
}

/** Small cast-iron teacup. */
function Cup({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, PROP_Y, z]}>
      <mesh position={[0, 0.026, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.026, 0.052, 10]} />
        <meshStandardMaterial color="#2b2b30" roughness={0.6} />
      </mesh>
      {/* tea surface, 6mm below the rim */}
      <mesh position={[0, 0.046, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.026, 10]} />
        <meshStandardMaterial color="#6b4a1e" emissive="#3a2408" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

/** Tabletop clutter — teapot, cups, mandarins, cans, snacks, cards.
 *  Positions are LOCAL to the table's centre (±TABLE/2). */
function TableProps() {
  return (
    <group position={[CX, 0, CZ]}>
      {/* cast-iron teapot (tetsubin): squat body, lid knob, spout, handle */}
      <group position={[-0.3, PROP_Y, -0.18]}>
        <mesh position={[0, 0.07, 0]} castShadow>
          <sphereGeometry args={[0.085, 10, 8]} />
          <meshStandardMaterial color="#26262b" roughness={0.55} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0.142, 0]}>
          <cylinderGeometry args={[0.042, 0.05, 0.022, 10]} />
          <meshStandardMaterial color="#1d1d22" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.162, 0]}>
          <sphereGeometry args={[0.016, 8, 6]} />
          <meshStandardMaterial color="#b58a3c" roughness={0.4} metalness={0.5} />
        </mesh>
        {/* spout, angled up and out */}
        <mesh position={[0.085, 0.085, 0.02]} rotation={[0, -0.3, -0.7]}>
          <cylinderGeometry args={[0.012, 0.018, 0.09, 8]} />
          <meshStandardMaterial color="#26262b" roughness={0.55} metalness={0.25} />
        </mesh>
        {/* bail handle */}
        <mesh position={[0, 0.155, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.072, 0.007, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#1d1d22" roughness={0.5} metalness={0.35} />
        </mesh>
      </group>

      <Cup x={-0.12} z={-0.32} />
      <Cup x={0.02} z={-0.24} />
      <Cup x={-0.17} z={0.07} />
      <Cup x={-0.05} z={0.2} />

      {/* bowl of mandarins */}
      <group position={[0.27, PROP_Y, 0.12]}>
        <mesh position={[0, 0.035, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.085, 0.07, 12]} />
          <meshStandardMaterial color="#d9cdb0" roughness={0.9} />
        </mesh>
        {[
          [-0.05, 0.085, -0.04],
          [0.045, 0.085, -0.045],
          [0.0, 0.085, 0.05],
          [-0.06, 0.088, 0.04],
          [0.06, 0.09, 0.03],
          [0.0, 0.145, 0.0],
        ].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]} castShadow>
            <sphereGeometry args={[0.038, 8, 6]} />
            <meshStandardMaterial color={i % 2 ? "#e07a28" : "#d8691f"} roughness={0.85} />
          </mesh>
        ))}
      </group>

      {/* two drink cans — one upright, one knocked over and rolling */}
      <mesh position={[0.36, PROP_Y + 0.065, -0.26]} castShadow>
        <cylinderGeometry args={[0.033, 0.033, 0.13, 10]} />
        <meshStandardMaterial color="#4a6f8f" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh
        position={[0.12, PROP_Y + 0.033, 0.37]}
        rotation={[Math.PI / 2, 0, 0.55]}
        castShadow
      >
        <cylinderGeometry args={[0.033, 0.033, 0.13, 10]} />
        <meshStandardMaterial color="#8a4a3c" roughness={0.4} metalness={0.4} />
      </mesh>

      {/* snack bowl (senbei / crisps), shallow and wide */}
      <group position={[-0.34, PROP_Y, 0.28]}>
        <mesh position={[0, 0.028, 0]} castShadow>
          <cylinderGeometry args={[0.105, 0.07, 0.056, 12]} />
          <meshStandardMaterial color="#3a3a46" roughness={0.9} />
        </mesh>
        {[
          [-0.03, 0.062, 0.0, 0.5],
          [0.035, 0.064, -0.02, -0.8],
          [0.005, 0.08, 0.03, 0.2],
        ].map((p, i) => (
          <mesh key={i} position={[p[0], p[1], p[2]]} rotation={[0.3, p[3], 0.2]}>
            <boxGeometry args={[0.05, 0.008, 0.05]} />
            <meshStandardMaterial color="#c89a52" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* small akari table lamp (owner ask 2026-10-19: "a small lamp on the
          kotatsu") — north-centre of the top, behind the mandarins from the
          camera. Turned-wood base, cream washi cylinder shade, wood cap.
          The pointLight is a CHILD of this un-rotated group at the shade's
          centre (HANDOFF §7 #1). Light BUDGET (§5, ≤19 across two bands):
          this light is paid for by the SE andon going emissive-only in
          CommonArea.tsx — the middle chochin already pools that corner. */}
      <group position={[-0.02, PROP_Y, -0.38]}>
        <mesh position={[0, 0.012, 0]}>
          <cylinderGeometry args={[0.05, 0.055, 0.024, 10]} />
          <meshStandardMaterial color="#3a2a1c" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.036, 6]} />
          <meshStandardMaterial color="#3a2a1c" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.048 + 0.08, 0]}>
          <cylinderGeometry args={[0.068, 0.062, 0.16, 12, 1, true]} />
          <meshStandardMaterial color="#f1e3c4" emissive="#ffc187" emissiveIntensity={0.5} roughness={1} side={2} />
        </mesh>
        <mesh position={[0, 0.048 + 0.16 + 0.008, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.016, 12]} />
          <meshStandardMaterial color="#3a2a1c" roughness={0.9} />
        </mesh>
        <pointLight position={[0, 0.048 + 0.08, 0]} color="#ffc187" intensity={2.0} distance={2.8} decay={2} />
      </group>

      {/* deck of cards + two fanned out beside it */}
      <mesh position={[0.33, PROP_Y + 0.011, 0.36]} rotation={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.062, 0.022, 0.09]} />
        <meshStandardMaterial color="#e6ddc8" roughness={0.9} />
      </mesh>
      <mesh position={[0.21, PROP_Y + 0.002, 0.33]} rotation={[0, -0.5, 0]}>
        <boxGeometry args={[0.058, 0.002, 0.086]} />
        <meshStandardMaterial color="#efe7d4" roughness={0.9} />
      </mesh>
      <mesh position={[0.17, PROP_Y + 0.005, 0.38]} rotation={[0, -1.0, 0]}>
        <boxGeometry args={[0.058, 0.002, 0.086]} />
        <meshStandardMaterial color="#efe7d4" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function KotatsuSet() {
  const tatami = usePixelTexture("/3am/tex/rug-tatami.png", 3, 2);
  const quilt = usePixelTexture("/3am/tex/linen-quilt.png", 3, 3);

  const legOff = TABLE / 2 - 0.09;

  return (
    <group>
      {/* tatami rug — visual only, no collider (house rule for rugs) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CX, RUG_Y, CZ]} receiveShadow>
        <planeGeometry args={[RUG_W, RUG_D]} />
        <meshStandardMaterial map={tatami} />
      </mesh>

      {/* heater glow — emissive-only plane under the skirt, 15mm above the
          rug and 110mm below the futon's hem, a touch wider than the futon
          so a warm orange line bleeds out all the way round. NOT a light. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CX, HEATER_Y, CZ]}>
        <planeGeometry args={[SKIRT + 0.06, SKIRT + 0.06]} />
        <meshStandardMaterial
          color="#5a1f06"
          emissive="#ff7a24"
          emissiveIntensity={0.9}
        />
      </mesh>

      {/* four short square legs */}
      {[
        [-legOff, -legOff],
        [legOff, -legOff],
        [-legOff, legOff],
        [legOff, legOff],
      ].map(([dx, dz], i) => (
        <mesh
          key={i}
          position={[CX + dx, (TOP_Y - TOP_T / 2) / 2, CZ + dz]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.075, TOP_Y - TOP_T / 2, 0.075]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}

      {/* quilted futon skirt — sits between the legs and the top, its four
          sides draping past the table on every edge */}
      <mesh position={[CX, (SKIRT_Y0 + SKIRT_Y1) / 2, CZ]} castShadow receiveShadow>
        <boxGeometry args={[SKIRT, SKIRT_Y1 - SKIRT_Y0, SKIRT]} />
        <meshStandardMaterial map={quilt} color={FUTON_COLOR} roughness={1} />
      </mesh>

      {/* dark wood top, resting on the quilt */}
      <mesh position={[CX, TOP_Y, CZ]} castShadow receiveShadow>
        <boxGeometry args={[TABLE, TOP_T, TABLE]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.55} />
      </mesh>
      {/* slim lighter edge band, 8mm proud of the top's sides. Raised 6mm
          (was TOP_Y - 0.012): at that y its underside landed at 0.360,
          exactly coplanar with the table top's own underside. Now 0.366
          vs 0.360, and its top (0.374) still sits under the top face. */}
      <mesh position={[CX, TOP_Y - 0.006, CZ]}>
        <boxGeometry args={[TABLE + 0.016, TOP_T * 0.4, TABLE + 0.016]} />
        <meshStandardMaterial color={WOOD_EDGE} roughness={0.6} />
      </mesh>

      {/* four zabuton — north, south, west, east */}
      <Zabuton
        x={CX}
        z={RECT.z + ZAB_CLEAR + ZAB / 2}
        color={ZABUTON_COLORS[0]}
      />
      <Zabuton
        x={CX}
        z={RECT.z + RECT.d - ZAB_CLEAR - ZAB / 2}
        color={ZABUTON_COLORS[1]}
      />
      <Zabuton
        x={RECT.x + ZAB_CLEAR_X + ZAB / 2}
        z={CZ}
        color={ZABUTON_COLORS[2]}
      />
      <Zabuton
        x={RECT.x + RECT.w - ZAB_CLEAR_X - ZAB / 2}
        z={CZ}
        color={ZABUTON_COLORS[3]}
      />

      <TableProps />
    </group>
  );
}
