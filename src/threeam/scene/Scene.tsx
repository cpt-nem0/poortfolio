"use client";

import { Canvas } from "@react-three/fiber";

/** The 3D world. Extended by House/Player/FollowCamera/Effects tasks. */
export default function Scene() {
  return (
    <Canvas
      camera={{ fov: 35, position: [11, 9, 11] }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#0a0916"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 10, 4]} intensity={1.2} />
      {/* placeholder cube proves the canvas renders; removed in Task 7 */}
      <mesh position={[11, 0.5, 3]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffb35c" />
      </mesh>
    </Canvas>
  );
}
