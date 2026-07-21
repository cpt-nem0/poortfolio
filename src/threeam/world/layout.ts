/**
 * Static floor plan for the /3am house. Pure data — no three.js, no React.
 * Units are meters. Origin at the house's north-west corner; x grows east
 * (bedroom → music nook), z grows south (toward the camera).
 */

export type Rect = { x: number; z: number; w: number; d: number };
export type RoomId = "bedroom" | "workspace" | "music" | "rooftop";
export type AreaId = "ground" | "roof";

export type Portal = {
  id: string;
  area: AreaId;
  /** Standing inside this rect arms the portal (HUD shows `label`). */
  trigger: Rect;
  toArea: AreaId;
  toPosition: { x: number; z: number };
  label: string;
};

export type Area = {
  id: AreaId;
  /** Outer walkable bounds; everything outside is blocked. */
  bounds: Rect;
  /** Blocked rectangles inside the bounds (interior walls; furniture later). */
  walls: Rect[];
  /** Solid furniture footprints — collide like walls but are rendered by
   *  room components (not by House), so art and physics share one source. */
  furniture: Rect[];
  rooms: { id: RoomId; rect: Rect }[];
};

const WALL_T = 0.2; // interior wall thickness
const DOOR_LO = 2.2; // doorway gap on z: [DOOR_LO, DOOR_HI]
const DOOR_HI = 3.8;

/** Interior dividing wall at `x` with a doorway gap, spanning depth `d`.
 *  `doorLo`/`doorHi` default to the shared interior-divider gap (used by
 *  the workspace/music dividers below) but can be overridden — the engawa
 *  wall (below) reuses this same thick-wall idiom with its own, wider
 *  gap. */
function dividerWithDoor(
  x: number,
  d: number,
  doorLo: number = DOOR_LO,
  doorHi: number = DOOR_HI
): Rect[] {
  return [
    { x: x - WALL_T / 2, z: 0, w: WALL_T, d: doorLo },
    { x: x - WALL_T / 2, z: doorHi, w: WALL_T, d: d - doorHi },
  ];
}

