import { describe, expect, it } from "vitest";
import { resolveAreaCrossing, stepAreaCross, type AreaCrossArmState } from "../runtime";

// OWNER FEEDBACK WAVE: every in-gap `x` probe below moved from 13.8 (inside
// the door's old 13.2-14.5 range) to 12.0 (inside the new 11.35-12.65
// range, recentered to the common room's own midpoint) — these tests don't
// import WS_DOOR_LO/HI, so the old literal silently went stale (fell
// outside the new gap) instead of failing to compile; caught by actually
// running the suite, not by the door-move grep alone.
describe("resolveAreaCrossing", () => {
  it("crossing north through the door gap enters the workstation", () => {
    expect(resolveAreaCrossing(0.4, -0.2, 12.0)).toBe("workstation");
  });

  it("crossing south through the door gap re-enters ground", () => {
    expect(resolveAreaCrossing(-0.3, 0.2, 12.0)).toBe("ground");
  });

  it("crossing the same z outside the door gap's x-range does nothing", () => {
    expect(resolveAreaCrossing(0.4, -0.2, 10)).toBeNull();
  });

  it("staying on the same side of the threshold (no cross) does nothing", () => {
    expect(resolveAreaCrossing(0.4, 0.3, 12.0)).toBeNull();
  });
});

/** Drives `stepAreaCross` frame-by-frame over a z-sequence at fixed `x`,
 * the same way Player.tsx's useFrame does, and returns the final resolved
 * area. `zs[0]` is the position BEFORE the sequence starts (no step taken
 * for it) — each subsequent entry is one frame's ending z. */
function driveAreaCross(zs: number[], x: number, startArea: "ground" | "workstation") {
  let state: AreaCrossArmState = { armed: true };
  let area: "ground" | "workstation" = startArea;
  let prevZ = zs[0];
  for (let i = 1; i < zs.length; i++) {
    const z = zs[i];
    const result = stepAreaCross(state, area, prevZ, z, x);
    state = { armed: result.armed };
    if (result.area) area = result.area;
    prevZ = z;
  }
  return area;
}

describe("stepAreaCross (2026-08 review regression: peek-and-reverse at the doorway)", () => {
  // Reviewer-verified repro: an ordinary peek into the workstation and
  // straight back out, all while still inside the 0.3m re-cross hysteresis
  // band, must not strand the resolved area on the wrong side once the
  // player has clearly walked away (z=0.5, well into the common area).
  const Z_SEQUENCE = [0.05, -0.12, -0.05, 0.02, 0.5];
  const X = 12.0;

  it("ends on the ground side the player is actually standing on", () => {
    expect(driveAreaCross(Z_SEQUENCE, X, "ground")).toBe("ground");
  });
});
