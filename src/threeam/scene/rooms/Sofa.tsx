"use client";

/**
 * Two-seat sofa in the audiophile sweet spot: dead-center on the console's
 * axis (x=19), backed against the south edge, facing the speakers straight
 * on. A throw blanket hangs over one armrest; cushions sit slightly uneven.
 * World AABB collider: {18.1, 4.8, 1.8, 0.8}.
 */
export function Sofa() {
  return (
    <group position={[19, 0, 5.2]} rotation={[0, Math.PI, 0]}>
      {/* base */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[1.8, 0.28, 0.8]} />
        <meshStandardMaterial color="#4d4a75" />
      </mesh>
      {/* backrest */}
      <mesh position={[0, 0.55, -0.31]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[1.8, 0.5, 0.18]} />
        <meshStandardMaterial color="#454269" />
      </mesh>
      {/* armrests */}
      <mesh position={[-0.89, 0.42, 0]}>
        <boxGeometry args={[0.2, 0.42, 0.8]} />
        <meshStandardMaterial color="#454269" />
      </mesh>
      <mesh position={[0.89, 0.42, 0]}>
        <boxGeometry args={[0.2, 0.42, 0.8]} />
        <meshStandardMaterial color="#454269" />
      </mesh>
      {/* seat cushions — mirrored, just a whisper of unevenness */}
      <mesh position={[-0.4, 0.39, 0.04]} rotation={[0, 0.015, 0]}>
        <boxGeometry args={[0.76, 0.12, 0.6]} />
        <meshStandardMaterial color="#5a5687" />
      </mesh>
      <mesh position={[0.4, 0.39, 0.04]} rotation={[0, -0.015, 0]}>
        <boxGeometry args={[0.76, 0.12, 0.6]} />
        <meshStandardMaterial color="#585486" />
      </mesh>
      {/* back cushions — mirrored */}
      <mesh position={[-0.42, 0.61, -0.22]} rotation={[-0.16, 0, 0.015]}>
        <boxGeometry args={[0.7, 0.34, 0.14]} />
        <meshStandardMaterial color="#5a5687" />
      </mesh>
      <mesh position={[0.42, 0.61, -0.22]} rotation={[-0.16, 0, -0.015]}>
        <boxGeometry args={[0.7, 0.34, 0.14]} />
        <meshStandardMaterial color="#585486" />
      </mesh>
      {/* brick-red throw cascading over the sofa's right end (reference:
          over the backrest top, down its face, across the seat, over the
          front edge, and covering the armrest with an outer hang) */}
      {/* over the backrest top + short hang behind */}
      <mesh position={[-0.6, 0.79, -0.33]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[0.42, 0.045, 0.28]} />
        <meshStandardMaterial color="#b3475f" />
      </mesh>
      <mesh position={[-0.6, 0.66, -0.46]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[0.42, 0.28, 0.035]} />
        <meshStandardMaterial color="#a8415a" />
      </mesh>
      {/* down the backrest face */}
      <mesh position={[-0.6, 0.6, -0.18]} rotation={[-0.62, 0, 0]}>
        <boxGeometry args={[0.42, 0.035, 0.36]} />
        <meshStandardMaterial color="#b3475f" />
      </mesh>
      {/* across the seat */}
      <mesh position={[-0.6, 0.465, 0.1]}>
        <boxGeometry args={[0.42, 0.035, 0.44]} />
        <meshStandardMaterial color="#ad4458" />
      </mesh>
      {/* over the front edge, hanging down */}
      <mesh position={[-0.6, 0.28, 0.415]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.42, 0.34, 0.035]} />
        <meshStandardMaterial color="#b3475f" />
      </mesh>
      {/* tasseled hem at the bottom of the front hang */}
      <mesh position={[-0.6, 0.105, 0.43]}>
        <boxGeometry args={[0.4, 0.05, 0.04]} />
        <meshStandardMaterial color="#8f3049" />
      </mesh>
      {/* over the armrest + outer hang */}
      <mesh position={[-0.89, 0.655, 0.02]}>
        <boxGeometry args={[0.24, 0.035, 0.52]} />
        <meshStandardMaterial color="#b3475f" />
      </mesh>
      <mesh position={[-1.005, 0.5, 0.02]}>
        <boxGeometry args={[0.035, 0.3, 0.46]} />
        <meshStandardMaterial color="#a8415a" />
      </mesh>
      {/* short wooden feet */}
      {[
        [-0.8, -0.32], [-0.8, 0.32], [0.8, -0.32], [0.8, 0.32],
      ].map(([fx, fz], i) => (
        <mesh key={i} position={[fx, 0.04, fz]}>
          <cylinderGeometry args={[0.03, 0.025, 0.08, 6]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
      ))}
    </group>
  );
}
