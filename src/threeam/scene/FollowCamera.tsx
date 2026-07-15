"use client";

import { useFrame } from "@react-three/fiber";
import { playerPosition } from "@/threeam/world/runtime";
import { useThreeAm } from "@/threeam/state/store";
import { HOUSE } from "@/threeam/world/layout";
import type { AreaId } from "@/threeam/world/layout";

/**
 * Per-area camera offsets. Interiors sit closer (dollhouse view); the
 * rooftop pulls way back to leave room for the skyline/scenery layer.
 * Area changes lerp automatically since the target swaps mid-flight.
 */
const AREA_CAMERA: Record<AreaId, { y: number; z: number }> = {
  ground: { y: 10.5, z: 9.5 },
  roof: { y: 14, z: 13 },
};
const LERP = 4; // 1/s — higher is snappier

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export function FollowCamera() {
  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const area = useThreeAm.getState().area;
    const b = HOUSE.areas[area].bounds;
    const OFFSET = AREA_CAMERA[area];

    // keep the framed point inside the area so edges don't show void
    // NOTE: margins assume every area is ≥6m wide and ≥2m deep; clamp()
    // returns `lo` if lo > hi, which would pin the camera in a smaller area.
    const tx = clamp(playerPosition.x, b.x + 3, b.x + b.w - 3);
    const tz = clamp(playerPosition.z, b.z + 1, b.z + b.d - 1);

    const t = 1 - Math.exp(-LERP * dt); // framerate-independent lerp
    camera.position.x += (tx - camera.position.x) * t;
    camera.position.y += (OFFSET.y - camera.position.y) * t;
    camera.position.z += (tz + OFFSET.z - camera.position.z) * t;
    camera.lookAt(tx, 0.8, tz);
  });
  return null;
}
