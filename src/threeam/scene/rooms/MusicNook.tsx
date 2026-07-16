"use client";

import { useEffect, useState } from "react";
import { usePixelTexture } from "../usePixelTexture";
import { AlbumWall } from "./AlbumWall";
import { MUSIC_ROOM as R } from "./musicNook.constants";
import { RecordConsole } from "./RecordConsole";
import { Sofa } from "./Sofa";
import { Turntable } from "./Turntable";

const WALL_H = 2.5;

/* ── style-gate tuning toggles (removed once Rohan picks) ──
   1 cycles walls, 2 cycles rugs. repeatY=1 means the texture spans the
   full wall height (wainscot variants bake the lower panel in). */
const WALL_VARIANTS = [
  /* teal locked in by Rohan (2026-07); others kept for comparison until final lock */
  { label: "teal + wainscot", path: "/3am/tex/wall-teal.png", ry: 1 },
  { label: "cream plaster", path: "/3am/tex/plaster.png", ry: WALL_H },
  { label: "dusty plum", path: "/3am/tex/wall-plum.png", ry: WALL_H },
  { label: "vintage stripes", path: "/3am/tex/wall-stripes.png", ry: WALL_H },
];
const RUG_VARIANTS = [
  { label: "persian rust", path: "/3am/tex/rug-persian.png", w: 3.4, d: 2.4 },
  { label: "teal field", path: "/3am/tex/rug-tealfield.png", w: 3.4, d: 2.4 },
  { label: "berber cream", path: "/3am/tex/rug-berber.png", w: 3.4, d: 2.4 },
  { label: "round braided", path: "/3am/tex/rug-round.png", w: 2.6, d: 2.6 },
  { label: "kilim bands", path: "/3am/tex/rug-kilim.png", w: 3.4, d: 2.4 },
  { label: "purple diamond", path: "/3am/tex/rug.png", w: 3.4, d: 2.4 },
];
const FLOOR_VARIANTS = [
  /* rx/ry: 32px tiles repeat once per meter; 64px tiles once per 2m */
  { label: "honey planks", path: "/3am/tex/floor-planks.png", rx: R.w, ry: R.d },
  { label: "dark walnut", path: "/3am/tex/floor-walnut.png", rx: R.w, ry: R.d },
  { label: "herringbone", path: "/3am/tex/floor-herringbone.png", rx: R.w / 2, ry: R.d / 2 },
  { label: "gray-washed", path: "/3am/tex/floor-graywash.png", rx: R.w, ry: R.d },
  { label: "café checker", path: "/3am/tex/floor-checker.png", rx: R.w, ry: R.d },
];

/**
 * The music nook — the house's first fully art-passed room and the style
 * gate for the whole project. Renders INSIDE the gray-box shell: textured
 * surfaces sit a few cm off House geometry; colliders live in layout.ts.
 */
