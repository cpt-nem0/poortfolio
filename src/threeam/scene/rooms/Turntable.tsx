"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { audioEngine } from "@/threeam/audio/engine";
import { useAudioStore } from "@/threeam/state/audio";
import { TURNTABLE_POS } from "./musicNook.constants";

/**
 * Deck + spinning vinyl + clickable tonearm (lift = mute).
 * The hardware mirrors the audio state diegetically: pausing (HUD ⏸) or
 * muting lifts the tonearm to its rest and stops the platter; resuming
 * swings the arm back onto the record. The arm glides between poses.
 */
export function Turntable() {
  const vinylRef = useRef<Group>(null);
  const armRef = useRef<Group>(null);
  const [hover, setHover] = useState(false);
  const muted = useAudioStore((s) => s.muted);
  const paused = useAudioStore((s) => s.paused);
  const unlocked = useAudioStore((s) => s.unlocked);
  const resting = muted || paused || !unlocked;

  useFrame((_, dt) => {
    if (vinylRef.current && !resting) {
      vinylRef.current.rotation.y -= dt * 2.4; // ~33rpm-ish, stylized
    }
    if (armRef.current) {
      // glide the tonearm toward its target pose
      const t = 1 - Math.exp(-8 * dt);
      const target = resting ? { x: -0.5, y: 0.3 } : { x: 0, y: 0.55 };
      armRef.current.rotation.x += (target.x - armRef.current.rotation.x) * t;
      armRef.current.rotation.y += (target.y - armRef.current.rotation.y) * t;
    }
  });

  return (
    /* scaled up per style-gate feedback — spin + hardware read better big */
    <group position={TURNTABLE_POS} scale={1.35}>
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
        {/* off-center label dot — the high-contrast marker that makes the
            spin visible (style-gate feedback: old dark sheen was invisible) */}
        <mesh position={[0.045, 0.016, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.004, 8]} />
          <meshStandardMaterial color="#12101f" />
        </mesh>
        {/* bright groove sheen wedge */}
        <mesh position={[0.14, 0.012, 0]} rotation={[0, 0.3, 0]}>
          <boxGeometry args={[0.06, 0.002, 0.02]} />
          <meshStandardMaterial color="#8d86a8" />
        </mesh>
      </group>
      {/* tonearm — clickable; glides to rest when muted/paused */}
      <group
        ref={armRef}
        position={[0.24, 0.07, -0.14]}
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