// ── engawa (P4 engawa rework, renamed from "balcony" — this is a
// ground-level Japanese veranda overlooking the future outside area, not
// an elevated balcony) — the bedroom's west wall (x=0) opens onto a
// walkable step-out deck through a wide sliding glass door. There's no
// RoomId/AreaId for it (it's part of the bedroom/ground area), so
// "engawa" only exists as these consts + comments; layout.ts stays the
// source of truth for every collider, Bedroom.tsx renders the visuals.
//
// REWORK (this pass, owner feedback: prior version read "dark, boxed,
// paper-thin-walled"): five structural fixes, all pure rect arithmetic —
//
// 1. DOOR WIDENED: the walk-through gap grows from z 2.7-4.1 (1.4m) to
//    z 2.5-4.3 (1.8m) — see ENGAWA_DOOR_LO/HI below. The old code drew two
//    glass panels but only ever gave the wall a collider at the two thin
//    door-jamb slivers — the "fixed" pane (the door's other half) had NO
//    collider, so a player could walk straight through painted glass.
//    Fixed: ENGAWA_DOOR_GLASS_RECT below is a real furniture collider
//    matching the fixed pane's z-band exactly (z 2.5-3.4, half the new
//    opening), leaving z 3.4-4.3 (0.9m) as the genuinely walkable gap.
//
// 2. THICK WALL: pre-rework, the "west wall" was two 0.14m-wide door-jamb
//    slivers plus a paper-thin 11mm-offset texture plane — it read flat.
//    ENGAWA_WALL_N/S (below) rebuild it with the SAME thick-wall idiom
//    every interior divider uses (`dividerWithDoor`, WALL_T=0.2, box
//    x -0.1..0.1) called with the engawa's own (wider) door bounds:
//    `dividerWithDoor(0, 6, ENGAWA_DOOR_LO, ENGAWA_DOOR_HI)`. These live in
//    `walls` (not `furniture`) so House.tsx's generic perimeter loop
//    renders them as real full-height boxes, solid from both faces, same
//    as the x=8/x=16 dividers. Bedroom.tsx paints both faces (bedroom-side
//    sage, engawa-side a darker sage/plaster tint) flush against this
//    box's two faces (x=0.1 and x=-0.1) instead of a single thin plane at
//    x=0.
//
// 3. DECK EXTENDED (seating-nook room, west + a bit deeper in z): deck
//    grows from {x:-1.5,z:2.3,w:1.5,d:2.2} to {x:-2.7,z:2.1,w:2.7,d:2.5}
//    (west edge -1.5→-2.7, z-band 2.3-4.5→2.1-4.6). `bounds` grows to
//    match (x -1.7→-2.9, w 23.7→24.9 — east edge x+w stays 22, only the
//    west edge moves). ENGAWA_WALL_BLOCK_N/S (the invisible collision
//    backstop for the void beyond the deck's own z-band — see "BALCONY
//    FREED" below, renamed ENGAWA FREED) shrink their z-bands to match
//    (0-2.1 / 4.6-6, was 0-2.3 / 4.5-6) and extend west to the new
//    bounds.x (-2.9, was -1.7).
//
// 4. WOODEN RAILING: ENGAWA_RAIL_W/N/S move to the deck's new outer edges
//    (same flush-against-the-edge convention as before, re-derived for the
//    bigger deck). UNLIKE the prior "ENGAWA/BALCONY FREED" pass (which
//    made all three rails invisible so the deck didn't read as boxed-in by
//    "giant dark slabs"), this rework gives all three a real but SLENDER
//    post-and-top-rail mesh in Bedroom.tsx — chunky wood, posts every
//    ~0.5m, not a solid wall panel, so it reads as a railing rather than a
//    box. West/north stand normal height (~0.9m); south — the edge facing
//    the dollhouse camera — stays deliberately LOW (~0.5m) so the player
//    is still visible over it, preserving the open feel from the prior
//    pass without going back to zero visual railing. Collider rects are
//    unaffected by any of this (posts/rail are visual-only additions on
//    top of the existing collider footprint).
//
// 5. RESERVE (comment only, NOT built this wave): a bonsai-pedestal spot
//    on the deck's SOUTH side, roughly x -1.6..-1.2, z 4.2-4.5 (clear of
//    the south rail's 6cm band and the door-gap's walk line). The rest of
//    the deck's dressing — folding chair + glass tea table, railing
//    plants, paper lantern, eave overhang, moonlight shaft — is a
//    separate, later wave; nothing beyond structure (wall/door/deck/rail)
//    lands here.
//
// ENGAWA FREED (kept from the prior pass, renamed from "BALCONY FREED"):
// `isBlocked`/`resolveMovement` OR together `walls` and `furniture`
// (collision.ts) — collision-identical, they only differ in who renders
// them. ENGAWA_WALL_BLOCK_N/S exist purely to backstop collision for the
// void beyond the deck's own footprint (not real, seen walls), so they
// stay in `furniture` (invisible) — only ENGAWA_WALL_N/S (the real, thick,
// visible wall — fix #2 above) live in `walls`.
const ENGAWA_DOOR_LO = 2.5; // sliding-door opening start (z) — was 2.7
const ENGAWA_DOOR_HI = 4.3; // sliding-door opening end (z) — was 4.1
const ENGAWA_DECK_Z0 = 2.1; // deck's north edge (z) — was 2.3
const ENGAWA_DECK_Z1 = 4.6; // deck's south edge (z) — was 4.5
const ENGAWA_DECK_X0 = -2.7; // deck's west edge (x) — was -1.5

// wall blocks: invisible collision backstop for the void beyond the
// deck's z-band, spanning the full new bounds width (x -2.9..0).
const ENGAWA_WALL_BLOCK_N: Rect = { x: -2.9, z: 0, w: 2.9, d: ENGAWA_DECK_Z0 }; // z 0-2.1
const ENGAWA_WALL_BLOCK_S: Rect = { x: -2.9, z: ENGAWA_DECK_Z1, w: 2.9, d: 1.4 }; // z 4.6-6

