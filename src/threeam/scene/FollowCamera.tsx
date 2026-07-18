"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { playerPosition } from "@/threeam/world/runtime";
import { useThreeAm } from "@/threeam/state/store";
import { HOUSE } from "@/threeam/world/layout";
import type { AreaId } from "@/threeam/world/layout";
import { STATIONS } from "@/threeam/world/stations";

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
  // Persistent smoothed look target: BOTH the follow rig and the station
  // close-up steer this point each frame, so orientation eases through focus
  // transitions in either direction (position alone easing would still snap
  // the rotation the instant the lookAt target swaps).
  const lookRef = useRef<Vector3 | null>(null);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = 1 - Math.exp(-LERP * dt); // framerate-independent lerp
    const s = useThreeAm.getState();
    const b = HOUSE.areas[s.area].bounds;
    const OFFSET = AREA_CAMERA[s.area];

    // follow-rig framing point — keep it inside the area so edges don't show
    // void. NOTE: margins assume every area is ≥6m wide and ≥2m deep; clamp()
    // returns `lo` if lo > hi, which would pin the camera in a smaller area.
    const tx = clamp(playerPosition.x, b.x + 3, b.x + b.w - 3);
    const tz = clamp(playerPosition.z, b.z + 1, b.z + b.d - 1);

    const station = s.focus
      ? STATIONS.find((st) => st.id === s.focus)
      : undefined;

    // desired pose: station close-up while focused, follow rig otherwise
    const [px, py, pz] = station
      ? station.camera.pos
      : [tx, OFFSET.y, tz + OFFSET.z];
    const [lx, ly, lz] = station ? station.camera.look : [tx, 0.8, tz];

    camera.position.x += (px - camera.position.x) * t;
    camera.position.y += (py - camera.position.y) * t;
    camera.position.z += (pz - camera.position.z) * t;

    // initialize to the follow target so the first frame doesn't swing
    const look = (lookRef.current ??= new Vector3(tx, 0.8, tz));
    look.x += (lx - look.x) * t;
    look.y += (ly - look.y) * t;
    look.z += (lz - look.z) * t;
    camera.lookAt(look);
  });
  return null;
}
