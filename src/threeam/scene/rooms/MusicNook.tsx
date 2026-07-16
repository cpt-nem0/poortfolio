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
      {/* floor lamp glow */}
      <pointLight position={[16.675, 1.75, 0.675]} color="#ffb35c" intensity={9} distance={7} decay={1.8} />
      {/* small warm fill over the console/turntable */}
      <pointLight position={[19, 1.6, 1.1]} color="#ffd9a0" intensity={3.5} distance={4.5} decay={2} />
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

      {/* side table + coffee mug, at the sofa's right hand — collider {19.95,4.95,0.5,0.5} */}
      <group position={[20.2, 0, 5.2]}>
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
