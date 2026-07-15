import type { Area, AreaId, Portal, Rect, RoomId } from "./layout";

function inRect(x: number, z: number, r: Rect) {
  return x >= r.x && x <= r.x + r.w && z >= r.z && z <= r.z + r.d;
}

export function roomAt(area: Area, x: number, z: number): RoomId | null {
  const hit = area.rooms.find((r) => inRect(x, z, r.rect));
  return hit ? hit.id : null;
}

export function portalAt(
  portals: Portal[],
  areaId: AreaId,
  x: number,
  z: number
): Portal | null {
  return (
    portals.find((p) => p.area === areaId && inRect(x, z, p.trigger)) ?? null
  );
}
