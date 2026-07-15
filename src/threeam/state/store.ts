import { create } from "zustand";
import type { AreaId, Portal, RoomId } from "@/threeam/world/layout";
import { SPAWN } from "@/threeam/world/layout";
import { playerPosition } from "@/threeam/world/runtime";

type ThreeAmState = {
  area: AreaId;
  room: RoomId | null;
  activePortal: Portal | null;
  /** Current pixelation granularity — set by Effects, displayed by Hud. */
  pixelSize: number;
  setRoom: (room: RoomId | null) => void;
  setActivePortal: (portal: Portal | null) => void;
  setPixelSize: (pixelSize: number) => void;
  /** Use a portal: switch area, teleport the player, clear the prompt. */
  travel: (portal: Portal) => void;
};

export const useThreeAm = create<ThreeAmState>((set) => ({
  area: SPAWN.area,
  room: null,
  activePortal: null,
  pixelSize: 7,
  setRoom: (room) => set({ room }),
  setActivePortal: (activePortal) => set({ activePortal }),
  setPixelSize: (pixelSize) => set({ pixelSize }),
  travel: (portal) => {
    playerPosition.x = portal.toPosition.x;
    playerPosition.z = portal.toPosition.z;
    set({ area: portal.toArea, activePortal: null });
  },
}));
