import { describe, expect, it } from "vitest";
import {
  HOUSE,
  STAIR_ROOM,
  STAIR_ROOM_DOOR_LO,
  STAIR_ROOM_DOOR_HI,
} from "../layout";
import { isBlocked, PLAYER_RADIUS } from "../collision";
import * as layoutMod from "../layout";

// Task 7: the roof stair-room enclosure. T1's placeholder STAIR_ROOM never
// actually contained the stairs-up portal's real arrival point
// (toPosition, live below) — these tests sweep the LIVE portal/wall/
// furniture data (never re-hardcoded literals for the geometry under test)
// so a future geometry change that breaks containment fails loudly here,
// not silently on the PR preview.
describe("roof stair-room (Task 7)", () => {
  const roof = HOUSE.areas.roof;
  const arrival = HOUSE.portals.find((p) => p.id === "stairs-up")!.toPosition;

  it("the stairs-up arrival point lands inside STAIR_ROOM's interior", () => {
    expect(arrival.x).toBeGreaterThan(STAIR_ROOM.x);
    expect(arrival.x).toBeLessThan(STAIR_ROOM.x + STAIR_ROOM.w);
    expect(arrival.z).toBeGreaterThan(STAIR_ROOM.z);
    expect(arrival.z).toBeLessThan(STAIR_ROOM.z + STAIR_ROOM.d);
  });

  it("the arrival point itself is walkable (no wall/furniture blocks it)", () => {
    expect(isBlocked(roof, arrival.x, arrival.z)).toBe(false);
  });

  it("no roof wall rect comes within player radius of the arrival point (live sweep)", () => {
    for (const w of roof.walls) {
      const cx = Math.max(w.x, Math.min(arrival.x, w.x + w.w));
      const cz = Math.max(w.z, Math.min(arrival.z, w.z + w.d));
      const dist = Math.hypot(arrival.x - cx, arrival.z - cz);
      expect(
        dist,
        `wall ${JSON.stringify(w)} is within player radius of the arrival point`
      ).toBeGreaterThanOrEqual(PLAYER_RADIUS);
    }
  });

  it("the door gap (south wall, toward the terrace) is passable", () => {
    const midX = (STAIR_ROOM_DOOR_LO + STAIR_ROOM_DOOR_HI) / 2;
    const wallMidZ = STAIR_ROOM.z + STAIR_ROOM.d + 0.1; // wall-thickness midline
    expect(isBlocked(roof, midX, wallMidZ)).toBe(false);
  });

  it("walking out the door lands on the open terrace beyond", () => {
    const midX = (STAIR_ROOM_DOOR_LO + STAIR_ROOM_DOOR_HI) / 2;
    expect(isBlocked(roof, midX, STAIR_ROOM.z + STAIR_ROOM.d + 0.5)).toBe(false);
  });

  it("the solid south-wall segments flanking the door gap block", () => {
    const wallMidZ = STAIR_ROOM.z + STAIR_ROOM.d + 0.1;
    expect(isBlocked(roof, STAIR_ROOM.x + 0.3, wallMidZ)).toBe(true); // west segment
    expect(isBlocked(roof, STAIR_ROOM.x + STAIR_ROOM.w - 0.3, wallMidZ)).toBe(true); // east segment
  });

  it("the north/west/east walls block", () => {
    expect(isBlocked(roof, STAIR_ROOM.x + STAIR_ROOM.w / 2, STAIR_ROOM.z - 0.1)).toBe(true);
    expect(isBlocked(roof, STAIR_ROOM.x - 0.1, STAIR_ROOM.z + STAIR_ROOM.d / 2)).toBe(true);
    expect(
      isBlocked(roof, STAIR_ROOM.x + STAIR_ROOM.w + 0.1, STAIR_ROOM.z + STAIR_ROOM.d / 2)
    ).toBe(true);
  });

  it("the enclosure doesn't overlap the stair flight's own footprint (live sweep vs roof furniture)", () => {
    for (const f of roof.furniture) {
      const overlap =
        STAIR_ROOM.x < f.x + f.w &&
        f.x < STAIR_ROOM.x + STAIR_ROOM.w &&
        STAIR_ROOM.z < f.z + f.d &&
        f.z < STAIR_ROOM.z + STAIR_ROOM.d;
      expect(overlap, `STAIR_ROOM overlaps furniture ${JSON.stringify(f)}`).toBe(false);
    }
  });
});

