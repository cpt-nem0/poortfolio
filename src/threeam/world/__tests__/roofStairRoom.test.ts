import { describe, expect, it } from "vitest";
import {
  HOUSE,
  STAIR_ROOM,
  STAIR_ROOM_DOOR_LO,
  STAIR_ROOM_DOOR_HI,
} from "../layout";
import { isBlocked, PLAYER_RADIUS } from "../collision";

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
