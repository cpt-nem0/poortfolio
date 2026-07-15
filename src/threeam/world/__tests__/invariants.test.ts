import { describe, it, expect } from "vitest";
import { HOUSE, SPAWN } from "@/threeam/world/layout";
import { isBlocked } from "@/threeam/world/collision";

describe("world invariants (soft-lock prevention)", () => {
  it("spawn is not blocked", () => {
    expect(isBlocked(HOUSE.areas[SPAWN.area], SPAWN.x, SPAWN.z)).toBe(false);
  });

  it("every portal destination is not blocked in its target area", () => {
    for (const p of HOUSE.portals) {
      expect(
        isBlocked(HOUSE.areas[p.toArea], p.toPosition.x, p.toPosition.z),
        `portal ${p.id} -> (${p.toPosition.x}, ${p.toPosition.z})`
      ).toBe(false);
    }
  });

  it("every portal trigger center is not blocked (reachable on foot)", () => {
    for (const p of HOUSE.portals) {
      const cx = p.trigger.x + p.trigger.w / 2;
      const cz = Math.max(p.trigger.z + p.trigger.d / 2, 0.36);
      expect(isBlocked(HOUSE.areas[p.area], cx, cz), `portal ${p.id} trigger`).toBe(false);
    }
  });
});
