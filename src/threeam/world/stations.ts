import type { AreaId, Rect } from "./layout";

/**
 * Stations: walk-up content hotspots. Standing in the trigger arms the HUD
 * prompt; E (or clicking the station's meshes) focuses it — the camera
 * flies to `camera` and a content panel opens. Pure data, no three/React.
 */
export type StationId = "projects" | "experience" | "about";

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
    // pos is raised + offset south of the look point so the sightline passes
    // over the head (~1.6m) of a player standing anywhere in the trigger
    camera: { pos: [12.0, 3.4, 2.6], look: [8.0, 1.5, 1.2] },
  },
  {
    id: "experience",
    area: "ground",
    // in front of the corkboard on the north wall (right of the desk)
    trigger: { x: 12.5, z: 0.35, w: 2.0, d: 1.6 },
    label: "read the corkboard",
    // pos is raised + offset west of the look point so the sightline clears
    // a player standing anywhere in the trigger (no shared x with look)
    camera: { pos: [11.4, 3.4, 4.4], look: [13.4, 1.7, 0.2] },
  },
  {
    id: "about",
    area: "ground",
    // standing zone in front of the manga dresser (north wall), just south
    // of the dresser's collider (z 0.3-0.85) so the whole trigger is clear
    trigger: { x: 2.7, z: 1.0, w: 1.9, d: 1.15 },
    label: "about me",
    // pos is SE of the dresser, above head height; look is at the dresser +
    // wall composition. pos and look share no axis coordinate (5.4/3.3/3.2
    // vs 3.0/1.35/0.4). Sightline clearance over the trigger verified in the
    // P4 T4 report via closest-approach analysis (min height ~1.49m at the
    // west trigger corner, clears the 1.4m head-height requirement).
    camera: { pos: [5.4, 3.3, 3.2], look: [3.0, 1.35, 0.4] },
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
