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

// ── LAYOUT V2 (this pass, 2026-08-09 workstation excalidraw + spec
// Resolutions) — the front row (bedroom/common/music, x0-22 z0-6) stays put;
// three new spaces attach to the common area (still `RoomId "workspace"`
// here — Task 4 renames the room/file, not this pass): a WORKSTATION room
// behind it (negative z), a GENKAN entry strip in front of it (z>6), and
// (owner feedback wave, later: DELETED — see the "basement stair stub —
// REMOVED" comment below) a basement-stair stub inside the common area
// itself. These are pure rect data here — meshes, the workstation's own
// camera area, and the area-swap logic are later tasks (2-7); this pass
// only extends `bounds`/`walls`/`furniture` so `isBlocked` is already
// correct.
//
// Since `bounds` is one rect spanning the FULL x-range (-2.9..22), growing
// its z-band to fit the workstation/genkan would also open unintended
// walkable voids beside the bedroom (x<8) and music room (x>16), which
// have no rooms at those new z's — WS_VOID_*/GK_VOID_* below seal those
// off (same "void backstop" idiom the old, now-deleted, ENGAWA_WALL_BLOCK_N/S
// used before the deck grew to fill its own void).

// workstation room (interior x8-16, z-6.2..-0.2 — same width as the common
// area it sits behind). Its shared wall with the common area sits at
// z-0.2..0, split by a 1.3m door gap (WS_DOOR_LO/HI, matches the engawa's
// walk-through width). OWNER FEEDBACK WAVE (this pass): recentered to the
// middle of the common room's own north wall (was 13.2-14.5, off-center
// toward the music side) — 11.35-12.65, centered on x=12 (the common area
// spans x8-16, so its true midpoint). WS_WALL_LO/HI below re-derive from
// these two consts, so the shared-wall split follows automatically.
export const WORKSTATION_ROOM: Rect = { x: 8, z: -6.2, w: 8, d: 6 };
export const WS_DOOR_LO = 11.35;
export const WS_DOOR_HI = 12.65;
const WS_WALL_LO: Rect = { x: 8, z: -0.2, w: WS_DOOR_LO - 8, d: 0.2 }; // wall west of the door
const WS_WALL_HI: Rect = { x: WS_DOOR_HI, z: -0.2, w: 16 - WS_DOOR_HI, d: 0.2 }; // wall east of the door

// genkan entry strip (interior x8-16, z6.2..8.1, depth 1.9). Its shared
// wall with the common area sits at z6..6.2, split by a 1.3m inner doorway
// (GENKAN_DOOR_LO/HI). Its own south wall (z8.1..8.3) is the front door:
// FRONT_DOOR_LO/HI mark where the door leaf sits (for Task 6's mesh), but
// the wall stays fully solid — no walkable gap — since the street beyond
// is a future plan; collision-wise it's one continuous locked door.
export const GENKAN_ROOM: Rect = { x: 8, z: 6.2, w: 8, d: 1.9 };
export const GENKAN_DOOR_LO = 11.4;
export const GENKAN_DOOR_HI = 12.7;
export const FRONT_DOOR_LO = 11.5;
export const FRONT_DOOR_HI = 12.6;
const GK_WALL_LO: Rect = { x: 8, z: 6, w: GENKAN_DOOR_LO - 8, d: 0.2 }; // wall west of the inner doorway
const GK_WALL_HI: Rect = { x: GENKAN_DOOR_HI, z: 6, w: 16 - GENKAN_DOOR_HI, d: 0.2 }; // wall east of the inner doorway
const GK_FRONT_WALL: Rect = { x: 8, z: 8.1, w: 8, d: 0.2 }; // solid, no gap — front door blocked

// void backstops — see the LAYOUT V2 comment above for why these exist:
// x8-16 is the only real room at these new z-bands, so the flanks (bedroom/
// engawa's x<8, music's x>16) need an explicit block once `bounds` grows
// to include them.
const WS_VOID_W: Rect = { x: -2.9, z: -6.2, w: 10.9, d: 6.2 }; // west of the workstation (bedroom/engawa side)
const WS_VOID_E: Rect = { x: 16, z: -6.2, w: 6, d: 6.2 }; // east of the workstation (music side)
const GK_VOID_W: Rect = { x: -2.9, z: 6, w: 10.9, d: 2.3 }; // west of the genkan (bedroom/engawa side)
const GK_VOID_E: Rect = { x: 16, z: 6, w: 6, d: 2.3 }; // east of the genkan (music side)

// basement stair stub — REMOVED (owner feedback wave, this pass: "the blue
// box enclosure looks bad", killed outright). Used to reserve a footprint
// beside the up-stairs (steps + side rails + a construction barrier); the
// basement entrance returns properly in the basement plan later — nothing
// reserved here in the meantime.