// real, thick, visible west wall — same idiom as every interior divider
// (dividerWithDoor, WALL_T=0.2, box x -0.1..0.1), just with the engawa's
// own (wider) door bounds instead of the shared DOOR_LO/DOOR_HI.
const [ENGAWA_WALL_N, ENGAWA_WALL_S] = dividerWithDoor(
  0,
  6,
  ENGAWA_DOOR_LO,
  ENGAWA_DOOR_HI
); // {x:-0.1,z:0,w:0.2,d:2.5} and {x:-0.1,z:4.3,w:0.2,d:1.7}

// fixed glass pane's collider — the walk-through gap's OTHER half (z
// 2.5-3.4) is genuinely solid glass, not just uncollided air (see fix #1
// above). Thin, centered on the wall plane, same 0.06 thickness as a rail.
const ENGAWA_DOOR_GLASS_RECT: Rect = { x: -0.06, z: ENGAWA_DOOR_LO, w: 0.06, d: 0.9 };

// railing colliders — moved to the enlarged deck's new outer edges. West
// rail sits flush OUTSIDE the deck's west edge (same convention as
// before); north/south rails occupy the deck's own outermost 6cm band
// (flush with its z-min/z-max respectively).
// x computed (not a hardcoded -2.76 literal) so x+w round-trips to exactly
// ENGAWA_DECK_X0 in floating point — a hardcoded literal here parses to a
// different double than this subtraction and makes the rail spuriously
// "overlap" the north rail's corner by a ~3e-16 epsilon (caught by
// furniture.test.ts's exact-overlap check).
const ENGAWA_RAIL_W: Rect = { x: ENGAWA_DECK_X0 - 0.06, z: ENGAWA_DECK_Z0, w: 0.06, d: 2.5 }; // x -2.76..-2.70
const ENGAWA_RAIL_N: Rect = { x: ENGAWA_DECK_X0, z: ENGAWA_DECK_Z0, w: 2.7, d: 0.06 }; // z 2.1-2.16
const ENGAWA_RAIL_S: Rect = { x: ENGAWA_DECK_X0, z: 4.54, w: 2.7, d: 0.06 }; // z 4.54-4.60

