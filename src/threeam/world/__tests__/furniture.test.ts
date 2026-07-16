import { describe, it, expect } from "vitest";
import { HOUSE } from "@/threeam/world/layout";
import { isBlocked } from "@/threeam/world/collision";

const ground = HOUSE.areas.ground;

describe("music-room furniture colliders", () => {
  it("areas expose a furniture list", () => {
    expect(Array.isArray(ground.furniture)).toBe(true);
    expect(Array.isArray(HOUSE.areas.roof.furniture)).toBe(true);
    expect(ground.furniture.length).toBeGreaterThanOrEqual(5);
  });

  it("the cabinet blocks the player", () => {
    expect(isBlocked(ground, 18.7, 0.8)).toBe(true); // turntable spot
  });

  it("the beanbag and plant block", () => {
    expect(isBlocked(ground, 21.2, 3.8)).toBe(true);
    expect(isBlocked(ground, 21.3, 5.2)).toBe(true);
  });

  it("the doorway into the music room stays open", () => {
    expect(isBlocked(ground, 16, 3)).toBe(false);
  });

  it("the nook's walking space stays open (rug area + in front of the wall)", () => {
    expect(isBlocked(ground, 18.7, 2.5)).toBe(false); // before the cabinet
    expect(isBlocked(ground, 19.5, 4.5)).toBe(false); // rug center-south
  });
});