// roof stair-room (Task 7). T1's placeholder ({x:12.4,z:0,w:3.6,d:1.5},
// flush against the roof's north/east edges — see prior comment, now
// stale) never actually contained the stairs-up portal's real arrival
// point: `toPosition: {x:12, z:2}` (below, in HOUSE.portals) sits 0.4m west
// and 0.5m south of that rect — the T1 guess was aimed at "the corner the
// stair flight occupies" (the flight's own footprint, x14.65-15.75), not
// at the actual portal arrival, which lands well clear of the flight to
// its west. Recentered here on the real toPosition instead, same
// ~3.6x1.5 footprint (interior), kept clear of the stair flight (its
// x-min 14.65 vs this room's x-max 14.0 — 0.65m gap) and the roof's own
// bounds (x8-16, z0-6) with margin on every side.
export const STAIR_ROOM: Rect = { x: 10.2, z: 1.25, w: 3.6, d: 1.5 };
// door gap out to the terrace, centered on the room's own x-midpoint (12,
// same x as the arrival point) in the south wall — the side that opens
// onto the rooftop's larger open span (z 2.75-6, vs. only 1.25m of
// clearance to the north edge).
export const STAIR_ROOM_DOOR_LO = 11.4;
export const STAIR_ROOM_DOOR_HI = 12.6;
const SR_WALL_N: Rect = {
  x: STAIR_ROOM.x - WALL_T,
  z: STAIR_ROOM.z - WALL_T,
  w: STAIR_ROOM.w + 2 * WALL_T,
  d: WALL_T,
};
const SR_WALL_W: Rect = {
  x: STAIR_ROOM.x - WALL_T,
  z: STAIR_ROOM.z,
  w: WALL_T,
  d: STAIR_ROOM.d,
};
const SR_WALL_E: Rect = {
  x: STAIR_ROOM.x + STAIR_ROOM.w,
  z: STAIR_ROOM.z,
  w: WALL_T,
  d: STAIR_ROOM.d,
};
// south wall, split by the door gap (west/east segments)
const SR_WALL_S_LO: Rect = {
  x: STAIR_ROOM.x,
  z: STAIR_ROOM.z + STAIR_ROOM.d,
  w: STAIR_ROOM_DOOR_LO - STAIR_ROOM.x,
  d: WALL_T,
};
const SR_WALL_S_HI: Rect = {
  x: STAIR_ROOM_DOOR_HI,
  z: STAIR_ROOM.z + STAIR_ROOM.d,
  w: STAIR_ROOM.x + STAIR_ROOM.w - STAIR_ROOM_DOOR_HI,
  d: WALL_T,
};

