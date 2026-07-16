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
  const wallWN = usePixelTexture("/3am/tex/wall-teal.png", 2.2, 1); // west divider, north of door
  const wallWS = usePixelTexture("/3am/tex/wall-teal.png", 2.2, 1); // west divider, south of door
  // south stub (dollhouse cutaway): sample only the teal band of the texture
  const wallS = usePixelTexture("/3am/tex/wall-teal.png", R.w, 0.2, 0, 0.5);
  const rugTex = usePixelTexture("/3am/tex/rug-kilim.png", 1, 1);
  const neonTex = usePixelTexture("/3am/tex/neon-3am.png", 1, 1);
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
          <meshStandardMaterial color="#ff7a4d" emissive="#ff6a45" emissiveIntensity={3.5} />
        </mesh>
      </group>
      <spotLight
        position={[19.68, 0.9, 0.76]}
        target={sunsetTarget}
        angle={0.58}
        penumbra={0.65}
        intensity={16}
        distance={5.5}
        decay={1.4}
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

      {/* west divider wall, nook-facing side — teal over the gray-box purple
          (two segments flanking the doorway; workspace side stays gray until Plan 3) */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[R.x + 0.105, WALL_H / 2, 1.1]}>
        <planeGeometry args={[2.2, WALL_H]} />
        <meshStandardMaterial map={wallWN} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[R.x + 0.105, WALL_H / 2, 4.9]}>
        <planeGeometry args={[2.2, WALL_H]} />
        <meshStandardMaterial map={wallWS} />
      </mesh>
      <mesh position={[R.x + 0.145, 0.09, 1.1]}>
        <boxGeometry args={[0.07, 0.18, 2.2]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>
      <mesh position={[R.x + 0.145, 0.09, 4.9]}>
        <boxGeometry args={[0.07, 0.18, 2.2]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>

      {/* south stub wall, nook-facing side — teal band so the cutaway edge
          matches the room instead of gray-box purple */}
      <mesh rotation={[0, Math.PI, 0]} position={[R.x + R.w / 2, 0.275, R.z + R.d - 0.015]}>
        <planeGeometry args={[R.w, 0.55]} />
        <meshStandardMaterial map={wallS} />
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
      <mesh rotation={[0, Math.PI / 2, 0]} position={[16.125, 1.35, 4.9]}>
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

      {/* listening shelf on the west wall (left of the snake plant):
          headphones, books, a cassette, and its own mini lamp — the room's
          fifth visible light source (no collider — wall-mounted overhead) */}
      <group position={[16.19, 1.45, 1.05]}>
        {/* plank + brackets */}
        <mesh>
          <boxGeometry args={[0.18, 0.035, 0.75]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        <mesh position={[-0.04, -0.06, -0.22]}>
          <boxGeometry args={[0.1, 0.09, 0.03]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        <mesh position={[-0.04, -0.06, 0.22]}>
          <boxGeometry args={[0.1, 0.09, 0.03]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        {/* mini shelf lamp */}
        <mesh position={[0, 0.04, -0.28]}>
          <cylinderGeometry args={[0.045, 0.05, 0.025, 8]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[0, 0.11, -0.28]}>
          <cylinderGeometry args={[0.01, 0.01, 0.12, 6]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[0, 0.19, -0.28]}>
          <coneGeometry args={[0.055, 0.08, 8, 1, true]} />
          <meshStandardMaterial color="#ffc87a" emissive="#ffc87a" emissiveIntensity={0.9} side={2} />
        </mesh>
        {/* headphones resting mid-shelf */}
        <group position={[0, 0.065, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh>
            <torusGeometry args={[0.085, 0.014, 6, 12, Math.PI]} />
            <meshStandardMaterial color="#22222c" />
          </mesh>
          <mesh position={[-0.085, -0.03, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.035, 8]} />
            <meshStandardMaterial color="#b3475f" />
          </mesh>
          <mesh position={[0.085, -0.03, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.035, 8]} />
            <meshStandardMaterial color="#b3475f" />
          </mesh>
        </group>
        {/* leaning books + cassette */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.1, 0.22 + i * 0.035]} rotation={[-0.12 + i * 0.05, 0, 0]}>
            <boxGeometry args={[0.13, 0.17, 0.025]} />
            <meshStandardMaterial color={["#5b4b8a", "#2e6e54", "#c98a2e"][i]} />
          </mesh>
        ))}
        <mesh position={[0, 0.032, 0.33]} rotation={[0, 0.3, 0]}>
          <boxGeometry args={[0.075, 0.025, 0.05]} />
          <meshStandardMaterial color="#57b6e8" />
        </mesh>
      </group>
      <pointLight position={[16.32, 1.66, 0.77]} color="#ffc87a" intensity={2} distance={2.2} decay={2} />

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

      {/* neon "3AM" sign on the east wall — the guitar corner's light and
          the house's name in coral neon */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[21.96, 1.95, 4.85]}>
        <planeGeometry args={[1.0, 0.4]} />
        <meshBasicMaterial map={neonTex} transparent />
      </mesh>
      <pointLight position={[21.6, 1.85, 4.9]} color="#ff7a5c" intensity={3} distance={3} decay={2} />

      {/* the guitar corner (SE): cutaway acoustic + seafoam electric on
          A-frame stands — collider {20.9,4.85,0.6,0.6} */}
      <group position={[21.35, 0, 5.28]} rotation={[0, -0.65, 0]}>
        {/* A-frame stand */}
        <mesh position={[-0.1, 0.22, 0.06]} rotation={[0.25, 0, 0.28]}>
          <cylinderGeometry args={[0.012, 0.012, 0.5, 5]} />
          <meshStandardMaterial color="#22222c" />
        </mesh>
        <mesh position={[0.1, 0.22, 0.06]} rotation={[0.25, 0, -0.28]}>
          <cylinderGeometry args={[0.012, 0.012, 0.5, 5]} />
          <meshStandardMaterial color="#22222c" />
        </mesh>
        {/* body — leaned back on the stand; upper bout offset = the cutaway */}
        <group rotation={[-0.18, 0, 0]}>
          <mesh position={[0, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.09, 14]} />
            <meshStandardMaterial color="#a06b42" />
          </mesh>
          {/* cutaway: upper bout shifted off the treble side, leaving the scoop */}
          <mesh position={[-0.055, 0.485, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.125, 0.125, 0.09, 12]} />
            <meshStandardMaterial color="#a06b42" />
          </mesh>
          {/* sound hole */}
          <mesh position={[0, 0.33, 0.047]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.01, 10]} />
            <meshStandardMaterial color="#2b1d12" />
          </mesh>
          {/* bridge */}
          <mesh position={[0, 0.17, 0.05]}>
            <boxGeometry args={[0.12, 0.025, 0.012]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
          {/* neck + fretboard */}
          <mesh position={[0, 0.82, 0.03]}>
            <boxGeometry args={[0.05, 0.5, 0.03]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
          {/* headstock + tuners */}
          <mesh position={[0, 1.11, 0.03]}>
            <boxGeometry args={[0.07, 0.12, 0.035]} />
            <meshStandardMaterial color="#6b4128" />
          </mesh>
          {[-1, 1].map((s) =>
            [0, 1, 2].map((i) => (
              <mesh key={`${s}-${i}`} position={[s * 0.045, 1.075 + i * 0.032, 0.03]}>
                <boxGeometry args={[0.018, 0.014, 0.014]} />
                <meshStandardMaterial color="#c9b088" />
              </mesh>
            ))
          )}
          {/* strings — one bright strip reads as all six at pixel scale */}
          <mesh position={[0, 0.62, 0.052]}>
            <boxGeometry args={[0.028, 0.92, 0.004]} />
            <meshStandardMaterial color="#f2ecd8" emissive="#f2ecd8" emissiveIntensity={0.12} />
          </mesh>
        </group>
      </group>

      {/* seafoam electric — offset solid body, cream pickguard */}
      <group position={[21.0, 0, 4.98]} rotation={[0, -0.35, 0]}>
        <mesh position={[-0.09, 0.2, 0.05]} rotation={[0.25, 0, 0.26]}>
          <cylinderGeometry args={[0.011, 0.011, 0.44, 5]} />
          <meshStandardMaterial color="#22222c" />
        </mesh>
        <mesh position={[0.09, 0.2, 0.05]} rotation={[0.25, 0, -0.26]}>
          <cylinderGeometry args={[0.011, 0.011, 0.44, 5]} />
          <meshStandardMaterial color="#22222c" />
        </mesh>
        <group rotation={[-0.16, 0, 0]}>
          {/* offset body: two overlapping flattened cylinders */}
          <mesh position={[0.02, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.155, 0.155, 0.06, 12]} />
            <meshStandardMaterial color="#4f8a80" />
          </mesh>
          <mesh position={[-0.05, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.115, 0.115, 0.06, 10]} />
            <meshStandardMaterial color="#4f8a80" />
          </mesh>
          {/* cream pickguard */}
          <mesh position={[0.045, 0.24, 0.033]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.012, 8]} />
            <meshStandardMaterial color="#f2ecd8" />
          </mesh>
          {/* pickups + knobs */}
          <mesh position={[0, 0.3, 0.04]}>
            <boxGeometry args={[0.09, 0.025, 0.012]} />
            <meshStandardMaterial color="#22222c" />
          </mesh>
          <mesh position={[0.01, 0.2, 0.04]}>
            <boxGeometry args={[0.09, 0.025, 0.012]} />
            <meshStandardMaterial color="#22222c" />
          </mesh>
          <mesh position={[0.11, 0.15, 0.04]}>
            <cylinderGeometry args={[0.014, 0.014, 0.02, 6]} />
            <meshStandardMaterial color="#c9b088" />
          </mesh>
          {/* slim neck */}
          <mesh position={[-0.02, 0.72, 0.02]}>
            <boxGeometry args={[0.04, 0.55, 0.025]} />
            <meshStandardMaterial color="#6b4128" />
          </mesh>
          {/* 6-inline headstock */}
          <mesh position={[-0.045, 1.04, 0.02]}>
            <boxGeometry args={[0.075, 0.11, 0.03]} />
            <meshStandardMaterial color="#4f8a80" />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} position={[-0.085, 0.995 + i * 0.018, 0.02]}>
              <boxGeometry args={[0.016, 0.012, 0.012]} />
              <meshStandardMaterial color="#c9b088" />
            </mesh>
          ))}
          {/* strings */}
          <mesh position={[-0.01, 0.58, 0.042]}>
            <boxGeometry args={[0.024, 0.82, 0.004]} />
            <meshStandardMaterial color="#f2ecd8" emissive="#f2ecd8" emissiveIntensity={0.12} />
          </mesh>
        </group>
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
