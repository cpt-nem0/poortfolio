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
      {/* throw blanket folded flat over one armrest (kept subtle so the
          arms still read as twins) */}
      <mesh position={[-0.89, 0.545, 0]}>
        <boxGeometry args={[0.24, 0.045, 0.62]} />
        <meshStandardMaterial color="#c98a2e" />
      </mesh>
      <mesh position={[-1.005, 0.42, 0]}>
        <boxGeometry args={[0.035, 0.3, 0.56]} />
        <meshStandardMaterial color="#b87d26" />
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
