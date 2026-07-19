import { describe, it, expect } from "vitest";
import { HOUSE, type Rect } from "@/threeam/world/layout";
import { isBlocked, resolveMovement } from "@/threeam/world/collision";
import { STATIONS } from "@/threeam/world/stations";

const ground = HOUSE.areas.ground;

describe("music-room furniture colliders", () => {
  it("areas expose a furniture list", () => {
    expect(Array.isArray(ground.furniture)).toBe(true);
    expect(Array.isArray(HOUSE.areas.roof.furniture)).toBe(true);
    expect(ground.furniture.length).toBeGreaterThanOrEqual(5);
  });

  it("the record console blocks the player", () => {
    expect(isBlocked(ground, 18.7, 0.8)).toBe(true); // turntable spot
  });

  it("the sofa, coffee table, floor lamp and guitar block", () => {
    expect(isBlocked(ground, 19, 5.2)).toBe(true); // sofa (sweet spot)
    expect(isBlocked(ground, 17.45, 5.2)).toBe(true); // coffee table
    expect(isBlocked(ground, 20.85, 0.65)).toBe(true); // floor lamp
    expect(isBlocked(ground, 21.3, 5.2)).toBe(true); // guitar on stand
  });

  it("the beanbag spot is walkable again (beanbag removed)", () => {
    expect(isBlocked(ground, 21.2, 3.8)).toBe(false);
  });

  it("the doorway into the music room stays open", () => {
    expect(isBlocked(ground, 16, 3)).toBe(false);
  });

  it("the nook's walking space stays open (rug area + around the sofa)", () => {
    expect(isBlocked(ground, 18.7, 2.5)).toBe(false); // between console and rug
    expect(isBlocked(ground, 19.5, 4.3)).toBe(false); // just in front of the sofa
    expect(isBlocked(ground, 20.45, 5.2)).toBe(false); // corridor east of the sofa
  });

  it("near-miss probes just outside footprints stay walkable", () => {
    // just south of the record console's edge (z 1.2) + player radius 0.35
    expect(isBlocked(ground, 19, 1.6)).toBe(false);
    // just east of the sofa's AABB (x 19.9 + 0.35)
    expect(isBlocked(ground, 20.3, 5.2)).toBe(false);
  });

  it("near-miss probes just inside blocked margins are blocked", () => {
    expect(isBlocked(ground, 19, 1.5)).toBe(true); // within radius of console
    expect(isBlocked(ground, 20.2, 5.2)).toBe(true); // within radius of sofa
  });
});

describe("workspace furniture colliders", () => {
  it("desk and chair block", () => {
    expect(isBlocked(ground, 11, 0.75)).toBe(true); // desk
    expect(isBlocked(ground, 10.8, 1.9)).toBe(true); // chair (shifted 0.3 west, wave E)
  });

  it("the spot east of the shifted chair is walkable (desk front unobstructed)", () => {
    expect(isBlocked(ground, 11.65, 1.9)).toBe(false);
  });

  it("the SW EVA-01 shrine blocks (replaces the storage-shelf lamp)", () => {
    expect(isBlocked(ground, 9.1, 5.45)).toBe(true); // plinth center
  });

  it("the coffee counter blocks (south wall, center)", () => {
    // probes sit north of the wall's own bounds margin (z + 0.35 < 6) so
    // they only pass if the counter rect itself blocks
    expect(isBlocked(ground, 12, 5.6)).toBe(true); // front face, center
    expect(isBlocked(ground, 11.4, 5.6)).toBe(true); // west end
    expect(isBlocked(ground, 12.6, 5.6)).toBe(true); // east end
  });

  it("the paper-lantern floor lamp blocks (south wall, right of the counter)", () => {
    expect(isBlocked(ground, 13.8, 5.55)).toBe(true); // lamp center (same rect as the old tripod)
  });

  it("the south walkway around the coffee corner stays open", () => {
    expect(isBlocked(ground, 11.5, 5.15)).toBe(false); // between shrine and counter front
    expect(isBlocked(ground, 12, 5.1)).toBe(false); // in front of the counter (coffee-making spot)
    expect(isBlocked(ground, 13.15, 5.5)).toBe(false); // between counter and lantern lamp
    expect(isBlocked(ground, 14.75, 5.5)).toBe(false); // between lamp and bookshelf
  });

  it("the old drawer's footprint is walkable again (drawer removed)", () => {
    expect(isBlocked(ground, 8.5, 4.8)).toBe(false);
  });

  it("the SE full-wall bookshelf blocks", () => {
    expect(isBlocked(ground, 15.7, 4.9)).toBe(true); // bookshelf center
    expect(isBlocked(ground, 15.7, 4.0)).toBe(true); // near the doorway end of the shelf
    expect(isBlocked(ground, 15.7, 5.8)).toBe(true); // near the south-wall end of the shelf
  });

  it("workspace walkways stay open", () => {
    expect(isBlocked(ground, 12, 3)).toBe(false); // room center
    expect(isBlocked(ground, 9.7, 2.9)).toBe(false); // between chair and west door
    expect(isBlocked(ground, 13.5, 1.1)).toBe(false); // corkboard station spot
    expect(isBlocked(ground, 8.9, 1.2)).toBe(false); // projects station spot
    expect(isBlocked(ground, 15.0, 4.9)).toBe(false); // west of the bookshelf, still walkable
    expect(isBlocked(ground, 16, 3)).toBe(false); // doorway into the music room stays open
  });
});

