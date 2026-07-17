import type { AreaId, Rect } from "./layout";

/**
 * Stations: walk-up content hotspots. Standing in the trigger arms the HUD
 * prompt; E (or clicking the station's meshes) focuses it — the camera
 * flies to `camera` and a content panel opens. Pure data, no three/React.
 */
export type StationId = "projects" | "experience";

export type Station = {
  id: StationId;
  area: AreaId;
  trigger: Rect;
  label: string;
  camera: { pos: [number, number, number]; look: [number, number, number] };
};

export const STATIONS: Station[] = [
  {
    id: "projects",
    area: "ground",
    // in front of the polaroid wall on the west divider (x=8), north segment
    trigger: { x: 8.2, z: 0.4, w: 1.4, d: 1.7 },
    label: "look at the projects",
    camera: { pos: [12.5, 2.3, 0.6], look: [8.0, 1.5, 0.6] },
  },
  {
    id: "experience",
    area: "ground",
    // in front of the corkboard on the north wall (right of the desk)
    trigger: { x: 12.5, z: 0.35, w: 2.0, d: 1.6 },
    label: "read the corkboard",
    camera: { pos: [12.6, 2.9, 4.6], look: [12.6, 1.8, 0.2] },
  },
];

export function stationAt(areaId: AreaId, x: number, z: number): Station | null {
  return (
    STATIONS.find(
      (s) =>
        s.area === areaId &&
        x >= s.trigger.x &&
        x <= s.trigger.x + s.trigger.w &&
        z >= s.trigger.z &&
        z <= s.trigger.z + s.trigger.d
    ) ?? null
  );
}
