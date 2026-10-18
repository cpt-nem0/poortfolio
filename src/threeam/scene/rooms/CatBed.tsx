"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const CAT_BED_CUSHION_TOP = 0.135;

/** One continuous upholstered bolster, lowered at the camera-facing front.
 * The outer silhouette stays inside the existing furniture rectangle. */
export function CatBed({ width, depth }: { width: number; depth: number }) {
  const bolster = useMemo(() => {
    const geometry = new THREE.TorusGeometry(0.375, 0.095, 12, 64);
    geometry.rotateX(Math.PI / 2);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const south = Math.max(0, z / Math.hypot(x, z));
      const height = 1 - 0.7 * Math.pow(south, 6);
      positions.setXYZ(i, x * width, 0.03 + (y + 0.095) * height, z * depth);
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }, [width, depth]);

  useEffect(() => () => bolster.dispose(), [bolster]);

  return (
    <group name="cat-bed">
      <mesh position={[0, 0.075, 0]} scale={[width * 0.48, 0.055, depth * 0.46]} castShadow receiveShadow>
        <sphereGeometry args={[1, 40, 16]} />
        <meshStandardMaterial color="#3e6263" roughness={1} />
      </mesh>
      <mesh geometry={bolster} castShadow receiveShadow>
        <meshStandardMaterial color="#577b79" roughness={1} />
      </mesh>
      <mesh position={[0, 0.07, 0]} scale={[width * 0.37, CAT_BED_CUSHION_TOP - 0.07, depth * 0.36]} receiveShadow>
        <sphereGeometry args={[1, 36, 16]} />
        <meshStandardMaterial color="#91aaa5" roughness={1} />
      </mesh>
      {/* Small sewn fabric tab, kept on the outside of the low front lip. */}
      <mesh position={[width * 0.2, 0.065, depth * 0.446]} rotation={[-0.22, 0, 0]}>
        <boxGeometry args={[0.055, 0.035, 0.012]} />
        <meshStandardMaterial color="#d8cbb0" roughness={1} />
      </mesh>
    </group>
  );
}