describe("bedroom furniture colliders", () => {
  // SUPER-KING pass: bed centered on the north wall (x 2.9-5.1, x-center
  // 4.0 unchanged) and enlarged again ({2.0,2.25}→{2.2,2.5}). The
  // dragonslayer lean-zone rect is REMOVED (sword parked for the future
  // gaming den). Nightstand and plant are untouched.
  it("bedroom rects are present verbatim", () => {
    const bedroomRects = [
      { x: 2.9, z: 0.33, w: 2.2, d: 2.5 }, // bed (headboard north, centered on the wall, SUPER-KING)
      { x: 6.45, z: 0.95, w: 0.55, d: 0.5 }, // nightstand (bed's east flank)
      { x: 0.45, z: 5.1, w: 0.4, d: 0.4 }, // plant
    ];

    for (const rect of bedroomRects) {
      const found = ground.furniture.some(
        (f) =>
          f.x === rect.x && f.z === rect.z && f.w === rect.w && f.d === rect.d
      );
      expect(
        found,
        `bedroom rect ${JSON.stringify(rect)} not found in furniture`
      ).toBe(true);
    }
  });

  it("the manga dresser rect is gone (removed for now)", () => {
    const found = ground.furniture.some(
      (f) => f.x === 2.8 && f.z === 0.3 && f.w === 1.6 && f.d === 0.55
    );
    expect(found).toBe(false);
  });

  it("the dragonslayer lean-zone rect is gone (parked for the den)", () => {
    const found = ground.furniture.some(
      (f) => f.x === 6.55 && f.z === 0.32 && f.w === 0.85 && f.d === 0.5
    );
    expect(found).toBe(false);
  });

  it("no two bedroom furniture rects overlap", () => {
    const intersects = (a: Rect, b: Rect) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;
    const bedroomRects = [
      { name: "bed", r: { x: 2.9, z: 0.33, w: 2.2, d: 2.5 } },
      { name: "nightstand", r: { x: 6.45, z: 0.95, w: 0.55, d: 0.5 } },
      { name: "plant", r: { x: 0.45, z: 5.1, w: 0.4, d: 0.4 } },
      { name: "balcony west rail", r: { x: -1.56, z: 2.3, w: 0.06, d: 2.2 } },
      { name: "balcony north rail", r: { x: -1.5, z: 2.3, w: 1.5, d: 0.06 } },
      { name: "balcony south rail", r: { x: -1.5, z: 4.44, w: 1.5, d: 0.06 } },
    ];
    for (let i = 0; i < bedroomRects.length; i++) {
      for (let j = i + 1; j < bedroomRects.length; j++) {
        expect(
          intersects(bedroomRects[i].r, bedroomRects[j].r),
          `${bedroomRects[i].name} overlaps ${bedroomRects[j].name}`
        ).toBe(false);
      }
    }
  });

  it("SPAWN point with player radius stays clear of all bedroom rects", () => {
    expect(isBlocked(ground, 4, 3.6)).toBe(false); // SPAWN point
  });

  it("SPAWN clears the super-king bed's far edge by exactly 42cm", () => {
    // bed far z edge = 0.33 + 2.5 = 2.83; + player radius 0.35 = 3.18;
    // SPAWN.z = 3.6, so the margin is 3.6 - 3.18 = 0.42m. Directly under
    // the spawn's x (4.0, inside the bed's 2.9-5.1 x-span), so this is the
    // closest-approach probe, not a diagonal corner case.
    expect(isBlocked(ground, 4, 3.18)).toBe(false); // 3.18 = tangent point, still clear (strict <)
    expect(isBlocked(ground, 4, 3.17)).toBe(true); // 1cm inside the 0.35 radius = blocked
  });

  it("the old SPAWN point {4,3} is now blocked by the super-king bed", () => {
    // bed far z edge (2.83) + player radius (0.35) = 3.18 > 3.0 — this is
    // exactly why SPAWN moved.
    expect(isBlocked(ground, 4, 3)).toBe(true);
  });

  it("bedroom walkway probes all walkable", () => {
    expect(isBlocked(ground, 4.5, 3.6)).toBe(false); // open floor, south of the centered bed
    expect(isBlocked(ground, 7.5, 3.0)).toBe(false); // door approach
    expect(isBlocked(ground, 1.6, 4.6)).toBe(false); // open floor west of the room, south side
    expect(isBlocked(ground, 2.0, 0.5)).toBe(false); // open floor — the manga dresser's old spot (removed for now)
  });

  it("bed blocks players standing on it", () => {
    expect(isBlocked(ground, 2.9, 0.33)).toBe(true); // bed rect corner
  });

  it("nightstand blocks players standing on it", () => {
    expect(isBlocked(ground, 6.45, 0.95)).toBe(true); // nightstand rect corner
  });

  it("plant blocks players standing on it", () => {
    expect(isBlocked(ground, 0.45, 5.1)).toBe(true); // plant center
  });

  it("the old bed/nightstand spots along the west wall are open floor now", () => {
    expect(isBlocked(ground, 1.5, 3.5)).toBe(false); // old bed footprint
    expect(isBlocked(ground, 0.6, 2.1)).toBe(false); // old nightstand footprint
  });

  it("the old window table spot (removed — balcony wave) is open floor now", () => {
    expect(isBlocked(ground, 0.35, 2.7)).toBe(false);
  });

  it("the old dragonslayer spot is open floor again — the super-king bed doesn't reach it", () => {
    // the super-king bed (x 2.9-5.1) doesn't reach x=6.55, and the
    // dragonslayer rect itself is gone — nothing left to block here.
    // (6.55, 0.32) — the rect's own former corner — is skipped as a probe:
    // it sits within the player radius of the z=0 north wall (0.32-0.35 <
    // 0), so it reads "blocked" from the bounds check alone regardless of
    // furniture; not a useful probe for "is the dragonslayer gone".
    expect(isBlocked(ground, 6.55, 0.55)).toBe(false);
    expect(isBlocked(ground, 6.0, 0.55)).toBe(false);
  });
});

