import { describe, it, expect } from "vitest";
import {
  HOUSE,
  GENKAN_DOOR_LO,
  GENKAN_DOOR_HI,
  FRONT_DOOR_LO,
  FRONT_DOOR_HI,
  type Rect,
} from "@/threeam/world/layout";
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
  // LAYOUT V2 (2026-08-09): the desk, EVA shrine, and coffee bar migrated
  // out of the common area into the new WORKSTATION_ROOM behind it (see
  // layout.ts's LAYOUT V2 comment block) — probes below re-point to the
  // new workstation coords instead of the old common-area ones.
  it("desk and chair block (migrated to the workstation)", () => {
    expect(isBlocked(ground, 11.6, -5.55)).toBe(true); // desk
    expect(isBlocked(ground, 11.4, -4.6)).toBe(true); // chair, center
  });

  it("the desk collider covers the desktop's visual EAST overhang (owner: 'i can walk in the work table' — rect widened 2.2->2.4; west overhang stays uncovered on purpose, it sits inside the projects station trigger zone, see layout.ts)", () => {
    expect(isBlocked(ground, 12.85, -5.55)).toBe(true); // east overhang, was outside the old x-max 12.7
  });

  it("the sunset lamp below the akira poster blocks (real floor furniture, genkan precedent)", () => {
    expect(isBlocked(ground, 8.35, -2.65)).toBe(true); // lamp center
    expect(isBlocked(ground, 8.6, -3.3)).toBe(false); // floor SE of it stays walkable (probe clear of the west wall's own 0.35 radius margin)
  });

  it("the old common-area desk/chair spots are walkable again (migrated to the workstation)", () => {
    expect(isBlocked(ground, 11, 0.75)).toBe(false); // old desk spot
    expect(isBlocked(ground, 10.8, 1.9)).toBe(false); // old chair spot
  });

  it("the spot east of the chair is walkable (desk front unobstructed — probe moved -4.6→-4.4 when the desk collider gained its 0.2m south stand-off, owner round 2 of 'i can walk in the work table')", () => {
    expect(isBlocked(ground, 12.2, -4.4)).toBe(false);
  });

  it("the SW EVA-01 shrine blocks (migrated to the workstation)", () => {
    expect(isBlocked(ground, 9.05, -1.1)).toBe(true); // plinth center
  });

  it("the old common-area EVA shrine spot is walkable again (migrated to the workstation)", () => {
    expect(isBlocked(ground, 9.1, 5.45)).toBe(false);
  });

  it("the coffee bar blocks (east wall, workstation) — counter + machine + paper lantern merged into one rect", () => {
    expect(isBlocked(ground, 15.15, -5.5)).toBe(true); // west end
    expect(isBlocked(ground, 15.5, -5.5)).toBe(true); // center
    expect(isBlocked(ground, 15.9, -5.5)).toBe(true); // east end
  });

  it("the full-wall bookshelf blocks (east wall, SE corner — T8 finale item 13: 2nd move, off the west wall)", () => {
    expect(isBlocked(ground, 15.7, -1.15)).toBe(true); // shelf center
    expect(isBlocked(ground, 15.7, -1.7)).toBe(true); // near the north end (z-1.8..-0.5 band)
    expect(isBlocked(ground, 15.7, -0.6)).toBe(true); // near the south end
  });

  it("the old west-wall bookshelf spot (item 10) is walkable again — probed between the project table's south edge (z-3.9) and the sunset lamp (z-2.88..-2.42, which now stands in the north half of the old bookshelf run, so the probe sits in the remaining south gap)", () => {
    expect(isBlocked(ground, 8.6, -3.4)).toBe(false);
  });

  it("the project-building table blocks (west wall, workstation — T8 finale item 15)", () => {
    expect(isBlocked(ground, 8.5, -5.0)).toBe(true); // table center
    expect(isBlocked(ground, 8.5, -6.0)).toBe(true); // near the north wall end
    expect(isBlocked(ground, 8.5, -4.0)).toBe(true); // near the south end
  });

  it("the bookshelf's rect doesn't overlap the coffee bar's rect (raw AABB check — both on the east wall, shelf south of it)", () => {
    const bookshelf = ground.furniture.find((f) => f.x === 15.46 && f.z === -1.8)!;
    const coffeeBar = ground.furniture.find((f) => f.x === 15.1 && f.z === -6.15)!;
    expect(bookshelf).toBeDefined();
    expect(coffeeBar).toBeDefined();
    const overlap =
      bookshelf.x < coffeeBar.x + coffeeBar.w &&
      bookshelf.x + bookshelf.w > coffeeBar.x &&
      bookshelf.z < coffeeBar.z + coffeeBar.d &&
      bookshelf.z + bookshelf.d > coffeeBar.z;
    expect(overlap).toBe(false);
  });

  it("the project table's rect doesn't overlap the EVA shrine's rect (raw AABB check)", () => {
    const table = ground.furniture.find((f) => f.x === 8 && f.z === -6.1)!;
    const eva = ground.furniture.find((f) => f.x === 8.3 && f.z === -1.7)!;
    expect(table).toBeDefined();
    expect(eva).toBeDefined();
    const overlap =
      table.x < eva.x + eva.w &&
      table.x + table.w > eva.x &&
      table.z < eva.z + eva.d &&
      table.z + table.d > eva.z;
    expect(overlap).toBe(false);
  });

  it("the old separate paper-lantern floor lamp rect is gone (merged into the coffee bar)", () => {
    const found = ground.furniture.some(
      (f) => f.x === 13.55 && f.z === 5.3 && f.w === 0.5 && f.d === 0.5
    );
    expect(found).toBe(false);
  });

  it("the old common-area coffee-corner spot is walkable again (migrated to the workstation)", () => {
    expect(isBlocked(ground, 12, 5.6)).toBe(false); // old counter front face, center
    expect(isBlocked(ground, 13.8, 5.55)).toBe(false); // old lamp center
  });

  it("the south walkway around the old coffee corner stays open", () => {
    expect(isBlocked(ground, 11.5, 5.15)).toBe(false); // between shrine and counter front
    expect(isBlocked(ground, 12, 5.1)).toBe(false); // in front of the counter (coffee-making spot)
    expect(isBlocked(ground, 13.15, 5.5)).toBe(false); // between counter and lantern lamp
    expect(isBlocked(ground, 14.75, 5.5)).toBe(false); // between lamp and bookshelf
  });

  it("the old drawer's footprint is walkable again (drawer removed)", () => {
    expect(isBlocked(ground, 8.5, 4.8)).toBe(false);
  });

  it("the old common-area SE bookshelf spot is walkable again (T8 finale: moved into the workstation, items 10 then 13) — probed at x15.5, clear of both the (now-gone) bookshelf AND the x16 common/music divider's own PLAYER_RADIUS margin", () => {
    expect(isBlocked(ground, 15.5, 4.9)).toBe(false); // old bookshelf center
    expect(isBlocked(ground, 15.5, 4.0)).toBe(false); // old doorway-end of the shelf
    expect(isBlocked(ground, 15.5, 5.5)).toBe(false); // old south-end of the shelf (clear of the z6 south stub's own margin too)
  });

  it("workspace walkways stay open", () => {
    expect(isBlocked(ground, 12, 3)).toBe(false); // room center
    expect(isBlocked(ground, 9.7, 2.9)).toBe(false); // open floor (old chair spot, migrated to the workstation)
    expect(isBlocked(ground, 13.5, 1.1)).toBe(false); // corkboard station spot
    expect(isBlocked(ground, 8.9, 1.2)).toBe(false); // projects station spot
    expect(isBlocked(ground, 15.0, 4.9)).toBe(false); // old bookshelf's west flank, still walkable (bookshelf gone from here)
    expect(isBlocked(ground, 16, 3)).toBe(false); // doorway into the music room stays open
  });

  it("PLANT PASS: the potted tree between the EVA shrine and the coffee counter blocks", () => {
    expect(isBlocked(ground, 9.97, 5.32)).toBe(true); // rect corner
  });

  it("PLANT PASS: the floor in front of the potted tree stays walkable", () => {
    expect(isBlocked(ground, 10.3, 4.9)).toBe(false); // north of the plant, room-facing
  });
});

