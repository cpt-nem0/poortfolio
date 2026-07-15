import { create } from "zustand";
import type { AreaId, Portal, RoomId } from "@/threeam/world/layout";
import { SPAWN } from "@/threeam/world/layout";
import { playerPosition } from "@/threeam/world/runtime";

type ThreeAmState = {
  area: AreaId;
  room: RoomId | null;
  activePortal: Portal | null;
  setRoom: (room: RoomId | null) => void;
  setActivePortal: (portal: Portal | null) => void;
  /** Use a portal: switch area, teleport the player, clear the prompt. */
  travel: (portal: Portal) => void;
};

export const useThreeAm = create<ThreeAmState>((set) => ({
  area: SPAWN.area,
  room: null,
  activePortal: null,
  setRoom: (room) => set({ room }),
  setActivePortal: (activePortal) => set({ activePortal }),
  travel: (portal) => {
    playerPosition.x = portal.toPosition.x;
    playerPosition.z = portal.toPosition.z;
    set({ area: portal.toArea, activePortal: null });
  },
}));
