import { create } from "zustand";
import type { AreaId, Portal, RoomId } from "@/threeam/world/layout";
import { SPAWN } from "@/threeam/world/layout";
import { playerPosition } from "@/threeam/world/runtime";
import type { Station, StationId } from "@/threeam/world/stations";

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
  travel: (portal: Portal) => void;
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
    set({ area: portal.toArea, activePortal: null });
  },
}));
