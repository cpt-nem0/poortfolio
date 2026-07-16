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
const PLAY_Y = 0.55; // arm yaw when the needle sits on the record

export function Turntable() {
  const vinylRef = useRef<Group>(null);
  const armRef = useRef<Group>(null);
  const [hover, setHover] = useState(false);
  const muted = useAudioStore((s) => s.muted);
  const paused = useAudioStore((s) => s.paused);
  const unlocked = useAudioStore((s) => s.unlocked);
  const resting = muted || paused || !unlocked;

  useFrame((_, rawDt) => {
    // clamp: ctx.resume()/suspend() can stall a frame — an unclamped dt
    // would make the exponential glide teleport (looked like a glitch)
    const dt = Math.min(rawDt, 0.05);
    if (armRef.current) {
      // glide the tonearm toward its target pose: over the record when
      // playing; swung right, flat and parallel to the deck's right edge
      // (its cradle) when resting
      const t = 1 - Math.exp(-8 * dt);
      const targetY = resting ? Math.PI / 2 : PLAY_Y;
      armRef.current.rotation.y += (targetY - armRef.current.rotation.y) * t;

      // the platter only spins once the arm has actually landed on the
      // record — sequencing arm → spin for every path (pause/mute/unlock)
      const armLanded = Math.abs(armRef.current.rotation.y - PLAY_Y) < 0.06;
      if (vinylRef.current && !resting && armLanded) {
        vinylRef.current.rotation.y -= dt * 2.4; // ~33rpm-ish, stylized
      }
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
      {/* tonearm — clickable; glides to rest when muted/paused. Pivot sits
          ABOVE the vinyl surface so the platter never occludes the arm
          (occlusion read as the arm changing length). Starts in the cradle. */}
      <group
        ref={armRef}
        position={[0.24, 0.105, -0.14]}
        rotation={[0, Math.PI / 2, 0]}
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
        <mesh position={[0, -0.025, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.1, 10]} />
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
