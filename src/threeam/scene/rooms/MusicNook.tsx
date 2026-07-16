"use client";

import { useState } from "react";
import * as THREE from "three";
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
  /** aim point for the sunset lamp's projection (center of the album grid) */
  const [sunsetTarget] = useState(() => new THREE.Object3D());
  const floor = usePixelTexture("/3am/tex/floor-walnut.png", R.w, R.d); // 1 tile = 1m
  const wallN = usePixelTexture("/3am/tex/wall-teal.png", R.w, 1); // wainscot baked in
  const wallE = usePixelTexture("/3am/tex/wall-teal.png", R.d, 1);
  const rugTex = usePixelTexture("/3am/tex/rug-kilim.png", 1, 1);
  const posterGig = usePixelTexture("/3am/tex/poster-gig.png", 1, 1);
  const posterWave = usePixelTexture("/3am/tex/poster-wave.png", 1, 1);
  const posterMoons = usePixelTexture("/3am/tex/poster-moons.png", 1, 1);

  return (
    <group>
      {/* The lamp family — every light attached to a VISIBLE fixture (hard
          rule), each with its own shape, size and warmth:
          1. floor lamp, amber (right of console — light below, fixture further down)
          2. coffee-table lamp, soft peach (inside the table group)
          3. wall sconce, golden (east wall, between the posters)
          4. salt rock lamp, pink-orange (on the console's front-left corner) */}
      <pointLight position={[20.85, 1.75, 0.65]} color="#ffb35c" intensity={9} distance={7} decay={1.8} />

      {/* wall sconce — brass half-dome washing the east wall */}
      <group position={[21.94, 2.15, 3.0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, -0.09, -0.02]}>
          <boxGeometry args={[0.1, 0.05, 0.06]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.11, 0.14, 8, 1, true]} />
          <meshStandardMaterial color="#ffcf8f" emissive="#ffcf8f" emissiveIntensity={0.8} side={2} />
        </mesh>
      </group>
      <pointLight position={[21.7, 2.35, 3.0]} color="#ffcf8f" intensity={3.2} distance={3.4} decay={2} />

      {/* sunset lamp on the console — projects its warm circle up across
          the album wall (fixture between the deck and the right speaker) */}
      <group position={[19.68, 0.74, 0.8]}>
        <mesh position={[0, 0.05, 0]}>
          <coneGeometry args={[0.07, 0.1, 8]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[0, 0.13, -0.01]} rotation={[-0.9, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.15, 10]} />
          <meshStandardMaterial color="#3a3244" />
        </mesh>
        {/* glowing lens facing the wall */}
        <mesh position={[0, 0.19, -0.065]} rotation={[-0.9, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.012, 10]} />
          <meshStandardMaterial color="#ff7a4d" emissive="#ff6a45" emissiveIntensity={2.2} />
        </mesh>
      </group>
      <spotLight
        position={[19.68, 0.9, 0.76]}
        target={sunsetTarget}
        angle={0.52}
        penumbra={0.7}
        intensity={9}
        distance={4.5}
        decay={1.6}
        color="#ff6a45"
      />
      <primitive object={sunsetTarget} position={[19, 2.05, 0.05]} />

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
        <pointLight position={[-0.08, 0.85, -0.04]} color="#ffd9a0" intensity={2.2} distance={2.6} decay={2} />
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

      {/* snake plant, back on the console's left flank — collider {16.5,0.5,0.35,0.35} */}
      <group position={[16.675, 0, 0.675]}>
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

      {/* barrel cactus by the doorway — collider {16.2,1.7,0.3,0.3} */}
      <group position={[16.35, 0, 1.85]}>
        <mesh position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.11, 0.09, 0.18, 8]} />
          <meshStandardMaterial color="#a04b3a" />
        </mesh>
        <mesh position={[0, 0.29, 0]} scale={[1, 1.15, 1]}>
          <sphereGeometry args={[0.11, 8, 6]} />
          <meshStandardMaterial color="#3f8f5a" />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <sphereGeometry args={[0.045, 6, 5]} />
          <meshStandardMaterial color="#b3475f" />
        </mesh>
      </group>

      {/* trailing pothos on a wall shelf, east wall by the sconce (no collider — wall-mounted) */}
      <group position={[21.94, 2.05, 4.6]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[0.45, 0.035, 0.16]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        <mesh position={[0, 0.08, -0.02]}>
          <cylinderGeometry args={[0.07, 0.055, 0.12, 7]} />
          <meshStandardMaterial color="#c9b088" />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[-0.18 + i * 0.09, -0.1 - (i % 3) * 0.14, 0.02]}
            rotation={[0.15, 0, ((i % 2) - 0.5) * 0.3]}
          >
            <boxGeometry args={[0.05, 0.22 + (i % 2) * 0.12, 0.02]} />
            <meshStandardMaterial color={i % 2 ? "#3f8f5a" : "#2e6e54"} />
          </mesh>
        ))}
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
