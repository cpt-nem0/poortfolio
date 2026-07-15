import { describe, it, expect, beforeEach } from "vitest";
import { useThreeAm } from "@/threeam/state/store";
import { playerPosition } from "@/threeam/world/runtime";
import { HOUSE, SPAWN } from "@/threeam/world/layout";

beforeEach(() => {
  useThreeAm.setState({ area: SPAWN.area, room: null, activePortal: null });
  playerPosition.x = SPAWN.x;
  playerPosition.z = SPAWN.z;
});

describe("useThreeAm store", () => {
  it("starts at spawn area with no room", () => {
    expect(useThreeAm.getState().area).toBe("ground");
    expect(useThreeAm.getState().room).toBeNull();
  });

  it("setRoom / setActivePortal update state", () => {
    useThreeAm.getState().setRoom("music");
    const ladder = HOUSE.portals.find((p) => p.id === "ladder-up")!;
    useThreeAm.getState().setActivePortal(ladder);
    expect(useThreeAm.getState().room).toBe("music");
    expect(useThreeAm.getState().activePortal?.id).toBe("ladder-up");
  });

  it("travel switches area, teleports the player, clears the portal", () => {
    const up = HOUSE.portals.find((p) => p.id === "ladder-up")!;
    useThreeAm.getState().setActivePortal(up);
    useThreeAm.getState().travel(up);
    const s = useThreeAm.getState();
    expect(s.area).toBe("roof");
    expect(s.activePortal).toBeNull();
    expect(playerPosition.x).toBe(up.toPosition.x);
    expect(playerPosition.z).toBe(up.toPosition.z);
  });
});
