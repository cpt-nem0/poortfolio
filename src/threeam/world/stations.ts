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
    // P4 recenter: retargeted from the (now-removed) manga dresser to the
    // bed. Standing zone on the bed's east/south approach — clear of the
    // bed (SUPER-KING pass grew the bed to x max 5.1; trigger x min 5.15,
    // now a 0.05m gap, tighter than the P4-recenter's 0.15m but still
    // strictly clear — 5.15 is not close enough to 5.1 for float error to
    // matter) and the nightstand (x min 6.45, trigger x max 6.40, 0.05m
    // gap, unaffected by the bed change); the exhaustive pairwise test in
    // furniture.test.ts referees this.
    trigger: { x: 5.15, z: 1.3, w: 1.25, d: 1.1 },
    label: "about me",
    // pos is southwest of the room (near the window side, well south of
    // everything), look is at the bed/cat cluster near the headboard — pos
    // and look share no axis coordinate (1.8/3.3/4.4 vs 4.3/1.1/0.9), and
    // pos sits west + south of look (southwest framing). The ray's x-span
    // ([1.8, 4.3]) never reaches the trigger's x-range (5.15-6.40) at all —
    // a stronger guarantee than height clearance, since a player standing
    // in the trigger can never fall on the ray's path (see the P4-recenter
    // report's sightline table: the ray even hits the north wall at
    // x≈4.94 before it could reach the trigger's x-min, so there's no
    // extrapolated line-of-sight risk either).
    camera: { pos: [1.8, 3.3, 4.4], look: [4.3, 1.1, 0.9] },
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
