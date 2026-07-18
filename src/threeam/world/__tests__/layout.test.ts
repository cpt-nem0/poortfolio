import { describe, it, expect } from "vitest";
import { HOUSE, SPAWN } from "@/threeam/world/layout";

describe("house layout", () => {
  it("has ground and roof areas", () => {
    expect(HOUSE.areas.ground).toBeDefined();
    expect(HOUSE.areas.roof).toBeDefined();
  });

  it("ground floor contains bedroom, workspace, music rooms", () => {
    const ids = HOUSE.areas.ground.rooms.map((r) => r.id);
    expect(ids).toEqual(["bedroom", "workspace", "music"]);
  });

  it("rooms tile the ground bounds without overlap on x", () => {
    const [bed, work, music] = HOUSE.areas.ground.rooms.map((r) => r.rect);
    expect(bed.x + bed.w).toBe(work.x);
    expect(work.x + work.w).toBe(music.x);
    expect(music.x + music.w).toBe(
      HOUSE.areas.ground.bounds.x + HOUSE.areas.ground.bounds.w
    );
  });

  it("has a stairs portal up and down between ground and roof", () => {
    const up = HOUSE.portals.find((p) => p.id === "stairs-up");
    const down = HOUSE.portals.find((p) => p.id === "stairs-down");
    expect(up?.area).toBe("ground");
    expect(up?.toArea).toBe("roof");
    expect(down?.area).toBe("roof");
    expect(down?.toArea).toBe("ground");
  });

  it("spawn is inside ground bounds", () => {
    const b = HOUSE.areas.ground.bounds;
    expect(SPAWN.area).toBe("ground");
    expect(SPAWN.x).toBeGreaterThan(b.x);
    expect(SPAWN.x).toBeLessThan(b.x + b.w);
  });
});
