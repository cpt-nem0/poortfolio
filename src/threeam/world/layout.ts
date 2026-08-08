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
// 5. RESERVE — SUPERSEDED (ZEN GARDEN PASS, below): the placeholder
//    bonsai-pedestal spot this item used to reserve (x -1.6..-1.2,
//    z 5.6-5.9) is now the real built zen garden corner — see the ZEN
//    GARDEN PASS comment and ENGAWA_ZEN_STAND_RECT/ENGAWA_ZEN_ROCK_RECT
//    below. Kept here as history only.
//
// DRESSING WAVE (P4 engawa dressing, this pass — eave overhang, paper
// lantern, tea nook, railing plants, moonlight shaft; owner's ask: light
// the deck and give it some life). Only the seating nook needs new
// colliders — everything else (eave, lantern, plants, moonlight shaft) is
// either overhead (no XZ footprint a player can walk into) or small/
// against a rail (same "no collider" convention the corner plants already
// use elsewhere in the house):
//   - folding chair + glass-top tea table, deck's north half (originally z
//     2.1-3.4; FULL-LENGTH PASS moved the nook to z ~0.4-1.6, see the
//     ENGAWA_TEA_TABLE_RECT/ENGAWA_CHAIR_RECT comment above for the
//     up-to-date clearance arithmetic — the numbers below describe the
//     ORIGINAL DRESSING WAVE placement, kept for history): center -1.7,2.7,
//     footprint 0.45x0.45) and ENGAWA_CHAIR_RECT (center -2.15,2.75,
//     footprint 0.35x0.35, angled toward the table/view in Bedroom.tsx).
//     Chosen footprints leave a clean 5cm gap between them (chair's x-max
//     -1.975 to table's x-min -1.925) and comfortable clearance from every
//     neighboring collider: 37.5cm from the west rail (chair x-min -2.325
//     vs rail x-max -2.70), 41.5cm from the north rail (chair z-min 2.575
//     vs rail z-max 2.16), and both rects sit entirely north of the walk
//     gap (table z-max 2.925, 47.5cm clear of the gap's own z-min 3.4) and
//     of the reserved bonsai spot (z-min 4.2) — furniture.test.ts's
//     pairwise-overlap check + layout.test.ts's dedicated engawa-nook
//     probes both assert this (TDD'd RED→GREEN before landing, no
//     adjustment needed from the owner's spec'd centers).
//
// ENGAWA FREED (kept from the prior pass, renamed from "BALCONY FREED"):
// `isBlocked`/`resolveMovement` OR together `walls` and `furniture`
// (collision.ts) — collision-identical, they only differ in who renders
// them. Only ENGAWA_WALL_N/S (the real, thick, visible wall — fix #2
// above) live in `walls`; everything else engawa-related lives in
// `furniture`.
//
// FULL-LENGTH PASS (this pass, owner's ask: the engawa should run the
// FULL length of the bedroom's west side, not just the seating-nook stub):
// deck z-band grows from 2.1-4.6 (2.5m, a stub) to 0-6 (6.0m, the entire
// west wall's own z-extent — `bounds` already covered this, see the bounds
// test in layout.test.ts, so no bounds change is needed here). Because the
// deck now spans the SAME z-range as `bounds` itself, ENGAWA_WALL_BLOCK_N/S
// (the invisible backstop for the void beyond the old stub deck's z-band)
// are DELETED outright, not just repositioned — there is no more void west
// of the wall to backstop; that whole strip is real, walkable deck floor
// now. The west rail extends to match (z 0-6); the old "north"/"south"
// rails (which used to sit at the STUB deck's own inner edges, z 2.1 and
// 4.6 — nowhere near the house's actual north/south walls) become true
// NORTH-END and SOUTH-END rails at the house's own z=0/z=6 edges. Heights
// unchanged: west + north-end stay normal (RAIL_NORMAL_H, Bedroom.tsx),
// south-end stays deliberately low (RAIL_LOW_H) since it's still the edge
// facing the dollhouse camera. The door gap (z 2.5-4.3) and the thick wall
// flanking it are UNTOUCHED — the door is still the only way between the
// bedroom and the deck; the rest of the west wall (z 0-2.5, z 4.3-6) stays
// solid.
//
// ENGAWA NORTH-WALL FIX (this pass, owner ask: a full-height wall was
// visible on the deck's north end — remove it, railing there like the
// other edges): the culprit was NOT a rect in this file — every wall/rail
// rect here checked out fine (ENGAWA_WALL_N/S is the bedroom/deck divider,
// oriented along z at x≈0, not a wall across the deck's own north/south
// ends). It was House.tsx's generic perimeter-wall renderer: its
// north/south boxes are built from `bounds.x`, which the FULL-LENGTH PASS
// above left at -2.9 (to cover the deck) — so those boxes silently grew to
// span the deck's own width too, becoming invisible while the deck was
// still a short stub set back from z=0/z=6, then suddenly very visible
// once the deck ran the house's full z 0-6 length right up against them.
// Purely a rendering bug (isBlocked reads `bounds`/`walls`/`furniture`
// directly, never House.tsx's perimeter), fixed in House.tsx by clipping
// those two boxes to the core house's own x=0 edge — same treatment the
// west perimeter already gets. No rects in this file changed for it; the
// ENGAWA_RAIL_N/S colliders above already provide the deck's north/south
// edge collision, unaffected by any of this.
//
// DRESS2 PASS (this pass, owner ask: "the 0.9m gap is hard to line up" —
// widen the walkable pass-through to ~1.3m): two changes, neither touches
// the deck/rail footprint —
//   1. the door opening itself grows z 2.5-4.3 (1.8m) → z 2.4-4.4 (2.0m),
//      symmetric around the same center (ENGAWA_DOOR_ZC stays 3.4).
//   2. the fixed glass pane's own width SHRINKS from half the opening
//      (0.9m) to a fixed 0.7m (ENGAWA_DOOR_GLASS_W below) — no longer
//      derived as ENGAWA_DOOR_W/2, an intentional asymmetric split so the
//      extra opening width goes entirely to the walkable half instead of
//      being split 50/50 with the glass. Net walkable gap: (4.4-2.4)-0.7 =
//      1.3m (z 3.1-4.4), up from 0.9m (z 3.4-4.3) — the glass collider
//      (ENGAWA_DOOR_GLASS_RECT) still exactly matches the visible glass
//      pane Bedroom.tsx renders (DOOR_PANEL_W there, copied verbatim), and
//      the solid wall on both sides of the whole opening is untouched
//      (dividerWithDoor still splits the wall at the new, wider LO/HI).
const ENGAWA_DOOR_LO = 2.4; // sliding-door opening start (z) — was 2.5 (DRESS2 pass), 2.7 before that
const ENGAWA_DOOR_HI = 4.4; // sliding-door opening end (z) — was 4.3 (DRESS2 pass), 4.1 before that
const ENGAWA_DECK_Z0 = 0; // deck's north edge (z) — was 2.1, now the house's own north edge (FULL-LENGTH PASS)
const ENGAWA_DECK_Z1 = 6; // deck's south edge (z) — was 4.6, now the house's own south edge (FULL-LENGTH PASS)
const ENGAWA_DECK_X0 = -2.7; // deck's west edge (x) — was -1.5

