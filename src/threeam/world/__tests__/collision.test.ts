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
    // was (4,3) — the old SPAWN point — but the SUPER-KING bed (far z edge
    // 2.83 + player radius 0.35 = 3.18) now reaches past it; (4,3.6) is the
    // new SPAWN point and stays clear (see furniture.test.ts for the exact
    // margin arithmetic).
    expect(isBlocked(ground, 4, 3.6)).toBe(false);
  });

  it("outside bounds is blocked", () => {
    expect(isBlocked(ground, -1, 3)).toBe(true);
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
    // just west of the x=8 divider, inside the wall band (z=1)
    const p = resolveMovement(ground, { x: 7.4, z: 1 }, { x: 0.5, z: 0.3 });
    expect(p.x).toBeCloseTo(7.4); // x move rejected
    expect(p.z).toBeCloseTo(1.3); // z move allowed
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
