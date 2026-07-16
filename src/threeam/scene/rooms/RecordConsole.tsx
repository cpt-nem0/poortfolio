"use client";

import { usePixelTexture } from "../usePixelTexture";

/**
 * Open-frame record console on hairpin legs (styled after Rohan's reference
 * photo): top slab carrying the turntable + two bookshelf speakers, two
 * cubbies below packed with records standing on edge.
 * Centered on the north wall (x=19); footprint matches the layout
 * collider {17.6, 0.3, 2.8, 0.9}.
 */

const SLEEVE_COLORS = [
  "#5b4b8a", "#b3475f", "#2e6e54", "#c9b088", "#57b6e8",
  "#f2ecd8", "#c98a2e", "#453a63", "#a04b3a", "#7cffb2",
];

function RecordRow({ x, count, seed }: { x: number; count: number; seed: number }) {
  // packed tight like a real collection — sleeves nearly touching, the
  // occasional one leaning a couple of degrees
  return (
    <group position={[x, 0.27, 0]}>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          position={[-0.575 + i * (1.15 / count), 0.19, 0.012 * ((i + seed) % 3)]}
          rotation={[0, 0, -0.02 + ((i + seed) % 4) * 0.013]}
        >
          <boxGeometry args={[0.025, 0.37, 0.37]} />
          <meshStandardMaterial color={SLEEVE_COLORS[(i + seed) % SLEEVE_COLORS.length]} />
        </mesh>
      ))}
    </group>
  );
}

function Speaker({ x, led }: { x: number; led?: boolean }) {
  return (
    <group position={[x, 0.765, 0]}>
      {/* dark front cabinet */}
      <mesh position={[0, 0.21, 0]}>
        <boxGeometry args={[0.26, 0.42, 0.26]} />
        <meshStandardMaterial color="#17171f" />
      </mesh>
      {/* wood side cheeks */}
      <mesh position={[-0.14, 0.21, 0]}>
        <boxGeometry args={[0.03, 0.42, 0.26]} />
        <meshStandardMaterial color="#8a5a3b" />
      </mesh>
      <mesh position={[0.14, 0.21, 0]}>
        <boxGeometry args={[0.03, 0.42, 0.26]} />
        <meshStandardMaterial color="#8a5a3b" />
      </mesh>
      {/* grille slit */}
      <mesh position={[0, 0.3, 0.132]}>
        <boxGeometry args={[0.16, 0.012, 0.005]} />
        <meshStandardMaterial color="#8d86a8" />
      </mesh>
      {/* power LED */}
      {led && (
        <mesh position={[0.07, 0.12, 0.132]}>
          <boxGeometry args={[0.015, 0.015, 0.005]} />
          <meshStandardMaterial color="#57b6e8" emissive="#57b6e8" emissiveIntensity={2} />
        </mesh>
      )}
    </group>
  );
}

export function RecordConsole() {
  const wood = usePixelTexture("/3am/tex/cabinet-wood.png", 3, 1);

  return (
    <group position={[19, 0, 0.75]}>
      {/* top slab (console top = y 0.74) */}
      <mesh position={[0, 0.715, 0]}>
        <boxGeometry args={[2.8, 0.05, 0.9]} />
        <meshStandardMaterial map={wood} />
      </mesh>
      {/* bottom slab */}
      <mesh position={[0, 0.245, 0]}>
        <boxGeometry args={[2.8, 0.05, 0.9]} />
        <meshStandardMaterial map={wood} />
      </mesh>
      {/* side + middle panels */}
      {[-1.375, 0, 1.375].map((px) => (
        <mesh key={px} position={[px, 0.48, 0]}>
          <boxGeometry args={[0.05, 0.42, 0.9]} />
          <meshStandardMaterial map={wood} />
        </mesh>
      ))}
      {/* records standing on edge in both cubbies, packed full */}
      <RecordRow x={-0.69} count={21} seed={0} />
      <RecordRow x={0.69} count={23} seed={4} />
      {/* hairpin legs */}
      {[
        [-1.3, -0.38], [-1.3, 0.38], [1.3, -0.38], [1.3, 0.38],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.11, lz]} rotation={[0, 0, i % 2 ? 0.1 : -0.1]}>
          <cylinderGeometry args={[0.013, 0.013, 0.22, 6]} />
          <meshStandardMaterial color="#15131a" />
        </mesh>
      ))}
      {/* bookshelf speakers flanking the turntable */}
      <Speaker x={-1.05} />
      <Speaker x={1.05} led />
    </group>
  );
}