describe("west balcony (P4 balcony wave)", () => {
  // The bedroom's west wall (x=0) was, pre-wave, a purely IMPLICIT collider
  // — `isBlocked` blocks anything past the area's `bounds.x`, and there was
  // never a matching entry in `walls`; House.tsx's generic perimeter loop
  // drew the *visual* box, but collision-wise `bounds.x = 0` alone did all
  // the work. Extending `bounds` west (to -1.7, for the balcony/deck) means
  // that implicit wall moves with it — so the old "west wall" behavior at
  // x=0 has to be rebuilt explicitly out of `walls` rects: a north block
  // and a south block (each spanning the full x -1.7..0 depth) reconstruct
  // the solid wall for z 0-2.3 and z 4.5-6, and two thin jamb rects (x
  // -0.14..0) close the wall for z 2.3-2.7 and z 4.1-4.5 — leaving z
  // 2.7-4.1 as the only gap in the x=0 plane: the sliding-door walk-through.

  it("bounds now include the balcony footprint west of x=0", () => {
    expect(isBlocked(ground, -0.75, 3.4)).toBe(false); // was out-of-bounds pre-wave
  });

  it("standing on the deck is walkable", () => {
    expect(isBlocked(ground, -0.75, 3.4)).toBe(false);
  });

  it("walking through the sliding-door gap (z 2.7-4.1) crosses x=0 freely", () => {
    expect(isBlocked(ground, 0.05, 3.4)).toBe(false);
    expect(isBlocked(ground, -0.2, 3.4)).toBe(false);
    const p = resolveMovement(ground, { x: 0.05, z: 3.4 }, { x: -0.25, z: 0 });
    expect(p.x).toBeCloseTo(-0.2);
  });

  it("the wall is solid at x=0 outside the door gap (north and south of it)", () => {
    expect(isBlocked(ground, -0.05, 2.5)).toBe(true); // north of the gap (jamb band)
    expect(isBlocked(ground, -0.05, 4.3)).toBe(true); // south of the gap (jamb band)
  });

  it("the blocked interior west of x=0 (outside the deck) cannot be reached", () => {
    expect(isBlocked(ground, -1.0, 1.0)).toBe(true); // north block interior
    expect(isBlocked(ground, -1.0, 5.0)).toBe(true); // south block interior
  });

  it("the west, north, and south railings block the player at the deck's edges", () => {
    expect(isBlocked(ground, -1.53, 3.4)).toBe(true); // west rail
    expect(isBlocked(ground, -0.75, 2.33)).toBe(true); // north rail
    expect(isBlocked(ground, -0.75, 4.47)).toBe(true); // south rail
  });

  it("cannot walk through the north or south rail off the deck", () => {
    // small deltas so the target lands INSIDE the rail band itself (2.3-2.36
    // / 4.44-4.5), not past it into the north/south wall block — isolates
    // the rail as the thing doing the blocking, not the deeper wall.
    const north = resolveMovement(ground, { x: -0.75, z: 2.5 }, { x: 0, z: -0.15 });
    expect(north.z).toBeCloseTo(2.5); // rail blocks northward exit
    const south = resolveMovement(ground, { x: -0.75, z: 4.3 }, { x: 0, z: 0.15 });
    expect(south.z).toBeCloseTo(4.3); // rail blocks southward exit
  });

  it("the balcony railing rects are present verbatim", () => {
    const railRects = [
      { x: -1.56, z: 2.3, w: 0.06, d: 2.2 },
      { x: -1.5, z: 2.3, w: 1.5, d: 0.06 },
      { x: -1.5, z: 4.44, w: 1.5, d: 0.06 },
    ];
    for (const rect of railRects) {
      const found = ground.furniture.some(
        (f) => f.x === rect.x && f.z === rect.z && f.w === rect.w && f.d === rect.d
      );
      expect(found, `railing rect ${JSON.stringify(rect)} not found`).toBe(true);
    }
  });

  it("the flanking wall rects (blocks + door jambs) are present verbatim", () => {
    const wallRects = [
      { x: -1.7, z: 0, w: 1.7, d: 2.3 }, // north block
      { x: -1.7, z: 4.5, w: 1.7, d: 1.5 }, // south block
      { x: -0.14, z: 2.3, w: 0.14, d: 0.4 }, // north door jamb
      { x: -0.14, z: 4.1, w: 0.14, d: 0.4 }, // south door jamb
    ];
    for (const rect of wallRects) {
      const found = ground.walls.some(
        (f) => f.x === rect.x && f.z === rect.z && f.w === rect.w && f.d === rect.d
      );
      expect(found, `wall rect ${JSON.stringify(rect)} not found`).toBe(true);
    }
  });
});

