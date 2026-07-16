import { describe, it, expect } from "vitest";
import { HOUSE } from "@/threeam/world/layout";
import { isBlocked } from "@/threeam/world/collision";

const ground = HOUSE.areas.ground;

describe("music-room furniture colliders", () => {
  it("areas expose a furniture list", () => {
    expect(Array.isArray(ground.furniture)).toBe(true);
    expect(Array.isArray(HOUSE.areas.roof.furniture)).toBe(true);
    expect(ground.furniture.length).toBeGreaterThanOrEqual(6);
  });

  it("the record console blocks the player", () => {
    expect(isBlocked(ground, 18.7, 0.8)).toBe(true); // turntable spot
  });

  it("the sofa, side table, snake plant and art totem block", () => {
    expect(isBlocked(ground, 19, 5.2)).toBe(true); // sofa (sweet spot)
    expect(isBlocked(ground, 20.2, 5.2)).toBe(true); // side table
    expect(isBlocked(ground, 20.85, 0.65)).toBe(true); // snake plant
    expect(isBlocked(ground, 21.3, 5.2)).toBe(true); // art totem
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
    expect(isBlocked(ground, 17.5, 5.2)).toBe(false); // corridor west of the sofa
  });
});
