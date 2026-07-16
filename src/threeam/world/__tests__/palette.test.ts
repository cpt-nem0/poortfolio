import { describe, it, expect } from "vitest";
// @ts-expect-error — plain-JS module shared with node generation scripts
import { PALETTE, hexToRgb, shade, hash2 } from "../../../../scripts/pixelart/palette.mjs";

describe("master palette", () => {
  it("every entry is a #rrggbb hex", () => {
    for (const [name, hex] of Object.entries(PALETTE)) {
      expect(hex, name).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("hexToRgb round-trips", () => {
    expect(hexToRgb("#ff8040")).toEqual([255, 128, 64]);
  });

  it("shade darkens and clamps", () => {
    expect(shade("#808080", 0.5)).toEqual([64, 64, 64]);
    expect(shade("#808080", 3)).toEqual([255, 255, 255]);
  });

  it("hash2 is deterministic and in [0,1)", () => {
    expect(hash2(3, 7, 1)).toBe(hash2(3, 7, 1));
    expect(hash2(3, 7, 1)).not.toBe(hash2(3, 7, 2));
    for (let i = 0; i < 50; i++) {
      const v = hash2(i, i * 13, 5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