const GROUND: Area = {
  id: "ground",
  bounds: { x: -2.9, z: 0, w: 24.9, d: 6 },
  walls: [
    ...dividerWithDoor(8, 6),
    ...dividerWithDoor(16, 6),
    // ENGAWA_WALL_BLOCK_N/S deliberately NOT here — see the ENGAWA FREED
    // comment above: they live in `furniture` (invisible, same collision).
    // ENGAWA_WALL_N/S are the real, thick, visible west wall.
    ENGAWA_WALL_N,
    ENGAWA_WALL_S,
  ],
  furniture: [
    // bedroom — FURNISHING WAVE (owner's final bedroom design sketch,
    // 2026-07-19): the single nightstand is REPLACED by a flanking pair
    // (west/east of the bed), and a full furnishing pass adds a sofa, cat
    // bed, bed-front bench, sunset-lamp stool, clothes hanger, perfume
    // stand, and a second plant. SPAWN moved {4,3.6}→{4,4.3} below: the new
    // bed-front bench ({3.5,2.95,1.2,0.4}) sits astride the old spawn's
    // approach and the bed's foot itself grew close to z=3.6 in prior
    // passes — {4,4.3} clears the bench by 0.95m (see furniture.test.ts's
    // exhaustive pairwise check) and stays well south of the about
    // trigger's z-band. Pairwise clearance arithmetic for every new rect
    // lives in p4-furnish-report.md (checked programmatically before this
    // pass landed, zero overlaps).
    { x: 2.9, z: 0.33, w: 2.2, d: 2.5 }, // bed (headboard north, centered on the wall, SUPER-KING)
    { x: 2.25, z: 0.4, w: 0.55, d: 0.5 }, // west nightstand (bed's west flank, two-drawer cabinet + lamp)
    { x: 5.25, z: 0.4, w: 0.55, d: 0.5 }, // east nightstand (bed's east flank, two-drawer cabinet + lamp)
    { x: 0.45, z: 5.1, w: 0.4, d: 0.4 }, // plant (SW corner)
    { x: 0.95, z: 5.15, w: 0.35, d: 0.35 }, // second plant (SW corner, beside the first)
    { x: 0.6, z: 0.4, w: 0.95, d: 0.95 }, // single-person sofa/armchair (NW corner)
    { x: 5.85, z: 0.42, w: 0.4, d: 0.4 }, // sunset-lamp stool (NE-ish, east of the east nightstand)
    { x: 7.05, z: 0.45, w: 0.55, d: 0.55 }, // cat's round bed (NE corner)
    { x: 3.5, z: 2.95, w: 1.2, d: 0.4 }, // bed-front bench (bed's foot, south of the bed's z-max 2.83)
    { x: 3.3, z: 5.35, w: 2.2, d: 0.5 }, // clothes hanger stand (south-center, A-frame rack + boutique clothes)
    // shoe storage — NEW (wardrobe corner upgrade, 2026-07-19), beside the
    // rack's east flank. TDD'd against its neighbors: rack's x-max is
    // 3.3+2.2=5.5, so 5.62-5.5=0.12m (12cm) clearance; perfume stand's
    // x-min is 6.55, so 6.55-(5.62+0.8)=0.13m (13cm) clearance — both clear
    // the pairwise-overlap check below with room to spare, no adjustment
    // needed from the owner's spec'd numbers.
    { x: 5.62, z: 5.35, w: 0.8, d: 0.45 }, // shoe storage cubby (2-shelf, east of the rack)
    { x: 6.55, z: 5.3, w: 1.0, d: 0.5 }, // perfume stand / slim dresser (SE)
    // window table + its west-window neighbor are REMOVED (superseded by
    // the engawa: glass sliding door + walkable deck); see the ENGAWA_*
    // rects above `GROUND` and Bedroom.tsx. The bonsai that was slated for
    // the window table now has a reserved (comment-only) pedestal spot on
    // the deck's south side instead — see the engawa comment block above.
    ENGAWA_RAIL_W,
    ENGAWA_RAIL_N,
    // ENGAWA_RAIL_S's collider stays (players still can't walk off the
    // deck's south edge). ENGAWA REWORK: all three rails are visible again
    // this pass (chunky wood posts + top rail in Bedroom.tsx) — the south
    // one is kept deliberately LOW (~0.5m) so it doesn't occlude the player
    // from the dollhouse camera, same intent as House.tsx's south-stub
    // convention, just applied to a real (short) railing instead of no
    // railing at all.
    ENGAWA_RAIL_S,
    // ENGAWA FREED — the flanking wall blocks (the void backstop beyond the
    // deck's own z-band) live in `furniture`, not `walls`, so House.tsx's
    // generic WallBox loop never draws them as giant flanking slabs.
    // Collision is untouched (collision.ts ORs both arrays); nothing
    // renders a mesh for these two rects.
    ENGAWA_WALL_BLOCK_N,
    ENGAWA_WALL_BLOCK_S,
    ENGAWA_DOOR_GLASS_RECT,
    { x: 17.6, z: 0.3, w: 2.8, d: 0.9 }, // record console, centered on the wall (turntable + speakers on top)
    { x: 20.675, z: 0.475, w: 0.35, d: 0.35 }, // floor lamp (right of console)
    { x: 16.5, z: 0.5, w: 0.35, d: 0.35 }, // snake plant (console's left flank)
    { x: 16.2, z: 1.7, w: 0.3, d: 0.3 }, // barrel cactus by the doorway
    { x: 18.1, z: 4.8, w: 1.8, d: 0.8 }, // sofa (sweet spot, facing the console)
    { x: 17.15, z: 4.9, w: 0.6, d: 0.6 }, // coffee table w/ lamp (sofa's left)
    { x: 20.9, z: 4.85, w: 0.6, d: 0.6 }, // guitar corner (cutaway acoustic + electric)
    // workspace
    { x: 9.7, z: 0.3, w: 2.6, d: 0.9 }, // desk
    { x: 10.4, z: 1.5, w: 0.8, d: 0.8 }, // desk chair (shifted west so the desk front reads clear)
    { x: 8.8, z: 5.15, w: 0.65, d: 0.7 }, // EVA-01 shrine (SW corner) — figure + plinth; widened wave F round 2 (1.8m figure's forward-leaning footprint measures ~8.80-9.41 x, 5.20-5.82 z in-browser)
    { x: 11.3, z: 5.54, w: 1.4, d: 0.44 }, // coffee counter (south wall, center) — machine + mug rack + lamp on top
    { x: 13.55, z: 5.3, w: 0.5, d: 0.5 }, // paper-lantern floor lamp (south wall, right of the coffee counter — same rect as the old tripod it replaced)
    { x: 15.45, z: 3.85, w: 0.44, d: 2.1 }, // full-wall bookshelf (east divider, workspace face, south of doorway — SE corner)
    // staircase to the roof — full flight footprint (shallow 10-step run
    // along the east divider). Depth is capped so the expanded blocking
    // (d + player radius = 2.91) stays clear of the music doorway band
    // (z 2.2–3.8 at x≈16) AND of the stairs-up portal trigger below
    // (furniture.test.ts asserts both).
    { x: 14.65, z: 0, w: 1.1, d: 2.56 },
  ],
  rooms: [
    { id: "bedroom", rect: { x: 0, z: 0, w: 8, d: 6 } },
    { id: "workspace", rect: { x: 8, z: 0, w: 8, d: 6 } },
    { id: "music", rect: { x: 16, z: 0, w: 6, d: 6 } },
  ],
};

