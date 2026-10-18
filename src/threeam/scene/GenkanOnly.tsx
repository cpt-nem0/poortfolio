"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { GENKAN_ROOM } from "@/threeam/world/layout";
import { playerPosition } from "@/threeam/world/runtime";

/** Children render ONLY while the player stands in the genkan strip.
 *
 *  Why: from the common area the common↔genkan divider is the CAMERA-SIDE
 *  wall (the dollhouse camera trails south of the player), so anything on
 *  or above that wall's genkan face — the divider's upper band, the
 *  north-wall shelf/print/hooks — would float over the knee-wall stub and
 *  sit between the camera and the kotatsu. From inside the genkan the same
 *  wall is the room's face-on north wall and wants all of it.
 *
 *  Single-writer discipline: this only READS `playerPosition` (Player.tsx
 *  writes it) and only writes its own group's `visible`. 0.1m hysteresis
 *  either side of the doorway so it never flickers mid-threshold. Starts
 *  hidden; the first frame settles it. Used by House.tsx's divider upper
 *  band and Genkan.tsx's north-wall dressing so both flip together. */
export function GenkanOnly({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  const inGenkanRef = useRef(false);
  useFrame(() => {
    const z = playerPosition.z;
    if (!inGenkanRef.current && z > GENKAN_ROOM.z + 0.1) inGenkanRef.current = true;
    else if (inGenkanRef.current && z < GENKAN_ROOM.z - 0.1) inGenkanRef.current = false;
    if (ref.current) ref.current.visible = inGenkanRef.current;
  });
  return (
    <group ref={ref} visible={false}>
      {children}
    </group>
  );
}