describe("W7 workstation floor pass (owner-approved: mushroom rug + beanbag/pile + waste bin — W7 FIX ROUND grew the beanbag's footprint and moved the bin south, per owner review)", () => {
  it("the beanbag blocks players standing on it (real furniture — genkan phase-through precedent, honest collider)", () => {
    expect(isBlocked(ground, 13.2, -2.1)).toBe(true); // rect center (owner size-up: 0.8->1.0, center moved east to keep x-min pinned at 12.7)
    expect(isBlocked(ground, 12.7, -2.6)).toBe(true); // rect corner (owner size-up: was 12.7,-2.5)
  });

  it("the waste bin blocks players standing on it", () => {
    expect(isBlocked(ground, 12.85, -4.75)).toBe(true); // rect center (FIX ROUND: moved south, was -5.75)
    expect(isBlocked(ground, 12.7, -4.9)).toBe(true); // rect corner (FIX ROUND: was 12.7,-5.9)
  });

  it("the rug itself has no collider — its footprint (away from the beanbag) stays walkable, visual floor dressing only", () => {
    expect(isBlocked(ground, 12, -3.0)).toBe(false); // rug center
    expect(isBlocked(ground, 11.5, -3.2)).toBe(false); // inside the round mushroom rug's own footprint (FIX ROUND: rug is now a 2.1x2.1 circle, not the old 3.0x2.2 rect — this point sits ~0.54m from its center, comfortably inside the ~1.05m radius), clear of the chair/desk/beanbag colliders
  });

  it("the beanbag doesn't overlap the waste bin, the coffee bar, or the 'experience' station trigger (raw AABB checks)", () => {
    const intersects = (a: Rect, b: Rect) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;
    const beanbag = ground.furniture.find((f) => f.x === 12.7 && f.z === -2.6)!;
    const bin = ground.furniture.find((f) => f.x === 12.7 && f.z === -4.9)!;
    const coffeeBar = ground.furniture.find((f) => f.x === 15.1 && f.z === -6.15)!;
    const experienceTrigger: Rect = { x: 13.0, z: -5.6, w: 1.9, d: 1.5 };
    expect(beanbag).toBeDefined();
    expect(bin).toBeDefined();
    expect(intersects(beanbag, bin)).toBe(false);
    expect(intersects(beanbag, coffeeBar)).toBe(false);
    expect(intersects(bin, coffeeBar)).toBe(false);
    expect(intersects(beanbag, experienceTrigger)).toBe(false);
    expect(intersects(bin, experienceTrigger)).toBe(false);
  });

  it("walk-path sanity: the door↔desk lane stays open (probes along the chair's east flank, the existing 'desk front unobstructed' corridor at x12.2 — the new rug/beanbag/bin add nothing in its way)", () => {
    expect(isBlocked(ground, 12, -0.3)).toBe(false); // at the door
    expect(isBlocked(ground, 12.2, -1.5)).toBe(false); // onto the rug
    expect(isBlocked(ground, 12.2, -2.8)).toBe(false); // rug mid-span, clear of the beanbag (x-min 12.7, FIX ROUND)
    expect(isBlocked(ground, 12.2, -4.0)).toBe(false); // approaching the chair, still clear at this x
    expect(isBlocked(ground, 12.2, -4.4)).toBe(false); // pre-existing probe, moved -4.6→-4.4 with the desk's 0.2m south stand-off (owner round 2), still south of the desk rect's new z-max -4.9 by a clean 0.5m
  });

  it("walk-path sanity: the door↔worktable lane stays open (probes along a straight line from the door toward the worktable, each individually clear of the EVA shrine's and project table's own player-radius margins)", () => {
    expect(isBlocked(ground, 12, -0.3)).toBe(false); // at the door
    expect(isBlocked(ground, 11.0, -1.2)).toBe(false);
    expect(isBlocked(ground, 10.0, -2.2)).toBe(false); // clears the EVA shrine's expanded z-margin (-2.05) by 0.15m
    expect(isBlocked(ground, 9.3, -3.1)).toBe(false); // clears the project table's expanded z-margin (-3.55) by 0.45m
  });
});