const ROOF: Area = {
  id: "roof",
  bounds: { x: 8, z: 0, w: 8, d: 6 },
  walls: [],
  furniture: [
    // the same staircase flight emerges here — same footprint as on ground
    { x: 14.65, z: 0, w: 1.1, d: 2.56 },
  ],
  rooms: [{ id: "rooftop", rect: { x: 8, z: 0, w: 8, d: 6 } }],
};

export const HOUSE: { areas: Record<AreaId, Area>; portals: Portal[] } = {
  areas: { ground: GROUND, roof: ROOF },
  // Both stair portals share one trigger rect on purpose: the flight occupies
  // the same footprint on both floors. If the roof layout changes, split them.
  // The stairs are SOLID (see the staircase furniture rect, z 0..2.56), so
  // the trigger sits just south of the collider plus the player radius
  // (0.35): the player walks up to the base of the flight and presses E.
  // Its z-extent (3.0–3.7) also stays north of the bookshelf collider
  // (z 3.85+) so the whole trigger is standable.
  portals: [
    {
      id: "stairs-up",
      area: "ground",
      trigger: { x: 14.6, z: 3.0, w: 1.2, d: 0.7 },
      toArea: "roof",
      toPosition: { x: 12, z: 2 },
      label: "go up the stairs",
    },
    {
      id: "stairs-down",
      area: "roof",
      trigger: { x: 14.6, z: 3.0, w: 1.2, d: 0.7 },
      toArea: "ground",
      toPosition: { x: 14, z: 2 },
      label: "head downstairs",
    },
  ],
};

// SPAWN — FURNISHING WAVE moved this from {4,3.6}: the new bed-front bench
// ({3.5,2.95,1.2,0.4}, x 3.5-4.7, z 2.95-3.35) sits under the old spawn's
// x (4 is inside the bench's x-span), and its far z edge (3.35) is now
// closer than the player radius to z=3.6: 3.6-3.35=0.25 < 0.35 — the old
// spawn point is blocked. {4,4.3} is the new spot: x=4 is still inside the
// bench's x-span, so distance-to-bench is again just the z gap,
// 4.3-3.35=0.95 > 0.35 (clear), and it stays north of the clothes-hanger
// stand (z-min 5.35) and every other new south-wall rect. Also still clear
// of the about trigger {5.15,1.3,1.25,1.1} (x=4 is west of the trigger's
// x-min 5.15, unchanged from before) — see furniture.test.ts and
// invariants.test.ts for the exhaustive checks.
export const SPAWN = { area: "ground" as AreaId, x: 4, z: 4.3 };
