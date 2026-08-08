import { describe, it, expect } from "vitest";
import {
  selectNeighbourBand,
  updateVisibleBands,
  visibleBands,
  neighbourSelection,
  type NeighbourSelection,
  type RoomBand,
} from "@/threeam/world/runtime";

/** Fresh "no prior selection for this band" context — forces the
 * nearest-doorway path in `selectNeighbourBand`. */
function fresh(current: RoomBand): NeighbourSelection {
  // forCurrent deliberately different from `current` so the reset branch
  // fires, same as a genuine band change would.
  const forCurrent = ((current + 1) % 3) as RoomBand;
  return { band: null, forCurrent };
}

describe("selectNeighbourBand", () => {
  it("workspace centre (x=11.7), no prior selection: picks nearer doorway (bedroom side, 3.7 < 4.3)", () => {
    const result = selectNeighbourBand(1, 11.7, fresh(1));
    expect(result.band).toBe(0);
  });

  it("x=12.5 walking east, bedroom previously selected: music doorway closer by >0.4 → switches to music", () => {
    const prev: NeighbourSelection = { band: 0, forCurrent: 1 };
    const result = selectNeighbourBand(1, 12.5, prev);
    expect(result.band).toBe(2);
  });

  it("hysteresis holds: music selected at x=12.1 (music 3.9 vs bedroom 4.1, not closer by >0.4) stays music", () => {
    const prev: NeighbourSelection = { band: 2, forCurrent: 1 };
    const result = selectNeighbourBand(1, 12.1, prev);
    expect(result.band).toBe(2);
  });

  it("single in-margin doorway (band 0, x=5): returns the only candidate regardless of prior selection", () => {
    const prev: NeighbourSelection = { band: null, forCurrent: 0 };
    expect(selectNeighbourBand(0, 5, prev).band).toBe(1);
  });

  it("out-of-margin (band 0, x=0, doorway 8m away): no neighbour", () => {
    const prev: NeighbourSelection = { band: null, forCurrent: 0 };
    expect(selectNeighbourBand(0, 0, prev).band).toBeNull();
  });

  it("current band change resets selection: prior music pick from band 1 is ignored on fresh band-1 entry", () => {
    // prev.forCurrent=0 (a different band) even though prev.band=2 — the
    // reset branch must win over any stale prior choice.
    const prev: NeighbourSelection = { band: 2, forCurrent: 0 };
    const result = selectNeighbourBand(1, 11.7, prev);
    expect(result.band).toBe(0); // nearest, not the stale "music" pick
  });

  it("never selects more than one neighbour, across a full sweep", () => {
    let sel: NeighbourSelection = { band: null, forCurrent: 0 };
    for (let x = -3; x <= 22; x += 0.1) {
      const current: RoomBand = x < 8 ? 0 : x < 16 ? 1 : 2;
      sel = selectNeighbourBand(current, x, sel);
      expect(sel.band === null || sel.band !== current).toBe(true);
    }
  });
});

describe("updateVisibleBands (integration: cap at 2 visible bands)", () => {
  it("workspace centre no longer renders all 3 bands", () => {
    updateVisibleBands(1, 11.7);
    const visibleCount = visibleBands.filter(Boolean).length;
    expect(visibleCount).toBeLessThanOrEqual(2);
    expect(visibleBands[1]).toBe(true); // current always visible
  });

  it("never more than 2 bands visible across a walking sweep, including workspace centre", () => {
    // Reset shared module state to a known start.
    neighbourSelection.band = null;
    neighbourSelection.forCurrent = 0;
    let current: RoomBand = 0;
    for (let x = -3; x <= 22; x += 0.1) {
      if (current === 0 && x > 8 + 0.4) current = 1;
      else if (current === 1 && x < 8 - 0.4) current = 0;
      else if (current === 1 && x > 16 + 0.4) current = 2;
      else if (current === 2 && x < 16 - 0.4) current = 1;
      updateVisibleBands(current, x);
      const visibleCount = visibleBands.filter(Boolean).length;
      expect(visibleCount).toBeLessThanOrEqual(2);
    }
  });

  it("regression guard: at the old-bug x=12 workspace centre, bedroom and music are not BOTH visible simultaneously", () => {
    updateVisibleBands(1, 12);
    expect(visibleBands[0] && visibleBands[2]).toBe(false);
  });
});
