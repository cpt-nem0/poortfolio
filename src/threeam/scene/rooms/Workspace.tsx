"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { usePixelTexture } from "../usePixelTexture";

const WALL_H = 2.8; // must match House.tsx
export const WORKSPACE = { x: 8, z: 0, w: 8, d: 6 };

/* style-test toggles (1 walls / 2 floors) — removed once Rohan picks */
const WALL_VARIANTS = [
  { label: "cream plaster", path: "/3am/tex/plaster.png", ry: WALL_H },
  { label: "teal + wainscot", path: "/3am/tex/wall-teal.png", ry: 1 },
  { label: "dusty plum", path: "/3am/tex/wall-plum.png", ry: WALL_H },
  { label: "vintage stripes", path: "/3am/tex/wall-stripes.png", ry: WALL_H },
];
const FLOOR_VARIANTS = [
  { label: "honey planks", path: "/3am/tex/floor-planks.png", rx: WORKSPACE.w, ry: WORKSPACE.d },
  { label: "dark walnut", path: "/3am/tex/floor-walnut.png", rx: WORKSPACE.w, ry: WORKSPACE.d },
  { label: "herringbone", path: "/3am/tex/floor-herringbone.png", rx: WORKSPACE.w / 2, ry: WORKSPACE.d / 2 },
  { label: "gray-washed", path: "/3am/tex/floor-graywash.png", rx: WORKSPACE.w, ry: WORKSPACE.d },
];

export function Workspace() {
  const R = WORKSPACE;
  const rootRef = useRef<THREE.Group>(null);
  const [wallIdx, setWallIdx] = useState(0);
  const [floorIdx, setFloorIdx] = useState(0);
  const wallV = WALL_VARIANTS[wallIdx];
  const floorV = FLOOR_VARIANTS[floorIdx];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Digit1") setWallIdx((i) => (i + 1) % WALL_VARIANTS.length);
      if (e.code === "Digit2") setFloorIdx((i) => (i + 1) % FLOOR_VARIANTS.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    rootRef.current?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, []);

  const floor = usePixelTexture(floorV.path, floorV.rx, floorV.ry);
  const wallN = usePixelTexture(wallV.path, R.w, wallV.ry);
  const wallSegW = usePixelTexture(wallV.path, 2.2, wallV.ry === 1 ? 1 : WALL_H);
  const wallSegE = usePixelTexture(wallV.path, 2.2, wallV.ry === 1 ? 1 : WALL_H);
  const wallStub = usePixelTexture(wallV.path, R.w, 0.2, 0, 0.5);

  const segs: Array<{ x: number; rotY: number }> = [
    { x: R.x + 0.11, rotY: Math.PI / 2 }, // west divider, workspace face
    { x: R.x + R.w - 0.11, rotY: -Math.PI / 2 }, // east divider, workspace face
  ];

  return (
    <group ref={rootRef}>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[R.x + R.w / 2, 0.02, R.z + R.d / 2]}>
        <planeGeometry args={[R.w, R.d]} />
        <meshStandardMaterial map={floor} />
      </mesh>
      {/* north wall */}
      <mesh position={[R.x + R.w / 2, WALL_H / 2, R.z + 0.01]}>
        <planeGeometry args={[R.w, WALL_H]} />
        <meshStandardMaterial map={wallN} />
      </mesh>
      {/* divider faces, two segments each (flanking the doors) */}
      {segs.map((seg, i) => (
        <group key={i}>
          <mesh rotation={[0, seg.rotY, 0]} position={[seg.x, WALL_H / 2, 1.1]}>
            <planeGeometry args={[2.2, WALL_H]} />
            <meshStandardMaterial map={i === 0 ? wallSegW : wallSegE} />
          </mesh>
          <mesh rotation={[0, seg.rotY, 0]} position={[seg.x, WALL_H / 2, 4.9]}>
            <planeGeometry args={[2.2, WALL_H]} />
            <meshStandardMaterial map={i === 0 ? wallSegW : wallSegE} />
          </mesh>
        </group>
      ))}
      {/* south stub band */}
      <mesh rotation={[0, Math.PI, 0]} position={[R.x + R.w / 2, 0.275, R.z + R.d - 0.015]}>
        <planeGeometry args={[R.w, 0.55]} />
        <meshStandardMaterial map={wallStub} />
      </mesh>
      {/* baseboards (north + both divider faces) */}
      <mesh position={[R.x + R.w / 2, 0.09, R.z + 0.045]}>
        <boxGeometry args={[R.w, 0.18, 0.07]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>
      {[R.x + 0.145, R.x + R.w - 0.145].map((bx) => (
        <group key={bx}>
          <mesh position={[bx, 0.09, 1.1]}>
            <boxGeometry args={[0.07, 0.18, 2.2]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
          <mesh position={[bx, 0.09, 4.9]}>
            <boxGeometry args={[0.07, 0.18, 2.2]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