describe("rooftop under-construction dressing (owner wave 2026-10-19)", () => {
  const {
    ROOF_SIGN_RECT,
    ROOF_CONE_RECT,
    ROOF_BRICKS_RECT,
    ROOF_SACKS_RECT,
    ROOF_BUCKET_RECT,
    STAIR_ROOM,
    STAIR_ROOM_DOOR_LO,
    STAIR_ROOM_DOOR_HI,
    HOUSE,
  } = layoutMod;
  const roofArea = HOUSE.areas.roof;
  const rooftop = roofArea.rooms[0].rect;
  // the rects this pass owns — the hoarding board, the cone, and the three
  // new site-clutter piles. Everything below sweeps these plus the LIVE
  // roofArea.furniture list, never a hardcoded snapshot of it.
  const DRESSING: Record<string, layoutMod.Rect> = {
    sign: ROOF_SIGN_RECT,
    cone: ROOF_CONE_RECT,
    bricks: ROOF_BRICKS_RECT,
    sacks: ROOF_SACKS_RECT,
    bucket: ROOF_BUCKET_RECT,
  };
  const inside = (r: layoutMod.Rect) =>
    r.x >= rooftop.x &&
    r.z >= rooftop.z &&
    r.x + r.w <= rooftop.x + rooftop.w &&
    r.z + r.d <= rooftop.z + rooftop.d;

  it("every dressing rect is inside the rooftop and in the live roof furniture list", () => {
    for (const [name, r] of Object.entries(DRESSING)) {
      expect(inside(r), `${name} ${JSON.stringify(r)} leaves the rooftop`).toBe(true);
      expect(roofArea.furniture, `${name} is not in HOUSE.areas.roof.furniture`).toContain(r);
    }
  });

  it("no two roof furniture rects overlap (live sweep over roof.furniture)", () => {
    const f = roofArea.furniture;
    for (let i = 0; i < f.length; i++) {
      for (let j = i + 1; j < f.length; j++) {
        const a = f[i];
        const b = f[j];
        const overlap =
          a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;
        expect(
          overlap,
          `roof furniture overlap: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`
        ).toBe(false);
      }
    }
  });

  it("the stair-room door's exit line stays walkable all the way down the terrace", () => {
    const xMid = (STAIR_ROOM_DOOR_LO + STAIR_ROOM_DOOR_HI) / 2;
    // stop at 5.4 — south of that the terrace's own bounds start to block
    for (let z = 3.05; z <= 5.4 + 1e-9; z += 0.2) {
      expect(
        isBlocked(roofArea, xMid, z),
        `door exit line blocked at z=${z.toFixed(2)}`
      ).toBe(false);
    }
  });

  it("the stairs-up arrival point (12, 2) is still clear", () => {
    expect(isBlocked(roofArea, 12, 2)).toBe(false);
  });

  it("every dressing rect actually blocks at its own centre", () => {
    for (const [name, r] of Object.entries(DRESSING)) {
      expect(
        isBlocked(roofArea, r.x + r.w / 2, r.z + r.d / 2),
        `${name} ${JSON.stringify(r)} does not block at its centre`
      ).toBe(true);
    }
  });

  it("the hoarding clears the doorway to its west and the stairs-down trigger to its east", () => {
    expect(ROOF_SIGN_RECT.x).toBeGreaterThanOrEqual(STAIR_ROOM_DOOR_HI + 0.2);
    // the shared stairs trigger must stay standable or the roof is a one-way
    // trip — this is what caps the board's width, see layout.ts.
    const down = HOUSE.portals.find((p) => p.id === "stairs-down")!;
    expect(isBlocked(roofArea, down.trigger.x + down.trigger.w / 2, down.trigger.z + down.trigger.d / 2)).toBe(false);
  });

  it("the clutter sits south of the stair-room's south wall, 0.3m clear of its neighbours", () => {
    const doorZ = STAIR_ROOM.z + STAIR_ROOM.d;
    const piles = [ROOF_BRICKS_RECT, ROOF_SACKS_RECT, ROOF_BUCKET_RECT, ROOF_CONE_RECT];
    for (const r of piles) expect(r.z).toBeGreaterThanOrEqual(doorZ);
    const gap = (a: layoutMod.Rect, b: layoutMod.Rect) =>
      Math.hypot(
        Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)),
        Math.max(0, a.z - (b.z + b.d), b.z - (a.z + a.d))
      );
    const all = Object.entries(DRESSING);
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(
          gap(all[i][1], all[j][1]),
          `${all[i][0]} and ${all[j][0]} are closer than 0.3m`
        ).toBeGreaterThanOrEqual(0.3 - 1e-9);
      }
    }
  });
});
