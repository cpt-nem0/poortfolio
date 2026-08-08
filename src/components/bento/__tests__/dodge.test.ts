import { describe, expect, it } from "vitest";
import { dodgePosition } from "../tiles/ClickbaitTile";

describe("dodgePosition", () => {
  it("does not move when the cursor is far away", () => {
    expect(dodgePosition(300, 150, 250, 120, 20, 20, 22)).toBeNull();
  });
  it("moves away from a near cursor and stays inside the tile", () => {
    const p = dodgePosition(300, 150, 250, 120, 245, 115, 22);
    expect(p).not.toBeNull();
    expect(p!.x).toBeGreaterThanOrEqual(6);
    expect(p!.x).toBeLessThanOrEqual(300 - 22 - 6);
    expect(p!.y).toBeGreaterThanOrEqual(6);
    expect(p!.y).toBeLessThanOrEqual(150 - 22 - 6);
    const away = Math.hypot(p!.x - 245, p!.y - 115) > Math.hypot(250 - 245, 120 - 115);
    expect(away).toBe(true);
  });
});