export function MusicNook() {
  const [wallIdx, setWallIdx] = useState(0);
  const [rugIdx, setRugIdx] = useState(0);
  const [floorIdx, setFloorIdx] = useState(0);
  const wallV = WALL_VARIANTS[wallIdx];
  const rugV = RUG_VARIANTS[rugIdx];
  const floorV = FLOOR_VARIANTS[floorIdx];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Digit1") setWallIdx((i) => (i + 1) % WALL_VARIANTS.length);
      if (e.code === "Digit2") setRugIdx((i) => (i + 1) % RUG_VARIANTS.length);
      if (e.code === "Digit3") setFloorIdx((i) => (i + 1) % FLOOR_VARIANTS.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const floor = usePixelTexture(floorV.path, floorV.rx, floorV.ry);
  const wallN = usePixelTexture(wallV.path, R.w, wallV.ry);
  const wallE = usePixelTexture(wallV.path, R.d, wallV.ry);
  const rugTex = usePixelTexture(rugV.path, 1, 1);
  const posterGig = usePixelTexture("/3am/tex/poster-gig.png", 1, 1);
  const posterWave = usePixelTexture("/3am/tex/poster-wave.png", 1, 1);
  const posterMoons = usePixelTexture("/3am/tex/poster-moons.png", 1, 1);

  return (
    <group>
      {/* floor lamp glow */}
      <pointLight position={[16.675, 1.75, 0.675]} color="#ffb35c" intensity={9} distance={7} decay={1.8} />
      {/* small warm fill over the cabinet/turntable */}
      <pointLight position={[18.7, 1.6, 1.1]} color="#ffd9a0" intensity={3.5} distance={4.5} decay={2} />
      {/* soft bounce over the rug/sofa so the listening corner stays alive */}
      <pointLight position={[20.0, 1.3, 3.4]} color="#ff9e63" intensity={2.2} distance={4.5} decay={2} />
      {/* doorway spill: sits IN the door gap so the glow reads as light
          escaping the nook, not a floating source in the workspace
          (style-gate feedback: the far-out version looked like its own lamp) */}
      <pointLight position={[16.0, 1.1, 3.0]} color="#ffb35c" intensity={4} distance={2.8} decay={2} />

      {/* plank floor, 2cm above the gray base floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[R.x + R.w / 2, 0.02, R.z + R.d / 2]}>
        <planeGeometry args={[R.w, R.d]} />
        <meshStandardMaterial map={floor} />
      </mesh>

      {/* north wall plaster (inner face of the perimeter wall at z=0) */}
      <mesh position={[R.x + R.w / 2, WALL_H / 2, R.z + 0.01]}>
        <planeGeometry args={[R.w, WALL_H]} />
        <meshStandardMaterial map={wallN} />
      </mesh>

      {/* east wall plaster (inner face of the perimeter wall at x=22) */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[R.x + R.w - 0.01, WALL_H / 2, R.z + R.d / 2]}>
        <planeGeometry args={[R.d, WALL_H]} />
        <meshStandardMaterial map={wallE} />
      </mesh>

      {/* baseboards */}
      <mesh position={[R.x + R.w / 2, 0.09, R.z + 0.045]}>
        <boxGeometry args={[R.w, 0.18, 0.07]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>
      <mesh position={[R.x + R.w - 0.045, 0.09, R.z + R.d / 2]}>
        <boxGeometry args={[0.07, 0.18, R.d]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>

      {/* record console (turntable + speakers) — collider {17.3,0.3,2.8,0.9} */}
      <RecordConsole />
      <Turntable />
      <AlbumWall />

      {/* rug (visual only, walkable) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[19.3, 0.035, 3.2]}>
        <planeGeometry args={[rugV.w, rugV.d]} />
        <meshStandardMaterial map={rugTex} transparent />
      </mesh>

      {/* posters — long gig poster on the west wall over the sofa, wave +
          moon-phases pair on the previously empty east wall */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[16.11, 1.35, 4.9]}>
        <planeGeometry args={[0.7, 1.9]} />
        <meshStandardMaterial map={posterGig} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[21.98, 1.5, 2.3]}>
        <planeGeometry args={[0.8, 1.12]} />
        <meshStandardMaterial map={posterWave} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[21.98, 1.4, 3.6]}>
        <planeGeometry args={[0.8, 1.12]} />
        <meshStandardMaterial map={posterMoons} />
      </mesh>

      {/* sofa — collider {16.4,4.0,1.8,1.7} */}
      <Sofa />

      {/* side table + coffee mug — collider {18.35,4.95,0.5,0.5} */}
      <group position={[18.6, 0, 5.2]}>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.035, 10]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        <mesh position={[0, 0.21, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 6]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.14, 0.16, 0.035, 8]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        {/* the 3am coffee mug */}
        <mesh position={[0.06, 0.485, 0.03]}>
          <cylinderGeometry args={[0.045, 0.04, 0.1, 8]} />
          <meshStandardMaterial color="#f2ecd8" />
        </mesh>
        <mesh position={[0.125, 0.49, 0.03]}>
          <boxGeometry args={[0.03, 0.05, 0.02]} />
          <meshStandardMaterial color="#f2ecd8" />
        </mesh>
      </group>

      {/* snake plant (right of console) — collider {20.6,0.4,0.5,0.5} */}
      <group position={[20.85, 0, 0.65]}>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.15, 0.11, 0.28, 8]} />
          <meshStandardMaterial color="#a04b3a" />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => {
          const a = (i / 9) * Math.PI * 2;
          const r = 0.03 + (i % 3) * 0.035;
          return (
            <mesh
              key={i}
              position={[Math.sin(a) * r, 0.28 + (0.7 + (i % 4) * 0.14) / 2, Math.cos(a) * r]}
              rotation={[((i % 3) - 1) * 0.08, a, ((i % 2) - 0.5) * 0.1]}
            >
              <boxGeometry args={[0.055, 0.7 + (i % 4) * 0.14, 0.018]} />
              <meshStandardMaterial color={i % 2 ? "#3f8f5a" : "#2e6e54"} />
            </mesh>
          );
        })}
      </group>

      {/* standing carved art totem (SE corner) — collider {21.0,4.9,0.55,0.55} */}
      <group position={[21.275, 0, 5.175]} rotation={[0, -0.5, 0]}>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.42, 0.16, 0.42]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[0.3, 0.95, 0.3]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {/* carved face + geometric inlays (painted cream) */}
        <mesh position={[-0.07, 0.86, 0.152]}>
          <boxGeometry args={[0.07, 0.05, 0.01]} />
          <meshStandardMaterial color="#f2ecd8" />
        </mesh>
        <mesh position={[0.07, 0.86, 0.152]}>
          <boxGeometry args={[0.07, 0.05, 0.01]} />
          <meshStandardMaterial color="#f2ecd8" />
        </mesh>
        <mesh position={[0, 0.68, 0.152]}>
          <boxGeometry args={[0.16, 0.035, 0.01]} />
          <meshStandardMaterial color="#f2ecd8" />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-0.07 + i * 0.07, 0.42, 0.152]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.05, 0.05, 0.008]} />
            <meshStandardMaterial color={i === 1 ? "#b3475f" : "#f2ecd8"} />
          </mesh>
        ))}
        {/* crown */}
        <mesh position={[0, 1.16, 0]}>
          <boxGeometry args={[0.38, 0.12, 0.38]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
      </group>

      {/* floor lamp — collider {16.5,0.5,0.35,0.35}; light source added in Task 11 */}
      <group position={[16.675, 0, 0.675]}>
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
          <meshStandardMaterial color="#ffb35c" emissive="#ffb35c" emissiveIntensity={0.9} side={2} />
        </mesh>
      </group>

    </group>
  );
}
