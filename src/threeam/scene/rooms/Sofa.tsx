"use client";

/**
 * Two-seat sofa in the nook's SW corner, angled toward the turntable (NE)
 * with the front partially visible to the camera. A throw blanket hangs
 * over the left armrest; cushions sit slightly uneven — lived-in, not staged.
 * World AABB collider: {16.4, 4.0, 1.8, 1.7}.
 */
export function Sofa() {
  return (
    <group position={[17.35, 0, 4.85]} rotation={[0, 2.25, 0]}>
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
      {/* seat cushions, slightly uneven */}
      <mesh position={[-0.4, 0.39, 0.05]} rotation={[0, 0.03, 0]}>
        <boxGeometry args={[0.76, 0.12, 0.6]} />
        <meshStandardMaterial color="#5a5687" />
      </mesh>
      <mesh position={[0.4, 0.38, 0.03]} rotation={[0, -0.02, 0]}>
        <boxGeometry args={[0.76, 0.12, 0.6]} />
        <meshStandardMaterial color="#565283" />
      </mesh>
      {/* back cushions */}
      <mesh position={[-0.42, 0.62, -0.22]} rotation={[-0.18, 0, 0.02]}>
        <boxGeometry args={[0.7, 0.34, 0.14]} />
        <meshStandardMaterial color="#5a5687" />
      </mesh>
      <mesh position={[0.42, 0.6, -0.23]} rotation={[-0.15, 0, -0.03]}>
        <boxGeometry args={[0.7, 0.34, 0.14]} />
        <meshStandardMaterial color="#565283" />
      </mesh>
      {/* throw blanket over the left armrest */}
      <mesh position={[-0.89, 0.56, 0.05]} rotation={[0, 0, 0.06]}>
        <boxGeometry args={[0.26, 0.05, 0.66]} />
        <meshStandardMaterial color="#c98a2e" />
      </mesh>
      <mesh position={[-1.0, 0.36, 0.05]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[0.05, 0.38, 0.6]} />
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
