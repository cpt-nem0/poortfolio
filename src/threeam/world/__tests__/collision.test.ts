import { describe, it, expect } from "vitest";
import { HOUSE } from "@/threeam/world/layout";
import {
  isBlocked,
  resolveMovement,
  PLAYER_RADIUS,
} from "@/threeam/world/collision";

const ground = HOUSE.areas.ground;

describe("isBlocked", () => {
  it("open floor is walkable", () => {
    // was (4,3), then (4,3.6) — the old SPAWN points — but the bedroom has
    // filled in twice since (the SUPER-KING bed, then the FURNISHING WAVE's
    // bed-front bench) and both are now inside some collider's radius.
    // Rather than keep chasing a bedroom-local point through every future
    // furniture pass, this probe moved to (12,3): open workspace floor,
    // untouched by any bedroom furniture rect. SPAWN's own current position
    // ({4,4.3}) is covered by furniture.test.ts's exhaustive bedroom checks.
    expect(isBlocked(ground, 12, 3)).toBe(false);
  });

  it("outside bounds is blocked", () => {
    // x=-1 and x=-2 used to be outside bounds (old bounds.x=0, then -1.7);
    // the P4 engawa rework extended bounds west again, to -2.9, to fit the
    // deck's seating-nook extension — both are now legitimately inside
    // (the deck's own footprint reaches x=-2.7). Use -3.5, still past the
    // new edge with room for the player radius.
    expect(isBlocked(ground, -3.5, 3)).toBe(true);
    expect(isBlocked(ground, 4, 7)).toBe(true);
  });

  it("near the outer edge (within radius) is blocked", () => {
    expect(isBlocked(ground, 0.1, 3)).toBe(true);
  });

  it("interior wall is blocked, its doorway is walkable", () => {
    expect(isBlocked(ground, 8, 1)).toBe(true); // wall segment
    expect(isBlocked(ground, 8, 3)).toBe(false); // doorway gap
  });
});

describe("resolveMovement", () => {
  it("moves freely on open floor", () => {
    // was (4,3) — the old SPAWN point — but the SUPER-KING bed now reaches
    // past it (see the isBlocked test above); (12,3) is open workspace
    // floor, unrelated to any furniture rect this task touches.
    const p = resolveMovement(ground, { x: 12, z: 3 }, { x: 0.5, z: 0 });
    expect(p.x).toBeCloseTo(12.5);
    expect(p.z).toBeCloseTo(3);
  });

  it("blocks x through a wall but slides on z", () => {
    // just west of the x=8 divider, inside the wall band. Was z=1, but the
    // FURNISHING WAVE's cat bed ({x:7.05,z:0.45,w:0.55,d:0.55}) now reaches
    // z=1.35 with the player radius added, which swallowed both the start
    // and target z of that probe; moved to z=4.5 (still inside the
    // divider's south wall band, z 3.8-6, and clear of the new perfume
    // stand at z 5.3-5.8 by 0.5m at the landing point z=4.8).
    const p = resolveMovement(ground, { x: 7.4, z: 4.5 }, { x: 0.5, z: 0.3 });
    expect(p.x).toBeCloseTo(7.4); // x move rejected
    expect(p.z).toBeCloseTo(4.8); // z move allowed
  });

  it("passes through the doorway", () => {
    const p = resolveMovement(ground, { x: 7.4, z: 3 }, { x: 0.5, z: 0 });
    expect(p.x).toBeCloseTo(7.9);
  });

  it("never returns a blocked position", () => {
    // was (4,3) — the old SPAWN point, now inside the SUPER-KING bed's
    // collider — start from (12,3) instead, still open workspace floor.
    const p = resolveMovement(ground, { x: 12, z: 3 }, { x: -10, z: -10 });
    expect(isBlocked(ground, p.x, p.z, PLAYER_RADIUS)).toBe(false);
  });
});
