import { describe, expect, it } from "vitest";
import {
  HOUSE,
  WORKSTATION_ROOM,
  WS_DOOR_LO,
  WS_DOOR_HI,
  GENKAN_ROOM,
  GENKAN_DOOR_LO,
  GENKAN_DOOR_HI,
  type Rect,
} from "../layout";
import { isBlocked } from "../collision";

const ground = HOUSE.areas.ground;

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.z < b.z + b.d && a.z + a.d > b.z;
}

describe("layout v2 geometry", () => {
  it("workstation room spans x8-16, z-6.2..-0.2", () => {
    expect(WORKSTATION_ROOM).toMatchObject({ x: 8, z: -6.2, w: 8, d: 6 });
  });

  it("genkan room spans x8-16, z6.2..8.1", () => {
    expect(GENKAN_ROOM).toMatchObject({ x: 8, z: 6.2, w: 8, d: 1.9 });
  });

  it("the shared wall blocks except the door gap", () => {
    // OWNER FEEDBACK WAVE: door recentered to the common room's own
    // midpoint (was 13.2-14.5, now 11.35-12.65) — the "west of door" probe
    // moves from 12.5 (which would now sit INSIDE the new gap) to 10 (still
    // solidly inside WS_WALL_LO, x8-11.35).
    expect(isBlocked(ground, 10, -0.1)).toBe(true); // wall west of door
    expect(isBlocked(ground, (WS_DOOR_LO + WS_DOOR_HI) / 2, -0.1)).toBe(false); // through the gap
    expect(isBlocked(ground, 15.2, -0.1)).toBe(true); // wall east of door
  });

  it("genkan is walkable and its front door is blocked", () => {
    expect(isBlocked(ground, 12, 7.0)).toBe(false); // inside genkan
    expect(isBlocked(ground, 12, 8.2)).toBe(true); // front door blocked
  });

  it("no furniture rect overlaps any station trigger or door gap (live sweep)", () => {
    for (const f of ground.furniture) {
      expect(
        f.x + f.w <= WS_DOOR_LO || f.x >= WS_DOOR_HI || f.z + f.d <= -0.2 || f.z >= 0
      ).toBe(true);
    }
  });

  // Task 4: framed openings (decorative trim, no colliders of their own)
  // sit right next to the house's existing door gaps and the up-stairs
  // landing — this sweep guards that relationship with LIVE data (never
  // re-hardcoded), same convention the rest of this file already follows.
  describe("Task 4: door gaps and the stairs landing stay clear (live sweep)", () => {
    // bedroom↔common (x=8) and common↔music (x=16) don't have exported
    // door-gap consts (unlike WS_DOOR_LO/HI, GENKAN_DOOR_LO/HI) — the
    // shared DOOR_LO/DOOR_HI dividerWithDoor was called with was never
    // exported — so they're read back from the live wall segments, the
    // same derivation House.tsx's door-frame mounting code uses.
    const bedroomCommonWalls = ground.walls
      .filter((w) => Math.abs(w.x - 7.9) < 1e-6)
      .sort((p, q) => p.z - q.z);
    const commonMusicWalls = ground.walls
      .filter((w) => Math.abs(w.x - 15.9) < 1e-6)
      .sort((p, q) => p.z - q.z);

    const doorGaps: Record<string, Rect> = {
      "bedroom↔common": {
        x: 7.9,
        z: bedroomCommonWalls[0].z + bedroomCommonWalls[0].d,
        w: 0.2,
        d: bedroomCommonWalls[1].z - (bedroomCommonWalls[0].z + bedroomCommonWalls[0].d),
      },
      "common↔music": {
        x: 15.9,
        z: commonMusicWalls[0].z + commonMusicWalls[0].d,
        w: 0.2,
        d: commonMusicWalls[1].z - (commonMusicWalls[0].z + commonMusicWalls[0].d),
      },
      "common↔workstation": { x: WS_DOOR_LO, z: -0.2, w: WS_DOOR_HI - WS_DOOR_LO, d: 0.2 },
      "common↔genkan": { x: GENKAN_DOOR_LO, z: 6, w: GENKAN_DOOR_HI - GENKAN_DOOR_LO, d: 0.2 },
    };

    const stairsLanding = HOUSE.portals.find((p) => p.id === "stairs-up")!.trigger;

    it("sanity: all 4 derived door gaps are real, positive-area rects", () => {
      expect(bedroomCommonWalls.length).toBe(2);
      expect(commonMusicWalls.length).toBe(2);
      for (const gap of Object.values(doorGaps)) {
        expect(gap.w).toBeGreaterThan(0);
        expect(gap.d).toBeGreaterThan(0);
      }
    });

    it("no furniture or wall rect blocks any of the 4 door gaps", () => {
      for (const [name, gap] of Object.entries(doorGaps)) {
        for (const f of [...ground.furniture, ...ground.walls]) {
          expect(rectsOverlap(f, gap), `${name} blocked by ${JSON.stringify(f)}`).toBe(false);
        }
      }
    });

    it("no furniture rect blocks the stairs-up landing", () => {
      for (const f of ground.furniture) {
        expect(rectsOverlap(f, stairsLanding)).toBe(false);
      }
    });
  });

  // T8 finale (owner correction): House.tsx's ns-band loop draws band 1's
  // own north/south walls as synthesized rects (not sourced from
  // `ground.walls`, so the sweep above never covered them) — that rect
  // used to span the WHOLE band-1 width (x8-16) as ONE solid box, fully
  // covering both the workstation door (north) and the genkan inner door
  // (south) with no gap at all: confirmed live (a scene-graph query found
  // a single w=8 h=2.8 box centered dead-on the workstation door; a
  // screenshot showed a solid knee-high bar across the genkan doorway).
  // `splitByGap` (House.tsx) fixes this; mirrored here (not imported —
  // House.tsx is a "use client" R3F component file this test suite never
  // imports, see every other test in this repo) so the ALGORITHM is
  // verified against the real door consts without a heavy import chain.
  describe("T8 finale: ns-band wall segments don't cross door gaps (owner correction)", () => {
    function splitByGap(
      x0: number,
      x1: number,
      gapLo: number | null,
      gapHi: number | null
    ): [number, number][] {
      if (gapLo === null || gapHi === null || gapHi <= x0 || gapLo >= x1) return [[x0, x1]];
      const segs: [number, number][] = [];
      if (gapLo > x0) segs.push([x0, gapLo]);
      if (gapHi < x1) segs.push([gapHi, x1]);
      return segs;
    }

    function segmentsCoverGap(segs: [number, number][], gapLo: number, gapHi: number): boolean {
      // true if ANY segment's [x0,x1) range overlaps the gap at all
      return segs.some(([x0, x1]) => x0 < gapHi && x1 > gapLo);
    }

    it("band 1's north split (around the workstation door, WS_DOOR_LO/HI) never covers the gap", () => {
      const segs = splitByGap(8, 16, WS_DOOR_LO, WS_DOOR_HI);
      expect(segs.length).toBe(2); // door sits strictly inside 8-16, both flanks are real
      expect(segmentsCoverGap(segs, WS_DOOR_LO, WS_DOOR_HI)).toBe(false);
      // and the two segments plus the gap exactly reconstruct the span, no
      // double-thickness overlap between segment and gap either
      expect(segs[0]).toEqual([8, WS_DOOR_LO]);
      expect(segs[1]).toEqual([WS_DOOR_HI, 16]);
    });

    it("band 1's south split (around the genkan inner door, GENKAN_DOOR_LO/HI) never covers the gap", () => {
      const segs = splitByGap(8, 16, GENKAN_DOOR_LO, GENKAN_DOOR_HI);
      expect(segs.length).toBe(2);
      expect(segmentsCoverGap(segs, GENKAN_DOOR_LO, GENKAN_DOOR_HI)).toBe(false);
      expect(segs[0]).toEqual([8, GENKAN_DOOR_LO]);
      expect(segs[1]).toEqual([GENKAN_DOOR_HI, 16]);
    });

    it("bands 0/2 (no door on their own north/south edge) stay a single unsplit segment", () => {
      expect(splitByGap(0, 8, null, null)).toEqual([[0, 8]]);
      expect(splitByGap(16, 22.9, null, null)).toEqual([[16, 22.9]]);
    });

    it("a sweep of x across both gaps never lands inside a returned segment", () => {
      const wsSegs = splitByGap(8, 16, WS_DOOR_LO, WS_DOOR_HI);
      const gkSegs = splitByGap(8, 16, GENKAN_DOOR_LO, GENKAN_DOOR_HI);
      for (let x = WS_DOOR_LO + 0.01; x < WS_DOOR_HI; x += 0.05) {
        expect(wsSegs.some(([x0, x1]) => x >= x0 && x < x1)).toBe(false);
      }
      for (let x = GENKAN_DOOR_LO + 0.01; x < GENKAN_DOOR_HI; x += 0.05) {
        expect(gkSegs.some(([x0, x1]) => x >= x0 && x < x1)).toBe(false);
      }
    });
  });
});
