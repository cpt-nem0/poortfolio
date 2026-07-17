import { describe, it, expect } from "vitest";
import { STATIONS, stationAt } from "@/threeam/world/stations";
import { HOUSE } from "@/threeam/world/layout";
import { portalAt } from "@/threeam/world/detect";
import { isBlocked } from "@/threeam/world/collision";

describe("stations", () => {
  it("registry has the projects and experience stations on the ground floor", () => {
    expect(STATIONS.map((s) => s.id).sort()).toEqual(["experience", "projects"]);
    for (const s of STATIONS) expect(s.area).toBe("ground");
  });

  it("stationAt finds a station inside its trigger and null elsewhere", () => {
    const exp = STATIONS.find((s) => s.id === "experience")!;
    const cx = exp.trigger.x + exp.trigger.w / 2;
    const cz = exp.trigger.z + exp.trigger.d / 2;
    expect(stationAt("ground", cx, cz)?.id).toBe("experience");
    expect(stationAt("ground", 4, 3)).toBeNull();
    expect(stationAt("roof", cx, cz)).toBeNull();
  });

  it("station triggers never overlap portal triggers (E-key can't conflict)", () => {
    for (const s of STATIONS) {
      const corners = [
        [s.trigger.x, s.trigger.z],
        [s.trigger.x + s.trigger.w, s.trigger.z],
        [s.trigger.x, s.trigger.z + s.trigger.d],
        [s.trigger.x + s.trigger.w, s.trigger.z + s.trigger.d],
        [s.trigger.x + s.trigger.w / 2, s.trigger.z + s.trigger.d / 2],
      ];
      for (const [x, z] of corners) {
        expect(portalAt(HOUSE.portals, s.area, x, z)).toBeNull();
      }
    }
  });

  it("every station trigger center is reachable (not blocked)", () => {
    for (const s of STATIONS) {
      const cx = s.trigger.x + s.trigger.w / 2;
      const cz = Math.max(s.trigger.z + s.trigger.d / 2, 0.36);
      expect(isBlocked(HOUSE.areas[s.area], cx, cz), s.id).toBe(false);
    }
  });
});