// real, thick, visible west wall — same idiom as every interior divider
// (dividerWithDoor, WALL_T=0.2, box x -0.1..0.1), just with the engawa's
// own (wider) door bounds instead of the shared DOOR_LO/DOOR_HI.
const [ENGAWA_WALL_N, ENGAWA_WALL_S] = dividerWithDoor(
  0,
  6,
  ENGAWA_DOOR_LO,
  ENGAWA_DOOR_HI
); // {x:-0.1,z:0,w:0.2,d:2.4} and {x:-0.1,z:4.4,w:0.2,d:1.6} (DRESS2 pass)

// fixed glass pane's collider — the walk-through gap's OTHER half (z
// 2.4-3.1, DRESS2 pass) is genuinely solid glass, not just uncollided air
// (see fix #1 above). Thin, centered on the wall plane, same 0.06
// thickness as a rail. Width is now its own constant (DRESS2 pass), NOT
// half of ENGAWA_DOOR_W — see the DRESS2 PASS comment above for why the
// split is asymmetric.
const ENGAWA_DOOR_GLASS_W = 0.7; // fixed pane width — was ENGAWA_DOOR_W/2 (0.9) pre-DRESS2
const ENGAWA_DOOR_GLASS_RECT: Rect = {
  x: -0.06,
  z: ENGAWA_DOOR_LO,
  w: 0.06,
  d: ENGAWA_DOOR_GLASS_W,
}; // z 2.4-3.1, leaving z 3.1-4.4 (1.3m) as the walkable gap

