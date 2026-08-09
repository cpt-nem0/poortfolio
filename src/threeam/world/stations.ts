import type { Rect } from "./layout";
import type { AreaId } from "./runtime";

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
    area: "workstation",
    // T8 finale item 15 (owner feedback wave): retargeted AGAIN — the
    // polaroid wall this station used to frame is gone, replaced by a
    // project-building table + angled drafting board (west wall, collider
    // {8,-6.1,1.0,2.2}). Trigger hugs the table's east face without
    // overlapping it (table ends x9.0; trigger starts x9.6, a 0.6m
    // walkable standoff) or the desk (x10.5-12.7; trigger ends x10.45, a
    // 0.05m gap) — both checked live in stations.test.ts/furniture.test.ts.
    trigger: { x: 9.6, z: -5.6, w: 0.85, d: 1.2 },
    label: "look at the projects",
    // Camera reframes to READ THE DRAFTING BOARD (board center ≈
    // [8.6,1.0,-5.0], tilted up-and-east per Workstation.tsx's own
    // comment) instead of the old polaroid wall. pos=[12.0,3.6,-3.0],
    // look=[8.6,1.0,-5.0] — no shared axis coordinate (12/3.6/-3.0 vs
    // 8.6/1.0/-5.0), no collinearity risk.
    //
    // Clearance math (parametrize P(t) = pos + t·(look-pos), t∈[0,1];
    // D = look-pos = [-3.4,-2.6,-2.0]): x(t)=12.0-3.4t crosses the
    // trigger's x-range [9.6,10.45] for t∈[0.4559,0.7059] (x=10.45 at
    // t=0.4559, x=9.6 at t=0.7059). Over THAT interval, z(t)=-3.0-2.0t
    // only enters the trigger's z-range [-5.6,-4.4] starting at t=0.7
    // (z=-4.4 exactly) through t=0.7059 (z=-4.412) — so the ray is only
    // ever inside the trigger's full 2D footprint for t∈[0.7,0.7059], a
    // narrow window near the FAR edge from the camera, not near the look
    // point. y(t)=3.6-2.6t over that window: y(0.7)=1.78, y(0.7059)=1.765
    // — both comfortably above the 1.6m player-capsule clearance (≥0.16m
    // margin), unlike a naive pos/look pair that would let the ray dip
    // toward look.y=1.0 while still crossing the trigger (the raised
    // pos.y=3.6 and the trigger's own standoff from the table are both
    // load-bearing for this — a lower pos or a trigger flush against the
    // table both fail the check, verified by hand while iterating).
    camera: { pos: [12.0, 3.6, -3.0], look: [8.6, 1.0, -5.0] },
  },
  {
    id: "experience",
    area: "workstation",
    // LAYOUT V2 (Task 5): retargeted from the old common-area corkboard
    // (x12.5, z0.35) to its new home on the workstation's NORTH wall
    // (corkboard face x13.1-14.7, z-6.05 — layout.ts). Trigger sits before
    // it, clear of the desk, chair, and coffee-bar rects, and of the
    // shared-wall door gap (live sweep in stations.test.ts).
    trigger: { x: 13.0, z: -5.6, w: 1.9, d: 1.5 },
    label: "read the corkboard",
    // Plan spec had pos.x === look.x === 13.9 (collinearity bug: a
    // dead-straight line down the x axis, fragile to any future x tweak).
    // Shifted pos.x by +0.15 to 14.05, keeping look.x at 13.9 (centered on
    // the corkboard's 13.1-14.7 span) so the framing target is unchanged.
    // Sightline math: x(t) only ranges [13.9,14.05] for t in [0,1] — inside
    // the trigger's x-range [13.0,14.9] for the whole ray — and z(t)
    // crosses the trigger's z-range [-5.6,-4.1] for t in [0.3871,0.8710];
    // y(t) over that interval runs 2.497 -> 1.868m, minimum 1.868m, well
    // clear of the 1.6m capsule.
    camera: { pos: [14.05, 3.0, -2.9], look: [13.9, 1.7, -6.0] },
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

/**
 * LAYOUT V2 (Task 5): "workstation" is a camera-only area — its floor space
 * physically belongs to `HOUSE.areas.ground` (see runtime.ts's AreaId doc),
 * so the `areaId` Player.tsx actually passes here (its `collisionAreaId`)
 * is always "ground" for a player standing in the workstation room, never
 * literally "workstation" — matching runtime.ts's documented convention
 * that physical-collision consumers ("HOUSE.areas[...], portalAt,
 * stationAt") "map 'workstation' back to 'ground' themselves". This helper
 * IS that mapping, applied on both sides of the comparison below: "ground"
 * and "workstation" collapse to the same physical bucket, "roof" stays its
 * own.
 *
 * Naively storing `area: "workstation"` on a station and comparing it
 * against `areaId` with strict equality would make it permanently
 * unreachable — `stationAt` is only ever called with "ground" or "roof",
 * never the literal string "workstation" — silently breaking the [E]
 * prompt for both moved stations. That's the exact failure this mapping
 * exists to avoid.
 *
 * This is still safe against the wall (not a from-behind exploit): every
 * workstation station's trigger sits deep inside `WORKSTATION_ROOM`, ~4m
 * past the shared wall's door threshold (runtime.ts's AREA_PORTAL_Z=-0.1).
 * A player can only physically reach those coordinates by walking through
 * the door gap, which flips the CAMERA area to "workstation" the instant it
 * happens — long before they can cover the remaining distance to a trigger.
 * See stations.test.ts's live-geometry proof of that margin.
 */
function physicalArea(area: AreaId): "ground" | "roof" {
  return area === "roof" ? "roof" : "ground";
}

export function stationAt(areaId: AreaId, x: number, z: number): Station | null {
  return (
    STATIONS.find(
      (s) =>
        physicalArea(s.area) === physicalArea(areaId) &&
        x >= s.trigger.x &&
        x <= s.trigger.x + s.trigger.w &&
        z >= s.trigger.z &&
        z <= s.trigger.z + s.trigger.d
    ) ?? null
  );
}
