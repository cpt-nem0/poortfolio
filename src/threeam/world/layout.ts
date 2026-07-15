/**
 * Static floor plan for the /3am house. Pure data — no three.js, no React.
 * Units are meters. Origin at the house's north-west corner; x grows east
 * (bedroom → music nook), z grows south (toward the camera).
 */

export type Rect = { x: number; z: number; w: number; d: number };
export type RoomId = "bedroom" | "workspace" | "music" | "rooftop";
export type AreaId = "ground" | "roof";

export type Portal = {
  id: string;
  area: AreaId;
  /** Standing inside this rect arms the portal (HUD shows `label`). */
  trigger: Rect;
  toArea: AreaId;
  toPosition: { x: number; z: number };
  label: string;
};

export type Area = {
  id: AreaId;
  /** Outer walkable bounds; everything outside is blocked. */
  bounds: Rect;
  /** Blocked rectangles inside the bounds (interior walls; furniture later). */
  walls: Rect[];
  rooms: { id: RoomId; rect: Rect }[];
};

const WALL_T = 0.2; // interior wall thickness
const DOOR_LO = 2.2; // doorway gap on z: [DOOR_LO, DOOR_HI]
const DOOR_HI = 3.8;

/** Interior dividing wall at `x` with a doorway gap, spanning depth `d`. */
function dividerWithDoor(x: number, d: number): Rect[] {
  return [
    { x: x - WALL_T / 2, z: 0, w: WALL_T, d: DOOR_LO },
    { x: x - WALL_T / 2, z: DOOR_HI, w: WALL_T, d: d - DOOR_HI },
  ];
}

const GROUND: Area = {
  id: "ground",
  bounds: { x: 0, z: 0, w: 22, d: 6 },
  walls: [...dividerWithDoor(8, 6), ...dividerWithDoor(16, 6)],
  rooms: [
    { id: "bedroom", rect: { x: 0, z: 0, w: 8, d: 6 } },
    { id: "workspace", rect: { x: 8, z: 0, w: 8, d: 6 } },
    { id: "music", rect: { x: 16, z: 0, w: 6, d: 6 } },
  ],
};

const ROOF: Area = {
  id: "roof",
  bounds: { x: 8, z: 0, w: 8, d: 6 },
  walls: [],
  rooms: [{ id: "rooftop", rect: { x: 8, z: 0, w: 8, d: 6 } }],
};

export const HOUSE: { areas: Record<AreaId, Area>; portals: Portal[] } = {
  areas: { ground: GROUND, roof: ROOF },
  portals: [
    {
      id: "ladder-up",
      area: "ground",
      trigger: { x: 14.6, z: 0.2, w: 1.2, d: 1.0 },
      toArea: "roof",
      toPosition: { x: 12, z: 2 },
      label: "climb the ladder",
    },
    {
      id: "ladder-down",
      area: "roof",
      trigger: { x: 14.6, z: 0.2, w: 1.2, d: 1.0 },
      toArea: "ground",
      toPosition: { x: 14, z: 2 },
      label: "climb down",
    },
  ],
};

export const SPAWN = { area: "ground" as AreaId, x: 4, z: 3 };