// railing colliders — FULL-LENGTH PASS: west rail now spans the deck's
// entire new z-range (0-6, was just the stub's 2.1-4.6); north/south rails
// move from the old stub's own inner edges to the deck's TRUE outer edges
// (z=0/z=6) — still occupying the deck's own outermost 6cm band (flush
// with its z-min/z-max respectively), just at the new locations.
// x computed (not a hardcoded -2.76 literal) so x+w round-trips to exactly
// ENGAWA_DECK_X0 in floating point — a hardcoded literal here parses to a
// different double than this subtraction and makes the rail spuriously
// "overlap" the north rail's corner by a ~3e-16 epsilon (caught by
// furniture.test.ts's exact-overlap check).
const ENGAWA_RAIL_W: Rect = {
  x: ENGAWA_DECK_X0 - 0.06,
  z: ENGAWA_DECK_Z0,
  w: 0.06,
  d: ENGAWA_DECK_Z1 - ENGAWA_DECK_Z0,
}; // x -2.76..-2.70, z 0-6
const ENGAWA_RAIL_N: Rect = { x: ENGAWA_DECK_X0, z: ENGAWA_DECK_Z0, w: 2.7, d: 0.06 }; // z 0-0.06, true north end
const ENGAWA_RAIL_S: Rect = { x: ENGAWA_DECK_X0, z: ENGAWA_DECK_Z1 - 0.06, w: 2.7, d: 0.06 }; // z 5.94-6.00, true south end

// tea nook (DRESSING WAVE, repositioned FULL-LENGTH PASS) — folding chair +
// glass-top tea table, moved from the old stub deck's north half (z
// 2.1-3.4, snug against both the west and north rails with no walk-through
// gap behind the chair — flagged in p4-engawa-dress-report.md) into the
// now-much-longer deck's north third (z ~0.4-1.6), where there's finally
// room to pull it off both rails: chair-to-west-rail clearance grows from
// 37.5cm to 77.5cm (chair x-min -1.925 vs rail x-max -2.70), now comfortably
// past the 2×0.35 player-radius squeeze threshold (0.775 > 0.70), so a
// player CAN walk around the west side of the chair — no longer a
// rail-hugging "cozy corner" by necessity. Same footprints (table
// 0.45×0.45, chair 0.35×0.35) and the same 5cm chair-table gap as before,
// just translated as a unit (chair = table center + (-0.45, +0.05), same
// relative offset the original spec used).
const ENGAWA_TEA_TABLE_RECT: Rect = { x: -1.525, z: 0.775, w: 0.45, d: 0.45 }; // center -1.3,1.0
const ENGAWA_CHAIR_RECT: Rect = { x: -1.925, z: 0.875, w: 0.35, d: 0.35 }; // center -1.75,1.05

// ── ZEN GARDEN PASS (this pass, owner ask: "big bonsai on a zen corner…
// whole section should be zen stone path, small grass kinda thing") — the
// engawa's SOUTH end (south of the sliding door, z>4.4; north of the south
// rail, z-min 5.94) becomes a recessed raked-gravel garden with a
// stepping-stone path, moss, grass, accent rocks, a fancy display stand
// (kadai), and a big hand-built bonsai (Bedroom.tsx's ZEN_* consts render
// all of it — this file stays the source of truth for the two pieces that
// actually block: the stand and the one big accent rock). Everything else
// in the corner — the gravel bed itself, the curb, the stepping stones,
// moss, small rocks, grass tufts — is walk-over floor dressing with no
// footprint, same "no collider" convention the railing plants already use
// on this deck.
//   - display stand: south-center of the gravel bed (the stone path leads
//     up to it). Clear of the west rail (x-min -1.9 vs rail x-max -2.70,
//     0.80m) and the south rail (z-max 5.55 vs rail z-min 5.94, 0.39m) —
//     comfortable walk-around room on every side. x-min -1.9 (not -1.95)
//     is deliberate: it keeps a real >0.35 margin from the pre-existing
//     deep-west regression probe at x=-2.3 (0.4m clear, not exactly 0.35 —
//     landing exactly on the player-radius boundary is floating-point-
//     flaky in circleIntersectsRect's strict `<` check).
//   - big accent rock: just south-east of the stand — deliberately NOT
//     tucked against the west rail (that same x=-2.3 probe). Its z-range
//     (5.62..5.86) sits entirely south of the stand's own z-range
//     (5.15..5.55, a 0.07m gap) even though the x-ranges overlap, so the
//     two rects never intersect; also clear of the south rail (0.08m gap
//     to its z-min, 5.94).
const ENGAWA_ZEN_STAND_RECT: Rect = { x: -1.9, z: 5.15, w: 0.5, d: 0.4 };
const ENGAWA_ZEN_ROCK_RECT: Rect = { x: -1.67, z: 5.62, w: 0.24, d: 0.24 };

