import { describe, it, expect } from "vitest";
import { HOUSE } from "@/threeam/world/layout";
import { roomAt, portalAt } from "@/threeam/world/detect";

const ground = HOUSE.areas.ground;

describe("roomAt", () => {
  it("maps positions to rooms", () => {
    expect(roomAt(ground, 4, 3)).toBe("bedroom");
    expect(roomAt(ground, 12, 3)).toBe("workspace");
    expect(roomAt(ground, 18, 3)).toBe("music");
  });

  it("returns null outside all rooms", () => {
    expect(roomAt(ground, -5, 3)).toBeNull();
  });
});

describe("portalAt", () => {
  it("finds the stairs when standing on its trigger", () => {
    const p = portalAt(HOUSE.portals, "ground", 15.2, 2.6);
    expect(p?.id).toBe("stairs-up");
  });

  it("ignores portals of other areas", () => {
    expect(portalAt(HOUSE.portals, "roof", 15.2, 2.6)?.id).toBe("stairs-down");
  });

  it("returns null away from triggers", () => {
    expect(portalAt(HOUSE.portals, "ground", 4, 3)).toBeNull();
  });
});
