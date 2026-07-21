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
  // FURNISHING WAVE (owner's final bedroom design sketch, 2026-07-19): the
  // single nightstand is replaced by a flanking twin pair, and eight new
  // pieces land (twin nightstands, sofa, sunset-lamp stool, cat bed, bench,
  // hanger stand, perfume stand, second plant). Bed and first plant are
  // untouched. Every pairwise gap below was verified programmatically
  // (node script, zero overlaps) before landing — see p4-furnish-report.md
  // for the full clearance table.
  it("bedroom rects are present verbatim", () => {
    const bedroomRects = [
      { x: 2.9, z: 0.33, w: 2.2, d: 2.5 }, // bed (headboard north, centered on the wall, SUPER-KING)
      { x: 2.25, z: 0.4, w: 0.55, d: 0.5 }, // west nightstand
      { x: 5.25, z: 0.4, w: 0.55, d: 0.5 }, // east nightstand
      { x: 0.45, z: 5.1, w: 0.4, d: 0.4 }, // plant
      { x: 0.95, z: 5.15, w: 0.35, d: 0.35 }, // second plant
      { x: 0.6, z: 0.4, w: 0.95, d: 0.95 }, // sofa
      { x: 5.85, z: 0.42, w: 0.4, d: 0.4 }, // sunset-lamp stool
      { x: 7.05, z: 0.45, w: 0.55, d: 0.55 }, // cat bed
      { x: 3.5, z: 2.95, w: 1.2, d: 0.4 }, // bed-front bench
      { x: 3.3, z: 5.35, w: 2.2, d: 0.5 }, // clothes hanger stand
      { x: 5.62, z: 5.35, w: 0.8, d: 0.45 }, // shoe storage cubby (wardrobe corner upgrade)
      { x: 6.55, z: 5.3, w: 1.0, d: 0.5 }, // perfume stand
      { x: -1.525, z: 0.775, w: 0.45, d: 0.45 }, // engawa tea table (DRESSING WAVE, repositioned FULL-LENGTH PASS)
      { x: -1.925, z: 0.875, w: 0.35, d: 0.35 }, // engawa chair (DRESSING WAVE, repositioned FULL-LENGTH PASS)
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

  it("the old single nightstand rect is gone (replaced by the twin pair)", () => {
    const found = ground.furniture.some(
      (f) => f.x === 6.45 && f.z === 0.95 && f.w === 0.55 && f.d === 0.5
    );
    expect(found).toBe(false);
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
      { name: "west nightstand", r: { x: 2.25, z: 0.4, w: 0.55, d: 0.5 } },
      { name: "east nightstand", r: { x: 5.25, z: 0.4, w: 0.55, d: 0.5 } },
      { name: "plant", r: { x: 0.45, z: 5.1, w: 0.4, d: 0.4 } },
      { name: "second plant", r: { x: 0.95, z: 5.15, w: 0.35, d: 0.35 } },
      { name: "sofa", r: { x: 0.6, z: 0.4, w: 0.95, d: 0.95 } },
      { name: "sunset-lamp stool", r: { x: 5.85, z: 0.42, w: 0.4, d: 0.4 } },
      { name: "cat bed", r: { x: 7.05, z: 0.45, w: 0.55, d: 0.55 } },
      { name: "bed-front bench", r: { x: 3.5, z: 2.95, w: 1.2, d: 0.4 } },
      { name: "clothes hanger stand", r: { x: 3.3, z: 5.35, w: 2.2, d: 0.5 } },
      { name: "shoe storage cubby", r: { x: 5.62, z: 5.35, w: 0.8, d: 0.45 } },
      { name: "perfume stand", r: { x: 6.55, z: 5.3, w: 1.0, d: 0.5 } },
      // x computed (-2.7 - 0.06), not a -2.76 literal — see layout.ts's ENGAWA_RAIL_W comment.
      // FULL-LENGTH PASS: west rail now spans z 0-6; north/south rails moved
      // to the deck's true outer edges (z=0/z=5.94-6).
      { name: "engawa west rail", r: { x: -2.7 - 0.06, z: 0, w: 0.06, d: 6 } },
      { name: "engawa north rail", r: { x: -2.7, z: 0, w: 2.7, d: 0.06 } },
      { name: "engawa south rail", r: { x: -2.7, z: 5.94, w: 2.7, d: 0.06 } },
      { name: "engawa fixed-glass pane", r: { x: -0.06, z: 2.5, w: 0.06, d: 0.9 } },
      // DRESSING WAVE — tea nook, repositioned FULL-LENGTH PASS to the
      // longer deck's north third (was the old stub deck's north half)
      { name: "engawa tea table", r: { x: -1.525, z: 0.775, w: 0.45, d: 0.45 } },
      { name: "engawa chair", r: { x: -1.925, z: 0.875, w: 0.35, d: 0.35 } },
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
    expect(isBlocked(ground, 4, 4.3)).toBe(false); // SPAWN point
  });

  it("SPAWN clears the bed-front bench's far edge by exactly 95cm", () => {
    // bench: {x:3.5, z:2.95, w:1.2, d:0.4} → z-span 2.95-3.35, x-span
    // 3.5-4.7. SPAWN.x (4.0) is inside the bench's x-span, so this is a
    // straight z-gap probe, not a diagonal corner case: bench far z edge
    // (3.35) + player radius (0.35) = 3.70 is the tangent point.
    // 4.3 - 3.70 = 0.60m of open margin past the tangent point (and
    // 4.3 - 3.35 = 0.95m from the bench's edge itself, the "95cm" in the
    // title, matching the earlier SUPER-KING pass's clearance-by-title
    // convention of citing the raw edge gap).
    expect(isBlocked(ground, 4, 3.70)).toBe(false); // 3.70 = tangent point, still clear (strict <)
    expect(isBlocked(ground, 4, 3.69)).toBe(true); // 1cm inside the 0.35 radius = blocked
  });

  it("the old SPAWN point {4,3} is still blocked by the super-king bed", () => {
    // bed far z edge (2.83) + player radius (0.35) = 3.18 > 3.0.
    expect(isBlocked(ground, 4, 3)).toBe(true);
  });

  it("the P4-SUPER-KING SPAWN point {4,3.6} is now blocked by the bed-front bench", () => {
    // bench far z edge (3.35) + player radius (0.35) = 3.70 > 3.6 — this is
    // exactly why SPAWN moved again, from {4,3.6} to {4,4.3}.
    expect(isBlocked(ground, 4, 3.6)).toBe(true);
  });

  it("bedroom walkway probes all walkable", () => {
    expect(isBlocked(ground, 4.5, 4.3)).toBe(false); // open floor, south of the bench, at the new spawn's z
    expect(isBlocked(ground, 7.5, 3.0)).toBe(false); // door approach
    expect(isBlocked(ground, 1.6, 4.6)).toBe(false); // open floor west of the room, south side (between the hanger and the plants)
    expect(isBlocked(ground, 2.0, 1.8)).toBe(false); // open floor between the sofa and the west nightstand (z=1.8 clears both z-ranges)
    expect(isBlocked(ground, 6.0, 3.5)).toBe(false); // open floor east of the bench, between it and the about trigger
  });

  it("bed blocks players standing on it", () => {
    expect(isBlocked(ground, 2.9, 0.33)).toBe(true); // bed rect corner
  });

  it("west nightstand blocks players standing on it", () => {
    expect(isBlocked(ground, 2.25, 0.4)).toBe(true); // rect corner
  });

  it("east nightstand blocks players standing on it", () => {
    expect(isBlocked(ground, 5.25, 0.4)).toBe(true); // rect corner
  });

  it("plant blocks players standing on it", () => {
    expect(isBlocked(ground, 0.45, 5.1)).toBe(true); // plant center
  });

  it("second plant blocks players standing on it", () => {
    expect(isBlocked(ground, 0.95, 5.15)).toBe(true); // rect corner
  });

  it("sofa blocks players standing on it", () => {
    expect(isBlocked(ground, 0.6, 0.4)).toBe(true); // rect corner
  });

  it("sunset-lamp stool blocks players standing on it", () => {
    expect(isBlocked(ground, 5.85, 0.42)).toBe(true); // rect corner
  });

  it("cat bed blocks players standing on it", () => {
    expect(isBlocked(ground, 7.05, 0.45)).toBe(true); // rect corner
  });

  it("bed-front bench blocks players standing on it", () => {
    expect(isBlocked(ground, 3.5, 2.95)).toBe(true); // rect corner
  });

  it("clothes hanger stand blocks players standing on it", () => {
    expect(isBlocked(ground, 3.3, 5.35)).toBe(true); // rect corner
  });

  it("perfume stand blocks players standing on it", () => {
    expect(isBlocked(ground, 6.55, 5.3)).toBe(true); // rect corner
  });

  it("shoe storage cubby blocks players standing on it", () => {
    expect(isBlocked(ground, 5.62, 5.35)).toBe(true); // rect corner
  });

  it("engawa tea table blocks players standing on it (DRESSING WAVE, repositioned FULL-LENGTH PASS)", () => {
    expect(isBlocked(ground, -1.3, 1.0)).toBe(true); // rect center
  });

  it("engawa chair blocks players standing on it (DRESSING WAVE, repositioned FULL-LENGTH PASS)", () => {
    expect(isBlocked(ground, -1.75, 1.05)).toBe(true); // rect center
  });

  it("the old bed/nightstand spots along the west wall are open floor now", () => {
    expect(isBlocked(ground, 1.5, 3.5)).toBe(false); // old bed footprint
    // old single-nightstand footprint from the P4-recenter pass, still
    // clear of the new sofa (sofa's z-max 1.35 is well short of z=2.1)
    expect(isBlocked(ground, 0.6, 2.1)).toBe(false);
  });

  it("the old window table spot (removed — engawa wave) is open floor now", () => {
    // moved from (0.35, 2.7): the P4 engawa rework's thicker west wall (its
    // north segment now runs x -0.1..0.1, z 0-2.5, wider/longer than the
    // old thin door-jamb it replaces) reaches within player-radius of that
    // exact corner, which is an expected side effect of item 2 (the wall
    // must read thick/solid), not a furniture regression — (0.5, 3.8) sits
    // in the same general west-wall area, clear of the new wall's corner.
    expect(isBlocked(ground, 0.5, 3.8)).toBe(false);
  });

  it("the old dragonslayer spot is now covered by the cat bed and its approach", () => {
    // the old dragonslayer rect ({x:6.55,z:0.32,w:0.85,d:0.5}, x 6.55-7.4)
    // is gone, but this wave's cat bed ({x:7.05,z:0.45,w:0.55,d:0.55})
    // reoccupies most of that footprint, and the sunset-lamp stool
    // (x 5.85-6.25) sits close enough (0.3m gap to x=6.55, inside the 0.35
    // player radius) to also reach into it — so the spot reads "furnished
    // again", just by different pieces. (6.55, 0.55): nearest stool edge is
    // x=6.25, dx=0.3 < 0.35 radius → blocked by the stool, not the (absent)
    // dragonslayer rect nor the cat bed (nearest cat-bed edge is x=7.05,
    // dx=0.5, clear on its own).
    expect(isBlocked(ground, 6.55, 0.55)).toBe(true);
    // (7.2, 0.7) sits inside the cat bed's own footprint (x 7.05-7.6,
    // z 0.45-1.0) — directly blocked by the new furniture, not a proximity
    // effect.
    expect(isBlocked(ground, 7.2, 0.7)).toBe(true);
  });
});

describe("engawa (P4 engawa rework, renamed from 'balcony')", () => {
  // REWORK (owner feedback: prior pass read "dark, boxed, paper-thin-walled").
  // Five structural fixes, all pure rect arithmetic — see layout.ts's engawa
  // comment block for the full derivation:
  //   1. door widened z 2.7-4.1 (1.4m) → z 2.5-4.3 (1.8m), AND the "fixed"
  //      glass half now has a real collider (it never did before — a player
  //      could walk straight through painted glass).
  //   2. the west wall rebuilt as a proper thick wall (same dividerWithDoor
  //      idiom every interior divider uses, WALL_T=0.2, box x -0.1..0.1) —
  //      replaces the old 0.14m-wide door-jamb slivers.
  //   3. the deck extended west + deeper in z: {x:-1.5,z:2.3,w:1.5,d:2.2} →
  //      {x:-2.7,z:2.1,w:2.7,d:2.5}; bounds grows to match (x -1.7→-2.9).
  //   4. railing repositioned to the deck's new outer edges (still solid
  //      colliders on all three sides — the visible wood-post rendering
  //      lives in Bedroom.tsx, out of collision's scope).
  //
  // FULL-LENGTH PASS (this pass, owner's ask: the engawa should run the FULL
  // length of the bedroom's west side): deck z-band grows from the 2.1-4.6
  // stub to the full 0-6 (matching `bounds`, which already covered this —
  // no bounds change). ENGAWA_WALL_BLOCK_N/S (the old void backstop for the
  // z-bands beyond the stub) are deleted outright — see the dedicated test
  // below. The west rail extends to z 0-6; the north/south rails move from
  // the stub's own inner edges (z 2.1/4.6) to the house's true north/south
  // edges (z 0/z 6). The tea nook relocates into the now-much-longer deck's
  // north third (its own describe block below has the up-to-date numbers).

  it("bounds now include the engawa deck footprint west of x=0", () => {
    expect(isBlocked(ground, -1.35, 3.35)).toBe(false); // deck center, was out-of-bounds pre-P4
  });

  it("standing on the enlarged deck is walkable along its full new length (FULL-LENGTH PASS)", () => {
    expect(isBlocked(ground, -1.35, 3.35)).toBe(false); // deck, mid-length
    expect(isBlocked(ground, -2.3, 3.35)).toBe(false); // deep west, clear of the west rail's radius
    // east side, mid-deck, clear of the tea nook (now north-third — see the
    // "tea nook" describe below)
    expect(isBlocked(ground, -0.5, 2.6)).toBe(false);
    expect(isBlocked(ground, -1.35, 4.1)).toBe(false); // south of the door, open floor
    // NEW (FULL-LENGTH PASS): the true north and south ends — formerly void
    // backstopped by ENGAWA_WALL_BLOCK_N/S, now real walkable deck.
    expect(isBlocked(ground, -2.3, 0.5)).toBe(false); // near the true north end, clear of the north-end rail's radius
    expect(isBlocked(ground, -2.3, 5.5)).toBe(false); // near the true south end, clear of the south-end rail's radius
  });

  it("walking through the widened sliding-door gap (z 2.5-4.3) crosses x=0 freely — open half only", () => {
    // the open half is z 3.4-4.3 (see the fixed-glass-pane test below for
    // the OTHER half, which is now solid).
    expect(isBlocked(ground, 0.05, 3.8)).toBe(false);
    expect(isBlocked(ground, -0.2, 3.8)).toBe(false);
    const p = resolveMovement(ground, { x: 0.05, z: 3.8 }, { x: -0.4, z: 0 });
    expect(p.x).toBeCloseTo(-0.35);
  });

  it("the fixed glass pane (z 2.5-3.4, the OTHER half of the door) is now solid, not walk-through", () => {
    // pre-rework this half had no collider at all — the glass was purely
    // decorative and a player could walk straight through it.
    expect(isBlocked(ground, 0.05, 2.9)).toBe(true);
    expect(isBlocked(ground, -0.05, 2.9)).toBe(true);
    const p = resolveMovement(ground, { x: 0.4, z: 2.9 }, { x: -0.4, z: 0 });
    expect(p.x).toBeGreaterThan(0); // blocked before reaching x=0
  });

  it("the thick west wall is solid at x=0 outside the door gap (north and south of it)", () => {
    expect(isBlocked(ground, -0.05, 1.0)).toBe(true); // north segment interior
    expect(isBlocked(ground, -0.05, 5.0)).toBe(true); // south segment interior
    expect(isBlocked(ground, 0.05, 1.0)).toBe(true); // solid from the bedroom side too
    expect(isBlocked(ground, 0.05, 5.0)).toBe(true);
  });

  it("the west wall rects are the proper WALL_T=0.2 thick-wall boxes (same idiom as every interior divider)", () => {
    const wallRects = [
      { x: -0.1, z: 0, w: 0.2, d: 2.5 }, // north segment
      { x: -0.1, z: 4.3, w: 0.2, d: 1.7 }, // south segment
    ];
    for (const rect of wallRects) {
      const found = ground.walls.some(
        (f) =>
          f.x === rect.x &&
          f.z === rect.z &&
          f.w === rect.w &&
          Math.abs(f.d - rect.d) < 1e-9
      );
      expect(found, `wall rect ${JSON.stringify(rect)} not found in walls`).toBe(true);
    }
  });

  it("FULL-LENGTH PASS: the old void-backstop wall blocks are gone — that whole strip is real, walkable deck now", () => {
    // ENGAWA_WALL_BLOCK_N/S used to occupy this exact footprint (invisible,
    // `furniture`-only) to stop players walking into the void beyond the
    // stub deck's own z-band. The deck itself now covers the identical
    // z-range (0-6), so the blocks are deleted outright, not repositioned.
    const staleBlockRects = [
      { x: -2.9, z: 0, w: 2.9, d: 2.1 }, // old north block
      { x: -2.9, z: 4.6, w: 2.9, d: 1.4 }, // old south block
    ];
    for (const rect of staleBlockRects) {
      const found = ground.furniture.some(
        (f) => f.x === rect.x && f.z === rect.z && f.w === rect.w && f.d === rect.d
      );
      expect(found, `stale wall-block rect ${JSON.stringify(rect)} should be gone`).toBe(false);
    }
    // the strips those blocks used to backstop (old z 0-2.1 and 4.6-6, west
    // of the wall) are now genuinely walkable deck floor. x=-0.5 (east side
    // of the deck, clear of the wall at x -0.1..0.1 and of the relocated
    // tea nook, which now sits further west and north).
    expect(isBlocked(ground, -0.5, 1.0)).toBe(false); // former north-block interior
    expect(isBlocked(ground, -0.5, 5.0)).toBe(false); // former south-block interior
  });

  it("the west, north-end, and south-end railings block the player at the deck's true outer edges (FULL-LENGTH PASS)", () => {
    expect(isBlocked(ground, -2.73, 3.35)).toBe(true); // west rail (still spans the full length, any mid z works)
    expect(isBlocked(ground, -0.5, 0.03)).toBe(true); // north-end rail (moved from z=2.1 to the true z=0 edge)
    expect(isBlocked(ground, -0.5, 5.97)).toBe(true); // south-end rail (moved from z=4.54 to the true z=6 edge)
  });

  it("cannot walk through the north-end or south-end rail off the full-length deck", () => {
    // resolveMovement applies each axis's delta all-or-nothing (checks only
    // the target point, no sliding-to-boundary) — same idiom every other
    // resolveMovement test in this file uses. x=-0.5 stays clear of the tea
    // nook (now north-third, x -1.925..-1.075) and of the wall/glass
    // (x -0.1..0.1).
    const north = resolveMovement(ground, { x: -0.5, z: 1.0 }, { x: 0, z: -0.8 });
    expect(north.z).toBeCloseTo(1.0); // z-delta dropped — target (0.2) is within the north-end rail's radius
    const south = resolveMovement(ground, { x: -0.5, z: 5.0 }, { x: 0, z: 0.8 });
    expect(south.z).toBeCloseTo(5.0); // z-delta dropped — target (5.8) is within the south-end rail's radius
  });

  it("the engawa railing rects are present verbatim at the deck's true outer edges (FULL-LENGTH PASS)", () => {
    const railRects = [
      // x computed (-2.7 - 0.06), not a -2.76 literal — see layout.ts's ENGAWA_RAIL_W comment
      { x: -2.7 - 0.06, z: 0, w: 0.06, d: 6 },
      { x: -2.7, z: 0, w: 2.7, d: 0.06 },
      { x: -2.7, z: 5.94, w: 2.7, d: 0.06 },
    ];
    for (const rect of railRects) {
      const found = ground.furniture.some(
        (f) => f.x === rect.x && f.z === rect.z && f.w === rect.w && f.d === rect.d
      );
      expect(found, `railing rect ${JSON.stringify(rect)} not found`).toBe(true);
    }
  });

  it("the fixed-glass-pane collider rect is present verbatim in furniture", () => {
    const found = ground.furniture.some(
      (f) => f.x === -0.06 && f.z === 2.5 && f.w === 0.06 && f.d === 0.9
    );
    expect(found).toBe(true);
  });

  it("the old (pre-extension) deck footprint is superseded, not double-defined", () => {
    // the old (stub-deck-era) rail rects must be gone now that they've
    // moved — includes both the original P4-engawa-rework positions AND the
    // even-older pre-rework positions from before that.
    const oldRailRects = [
      { x: -1.56, z: 2.3, w: 0.06, d: 2.2 },
      { x: -1.5, z: 2.3, w: 1.5, d: 0.06 },
      { x: -1.5, z: 4.44, w: 1.5, d: 0.06 },
      // stub-deck-era (P4 engawa rework, pre-FULL-LENGTH-PASS) rail rects
      { x: -2.7 - 0.06, z: 2.1, w: 0.06, d: 2.5 },
      { x: -2.7, z: 2.1, w: 2.7, d: 0.06 },
      { x: -2.7, z: 4.54, w: 2.7, d: 0.06 },
    ];
    for (const rect of oldRailRects) {
      const found = ground.furniture.some(
        (f) => f.x === rect.x && f.z === rect.z && f.w === rect.w && f.d === rect.d
      );
      expect(found, `stale old rail rect ${JSON.stringify(rect)} should be gone`).toBe(false);
    }
  });

  // DRESSING WAVE (tea nook), repositioned FULL-LENGTH PASS from the stub
  // deck's north half (z 2.1-3.4) into the longer deck's north third (z
  // ~0.4-1.6) — TDD'd before landing: these probes assert both colliders
  // still block at their new centers, that the nook now has genuine
  // breathing room off both rails (the ask this pass — it used to hug the
  // corner with no walk-through gap behind the chair), and that the two
  // things the brief called out explicitly stay clear of it (the z 3.4-4.3
  // walk-through gap, and the path south to the reserved — and also
  // relocated — bonsai pedestal spot).
  describe("tea nook (DRESSING WAVE, repositioned FULL-LENGTH PASS)", () => {
    it("the tea table and chair block the player at their new centers", () => {
      expect(isBlocked(ground, -1.3, 1.0)).toBe(true); // tea table
      expect(isBlocked(ground, -1.75, 1.05)).toBe(true); // chair
    });

    it("the nook's rects don't overlap the west/north rails or the fixed glass pane (rect-level, matches the brief's ask)", () => {
      const intersects = (a: Rect, b: Rect) =>
        a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;
      const chair = { x: -1.925, z: 0.875, w: 0.35, d: 0.35 };
      const table = { x: -1.525, z: 0.775, w: 0.45, d: 0.45 };
      const railW = { x: -2.7 - 0.06, z: 0, w: 0.06, d: 6 };
      const railN = { x: -2.7, z: 0, w: 2.7, d: 0.06 };
      const glass = { x: -0.06, z: 2.5, w: 0.06, d: 0.9 };
      for (const other of [railW, railN, glass]) {
        expect(intersects(chair, other)).toBe(false);
        expect(intersects(table, other)).toBe(false);
      }
    });

    it("FULL-LENGTH PASS: the nook now has real breathing room off the west rail (fixes the old rail-hugging squeeze)", () => {
      // chair x-min (-1.925) to west-rail x-max (-2.70) is now 77.5cm —
      // was 37.5cm pre-extension, when 2×0.35 player-radius (0.70m) left no
      // room to pass. The midpoint between them is now walkable, proving a
      // player can actually walk around the chair's west side.
      expect(isBlocked(ground, -2.3125, 1.05)).toBe(false);
    });

    it("the room-side approach to the nook (east of the table) stays walkable", () => {
      expect(isBlocked(ground, -0.6, 1.0)).toBe(false);
    });

    it("the walk-through gap (z 3.4-4.3) stays fully clear of the nook", () => {
      // table's south edge (z 1.225) sits well north of the gap's own
      // z-min (3.4) — nowhere near the nook.
      expect(isBlocked(ground, -1.3, 3.6)).toBe(false); // deck side of the open gap, in line with the table's x
      expect(isBlocked(ground, -0.2, 3.8)).toBe(false); // inside the gap itself (pre-existing probe, still true post-nook)
    });

    it("a path from the walk gap south to the reserved (and relocated) bonsai pedestal spot stays clear", () => {
      // bonsai spot: x -1.6..-1.2, z 5.6-5.9 (layout.ts's RESERVE comment,
      // moved south this pass to keep pace with the south-end rail's own
      // move from z=4.54 to z=5.94 — same 19cm gap between spot and rail as
      // before). The nook sits entirely north of z 1.225, nowhere near this
      // path, so a straight walk south is unobstructed the whole way up to
      // the spot's own northern approach (5.55) — NOTE: the spot's own
      // z-range (5.6-5.9) sits close enough to the south-end rail (z-min
      // 5.94) that most of it already falls inside the rail's own 0.35
      // player-radius zone (same pre-existing relationship as before this
      // pass, just at the new rail position), which is exactly why the
      // placeholder plant landing there gets no new collider of its own: a
      // player was never going to stand dead-center on it anyway, same as
      // standing flush against any railing.
      expect(isBlocked(ground, -1.4, 4.5)).toBe(false);
      expect(isBlocked(ground, -1.4, 5.0)).toBe(false);
      expect(isBlocked(ground, -1.4, 5.55)).toBe(false); // the reserved spot's own northern approach
    });
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