// ── PLANT PASS (this pass, owner ask: place the newly-prepared plant GLBs
// — FicusLyrata/PottedTree/BroadleafPlant/TallPalm, see
// scene/models/Plants.tsx — around the house) — two new floor plants on
// the engawa deck.
//   - TALLPALM: the "statement plant" near the tea nook, deck's north tip
//     (between the north-end rail and the nook). Its real footprint
//     (1.25x1.11m frond spread, per Plants.tsx) does NOT fit anywhere on
//     this deck without either re-blocking the FULL-LENGTH PASS's
//     hard-won nook west-side walkaround (the {-2.3125,1.05} probe) or the
//     room-side east approach ({-0.6,1.0}/{-0.5,1.0}/{-0.5,2.6} probes) —
//     checked exhaustively against every existing engawa probe in
//     furniture.test.ts, no placement with the full 1.25x1.11 rect clears
//     all of them simultaneously. So the COLLIDER here is sized to the
//     plant's pot/trunk base instead (0.6x0.6), matching this house's own
//     established plant-collider convention (every existing corner plant's
//     leaf spread already exceeds its pot-sized collider; RAILING_PLANTS
//     get no collider at all) — the visual model still renders at its full
//     native scale (1.75m tall), fronds simply extend past the collision
//     box, same as everywhere else in the house. Placed clear of the tea
//     nook (z max 0.69, nook z min 0.775) and the north-end rail (z min
//     0.09, rail z max 0.06), with wide margins on both the west-rail and
//     wall/nook approach probes (checked below).
//   - FICUS: the second/balancing floor plant, opposite side (east, near
//     the interior wall) and a different z-band (the deck's north-third
//     "connector" strip between the nook and the sliding-door wall) — this
//     one DOES fit at its real 0.45x0.55m footprint with real margins,
//     clear of every existing probe.
const ENGAWA_TALLPALM_RECT: Rect = { x: -1.85, z: 0.09, w: 0.6, d: 0.6 };
const ENGAWA_FICUS_RECT: Rect = { x: -0.6, z: 1.55, w: 0.45, d: 0.55 };