describe("genkan furniture colliders (T8 finale item 17 — owner-reported: T6 shipped these decor-only, colliders added now that layout.ts is in scope)", () => {
  it("the shoe rack and umbrella stand block, matching their rendered footprints in Genkan.tsx", () => {
    expect(isBlocked(ground, 8.8, 6.55)).toBe(true); // shoe rack center
    expect(isBlocked(ground, 14.6, 7.5)).toBe(true); // umbrella stand center
  });

  it("the doormat stays walkable (floor decal, not furniture — no collider by design)", () => {
    expect(isBlocked(ground, 12.05, 7.6)).toBe(false);
  });

  it("genkan furniture doesn't block the inner-door↔front-door walking lane (x11.4-12.7, live sweep — z capped at 7.7, short of GK_FRONT_WALL's own z8.1 face plus its PLAYER_RADIUS margin, since that wall is intentionally solid/locked, not a furniture concern)", () => {
    for (let z = 6.3; z < 7.7; z += 0.1) {
      expect(isBlocked(ground, 12, z)).toBe(false);
    }
  });

  it("neither genkan furniture rect overlaps the inner doorway or front-door gap (raw AABB, live sweep — same convention as layout-v2.test.ts's door-gap sweep)", () => {
    const gaps: Rect[] = [
      { x: GENKAN_DOOR_LO, z: 6, w: GENKAN_DOOR_HI - GENKAN_DOOR_LO, d: 0.2 },
      { x: FRONT_DOOR_LO, z: 8.1, w: FRONT_DOOR_HI - FRONT_DOOR_LO, d: 0.2 },
    ];
    const shoeRack = ground.furniture.find((f) => f.x === 8.3 && f.z === 6.375)!;
    const umbrella = ground.furniture.find((f) => f.x === 14.45 && f.z === 7.35)!;
    expect(shoeRack).toBeDefined();
    expect(umbrella).toBeDefined();
    for (const f of [shoeRack, umbrella]) {
      for (const gap of gaps) {
        const overlap =
          f.x < gap.x + gap.w && f.x + f.w > gap.x && f.z < gap.z + gap.d && f.z + f.d > gap.z;
        expect(overlap).toBe(false);
      }
    }
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
      { x: 0.43, z: 5.0, w: 0.94, d: 0.84 }, // broadleaf plant (PLANT PASS, real GLB, replaces the two hand-built plants)
      { x: 1.55, z: 5.0, w: 0.66, d: 0.66 }, // potted tree (PLANT PASS, real GLB, beside the broadleaf)
      { x: 0.6, z: 0.4, w: 0.95, d: 0.95 }, // sofa
      { x: 5.85, z: 0.42, w: 0.4, d: 0.4 }, // sunset-lamp stool
      { x: 6.72, z: 0.45, w: 0.88, d: 0.88 }, // cat bed (CATBED ENLARGE PASS, 1.6x diameter)
      { x: 3.3, z: 5.35, w: 2.2, d: 0.5 }, // clothes hanger stand
      { x: 5.62, z: 5.35, w: 0.8, d: 0.45 }, // shoe storage cubby (wardrobe corner upgrade)
      { x: 6.55, z: 5.3, w: 1.0, d: 0.5 }, // perfume stand
      { x: 2.55, z: 5.25, w: 0.35, d: 0.35 }, // south floor lamp (ART+LIGHT+RUGGATE pass)
      { x: -1.525, z: 0.775, w: 0.45, d: 0.45 }, // engawa tea table (DRESSING WAVE, repositioned FULL-LENGTH PASS)
      { x: -1.925, z: 0.875, w: 0.35, d: 0.35 }, // engawa chair (DRESSING WAVE, repositioned FULL-LENGTH PASS)
      { x: -1.9, z: 5.15, w: 0.5, d: 0.4 }, // zen garden display stand (kadai), ZEN GARDEN PASS
      { x: -1.67, z: 5.62, w: 0.24, d: 0.24 }, // zen garden big accent rock, ZEN GARDEN PASS
      { x: -1.85, z: 0.09, w: 0.6, d: 0.6 }, // tall palm (PLANT PASS), engawa north tip
      { x: -0.6, z: 1.55, w: 0.45, d: 0.55 }, // ficus (PLANT PASS), engawa east side
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

  it("the bed-front bench rect is gone (owner ask: remove the bed-foot bench)", () => {
    const found = ground.furniture.some(
      (f) => f.x === 3.5 && f.z === 2.95 && f.w === 1.2 && f.d === 0.4
    );
    expect(found).toBe(false);
  });

  it("the dragonslayer lean-zone rect is gone (parked for the den)", () => {
    const found = ground.furniture.some(
      (f) => f.x === 6.55 && f.z === 0.32 && f.w === 0.85 && f.d === 0.5
    );
    expect(found).toBe(false);
  });

  it("no two furniture rects overlap (live sweep over ground.furniture, not a hand-copied snapshot)", () => {
    // Pulls straight from the live layout data (imported above) instead of a
    // hardcoded copy, so it can never drift from the real furniture list
    // again — a hand-copied array previously omitted two engawa plant rects
    // (tall palm, ficus) from this sweep entirely, a coverage hole that let
    // a real overlap slip past unnoticed.
    const intersects = (a: Rect, b: Rect) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;
    const rects = ground.furniture;
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(
          intersects(rects[i], rects[j]),
          `furniture rect ${JSON.stringify(rects[i])} overlaps ${JSON.stringify(rects[j])}`
        ).toBe(false);
      }
    }
  });

  it("SPAWN point with player radius stays clear of all bedroom rects", () => {
    expect(isBlocked(ground, 4, 4.3)).toBe(false); // SPAWN point
  });

  it("the old SPAWN point {4,3} is still blocked by the super-king bed", () => {
    // bed far z edge (2.83) + player radius (0.35) = 3.18 > 3.0.
    expect(isBlocked(ground, 4, 3)).toBe(true);
  });

  it("BENCH REMOVAL: the old bed-front-bench spot {4,3.6} is walkable again (bench removed)", () => {
    // pre-removal this was blocked by the bench's far z edge (3.35) +
    // player radius (0.35) = 3.70 > 3.6 — the bench is gone now, and
    // nothing else reaches this point (bed far z edge 2.83 + 0.35 = 3.18
    // < 3.6, also clear).
    expect(isBlocked(ground, 4, 3.6)).toBe(false);
  });

  it("bedroom walkway probes all walkable", () => {
    expect(isBlocked(ground, 4.5, 4.3)).toBe(false); // open floor, at the spawn's z (the bench used to sit north of here, now gone)
    expect(isBlocked(ground, 7.5, 3.0)).toBe(false); // door approach
    expect(isBlocked(ground, 1.6, 4.6)).toBe(false); // open floor west of the room, south side (between the hanger and the plants)
    expect(isBlocked(ground, 2.0, 1.8)).toBe(false); // open floor between the sofa and the west nightstand (z=1.8 clears both z-ranges)
    expect(isBlocked(ground, 6.0, 3.5)).toBe(false); // open floor east of the old bench spot, between it and the about trigger
    expect(isBlocked(ground, 4, 3.35)).toBe(false); // BENCH REMOVAL: dead-center of the old bench footprint, now open floor
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

  it("broadleaf plant blocks players standing on it (PLANT PASS, real GLB)", () => {
    expect(isBlocked(ground, 0.43, 5.0)).toBe(true); // rect corner
  });

  it("potted tree blocks players standing on it (PLANT PASS, real GLB)", () => {
    expect(isBlocked(ground, 1.55, 5.0)).toBe(true); // rect corner
  });

  it("sofa blocks players standing on it", () => {
    expect(isBlocked(ground, 0.6, 0.4)).toBe(true); // rect corner
  });

  it("sunset-lamp stool blocks players standing on it", () => {
    expect(isBlocked(ground, 5.85, 0.42)).toBe(true); // rect corner
  });

  it("cat bed blocks players standing on it (CATBED ENLARGE PASS, 1.6x diameter)", () => {
    expect(isBlocked(ground, 6.72, 0.45)).toBe(true); // rect corner
    expect(isBlocked(ground, 7.5, 1.2)).toBe(true); // far SE corner, inside the enlarged footprint
  });

  it("the enlarged cat bed still clears the sunset-lamp stool (no overlap)", () => {
    // stool x-max 6.25, cat-bed x-min 6.72, a 0.47m gap — (6.3, 0.6) sits
    // within the stool's own 0.35 player-radius (dx 0.05) but clear of the
    // enlarged cat bed's radius (dx 0.42 > 0.35), proving the two rects
    // still don't overlap (also checked in the pairwise-overlap sweep above).
    expect(isBlocked(ground, 6.3, 0.6)).toBe(true); // blocked by the stool only
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

  it("south floor lamp blocks players standing on it (ART+LIGHT+RUGGATE pass)", () => {
    expect(isBlocked(ground, 2.55, 5.25)).toBe(true); // rect corner
  });

  it("the walkway north of the new south floor lamp stays open", () => {
    // z=4.8 sits north of the lamp/potted-tree/clothes-hanger z-bands —
    // clear of all three by more than the player radius (checked: 0.45m,
    // 0.53m, 0.81m respectively).
    expect(isBlocked(ground, 2.7, 4.8)).toBe(false);
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
    // is gone, but the sunset-lamp stool (x 5.85-6.25) sits close enough
    // (0.3m gap to x=6.55, inside the 0.35 player radius) to reach into it,
    // and — post CATBED ENLARGE PASS — so does the cat bed itself (its
    // x-min is now 6.72, dx=0.17 < 0.35) — so the spot reads "furnished
    // again", just by different pieces. (6.55, 0.55) is blocked by both the
    // stool's and the enlarged cat bed's proximity radius now.
    expect(isBlocked(ground, 6.55, 0.55)).toBe(true);
    // (7.2, 0.7) sits inside the cat bed's own footprint (x 6.72-7.6,
    // z 0.45-1.33, CATBED ENLARGE PASS) — directly blocked by the new
    // furniture, not a proximity effect.
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
  //
  // DRESS2 PASS (this pass, owner ask: "the 0.9m gap is hard to line up"):
  // door opening widens z 2.5-4.3 (1.8m) → z 2.4-4.4 (2.0m), and the fixed
  // glass pane shrinks from half the opening (0.9m) to a fixed 0.7m
  // (ENGAWA_DOOR_GLASS_W, layout.ts) — an intentional asymmetric split so
  // the walkable half grows to 1.3m (z 3.1-4.4), up from 0.9m. See
  // layout.ts's DRESS2 PASS comment for the full arithmetic.

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

  it("DRESS2 PASS: walking through the widened sliding-door gap (physical opening z 3.1-4.4, now 1.3m) crosses x=0 freely — open half only", () => {
    // the open half is z 3.1-4.4 (see the fixed-glass-pane test below for
    // the OTHER half, which is now solid). Player-center navigable band
    // shrinks from the physical opening by PLAYER_RADIUS (0.35) on each
    // side: 3.1+0.35=3.45 to 4.4-0.35=4.05 (0.6m navigable center band, up
    // from 0.2m pre-DRESS2 — the actual "easier to line up" improvement).
    expect(isBlocked(ground, 0.05, 3.8)).toBe(false);
    expect(isBlocked(ground, -0.2, 3.8)).toBe(false);
    // near both new edges of the navigable band
    expect(isBlocked(ground, 0.05, 3.5)).toBe(false); // just clear of the shrunk glass pane's radius (3.1+0.35=3.45)
    expect(isBlocked(ground, 0.05, 4.0)).toBe(false); // just clear of the solid wall's radius (4.4-0.35=4.05)
    const p = resolveMovement(ground, { x: 0.05, z: 3.8 }, { x: -0.4, z: 0 });
    expect(p.x).toBeCloseTo(-0.35);
  });

  it("DRESS2 PASS: the old glass-pane band (z 3.1-3.4, plus its old radius buffer) is walkable now that the pane shrunk to grow the gap", () => {
    // pre-DRESS2 this was inside the old fixed glass pane's radius buffer
    // (pane z-max 3.4 + player radius 0.35 = blocked up to z=3.75) and
    // therefore blocked; the pane's z-max is now 3.1 (blocked only up to
    // z=3.45), so z=3.6 joined the walkable gap.
    expect(isBlocked(ground, 0.05, 3.6)).toBe(false);
  });

  it("the fixed glass pane (z 2.4-3.1, the OTHER half of the door, DRESS2 pass) is solid, not walk-through", () => {
    // pre-rework this half had no collider at all — the glass was purely
    // decorative and a player could walk straight through it.
    expect(isBlocked(ground, 0.05, 2.7)).toBe(true);
    expect(isBlocked(ground, -0.05, 2.7)).toBe(true);
    const p = resolveMovement(ground, { x: 0.4, z: 2.7 }, { x: -0.4, z: 0 });
    expect(p.x).toBeGreaterThan(0); // blocked before reaching x=0
  });

  it("the thick west wall is solid at x=0 outside the door gap (north and south of it, DRESS2 pass)", () => {
    expect(isBlocked(ground, -0.05, 1.0)).toBe(true); // north segment interior
    expect(isBlocked(ground, -0.05, 5.0)).toBe(true); // south segment interior
    expect(isBlocked(ground, 0.05, 1.0)).toBe(true); // solid from the bedroom side too
    expect(isBlocked(ground, 0.05, 5.0)).toBe(true);
  });

  it("the west wall rects are the proper WALL_T=0.2 thick-wall boxes (same idiom as every interior divider, DRESS2 pass)", () => {
    const wallRects = [
      { x: -0.1, z: 0, w: 0.2, d: 2.4 }, // north segment
      { x: -0.1, z: 4.4, w: 0.2, d: 1.6 }, // south segment
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

  it("the fixed-glass-pane collider rect is present verbatim in furniture (DRESS2 pass: z 2.4, d 0.7)", () => {
    const found = ground.furniture.some(
      (f) => f.x === -0.06 && f.z === 2.4 && f.w === 0.06 && f.d === 0.7
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
      const glass = { x: -0.06, z: 2.4, w: 0.06, d: 0.7 }; // DRESS2 pass
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

    it("a path from the walk gap south to the zen garden corner's own north edge stays clear", () => {
      // SUPERSEDED (ZEN GARDEN PASS): the reserved placeholder spot this
      // test used to walk right up to (x -1.6..-1.2, z 5.6-5.9) is now the
      // real built zen garden (display stand + accent rock — see the "zen
      // garden corner" describe block below for their own blocking tests).
      // The nook sits entirely north of z 1.225, nowhere near this path, so
      // a straight walk south is unobstructed up to the garden's own north
      // edge (z 4.5, where the gravel bed itself begins — gravel/stones/
      // moss are walk-over floor dressing with no collider of their own).
      expect(isBlocked(ground, -1.4, 4.5)).toBe(false);
    });
  });
});

describe("zen garden corner (engawa south end, ZEN GARDEN PASS)", () => {
  // Built this pass: a recessed gravel bed, stepping-stone path, moss,
  // grass, accent rocks, a display stand (kadai), and a big hand-built
  // bonsai (Bedroom.tsx's ZEN_* consts). Only the display stand and the
  // one big accent rock get colliders — everything else is walk-over floor
  // dressing, same "no collider" convention the railing plants already use
  // on this deck.
  it("the display stand (kadai) blocks players standing on it", () => {
    expect(isBlocked(ground, -1.65, 5.35)).toBe(true); // rect center
  });

  it("the big accent rock blocks players standing on it", () => {
    expect(isBlocked(ground, -1.55, 5.74)).toBe(true); // rect center
  });

  it("the stand and rock don't overlap each other or the west/south rails", () => {
    const intersects = (a: Rect, b: Rect) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;
    const stand = { x: -1.9, z: 5.15, w: 0.5, d: 0.4 };
    const rock = { x: -1.67, z: 5.62, w: 0.24, d: 0.24 };
    const railW = { x: -2.7 - 0.06, z: 0, w: 0.06, d: 6 };
    const railS = { x: -2.7, z: 5.94, w: 2.7, d: 0.06 };
    expect(intersects(stand, rock)).toBe(false);
    for (const other of [railW, railS]) {
      expect(intersects(stand, other)).toBe(false);
      expect(intersects(rock, other)).toBe(false);
    }
  });

  it("the previously-open interior of the old placeholder spot is now correctly blocked by the built stand", () => {
    // pre-build (placeholder era) these were walkable (see the superseded
    // "path to the reserved bonsai pedestal" test above) — now that the
    // real display stand actually stands there, a player can't stand on
    // it, same as any other real furniture in the room.
    expect(isBlocked(ground, -1.4, 5.0)).toBe(true);
    expect(isBlocked(ground, -1.4, 5.55)).toBe(true);
  });

  it("the deck stays walkable around the garden — the east-side path (between the garden and the solid wall) clears the full south end", () => {
    expect(isBlocked(ground, -0.6, 4.6)).toBe(false);
    expect(isBlocked(ground, -0.6, 5.2)).toBe(false);
    // z=5.55 (not further south): the south rail's own z-min (5.94) blocks
    // anything within player-radius 0.35 of it regardless of x, i.e. z>5.59
    // — this is the deepest south probe the rail itself allows.
    expect(isBlocked(ground, -0.6, 5.55)).toBe(false);
  });

  it("the sliding-door walk gap and tea nook are unaffected by the garden", () => {
    expect(isBlocked(ground, -0.2, 3.8)).toBe(false); // door gap, pre-existing probe
    expect(isBlocked(ground, -1.3, 1.0)).toBe(true); // tea table, still blocks
  });
});

describe("engawa deck plants (PLANT PASS)", () => {
  // TallPalm (statement plant, deck's north tip near the tea nook) and
  // FicusLyrata (balancing second plant, east side/different z-band) — see
  // layout.ts's PLANT PASS comment (above ENGAWA_TALLPALM_RECT) for the
  // full placement + collider-sizing arithmetic, including why the palm's
  // collider is pot-sized (0.6x0.6) rather than its full 1.25x1.11m
  // frond-spread footprint: the full footprint doesn't fit anywhere on
  // this deck without re-blocking either the FULL-LENGTH PASS's nook
  // west-side walkaround ({-2.3125,1.05}, below) or the room-side east
  // approach ({-0.6,1.0}/{-0.5,1.0}/{-0.5,2.6}, all pre-existing tests
  // above, still green — checked exhaustively against every existing
  // probe on this deck before landing.
  it("the tall palm blocks players standing on it", () => {
    expect(isBlocked(ground, -1.85, 0.09)).toBe(true); // rect corner
  });

  it("the ficus blocks players standing on it", () => {
    expect(isBlocked(ground, -0.6, 1.55)).toBe(true); // rect corner
  });

  it("neither plant overlaps the tea nook, the rails, or each other", () => {
    const intersects = (a: Rect, b: Rect) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;
    const palm = { x: -1.85, z: 0.09, w: 0.6, d: 0.6 };
    const ficus = { x: -0.6, z: 1.55, w: 0.45, d: 0.55 };
    const table = { x: -1.525, z: 0.775, w: 0.45, d: 0.45 };
    const chair = { x: -1.925, z: 0.875, w: 0.35, d: 0.35 };
    const railN = { x: -2.7, z: 0, w: 2.7, d: 0.06 };
    const railW = { x: -2.7 - 0.06, z: 0, w: 0.06, d: 6 };
    expect(intersects(palm, ficus)).toBe(false);
    for (const other of [table, chair, railN, railW]) {
      expect(intersects(palm, other)).toBe(false);
      expect(intersects(ficus, other)).toBe(false);
    }
  });

  it("the FULL-LENGTH PASS's nook west-side walkaround stays clear of the new palm", () => {
    // the same {-2.3125,1.05} probe the FULL-LENGTH PASS added — re-checked
    // here explicitly since the palm sits close by (deck's north tip).
    expect(isBlocked(ground, -2.3125, 1.05)).toBe(false);
  });

  it("the room-side approach to the tea nook stays clear of the new palm", () => {
    expect(isBlocked(ground, -0.6, 1.0)).toBe(false); // pre-existing probe, re-checked against the palm
  });

  it("walking space stays open on both sides of the palm and around the ficus", () => {
    expect(isBlocked(ground, -2.3, 0.45)).toBe(false); // west of the palm, rail side
    expect(isBlocked(ground, -0.85, 0.45)).toBe(false); // east of the palm, nook side
    expect(isBlocked(ground, -0.5, 1.15)).toBe(false); // north of the ficus
    expect(isBlocked(ground, -0.5, 2.5)).toBe(false); // south of the ficus, before the door wall
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
