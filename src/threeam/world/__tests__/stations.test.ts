import { describe, it, expect } from "vitest";
import { STATIONS, stationAt, type Station } from "@/threeam/world/stations";
import { HOUSE, WORKSTATION_ROOM, WS_DOOR_LO, WS_DOOR_HI, type Rect } from "@/threeam/world/layout";
import { AREA_PORTAL_Z } from "@/threeam/world/runtime";
import { portalAt } from "@/threeam/world/detect";
import { isBlocked } from "@/threeam/world/collision";

// LAYOUT V2 (Task 5): stationAt's `areaId` param is only ever "ground" or
// "roof" at the real call site (Player.tsx's collisionAreaId) — mirrors
// stations.ts's own physicalArea mapping so this file's remaining
// physical-collision checks (portalAt, HOUSE.areas[...]) stay valid for
// "workstation"-tagged stations without touching those functions' types.
const physicalArea = (s: Station): "ground" | "roof" => (s.area === "roof" ? "roof" : "ground");

const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;

describe("stations", () => {
  it("registry has the projects, experience, and about stations, workstation-tagged except about", () => {
    expect(STATIONS.map((s) => s.id).sort()).toEqual(["about", "experience", "projects"]);
    for (const s of STATIONS) {
      expect(s.area).toBe(s.id === "about" ? "ground" : "workstation");
    }
  });

  it("stationAt finds a station inside its trigger and null elsewhere", () => {
    const exp = STATIONS.find((s) => s.id === "experience")!;
    const cx = exp.trigger.x + exp.trigger.w / 2;
    const cz = exp.trigger.z + exp.trigger.d / 2;
    // areaId passed here is "ground" (Player.tsx's collisionAreaId for a
    // non-roof player) even though exp.area is "workstation" — this is the
    // real call pattern, and the point of the physicalArea mapping.
    expect(stationAt("ground", cx, cz)?.id).toBe("experience");
    expect(stationAt("ground", 4, 3)).toBeNull();
    expect(stationAt("roof", cx, cz)).toBeNull();
  });

  it("stationAt hits inside the about trigger and misses just outside it", () => {
    const about = STATIONS.find((s) => s.id === "about")!;
    const cx = about.trigger.x + about.trigger.w / 2;
    const cz = about.trigger.z + about.trigger.d / 2;
    expect(stationAt("ground", cx, cz)?.id).toBe("about");
    expect(stationAt("ground", about.trigger.x - 0.01, about.trigger.z)?.id).not.toBe("about");
  });

  it("stationAt finds the projects/experience stations inside their new workstation triggers", () => {
    for (const id of ["projects", "experience"] as const) {
      const s = STATIONS.find((st) => st.id === id)!;
      const cx = s.trigger.x + s.trigger.w / 2;
      const cz = s.trigger.z + s.trigger.d / 2;
      expect(stationAt("ground", cx, cz)?.id).toBe(id);
      expect(stationAt("roof", cx, cz)).toBeNull();
    }
  });

  it("about station camera pos sits inside the ground floor bounds", () => {
    const about = STATIONS.find((s) => s.id === "about")!;
    const [px, , pz] = about.camera.pos;
    expect(px).toBeGreaterThanOrEqual(HOUSE.areas.ground.bounds.x);
    expect(px).toBeLessThanOrEqual(HOUSE.areas.ground.bounds.x + HOUSE.areas.ground.bounds.w);
    expect(pz).toBeGreaterThanOrEqual(HOUSE.areas.ground.bounds.z);
    expect(pz).toBeLessThanOrEqual(HOUSE.areas.ground.bounds.z + HOUSE.areas.ground.bounds.d);
  });

  it("projects/experience camera pos sits inside the workstation room bounds", () => {
    for (const id of ["projects", "experience"] as const) {
      const s = STATIONS.find((st) => st.id === id)!;
      const [px, , pz] = s.camera.pos;
      expect(px).toBeGreaterThanOrEqual(WORKSTATION_ROOM.x);
      expect(px).toBeLessThanOrEqual(WORKSTATION_ROOM.x + WORKSTATION_ROOM.w);
      expect(pz).toBeGreaterThanOrEqual(WORKSTATION_ROOM.z);
      expect(pz).toBeLessThanOrEqual(WORKSTATION_ROOM.z + WORKSTATION_ROOM.d);
    }
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
        expect(portalAt(HOUSE.portals, physicalArea(s), x, z)).toBeNull();
      }
    }
  });

  it("every station trigger center is reachable (not blocked)", () => {
    for (const s of STATIONS) {
      const cx = s.trigger.x + s.trigger.w / 2;
      const cz = s.trigger.z + s.trigger.d / 2;
      expect(isBlocked(HOUSE.areas[physicalArea(s)], cx, cz), s.id).toBe(false);
    }
  });

  it("no station trigger overlaps any live ground furniture rect (live sweep)", () => {
    for (const s of STATIONS) {
      for (const rect of HOUSE.areas.ground.furniture) {
        expect(
          intersects(s.trigger, rect),
          `station "${s.id}" trigger overlaps furniture rect ${JSON.stringify(rect)}`
        ).toBe(false);
      }
    }
  });

  it("no two station triggers overlap each other", () => {
    for (let i = 0; i < STATIONS.length; i++) {
      for (let j = i + 1; j < STATIONS.length; j++) {
        expect(
          intersects(STATIONS[i].trigger, STATIONS[j].trigger),
          `${STATIONS[i].id} trigger overlaps ${STATIONS[j].id} trigger`
        ).toBe(false);
      }
    }
  });

  describe("workstation stations: reachability is wall-gated, not just area-tagged", () => {
    // The workstation "area" tag alone can't gate reachability (stationAt's
    // areaId param is always "ground" here — see stations.ts's
    // physicalArea doc). The actual guarantee is geometric: every
    // workstation trigger sits fully inside WORKSTATION_ROOM, and its
    // closest edge to the shared-wall door threshold (AREA_PORTAL_Z=-0.1)
    // is still deep past it — proving a player can't reach the trigger
    // without already having crossed into the workstation room (which
    // flips the camera area on the same frame, well before they arrive).
    const workstationStations = STATIONS.filter((s) => s.area === "workstation");

    it("every workstation trigger lies fully inside WORKSTATION_ROOM", () => {
      for (const s of workstationStations) {
        expect(s.trigger.x, s.id).toBeGreaterThanOrEqual(WORKSTATION_ROOM.x);
        expect(s.trigger.x + s.trigger.w, s.id).toBeLessThanOrEqual(
          WORKSTATION_ROOM.x + WORKSTATION_ROOM.w
        );
        expect(s.trigger.z, s.id).toBeGreaterThanOrEqual(WORKSTATION_ROOM.z);
        expect(s.trigger.z + s.trigger.d, s.id).toBeLessThanOrEqual(
          WORKSTATION_ROOM.z + WORKSTATION_ROOM.d
        );
      }
    });

    it("every workstation trigger's near edge sits well past the door threshold (>1m margin)", () => {
      // trigger.z + trigger.d is the edge closest to the shared wall
      // (z increases toward the common room); AREA_PORTAL_Z is where the
      // camera area actually swaps. A >1m margin here means the swap has
      // long since happened by the time a player could reach the trigger.
      for (const s of workstationStations) {
        const nearEdge = s.trigger.z + s.trigger.d;
        expect(nearEdge, s.id).toBeLessThan(AREA_PORTAL_Z - 1);
      }
    });

    it("no workstation trigger overlaps the shared-wall door gap", () => {
      const doorGap: Rect = { x: WS_DOOR_LO, z: -0.2, w: WS_DOOR_HI - WS_DOOR_LO, d: 0.2 };
      for (const s of workstationStations) {
        expect(intersects(s.trigger, doorGap), s.id).toBe(false);
      }
    });
  });

  describe("sightline clearance: camera-to-look ray clears a 1.6m player capsule across each trigger", () => {
    const CAPSULE_HEIGHT = 1.6;

    /**
     * For a station's ray P(t) = pos + t*(look-pos), returns the min y over
     * the t-range where the ray's (x,z) projection falls inside the
     * trigger rect (empty if the ray never crosses it — see the "about"
     * station's own comment for that case, which this function would
     * report as `null`/no crossing and is asserted separately below).
     */
    function minClearanceOverTrigger(s: Station): number | null {
      const [px, py, pz] = s.camera.pos;
      const [lx, ly, lz] = s.camera.look;
      const dx = lx - px;
      const dz = lz - pz;
      const dy = ly - py;
      const { x: tx, z: tz, w: tw, d: td } = s.trigger;

      // t-range where x(t) is inside [tx, tx+tw]
      let txRange: [number, number] | null = null;
      if (dx === 0) {
        txRange = px >= tx && px <= tx + tw ? [0, 1] : null;
      } else {
        const t1 = (tx - px) / dx;
        const t2 = (tx + tw - px) / dx;
        txRange = [Math.min(t1, t2), Math.max(t1, t2)];
      }
      // t-range where z(t) is inside [tz, tz+td]
      let tzRange: [number, number] | null = null;
      if (dz === 0) {
        tzRange = pz >= tz && pz <= tz + td ? [0, 1] : null;
      } else {
        const t1 = (tz - pz) / dz;
        const t2 = (tz + td - pz) / dz;
        tzRange = [Math.min(t1, t2), Math.max(t1, t2)];
      }
      if (!txRange || !tzRange) return null;

      const lo = Math.max(txRange[0], tzRange[0], 0);
      const hi = Math.min(txRange[1], tzRange[1], 1);
      if (lo > hi) return null; // ray never actually crosses the trigger footprint

      const yAt = (t: number) => py + t * dy;
      return Math.min(yAt(lo), yAt(hi));
    }

    it("projects: ray crosses the trigger and clears the capsule with margin (T8 finale item 15: retargeted to the project-building table's drafting board)", () => {
      const s = STATIONS.find((st) => st.id === "projects")!;
      const clearance = minClearanceOverTrigger(s);
      expect(clearance).not.toBeNull();
      expect(clearance!).toBeGreaterThanOrEqual(CAPSULE_HEIGHT);
      expect(clearance!).toBeCloseTo(1.7647, 4);
    });

    it("experience: ray crosses the trigger and clears the capsule with margin", () => {
      const s = STATIONS.find((st) => st.id === "experience")!;
      const clearance = minClearanceOverTrigger(s);
      expect(clearance).not.toBeNull();
      expect(clearance!).toBeGreaterThanOrEqual(CAPSULE_HEIGHT);
      expect(clearance!).toBeCloseTo(1.868, 2);
    });

    it("about: the ray never crosses the trigger at all (stronger guarantee than height clearance)", () => {
      const s = STATIONS.find((st) => st.id === "about")!;
      expect(minClearanceOverTrigger(s)).toBeNull();
    });

    it("FORCED-RED PROOF: a lower pos.y (2.6, down from 3.6) fails the projects clearance check", () => {
      // Confirms the test can actually fail — proves pos.y=3.6 is
      // load-bearing for the item-15 retarget's clearance, not an
      // arbitrary/unchecked value. Same pos.x/z and look unchanged; only
      // pos.y drops. Hand-computed: over the ray's true trigger-overlap
      // window (t∈[0.7,0.7059] — see stations.ts's own comment), y drops
      // to ~1.48-1.47m, well under the 1.6m capsule.
      const broken: Station = {
        ...STATIONS.find((st) => st.id === "projects")!,
        camera: { pos: [12.0, 2.6, -3.0], look: [8.6, 1.0, -5.0] },
      };
      const clearance = minClearanceOverTrigger(broken);
      expect(clearance).not.toBeNull();
      expect(clearance!).toBeLessThan(CAPSULE_HEIGHT);
    });

    it("experience: no shared axis coordinate between pos and look (collinearity fixed)", () => {
      const s = STATIONS.find((st) => st.id === "experience")!;
      expect(s.camera.pos[0]).not.toBe(s.camera.look[0]);
      expect(s.camera.pos[1]).not.toBe(s.camera.look[1]);
      expect(s.camera.pos[2]).not.toBe(s.camera.look[2]);
    });
  });
});
