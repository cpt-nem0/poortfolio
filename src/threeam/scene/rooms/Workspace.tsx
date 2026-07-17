"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { usePixelTexture } from "../usePixelTexture";
import { useThreeAm } from "@/threeam/state/store";
import { site } from "@/content/site";

const WALL_H = 2.8; // must match House.tsx
export const WORKSPACE = { x: 8, z: 0, w: 8, d: 6 };

/* style-test toggles (1 walls / 2 floors) — removed once Rohan picks */
const WALL_VARIANTS = [
  { label: "cream plaster", path: "/3am/tex/plaster.png", ry: WALL_H },
  { label: "teal + wainscot", path: "/3am/tex/wall-teal.png", ry: 1 },
  { label: "dusty plum", path: "/3am/tex/wall-plum.png", ry: WALL_H },
  { label: "vintage stripes", path: "/3am/tex/wall-stripes.png", ry: WALL_H },
];
/* corkboard pin positions (board-local), one per site.experience entry.
   The red string is DERIVED from these so its endpoints land exactly on
   the pin centers — never hand-tune the string separately. */
const PINS = site.experience.map((_, i) => ({
  x: -0.45 + i * 0.9,
  y: 0.3 - (i % 2) * 0.35,
}));
const PIN_R = 0.02;
const PIN_Z = 0.045; // note group z (0.035) + pin-local z (0.01)
const PIN_A = PINS[0];
const PIN_B = PINS[PINS.length - 1];
const STRING = {
  x: (PIN_A.x + PIN_B.x) / 2,
  y: (PIN_A.y + PIN_B.y) / 2,
  z: PIN_Z + PIN_R + 0.004, // just proud of the pin heads (4mm convention)
  len: Math.hypot(PIN_B.x - PIN_A.x, PIN_B.y - PIN_A.y),
  rot: Math.atan2(PIN_B.y - PIN_A.y, PIN_B.x - PIN_A.x),
};

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
  const termTex = usePixelTexture("/3am/tex/terminal.png", 1, 1);
  const corkTex = usePixelTexture("/3am/tex/cork.png", 1, 1);

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

      {/* ── desk — collider {9.7,0.3,2.6,0.9} (Task 7 shrank this from 3.0 wide;
          desktop + everything on it scaled in on x by 13/15 to stay on the new top) ── */}
      <group position={[11, 0, 0.75]}>
        <mesh position={[0, 0.72, 0]}>
          <boxGeometry args={[2.6, 0.06, 0.9]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {[
          [-1.231, -0.38], [-1.231, 0.38], [1.231, -0.38], [1.231, 0.38],
        ].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.36, lz]}>
            <boxGeometry args={[0.08, 0.72, 0.08]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
        ))}
        {/* main monitor with glowing terminal */}
        <group position={[-0.303, 0.75, -0.15]} rotation={[0, 0.08, 0]}>
          <mesh position={[0, 0.34, 0]}>
            <boxGeometry args={[0.78, 0.5, 0.05]} />
            <meshStandardMaterial color="#22222c" />
          </mesh>
          <mesh position={[0, 0.34, 0.028]}>
            <planeGeometry args={[0.7, 0.42]} />
            <meshBasicMaterial map={termTex} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.1, 0.12, 0.08]} />
            <meshStandardMaterial color="#22222c" />
          </mesh>
        </group>
        {/* second monitor, vertical, slightly angled */}
        <group position={[0.477, 0.75, -0.12]} rotation={[0, -0.18, 0]}>
          <mesh position={[0, 0.36, 0]}>
            <boxGeometry args={[0.42, 0.56, 0.05]} />
            <meshStandardMaterial color="#22222c" />
          </mesh>
          <mesh position={[0, 0.36, 0.028]} rotation={[0, 0, Math.PI / 2]}>
            <planeGeometry args={[0.48, 0.34]} />
            <meshBasicMaterial map={termTex} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.09, 0.1, 0.08]} />
            <meshStandardMaterial color="#22222c" />
          </mesh>
        </group>
        {/* screen glow — attached to the visible screens */}
        <pointLight position={[0, 1.15, 0.2]} color="#7cffb2" intensity={1.6} distance={2.2} decay={2} />
        {/* keyboard, mouse, mug, paper mess */}
        <mesh position={[-0.26, 0.77, 0.22]}>
          <boxGeometry args={[0.55, 0.03, 0.18]} />
          <meshStandardMaterial color="#3a3244" />
        </mesh>
        <mesh position={[0.104, 0.765, 0.24]}>
          <boxGeometry args={[0.09, 0.025, 0.13]} />
          <meshStandardMaterial color="#3a3244" />
        </mesh>
        <mesh position={[0.91, 0.81, 0.15]}>
          <cylinderGeometry args={[0.05, 0.045, 0.12, 8]} />
          <meshStandardMaterial color="#b3475f" />
        </mesh>
        <mesh position={[-0.91, 0.755, 0.2]} rotation={[0, 0.35, 0]}>
          <boxGeometry args={[0.3, 0.01, 0.22]} />
          <meshStandardMaterial color="#e8e2d0" />
        </mesh>
        {/* desk lamp (visible fixture, warm) — light is desk-group-local */}
        <group position={[1.083, 0.75, -0.25]}>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 0.04, 8]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, 0.18, 0]} rotation={[0, 0, 0.35]}>
            <cylinderGeometry args={[0.015, 0.015, 0.3, 6]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[-0.09, 0.33, 0]} rotation={[0, 0, 1.1]}>
            <coneGeometry args={[0.06, 0.1, 8, 1, true]} />
            <meshStandardMaterial color="#ffb35c" emissive="#ffb35c" emissiveIntensity={0.9} side={2} />
          </mesh>
        </group>
        <pointLight castShadow shadow-mapSize={[256, 256]} shadow-bias={-0.004} shadow-radius={5} shadow-intensity={0.4} position={[1.083, 1.15, -0.25]} color="#ffb35c" intensity={3} distance={3} decay={2} />
      </group>

      {/* ── corkboard (experience station) — north wall, right of the desk ── */}
      <group
        position={[13.5, 1.75, 0.045]}
        onClick={(e) => {
          e.stopPropagation();
          useThreeAm.getState().setFocus("experience");
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <mesh>
          <boxGeometry args={[1.7, 1.15, 0.05]} />
          <meshStandardMaterial map={corkTex} />
        </mesh>
        {/* one pinned note per job + red string connecting the pins */}
        {site.experience.map((e2, i) => (
          <group key={e2.company} position={[PINS[i].x, PINS[i].y - 0.15, 0.035]}>
            <mesh rotation={[0, 0, i % 2 ? 0.06 : -0.05]}>
              <planeGeometry args={[0.42, 0.34]} />
              <meshStandardMaterial color="#f2ecd8" />
            </mesh>
            <mesh position={[0, 0.15, 0.01]}>
              <sphereGeometry args={[PIN_R, 6, 5]} />
              <meshStandardMaterial color="#b3475f" />
            </mesh>
            {/* scribble lines (illegible on purpose — the panel has the words) */}
            {[0, 1, 2].map((l) => (
              <mesh key={l} position={[0, 0.05 - l * 0.08, 0.005]}>
                <planeGeometry args={[0.3 - l * 0.06, 0.02]} />
                <meshStandardMaterial color="#7d729e" />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[STRING.x, STRING.y, STRING.z]} rotation={[0, 0, STRING.rot]}>
          <planeGeometry args={[STRING.len, 0.012]} />
          <meshStandardMaterial color="#c9302f" />
        </mesh>
        {/* a couple of extra empty pins for mess */}
        <mesh position={[0.65, 0.42, 0.03]}>
          <sphereGeometry args={[0.018, 6, 5]} />
          <meshStandardMaterial color="#c98a2e" />
        </mesh>
      </group>

      {/* ── desk chair — collider {10.7,1.5,0.8,0.8} ── */}
      <group position={[11.1, 0, 1.9]} rotation={[0, 0.25, 0]}>
        <mesh position={[0, 0.44, 0]}>
          <boxGeometry args={[0.5, 0.07, 0.48]} />
          <meshStandardMaterial color="#22222c" />
        </mesh>
        <mesh position={[0, 0.75, -0.22]} rotation={[-0.1, 0, 0]}>
          <boxGeometry args={[0.48, 0.6, 0.07]} />
          <meshStandardMaterial color="#22222c" />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.44, 6]} />
          <meshStandardMaterial color="#3a3244" />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.sin(a) * 0.2, 0.03, Math.cos(a) * 0.2]} rotation={[0, a, 0]}>
              <boxGeometry args={[0.06, 0.04, 0.24]} />
              <meshStandardMaterial color="#3a3244" />
            </mesh>
          );
        })}
      </group>

      {/* ── shelf unit — collider {8.15,4.3,0.55,1.1} ── */}
      <group position={[8.425, 0, 4.85]}>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[0.55, 1.4, 1.1]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {[0.35, 0.8, 1.25].map((sy, row) => (
          <group key={sy}>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} position={[0.2, sy, -0.4 + i * 0.26]} rotation={[0, 0, -0.04 + (((i + row) % 3) as number) * 0.04]}>
                <boxGeometry args={[0.05, 0.24, 0.2]} />
                <meshStandardMaterial
                  color={["#5b4b8a", "#2e6e54", "#c98a2e", "#b3475f"][(i + row) % 4]}
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* ── floor lamp — collider {8.9,5.3,0.35,0.35} ── */}
      <group position={[9.075, 0, 5.475]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.16, 0.18, 0.04, 10]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.55, 8]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[0, 1.68, 0]}>
          <cylinderGeometry args={[0.14, 0.2, 0.26, 10, 1, true]} />
          <meshStandardMaterial color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={0.9} side={2} />
        </mesh>
      </group>
      <pointLight castShadow shadow-mapSize={[512, 512]} shadow-bias={-0.004} shadow-radius={5} shadow-intensity={0.4} position={[9.075, 1.75, 5.475]} color="#ffd9a0" intensity={9} distance={6.5} decay={1.8} />
    </group>
  );
}
