"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Mesh } from "three";
import { useKeyboard } from "@/threeam/input/useKeyboard";
import { HOUSE } from "@/threeam/world/layout";
import { resolveMovement } from "@/threeam/world/collision";
import { roomAt, portalAt } from "@/threeam/world/detect";
import { stationAt } from "@/threeam/world/stations";
import { playerPosition, stepAreaCross, type AreaCrossArmState } from "@/threeam/world/runtime";
import { useThreeAm } from "@/threeam/state/store";

const SPEED = 2.2; // m/s — was 3.5 → 3.0 → 2.5 → 2.2; retuned each time real fps went up (dt clamping used to eat distance at low fps, so the same constant reads faster once frames are actually delivered) — 2.2 is the owner's layout-v2 retune (2026-08-10), the bigger room count made 2.5 feel rushed

export function Player() {
  const meshRef = useRef<Mesh>(null);
  const keyboard = useKeyboard();
  const { gl, scene } = useThree();
  // `stepAreaCross`'s persisted arm state. Starts armed (SPAWN sits well
  // clear of the threshold either way).
  const areaCross = useRef<AreaCrossArmState>({ armed: true });

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    // dev-only handle so browser automation can teleport & inspect state —
    // also exposes the renderer/scene for perf probing (renderer.info.render
    // .calls/.triangles, scene.traverse for light counts) without shipping
    // any of this to production.
    const w = window as unknown as Record<string, unknown>;
    w.__3am = { playerPosition, store: useThreeAm, renderer: gl, scene };
    return () => {
      delete w.__3am;
    };
  }, [gl, scene]);

  useFrame((_, rawDt) => {
    if (useThreeAm.getState().focus) {
      keyboard.consumeInteract(); // drain stale E presses while frozen
      return;
    }
    const dt = Math.min(rawDt, 0.05); // clamp tab-switch spikes
    let s = useThreeAm.getState();
    // LAYOUT V2 (Task 2): "workstation" is a camera-only area — physically
    // the player is still standing in GROUND's own bounds/walls (the
    // workstation's floor space is already part of GROUND, see layout.ts's
    // LAYOUT V2 comment), so collision/room/portal/station all key off
    // "ground" for it, same as they always have for "ground" itself. Only
    // "roof" is a genuinely different physical Area.
    const collisionAreaId = s.area === "roof" ? "roof" : "ground";
    const area = HOUSE.areas[collisionAreaId];

    const prevZ = playerPosition.z;
    const move = keyboard.getMove();
    if (move.x !== 0 || move.z !== 0) {
      const next = resolveMovement(area, playerPosition, {
        x: move.x * SPEED * dt,
        z: move.z * SPEED * dt,
      });
      playerPosition.x = next.x;
      playerPosition.z = next.z;
    }

    // Position-triggered workstation threshold portal: crossing z=-0.1
    // inside the door gap swaps ground<->workstation, no keypress. Gated to
    // non-roof (2026-08 review Finding 2): this portal has no business
    // running in the roof's own coordinate space, even if today's geometry
    // happens not to overlap it — future roof geometry (T7's stair-room)
    // shouldn't be able to regress this by accident.
    if (s.area !== "roof") {
      const currentArea = s.area === "workstation" ? "workstation" : "ground";
      const result = stepAreaCross(
        areaCross.current,
        currentArea,
        prevZ,
        playerPosition.z,
        playerPosition.x
      );
      areaCross.current = { armed: result.armed };
      if (result.area && result.area !== currentArea) {
        s.travel({
          toArea: result.area,
          toPosition: { x: playerPosition.x, z: playerPosition.z },
        });
        // Stale-input bug class: an E queued this same frame was meant for
        // whichever area we just left — drain it so it can't fire a
        // portal/station focus in the area we just entered.
        keyboard.consumeInteract();
        s = useThreeAm.getState(); // travel() just reset area/activePortal/focus/activeStation
      }
    }

    // discrete facts → store (only on change; avoids render churn)
    const room = roomAt(area, playerPosition.x, playerPosition.z);
    if (room !== s.room) s.setRoom(room);
    const portal = portalAt(
      HOUSE.portals,
      collisionAreaId,
      playerPosition.x,
      playerPosition.z
    );
    if (portal?.id !== s.activePortal?.id) s.setActivePortal(portal);

    const station = stationAt(collisionAreaId, playerPosition.x, playerPosition.z);
    if (station?.id !== s.activeStation?.id) s.setActiveStation(station);

    // E priority: portal travels immediately, else focus the station
    if (keyboard.consumeInteract()) {
      if (portal) {
        s.travel(portal);
      } else if (station) {
        s.setFocus(station.id);
      }
    }

    if (meshRef.current) {
      meshRef.current.position.set(playerPosition.x, 0.8, playerPosition.z);
    }
  });

  return (
    <mesh ref={meshRef} castShadow>
      <capsuleGeometry args={[0.35, 0.9, 4, 12]} />
      <meshStandardMaterial color="#ffb35c" />
    </mesh>
  );
}
