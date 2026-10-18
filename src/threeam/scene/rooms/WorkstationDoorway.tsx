"use client";

import { WS_DOOR_LO, WS_DOOR_HI, WORKSTATION_ROOM } from "@/threeam/world/layout";
import { usePixelTexture } from "../usePixelTexture";

export const WORKSTATION_DOOR_HEIGHT = 2.3;

/** Common-side entrance. Casing sits proud of the wall; the reveal runs
 * through its thickness. All timber stays outside the walkable gap. */
export function WorkstationDoorway() {
  const spill = usePixelTexture("/3am/tex/floor-spill.png");
  const cx = (WS_DOOR_LO + WS_DOOR_HI) / 2;
  const width = WS_DOOR_HI - WS_DOOR_LO;
  const back = WORKSTATION_ROOM.z + WORKSTATION_ROOM.d;
  const recess = 0.65;
  const floor = usePixelTexture("/3am/tex/floor-walnut.png", width, recess);
  const front = 0.16;
  const depth = front - back;
  const height = WORKSTATION_DOOR_HEIGHT;
  const trim = 0.14;

  return (
    <group name="workstation-doorway">
      {/* Deep jambs and a lower lintel give this a doorway's proportions. */}
      {[WS_DOOR_LO - trim / 2, WS_DOOR_HI + trim / 2].map((x) => (
        <group key={x}>
          <mesh position={[x, height / 2, back + depth / 2]} castShadow receiveShadow>
            <boxGeometry args={[trim, height, depth]} />
            <meshStandardMaterial color="#926c46" roughness={0.85} />
          </mesh>
          <mesh position={[x, height / 2, front + 0.016]} receiveShadow>
            <boxGeometry args={[0.045, height, 0.032]} />
            <meshStandardMaterial color="#ba9464" roughness={0.85} />
          </mesh>
          <mesh position={[x, 0.12, front - 0.01]} receiveShadow>
            <boxGeometry args={[trim + 0.04, 0.24, 0.1]} />
            <meshStandardMaterial color="#785334" roughness={0.9} />
          </mesh>
        </group>
      ))}
      <mesh position={[cx, height + trim / 2, back + depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[width + trim * 2, trim, depth]} />
        <meshStandardMaterial color="#926c46" roughness={0.85} />
      </mesh>
      <mesh position={[cx, height + trim + 0.025, front - 0.015]} castShadow receiveShadow>
        <boxGeometry args={[width + trim * 2 + 0.1, 0.05, 0.13]} />
        <meshStandardMaterial color="#ba9464" roughness={0.85} />
      </mesh>
      {/* Low wooden sill bridges the room floor and the recessed opening. */}
      <mesh position={[cx, 0.034, back + depth / 2]} receiveShadow>
        <boxGeometry args={[width, 0.028, depth + 0.08]} />
        <meshStandardMaterial color="#ad8556" roughness={0.9} />
      </mesh>
      {/* The adjoining room is culled until entry. A recessed warm backing
          supplies depth without mounting its lights or furniture here. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.02, back - recess / 2]} receiveShadow>
        <planeGeometry args={[width, recess]} />
        <meshStandardMaterial map={floor} />
      </mesh>
      {[WS_DOOR_LO - trim / 2, WS_DOOR_HI + trim / 2].map((x) => (
        <mesh key={x} position={[x, height / 2, back - recess / 2]} receiveShadow>
          <boxGeometry args={[trim, height, recess]} />
          <meshStandardMaterial color="#473a2e" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[cx, height / 2, back - recess]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#211a16" />
      </mesh>
      {/* door-glow floor decal REMOVED (Rohan 2026-10-19: "remove this glow from the workstation entrance") */}
      {/* CommonArea's finished floor is y=.02, above the structural slab. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.028, 0.7]}>
        <planeGeometry args={[width + 0.5, 1.3]} />
        <meshBasicMaterial map={spill} transparent depthWrite={false} opacity={0.55} />
      </mesh>
    </group>
  );
}
