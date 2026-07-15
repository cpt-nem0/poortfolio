import type { Area, Rect } from "./layout";

export const PLAYER_RADIUS = 0.35;

function circleIntersectsRect(px: number, pz: number, r: number, rect: Rect) {
  const cx = Math.max(rect.x, Math.min(px, rect.x + rect.w));
  const cz = Math.max(rect.z, Math.min(pz, rect.z + rect.d));
  const dx = px - cx;
  const dz = pz - cz;
  return dx * dx + dz * dz < r * r;
}

/** True if a circle of radius `r` at (x, z) overlaps a wall or leaves bounds. */
export function isBlocked(
  area: Area,
  x: number,
  z: number,
  r: number = PLAYER_RADIUS
): boolean {
  const b = area.bounds;
  if (x - r < b.x || x + r > b.x + b.w) return true;
  if (z - r < b.z || z + r > b.z + b.d) return true;
  return area.walls.some((w) => circleIntersectsRect(x, z, r, w));
}

/**
 * Apply `delta` axis-by-axis so a blocked axis is dropped while the other
 * still applies (wall sliding). Always returns an unblocked position.
 */
export function resolveMovement(
  area: Area,
  pos: { x: number; z: number },
  delta: { x: number; z: number },
  r: number = PLAYER_RADIUS
): { x: number; z: number } {
  let { x, z } = pos;
  if (!isBlocked(area, x + delta.x, z, r)) x += delta.x;
  if (!isBlocked(area, x, z + delta.z, r)) z += delta.z;
  return { x, z };
}
