"use client";

import { usePixelTexture } from "../usePixelTexture";
import { MUSIC_ROOM as R } from "./musicNook.constants";
import { Turntable } from "./Turntable";

const WALL_H = 2.5;

/**
 * The music nook — the house's first fully art-passed room and the style
 * gate for the whole project. Renders INSIDE the gray-box shell: textured
 * surfaces sit a few cm off House geometry; colliders live in layout.ts.
 */
export function MusicNook() {
  const floor = usePixelTexture("/3am/tex/floor-planks.png", R.w, R.d); // 1 tile = 1m
  const wallN = usePixelTexture("/3am/tex/plaster.png", R.w, WALL_H);
  const wallE = usePixelTexture("/3am/tex/plaster.png", R.d, WALL_H);
  const cabinetTex = usePixelTexture("/3am/tex/cabinet-wood.png", 3, 1);
  const rugTex = usePixelTexture("/3am/tex/rug.png", 1, 1);

  return (
    <group>
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

      {/* cabinet under the turntable — collider {17.2,0.3,3.0,1.0} */}
      <mesh position={[18.7, 0.45, 0.8]}>
        <boxGeometry args={[3.0, 0.9, 1.0]} />
        <meshStandardMaterial map={cabinetTex} />
      </mesh>
      <Turntable />

      {/* record crate — collider {20.6,0.4,0.8,0.8} */}
      <group position={[21.0, 0, 0.8]}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.8, 0.5, 0.8]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[-0.24 + i * 0.16, 0.52, 0]} rotation={[0, 0, -0.12 + i * 0.06]}>
            <boxGeometry args={[0.03, 0.42, 0.62]} />
            <meshStandardMaterial color={["#5b4b8a", "#b3475f", "#2e6e54", "#c9b088"][i]} />
          </mesh>
        ))}
      </group>

      {/* rug (visual only, walkable) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[19.3, 0.035, 3.2]}>
        <planeGeometry args={[3.4, 2.4]} />
        <meshStandardMaterial map={rugTex} transparent />
      </mesh>

      {/* beanbag — collider {20.8,3.4,0.9,0.9} */}
      <mesh position={[21.25, 0.28, 3.85]} scale={[1, 0.62, 1]}>
        <sphereGeometry args={[0.5, 12, 8]} />
        <meshStandardMaterial color="#b3475f" />
      </mesh>

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

      {/* monstera — collider {21.1,5.0,0.45,0.45} */}
      <group position={[21.325, 0, 5.225]}>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.16, 0.12, 0.32, 8]} />
          <meshStandardMaterial color="#a04b3a" />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[Math.sin(i * 1.25) * 0.14, 0.5 + (i % 3) * 0.16, Math.cos(i * 1.25) * 0.14]}
            rotation={[0.4, i * 1.25, 0]}
          >
            <coneGeometry args={[0.13, 0.34, 5]} />
            <meshStandardMaterial color={i % 2 ? "#3f8f5a" : "#2e6e54"} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