describe("staircase collider", () => {
  const roof = HOUSE.areas.roof;

  it("the flight is solid on the ground floor (no phasing through)", () => {
    expect(isBlocked(ground, 15.2, 0.5)).toBe(true); // upper stringer
    expect(isBlocked(ground, 15.2, 1.0)).toBe(true); // mid flight
    expect(isBlocked(ground, 15.2, 1.7)).toBe(true); // lower flight
    expect(isBlocked(ground, 15.2, 2.4)).toBe(true); // bottom steps (long shallow run)
  });

  it("the flight is solid on the roof too", () => {
    expect(isBlocked(roof, 15.2, 0.5)).toBe(true);
    expect(isBlocked(roof, 15.2, 2.4)).toBe(true);
  });

  it("the base trigger area stays walkable on both floors", () => {
    expect(isBlocked(ground, 15.2, 3.35)).toBe(false); // trigger center
    expect(isBlocked(roof, 15.2, 3.35)).toBe(false);
  });

  it("walkways around the flight stay open", () => {
    expect(isBlocked(ground, 14.0, 1.0)).toBe(false); // west of the flight
    expect(isBlocked(ground, 15.2, 3.1)).toBe(false); // just south of the base
    expect(isBlocked(ground, 16, 3)).toBe(false); // doorway into the music nook
    expect(isBlocked(ground, 14.7, 3.35)).toBe(false); // rug spot toward the room
  });
});

describe("station triggers vs furniture", () => {
  const intersects = (a: Rect, b: Rect) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;

  it("no station trigger overlaps any ground furniture rect", () => {
    for (const station of STATIONS) {
      for (const rect of ground.furniture) {
        expect(
          intersects(station.trigger, rect),
          `station "${station.id}" trigger overlaps furniture rect ${JSON.stringify(rect)}`
        ).toBe(false);
      }
    }
  });

  it("no portal trigger overlaps any furniture rect in its area (player can stand in it)", () => {
    for (const portal of HOUSE.portals) {
      for (const rect of HOUSE.areas[portal.area].furniture) {
        expect(
          intersects(portal.trigger, rect),
          `portal "${portal.id}" trigger overlaps furniture rect ${JSON.stringify(rect)}`
        ).toBe(false);
      }
    }
  });
});
