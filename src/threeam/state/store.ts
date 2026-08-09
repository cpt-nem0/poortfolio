import { create } from "zustand";
import type { Portal, RoomId } from "@/threeam/world/layout";
import { SPAWN } from "@/threeam/world/layout";
import { playerPosition, type AreaId } from "@/threeam/world/runtime";
import type { Station, StationId } from "@/threeam/world/stations";

/** Anything `travel` can move the player to: the existing declarative stair
 * `Portal`s (layout.ts), or the ad-hoc object the workstation's threshold
 * portal builds (LAYOUT V2 Task 2 — no trigger/label, just where it goes).
 * A `Portal` structurally satisfies this (its narrower `toArea` type is a
 * subset of the wider `AreaId` here), so every existing caller is unaffected. */
type Travelable = { toArea: AreaId; toPosition: { x: number; z: number } };

type ThreeAmState = {
  area: AreaId;
  room: RoomId | null;
  activePortal: Portal | null;
  /** Station currently focused (camera pushed in + panel open). */
  focus: StationId | null;
  /** Station whose trigger the player stands in (HUD prompt). */
  activeStation: Station | null;
  setRoom: (room: RoomId | null) => void;
  setActivePortal: (portal: Portal | null) => void;
  setFocus: (focus: StationId | null) => void;
  setActiveStation: (activeStation: Station | null) => void;
  /** Use a portal: switch area, teleport the player, clear the prompt. */
  travel: (portal: Travelable) => void;
};

export const useThreeAm = create<ThreeAmState>((set) => ({
  area: SPAWN.area,
  room: null,
  activePortal: null,
  focus: null,
  activeStation: null,
  setRoom: (room) => set({ room }),
  setActivePortal: (activePortal) => set({ activePortal }),
  setFocus: (focus) => set({ focus }),
  setActiveStation: (activeStation) => set({ activeStation }),
  travel: (portal) => {
    playerPosition.x = portal.toPosition.x;
    playerPosition.z = portal.toPosition.z;
    set({ area: portal.toArea, activePortal: null, focus: null, activeStation: null });
  },
}));
