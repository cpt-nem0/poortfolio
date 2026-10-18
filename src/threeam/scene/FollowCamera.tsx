"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { playerPosition, type AreaId } from "@/threeam/world/runtime";
import { useThreeAm } from "@/threeam/state/store";
import { HOUSE, WORKSTATION_ROOM, GENKAN_ROOM } from "@/threeam/world/layout";
import { PLAYER_RADIUS } from "@/threeam/world/collision";
import { STATIONS } from "@/threeam/world/stations";

/**
 * Per-area camera offsets. Interiors sit closer (dollhouse view); the
 * rooftop pulls way back to leave room for the skyline/scenery layer.
 * Area changes lerp automatically since the target swaps mid-flight.
 * LAYOUT V2 (Task 2): workstation reuses the ground offset — WORKSTATION_ROOM
 * is the same 8x6 footprint as the ground front-row rooms, just mirrored
 * behind the shared wall (see the `bounds` derivation below), so the same
 * dollhouse framing fits it.
 */
const AREA_CAMERA: Record<AreaId, { y: number; z: number }> = {
  ground: { y: 10.5, z: 9.5 },
  roof: { y: 14, z: 13 },
  workstation: { y: 10.5, z: 9.5 },
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
    // LAYOUT V2 (Task 2): "workstation" isn't a real `HOUSE.areas` entry
    // (it's camera-only — see runtime.ts's AreaId doc) — derive its bounds
    // straight from WORKSTATION_ROOM, the same way every other area derives
    // from `HOUSE.areas[...].bounds`.
    const b = s.area === "workstation" ? WORKSTATION_ROOM : HOUSE.areas[s.area].bounds;
    const OFFSET = AREA_CAMERA[s.area];

    // follow-rig framing point — keep it inside the area so edges don't show
    // void. NOTE: margins assume every area is ≥6m wide and ≥2m deep; clamp()
    // returns `lo` if lo > hi, which would pin the camera in a smaller area.
    const tx = clamp(playerPosition.x, b.x + 3, b.x + b.w - 3);
    // LAYOUT V2 (Task 6): "ground"'s own `bounds` now spans the WHOLE
    // combined structure (workstation through genkan, see layout.ts's
    // LAYOUT V2 comment) — a flat `b.z+b.d-1` south margin, sized for the
    // old single 6m-deep front row, landed at z7.3, short of the genkan's
    // own reachable south edge (its front door wall starts at z8.1; the
    // player's capsule — PLAYER_RADIUS below — stops at 8.1-0.35=7.75).
    // While `area === "ground"` the player can never be north of the
    // workstation door threshold anyway (that flips `area` to
    // "workstation" first — runtime.ts's stepAreaCross), so the south edge
    // is the only one that needs its own margin here; north keeps the
    // generic `b.z+1` (unreachable in practice, harmless either way).
    const tzHi =
      s.area === "ground" ? GENKAN_ROOM.z + GENKAN_ROOM.d - PLAYER_RADIUS : b.z + b.d - 1;
    const tz = clamp(playerPosition.z, b.z + 1, tzHi);

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
