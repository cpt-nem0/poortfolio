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

/** Interior dividing wall at `x` with a doorway gap, spanning depth `d`. */
function dividerWithDoor(x: number, d: number): Rect[] {
  return [
    { x: x - WALL_T / 2, z: 0, w: WALL_T, d: DOOR_LO },
    { x: x - WALL_T / 2, z: DOOR_HI, w: WALL_T, d: d - DOOR_HI },
  ];
}

const GROUND: Area = {
  id: "ground",
  bounds: { x: 0, z: 0, w: 22, d: 6 },
  walls: [...dividerWithDoor(8, 6), ...dividerWithDoor(16, 6)],
  furniture: [
    // bedroom — SUPER-KING pass: bed enlarged again (w 2.0→2.2, d 2.25→2.5),
    // still centered on the north wall (x 2.9-5.1, room-x-center = 4.0 —
    // unchanged). The dragonslayer lean-zone rect is REMOVED — the sword is
    // parked for the future gaming den (owner's call, 2026-07-19); behelit
    // trigger + sword relocation land with the eclipse/den plans. The manga
    // dresser is still REMOVED for now (P4 recenter, unrelated to this
    // pass) — its old rect (x 2.8-4.4) overlapped the centered bed's
    // x-span; it returns in a later step. Nightstand is unchanged (still
    // clear of the bigger bed — see furniture.test.ts's "no two bedroom
    // furniture rects overlap" test for the exhaustive pairwise clearance
    // check). SPAWN moved {4,3}→{4,3.6} below: the bed's new far z edge
    // (2.83) + player radius (0.35) = 3.18 pushed past the old spawn z.
    { x: 2.9, z: 0.33, w: 2.2, d: 2.5 }, // bed (headboard north, centered on the wall, SUPER-KING)
    { x: 6.45, z: 0.95, w: 0.55, d: 0.5 }, // nightstand (bed's east flank)
    { x: 0.45, z: 5.1, w: 0.4, d: 0.4 }, // plant (SW corner)
    { x: 0.35, z: 2.7, w: 0.5, d: 1.1 }, // window table (west wall, under the window)
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

// SPAWN — SUPER-KING pass moved this from {4,3}: the bed's new far z edge
// (0.33 + 2.5 = 2.83) + player radius (0.35) = 3.18 > 3.0, so the old spawn
// point is now inside the bed's collider. {4,3.6} clears the bed by 0.42m
// (3.6 - 3.18), the rug (no collider, so not a hard requirement, but still
// true — rug z-min 2.75 < 3.6), and the about trigger
// {5.15,1.3,1.25,1.1} (x 4 is west of the trigger's x-min 5.15) — see
// furniture.test.ts and invariants.test.ts for the exhaustive checks.
export const SPAWN = { area: "ground" as AreaId, x: 4, z: 3.6 };
