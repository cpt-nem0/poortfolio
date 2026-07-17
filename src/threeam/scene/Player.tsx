"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { useKeyboard } from "@/threeam/input/useKeyboard";
import { HOUSE } from "@/threeam/world/layout";
import { resolveMovement } from "@/threeam/world/collision";
import { roomAt, portalAt } from "@/threeam/world/detect";
import { stationAt } from "@/threeam/world/stations";
import { playerPosition } from "@/threeam/world/runtime";
import { useThreeAm } from "@/threeam/state/store";

const SPEED = 3.5; // m/s

export function Player() {
  const meshRef = useRef<Mesh>(null);
  const keyboard = useKeyboard();

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    // dev-only handle so browser automation can teleport & inspect state
    const w = window as unknown as Record<string, unknown>;
    w.__3am = { playerPosition, store: useThreeAm };
    return () => {
      delete w.__3am;
    };
  }, []);

  useFrame((_, rawDt) => {
    if (useThreeAm.getState().focus) return; // station focused: player frozen
    const dt = Math.min(rawDt, 0.05); // clamp tab-switch spikes
    const s = useThreeAm.getState();
    const area = HOUSE.areas[s.area];

    const move = keyboard.getMove();
    if (move.x !== 0 || move.z !== 0) {
      const next = resolveMovement(area, playerPosition, {
        x: move.x * SPEED * dt,
        z: move.z * SPEED * dt,
      });
      playerPosition.x = next.x;
      playerPosition.z = next.z;
    }

    // discrete facts → store (only on change; avoids render churn)
    const room = roomAt(area, playerPosition.x, playerPosition.z);
    if (room !== s.room) s.setRoom(room);
    const portal = portalAt(
      HOUSE.portals,
      s.area,
      playerPosition.x,
      playerPosition.z
    );
    if (portal?.id !== s.activePortal?.id) s.setActivePortal(portal);

    const station = stationAt(s.area, playerPosition.x, playerPosition.z);
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