const GROUND: Area = {
  id: "ground",
  // LAYOUT V2: z-band grows from {0,6} to {-6.2,14.5} to fit the
  // workstation (north) and genkan (south) — see the LAYOUT V2 comment
  // block above for the void-backstop rects this requires.
  bounds: { x: -2.9, z: -6.2, w: 24.9, d: 14.5 },
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
    // LAYOUT V2: workstation perimeter (shared wall split by its door gap;
    // the void backstops double as its west/east perimeter)
    WS_WALL_LO,
    WS_WALL_HI,
    WS_VOID_W,
    WS_VOID_E,
    // LAYOUT V2: genkan perimeter (inner-doorway wall + solid front door +
    // void backstops)
    GK_WALL_LO,
    GK_WALL_HI,
    GK_FRONT_WALL,
    GK_VOID_W,
    GK_VOID_E,
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
    // common area (formerly "workspace" — LAYOUT V2 migrates the desk,
    // EVA shrine, and coffee corner out to the new WORKSTATION_ROOM below;
    // this pass keeps the up-stairs and plants here, per the Geometry
    // Reference's "common area keeps" list. The bookshelf, originally kept
    // here (SE corner, east divider), MOVED to the workstation's west-wall
    // TBD slot — owner feedback wave, T8 finale item 10 — see the
    // workstation furniture block below.)
    { x: 9.97, z: 5.32, w: 0.66, d: 0.66 }, // potted tree (south wall) — PLANT PASS; its old neighbors (EVA shrine, coffee counter) migrated out to the workstation
    // staircase to the roof — full flight footprint (shallow 10-step run
    // along the east divider). Depth is capped so the expanded blocking
    // (d + player radius = 2.91) stays clear of the music doorway band
    // (z 2.2–3.8 at x≈16) AND of the stairs-up portal trigger below
    // (furniture.test.ts asserts both).
    { x: 14.65, z: 0, w: 1.1, d: 2.56 },

    // ── LAYOUT V2: workstation room (behind the common area, through the
    // WS_DOOR_LO/HI gap) — desk rig, EVA shrine, and coffee bar, migrated
    // verbatim from the Geometry Reference. Corkboard, polaroid wall, and
    // the neon sign are wall-mounted decor with no floor footprint (same
    // "no collider" convention the corkboard/polaroids they replace used) —
    // no rects for them here.
    // Desk rect widened east 2.2→2.4 (owner: "i can walk in the work
    // table" — the desktop MESH is 2.6m wide centered x11.6, x10.3..12.9,
    // but this rect's x-max was 12.7, so the capsule sank 0.2m into the
    // slab's visual east overhang, which is exactly where the owner hit
    // it). The WEST overhang (x10.3..10.5) is deliberately NOT covered:
    // the projects station trigger (stations.ts, x9.6..10.45) reaches
    // x10.45, and extending this rect west would overlap it / block its
    // center probe — a 0.2m visual graze inside the station-focus zone is
    // the lesser evil vs. moving the trigger's documented camera math.
    // Depth 0.9→1.1 (owner round 2: "the table wall is still not fixed" —
    // this time the SOUTH face: the collider matched the desktop's visual
    // z-extent exactly, but the fixed camera's elevation projects the
    // capsule's head ~0.5m of depth over any surface it stands 0.35m from,
    // so matching the visual isn't enough on the camera-facing side. The
    // extra 0.2m stand-off keeps the head off the slab. Overlaps the
    // chair rect by a 0.1m sliver (-5.0..-4.9) — physically the chair
    // tucks under the desk edge, colliders union anyway.)
    { x: 10.5, z: -6.0, w: 2.4, d: 1.1 }, // desk (motorized rig), north wall center
    // Chair z-min trimmed -5.0→-4.9: the desk's south stand-off (see
    // above) covers that 0.1m sliver now — the blocked UNION is unchanged
    // and the no-overlap sweep stays clean.
    { x: 11.0, z: -4.9, w: 0.8, d: 0.7 }, // desk chair, center (11.4,-4.55) — same footprint as the old chair
    { x: 8.3, z: -1.7, w: 1.5, d: 1.2 }, // EVA-01 shrine + crossfire cans, SW corner
    { x: 15.1, z: -6.15, w: 0.85, d: 1.8 }, // coffee bar (counter + machine + paper lantern, merged into one rect), east wall
    // T8 finale item 13 (owner feedback wave, 2nd bookshelf move — item 10's
    // west-wall slot didn't stick): SE corner, EAST wall, z-1.8..-0.5 —
    // owner's exact numbers. The shelf's own visual footprint is ~2.06m
    // deep (its carcass panels sit at local z ±1.03); a 1.3m collider band
    // would either clip the wall or leave the mesh floating past its own
    // collider, so Workstation.tsx's mount wraps the whole assembly in a
    // z-only scale (0.6311 = 1.3/2.06) that compresses it to EXACTLY this
    // band — collider matches the rendered footprint, not a truncation of
    // it. w=0.44 (thickness, x-axis) is unchanged by the z-only scale.
    { x: 15.46, z: -1.8, w: 0.44, d: 1.3 }, // full-wall bookshelf, east wall (SE corner)
    // T8 finale item 15 (owner feedback wave): project-building table,
    // west wall, replacing the polaroid wall's old footprint (was wall-
    // mounted decor, no collider — this is real floor furniture). ~1.0m
    // deep (x) × 2.2m long (z), flush against the wall (0.05m clearance
    // from the room's own north wall at z-6.2, matching the desk's own
    // convention above) and well clear of the EVA shrine (z-1.7..-0.5,
    // 1.8m gap) and the desk itself (x10.5-12.7, no x-overlap).
    { x: 8, z: -6.1, w: 1.0, d: 2.2 }, // project building table, west wall

    // W7 polish pass (owner-approved floor wave) + W7 FIX ROUND (owner
    // review of the shipped pass, this pass): mushroom rug under the
    // ceiling pendant (x12,z-2.6, Workstation.tsx) + a beanbag/pile at its
    // SE rim + a waste bin beside the desk. The rug itself is visual-only
    // floor dressing (no collider, same convention as every other rug in
    // the house) — only the beanbag (real furniture you can visibly bump —
    // the genkan phase-through precedent above: visible floor furniture
    // with no collider lets the player walk straight through it) and the
    // waste bin get real colliders here.
    //
    // Beanbag — FIX ROUND (owner: "reads as the poop emoji" — the old
    // stacked-spheres profile). Redesigned twice in Workstation.tsx: a
    // hand-built single flattened-sphere primitive first, then swapped for
    // a real CC-BY-3.0 low-poly GLB (BeanbagModel, owner-requested model
    // hunt). Owner then sized it up live ("make it a bit bigger it looks
    // perfect"): ~1.0m dia × ~0.48m tall, so this rect is 1.0×1.0 with
    // the growth pushed EAST/SOUTH (center 13.1,-2.1 → 13.2,-2.1) so the
    // x-min stays pinned at 12.7 — preserving the door↔desk lane
    // clearance invariant (door x11.35-12.65, 0.05m clear; the lane's
    // own walk probe sits at x12.2, 0.5m further west). Still clear of
    // every other workstation rect (nearest is the coffee bar, x-min
    // 15.1, 1.45m east) and the door↔worktable lane (worktable x8-9,
    // well west). Also clear of the "experience" station trigger
    // (stations.ts, x13.0-14.9,z-5.6..-4.1 — beanbag's whole z-range,
    // -2.6..-1.6, sits south of the trigger's z-max -4.1).
    { x: 12.7, z: -2.6, w: 1.0, d: 1.0 }, // beanbag, rug's SE rim
    // Waste bin — FIX ROUND (owner: bin was invisible from the room's
    // fixed camera — the desk's own DESKTOP mesh visually overhangs the
    // collider it had at the time (x-max 12.7 vs the 2.6m-wide desktop
    // box centered on the desk group's x11.6, visually x10.3-12.9; the
    // desk rect has SINCE been widened to match the visual, see its own
    // comment above — this bin placement predates that and still works;
    // depth 0.9 centered on z-5.55 spans z-6.0..-5.1 — matches this exact
    // z-range the old bin sat in). Moved south, OUT of that z-band
    // entirely (new z-min -4.9, a clean 0.2m south of the desktop's own
    // z-max -5.1) so nothing overhangs it — verified live via screenshot,
    // not just the rect math (the ask's own instruction, since the
    // invisibility bug was never a collision bug in the first place). Kept
    // the same x (12.7, the desk collider's own x-max) so it's still
    // clearly "beside the desk", and — because x never crosses 13.0 — it
    // stays clear of the "experience" station trigger (x-min 13.0,
    // touches at the boundary, no overlap, same convention as the old
    // bin's x-max touch) regardless of z. Also clear of the desk collider
    // itself (x touches at 12.7, z-min -4.9 vs desk z-max -5.1, a real
    // 0.2m gap — no boundary-touch ambiguity there) and of the chair
    // (x11.0-11.8, no x-overlap with the bin's own x12.7-13.0 at all).
    { x: 12.7, z: -4.9, w: 0.3, d: 0.3 }, // waste bin, south of the desk's overhang

    // Sunset floor lamp (owner ask: "a huge sunset lamp at the floor which
    // lights up the akira poster" — replaced the wall picture-light above
    // the poster). Sits at the poster's base against the west wall,
    // centered on the poster's own z-2.65. Real floor furniture → real
    // collider (genkan precedent). Clear of the worktable (z-6.1..-3.9,
    // 1.0m south... i.e. lamp z-max -2.42 vs table z-min -3.9 — 1.48m
    // gap), the EVA shrine (z-1.7..-0.5, 0.73m north of the lamp's
    // z-max), and the door↔worktable lane (which runs well east of the
    // west wall's x8.6 band).
    { x: 8.12, z: -2.88, w: 0.46, d: 0.46 }, // sunset lamp, below the akira poster

    // T8 finale item 17 (owner-reported, walk-through genkan furniture):
    // T6 shipped the shoe rack + umbrella stand decor-only ("no layout.ts
    // colliders — that file is off-limits this task", Genkan.tsx's own
    // comment) since layout.ts wasn't in that task's file set. Rects below
    // match Genkan.tsx's actual rendered footprints exactly (hugging their
    // own walls, same as every other piece of dressing in this house):
    // shoe rack — shelf mesh {x:8.8,z:6.55,w:1.0,d:0.35} (boxGeometry
    // [1.0,0.06,0.35]) → x8.3-9.3, z6.375-6.725. Umbrella stand — pot
    // cylinder {x:14.6,z:7.5,r:0.14-0.15} → a ~0.3x0.3 square around it.
    // Both sit well clear of the inner-doorway↔front-door walking lane
    // (x11.4-12.7) and the doormat stays uncollidered (a floor decal, not
    // furniture) — layout-v2.test.ts's live sweep re-verifies both.
    { x: 8.3, z: 6.375, w: 1.0, d: 0.35 }, // genkan shoe rack, NW corner
    { x: 14.45, z: 7.35, w: 0.3, d: 0.3 }, // genkan umbrella stand, SE corner
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
  walls: [
    // stair-room enclosure (Task 7) — 3 solid sides + the south wall split
    // by the door gap. Rendered generically by House.tsx's existing
    // `a.walls.map` loop (full height, same as every other interior
    // divider) — no roof/ceiling rect anywhere here, top stays open so the
    // roof's own top-down camera looks straight down into it.
    SR_WALL_N,
    SR_WALL_W,
    SR_WALL_E,
    SR_WALL_S_LO,
    SR_WALL_S_HI,
  ],
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
