"use client";

import { usePixelTexture } from "../usePixelTexture";
import { AlbumWall } from "./AlbumWall";
import { MUSIC_ROOM as R } from "./musicNook.constants";
import { RecordConsole } from "./RecordConsole";
import { Sofa } from "./Sofa";
import { Turntable } from "./Turntable";

const WALL_H = 2.8; // must match House.tsx's shell wall height

/* Interior locked by Rohan (2026-07 style gate): teal + wainscot walls,
   dark walnut floor, kilim rug. Alternatives are regenerable via
   `node scripts/pixelart/gen-variants.mjs` if the room is redecorated. */

/**
 * The music nook — the house's first fully art-passed room and the style
 * gate for the whole project. Renders INSIDE the gray-box shell: textured
 * surfaces sit a few cm off House geometry; colliders live in layout.ts.
 */
export function MusicNook() {
  const floor = usePixelTexture("/3am/tex/floor-walnut.png", R.w, R.d); // 1 tile = 1m
  const wallN = usePixelTexture("/3am/tex/wall-teal.png", R.w, 1); // wainscot baked in
  const wallE = usePixelTexture("/3am/tex/wall-teal.png", R.d, 1);
  const rugTex = usePixelTexture("/3am/tex/rug-kilim.png", 1, 1);
  const posterGig = usePixelTexture("/3am/tex/poster-gig.png", 1, 1);
  const posterWave = usePixelTexture("/3am/tex/poster-wave.png", 1, 1);
  const posterMoons = usePixelTexture("/3am/tex/poster-moons.png", 1, 1);

  return (
    <group>
      {/* floor lamp glow (right of the console) */}
      <pointLight position={[20.85, 1.75, 0.65]} color="#ffb35c" intensity={9} distance={7} decay={1.8} />
      {/* small warm fill over the console/turntable */}
      <pointLight position={[19, 1.6, 1.1]} color="#ffd9a0" intensity={3.5} distance={4.5} decay={2} />
      {/* (rug bounce light removed — the coffee-table lamp lights the seating
          corner now, and the invisible source made the player glow) */}
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

      {/* rug (visual only, walkable) — centered on the sofa/console axis */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[19, 0.035, 3.2]}>
        <planeGeometry args={[3.4, 2.4]} />
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

      {/* coffee table at the sofa's left, with table lamp + the 3am mug —
          collider {17.15,4.9,0.6,0.6} */}
      <group position={[17.45, 0, 5.2]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.04, 12]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.48, 6]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.18, 0.2, 0.04, 8]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        {/* table lamp */}
        <mesh position={[-0.08, 0.54, -0.04]}>
          <cylinderGeometry args={[0.07, 0.08, 0.03, 8]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[-0.08, 0.65, -0.04]}>
          <cylinderGeometry args={[0.015, 0.015, 0.2, 6]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[-0.08, 0.78, -0.04]}>
          <cylinderGeometry args={[0.07, 0.1, 0.13, 8, 1, true]} />
          <meshStandardMaterial color="#ffb35c" emissive="#ffb35c" emissiveIntensity={0.85} side={2} />
        </mesh>
        <pointLight position={[-0.08, 0.85, -0.04]} color="#ffb35c" intensity={2.2} distance={2.6} decay={2} />
        {/* the 3am coffee mug */}
        <mesh position={[0.13, 0.57, 0.08]}>
          <cylinderGeometry args={[0.045, 0.04, 0.1, 8]} />
          <meshStandardMaterial color="#f2ecd8" />
        </mesh>
        <mesh position={[0.195, 0.575, 0.08]}>
          <boxGeometry args={[0.03, 0.05, 0.02]} />
          <meshStandardMaterial color="#f2ecd8" />
        </mesh>
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

      {/* floor lamp, right of the console — collider {20.675,0.475,0.35,0.35} */}
      <group position={[20.85, 0, 0.65]}>
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
