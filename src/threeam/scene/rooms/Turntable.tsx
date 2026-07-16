"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { audioEngine } from "@/threeam/audio/engine";
import { useAudioStore } from "@/threeam/state/audio";
import { TURNTABLE_POS } from "./musicNook.constants";

/** Deck + spinning vinyl + clickable tonearm (lift = mute). */
export function Turntable() {
  const vinylRef = useRef<Group>(null);
  const [hover, setHover] = useState(false);
  const muted = useAudioStore((s) => s.muted);
  const unlocked = useAudioStore((s) => s.unlocked);

  useFrame((_, dt) => {
    if (vinylRef.current && unlocked && !muted) {
      vinylRef.current.rotation.y -= dt * 2.4; // ~33rpm-ish, stylized
    }
  });

  return (
    <group position={TURNTABLE_POS}>
      {/* plinth */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.7, 0.06, 0.5]} />
        <meshStandardMaterial color="#2e2a4d" />
      </mesh>
      {/* platter + vinyl */}
      <group ref={vinylRef} position={[-0.08, 0.075, 0]}>
        <mesh>
          <cylinderGeometry args={[0.21, 0.21, 0.02, 24]} />
          <meshStandardMaterial color="#151318" />
        </mesh>
        <mesh position={[0, 0.012, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.005, 16]} />
          <meshStandardMaterial color="#ffb35c" />
        </mesh>
        {/* groove sheen line so the spin reads */}
        <mesh position={[0.13, 0.011, 0]}>
          <boxGeometry args={[0.05, 0.002, 0.01]} />
          <meshStandardMaterial color="#221e29" />
        </mesh>
      </group>
      {/* tonearm — clickable; lifted (rotated up) when muted */}
      <group
        position={[0.24, 0.07, -0.14]}
        rotation={[muted ? -0.5 : 0, muted ? 0.3 : 0.55, 0]}
        onClick={(e) => {
          e.stopPropagation();
          audioEngine.toggleMute();
        }}
        onPointerOver={() => {
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "auto";
        }}
      >
        <mesh position={[-0.11, 0, 0]}>
          <boxGeometry args={[0.24, 0.015, 0.02]} />
          <meshStandardMaterial
            color="#f2ecd8"
            emissive="#f2ecd8"
            emissiveIntensity={hover ? 0.35 : 0}
          />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.025, 0.025, 0.05, 10]} />
          <meshStandardMaterial color="#c9b088" />
        </mesh>
      </group>
      {/* power LED — stays lit even when the room goes dark (Plan 4) */}
      <mesh position={[0.3, 0.065, 0.2]}>
        <boxGeometry args={[0.02, 0.02, 0.02]} />
        <meshStandardMaterial color="#7cffb2" emissive="#7cffb2" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}