const GROUND: Area = {
  id: "ground",
  bounds: { x: -2.9, z: 0, w: 24.9, d: 6 },
  walls: [
    ...dividerWithDoor(8, 6),
    ...dividerWithDoor(16, 6),
    // ENGAWA_WALL_N/S are the real, thick, visible west wall — the only
    // engawa rects that live in `walls` (everything else, including the
    // rails and the fixed-glass pane, is invisible/`furniture`). The old
    // ENGAWA_WALL_BLOCK_N/S void-backstop rects are GONE as of the
    // FULL-LENGTH PASS (see the FULL-LENGTH PASS comment above) — there's
    // no more void west of this wall to backstop.
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
    // PLANT PASS: the two hand-built corner plants are REPLACED by real GLB
    // models (BroadleafPlant + PottedTree, see scene/models/Plants.tsx) —
    // sized to their own real footprints, nudged 12cm further south (z
    // 5.1/5.15 -> 5.0) so the bigger broadleaf clears the {1.6,4.6} walkway
    // probe with real margin (was 1.2cm at the old z, now 4.6cm).
    { x: 0.43, z: 5.0, w: 0.94, d: 0.84 }, // broadleaf plant (SW corner, real GLB model)
    { x: 1.55, z: 5.0, w: 0.66, d: 0.66 }, // potted tree (SW corner, beside the broadleaf, real GLB model)
    { x: 0.6, z: 0.4, w: 0.95, d: 0.95 }, // single-person sofa/armchair (NW corner)
    { x: 5.85, z: 0.42, w: 0.4, d: 0.4 }, // sunset-lamp stool (NE-ish, east of the east nightstand)
    // cat's round bed (NE corner) — CATBED ENLARGE PASS (owner ask: "make
    // the cat's bed bigger"): 1.6x the old diameter (0.55→0.88), grown off
    // the NE corner closest to the walls so its old wall margins (0.3m off
    // the east wall, 0.45m off the north wall) stay exactly unchanged; the
    // extra width/depth is added south-west instead, where the room is
    // open. New x-min (6.72) still clears the sunset-lamp stool (x-max
    // 6.25) by 0.47m — see Bedroom.tsx's CATBED_RECT comment for the full
    // arithmetic.
    { x: 6.72, z: 0.45, w: 0.88, d: 0.88 },
    // bed-front bench — REMOVED (owner ask: "that sitting thing at the
    // bottom of the bed" gone). Old collider was {3.5,2.95,1.2,0.4}. SPAWN
    // ({4,4.3}) doesn't need to move — it's still clear of every remaining
    // bedroom rect (nearest is the bed, far z edge 2.83 + player radius
    // 0.35 = 3.18 < 4.3); see furniture.test.ts's SPAWN checks.
    { x: 3.3, z: 5.35, w: 2.2, d: 0.5 }, // clothes hanger stand (south-center, A-frame rack + boutique clothes)
    // shoe storage — NEW (wardrobe corner upgrade, 2026-07-19), beside the
    // rack's east flank. TDD'd against its neighbors: rack's x-max is
    // 3.3+2.2=5.5, so 5.62-5.5=0.12m (12cm) clearance; perfume stand's
    // x-min is 6.55, so 6.55-(5.62+0.8)=0.13m (13cm) clearance — both clear
    // the pairwise-overlap check below with room to spare, no adjustment
    // needed from the owner's spec'd numbers.
    { x: 5.62, z: 5.35, w: 0.8, d: 0.45 }, // shoe storage cubby (2-shelf, east of the rack)
    { x: 6.55, z: 5.3, w: 1.0, d: 0.5 }, // perfume stand / slim dresser (SE)
    // south floor lamp — NEW (P4 art+light+ruggate pass, owner ask: "add
    // some lighting on the bedroom south areas"). Sits in the open pocket
    // between the potted tree (x-max 2.21) and the clothes hanger stand
    // (x-min 3.3) — 0.34m/0.40m clear of each, see Bedroom.tsx's
    // SOUTH_LAMP_RECT comment for the full arithmetic.
    { x: 2.55, z: 5.25, w: 0.35, d: 0.35 },
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
    // tea nook (DRESSING WAVE) — see the ENGAWA_TEA_TABLE_RECT/
    // ENGAWA_CHAIR_RECT comment above for the clearance arithmetic.
    ENGAWA_TEA_TABLE_RECT,
    ENGAWA_CHAIR_RECT,
    // zen garden corner (ZEN GARDEN PASS) — see the comment above these
    // consts for the clearance arithmetic.
    ENGAWA_ZEN_STAND_RECT,
    ENGAWA_ZEN_ROCK_RECT,
    // PLANT PASS — see the comment above ENGAWA_TALLPALM_RECT/
    // ENGAWA_FICUS_RECT for the placement/collider-sizing arithmetic.
    ENGAWA_TALLPALM_RECT,
    ENGAWA_FICUS_RECT,
    // ENGAWA_WALL_BLOCK_N/S (the old void backstop beyond the stub deck's
    // z-band) are GONE — FULL-LENGTH PASS: the deck now spans the whole
    // z 0-6 west side, so there's no more void to backstop. See the
    // FULL-LENGTH PASS comment above the ENGAWA_* consts.
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
    // PLANT PASS: a real potted-tree GLB (see scene/models/Plants.tsx) in
    // the open south-wall gap between the shrine (x max 9.45) and the
    // coffee counter (x min 11.3) — softens the corner, clear of both with
    // room to spare (0.52m/0.67m gaps).
    { x: 9.97, z: 5.32, w: 0.66, d: 0.66 }, // potted tree (south wall, between the EVA shrine and the coffee counter)
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

// SPAWN — FURNISHING WAVE moved this from {4,3.6} to {4,4.3} because of the
// (now-removed) bed-front bench: the bench used to sit under x=4 with its
// far z edge at 3.35, blocking {4,3.6} (0.25 < player radius 0.35). BENCH
// REMOVAL (this pass, owner ask: "that sitting thing at the bottom of the
// bed" gone): the bench and its collider are gone, but SPAWN stays at
// {4,4.3} — no test forces a move, and it's still comfortably clear of
// every remaining bedroom rect (nearest is the bed, far z edge 2.83 +
// player radius 0.35 = 3.18 < 4.3), north of the clothes-hanger stand
// (z-min 5.35), and clear of the about trigger {5.15,1.3,1.25,1.1} (x=4 is
// west of the trigger's x-min 5.15) — see furniture.test.ts and
// invariants.test.ts for the exhaustive checks.
export const SPAWN = { area: "ground" as AreaId, x: 4, z: 4.3 };
