"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Sleeping black cat (Task 9), curled up in her own cat bed (FURNISHING
 * WAVE — she used to curl on the bed's duvet; the owner's final sketch
 * gives her a round pet bed in the room's NE corner instead, and moves her
 * there). Chunky "loaf" silhouette from 2 stacked boxes, a tucked head box,
 * 2 ear wedges (one twitches), and a tail that curls from the body's back
 * around toward the front. Near-black matte everywhere, one lighter
 * highlight band along the spine to catch the room's ambient light.
 * castShadow comes from Bedroom's mount-time traverse — this component
 * mounts inside that traversed root, so it deliberately sets no shadow
 * flags itself.
 *
 * Position is a prop, not a hand-guessed local constant: Bedroom.tsx
 * derives x/y/z from the cat bed's own constructed geometry (its inner
 * pad's top surface + center) and passes them in. STALE HISTORY: from the
 * bed-swap task through the SUPER-KING pass, the source used to be the GLB
 * bed's own foot-area vertex cloud (see BedModel's attribution comment in
 * Bedroom.tsx for that old derivation, kept there for the record) — this
 * wave replaces all of that with the much simpler cat-bed-pad math (see the
 * CAT_X/CAT_Y/CAT_Z consts in Bedroom.tsx). Cat behavior/rendering itself
 * is untouched by the move — only the seat changed.
 */

const CAT_NEAR_BLACK = "#16161c";
const CAT_HIGHLIGHT = "#232330";
const HEART_COLOR = "#ff7d9c";

// Ear at rest is tilted outward this much (z-rotation); the twitch animates
// relative to this base so the idle pose isn't lost after the first cycle.
const EAR_BASE_TILT = 0.15;
const EAR_TWITCH_ANGLE = 0.2; // ~0.2 rad flick
const EAR_TWITCH_DUR = 0.15; // 150ms out-and-back
const EAR_TWITCH_MIN = 6; // 6–9s between twitches
const EAR_TWITCH_RANGE = 3;

const HEART_BURST_COOLDOWN = 2; // max one burst per 2s
const HEART_RISE = 0.3; // float up 0.3m
const HEART_FADE = 1; // fade over ~1s

/**
 * Deterministic pseudo-random in [0,1), seeded by an integer. Used to pick
 * the next ear-twitch interval and the heart-burst count/scatter — never
 * called from inside the per-frame hot path with a free-running seed, only
 * with counters that advance on discrete events (a twitch completing, a
 * click), so it's reproducible and never `Math.random()`-per-frame.
 */
function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function darkMat(color: string = CAT_NEAR_BLACK) {
  return <meshStandardMaterial color={color} roughness={1} metalness={0} />;
}

interface CatProps {
  x: number;
  y: number;
  z: number;
  rotationY?: number;
}

interface Heart {
  id: number;
  spawnT: number;
  dx: number;
  dz: number;
}

export function Cat({ x, y, z, rotationY = 0.35 }: CatProps) {
  const bodyRef = useRef<THREE.Group>(null);
  const earRef = useRef<THREE.Mesh>(null);
  const heartMeshRefs = useRef(new Map<number, THREE.Mesh>());

  const clockRef = useRef(0);
  const twitchCountRef = useRef(1);
  // seed from the literal initial count (1) — reading twitchCountRef.current
  // here would be a ref-access-during-render lint error, and it's the same value
  const nextTwitchRef = useRef(EAR_TWITCH_MIN + hash(1) * EAR_TWITCH_RANGE);
  const twitchStartRef = useRef<number | null>(null);
  const lastBurstRef = useRef(-Infinity);
  const heartIdRef = useRef(0);

  const [hearts, setHearts] = useState<Heart[]>([]);

  useFrame((_, rawDt) => {
    // clamped dt, same pattern as Turntable — never Date.now()/Math.random()
    // per frame; all timing derives from this accumulated clock.
    const dt = Math.min(rawDt, 0.05);
    clockRef.current += dt;
    const t = clockRef.current;

    // breathing — subtle scale pulse on the body group's y axis
    if (bodyRef.current) {
      bodyRef.current.scale.y = 1 + 0.03 * Math.sin(t * 1.4);
    }

    // ear twitch — accumulator crosses a hash-seeded threshold, then the
    // ear rotates out from its base tilt and back over 150ms
    if (twitchStartRef.current === null && t >= nextTwitchRef.current) {
      twitchStartRef.current = t;
    }
    if (twitchStartRef.current !== null) {
      const elapsed = t - twitchStartRef.current;
      if (elapsed <= EAR_TWITCH_DUR) {
        const phase = elapsed / EAR_TWITCH_DUR;
        const k = phase < 0.5 ? phase * 2 : (1 - phase) * 2; // triangular pulse
        if (earRef.current) earRef.current.rotation.z = EAR_BASE_TILT + k * EAR_TWITCH_ANGLE;
      } else {
        if (earRef.current) earRef.current.rotation.z = EAR_BASE_TILT;
        twitchStartRef.current = null;
        twitchCountRef.current += 1;
        nextTwitchRef.current = t + EAR_TWITCH_MIN + hash(twitchCountRef.current) * EAR_TWITCH_RANGE;
      }
    }

    // hearts — rise + fade off the same clamped clock, then drop out
    if (hearts.length > 0) {
      let anyDone = false;
      for (const h of hearts) {
        const mesh = heartMeshRefs.current.get(h.id);
        const elapsed = t - h.spawnT;
        if (elapsed >= HEART_FADE) {
          anyDone = true;
          continue;
        }
        if (!mesh) continue;
        const p = elapsed / HEART_FADE;
        mesh.position.y = HEART_RISE * p;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = 1 - p;
      }
      if (anyDone) {
        setHearts((prev) => prev.filter((h) => t - h.spawnT < HEART_FADE));
      }
    }
  });

  function spawnHearts() {
    const t = clockRef.current;
    if (t - lastBurstRef.current < HEART_BURST_COOLDOWN) return;
    lastBurstRef.current = t;
    const count = hash(twitchCountRef.current + heartIdRef.current) > 0.5 ? 2 : 1;
    const spawned: Heart[] = [];
    for (let i = 0; i < count; i++) {
      const id = heartIdRef.current++;
      spawned.push({
        id,
        spawnT: t,
        dx: (hash(id + 11) - 0.5) * 0.1,
        dz: (hash(id + 23) - 0.5) * 0.1,
      });
    }
    setHearts((prev) => [...prev, ...spawned]);
  }

  return (
    <group
      position={[x, y, z]}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        spawnHearts();
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {/* body — breathing group, 2 stacked boxes forming a curled loaf */}
      <group ref={bodyRef} position={[0, 0.045, 0]}>
        <mesh>
          <boxGeometry args={[0.28, 0.09, 0.2]} />
          {darkMat()}
        </mesh>
        <mesh position={[-0.01, 0.075, 0.005]}>
          <boxGeometry args={[0.21, 0.07, 0.16]} />
          {darkMat()}
        </mesh>
        {/* top highlight band along the spine */}
        <mesh position={[-0.01, 0.112, 0.005]}>
          <boxGeometry args={[0.19, 0.012, 0.05]} />
          {darkMat(CAT_HIGHLIGHT)}
        </mesh>

        {/* head — tucked against the body's high-x end, tipped down */}
        <group position={[0.15, 0.03, 0.02]} rotation={[0.3, -0.3, 0]}>
          <mesh>
            <boxGeometry args={[0.1, 0.09, 0.1]} />
            {darkMat()}
          </mesh>
          {/* ears — 2 wedges; the +x one twitches */}
          <mesh position={[-0.025, 0.06, 0.01]} rotation={[0, 0, -EAR_BASE_TILT]}>
            <coneGeometry args={[0.025, 0.045, 3]} />
            {darkMat()}
          </mesh>
          <mesh ref={earRef} position={[0.025, 0.06, 0.01]} rotation={[0, 0, EAR_BASE_TILT]}>
            <coneGeometry args={[0.025, 0.045, 3]} />
            {darkMat()}
          </mesh>
        </group>

        {/* tail — curls from the body's low-x (back) end around toward the
            front, 2 segments at increasing yaw to fake a curled sweep */}
        <mesh position={[-0.14, -0.005, 0.09]} rotation={[0, 0.5, 0]}>
          <boxGeometry args={[0.14, 0.045, 0.045]} />
          {darkMat()}
        </mesh>
        <mesh position={[-0.06, -0.005, 0.15]} rotation={[0, 1.3, 0]}>
          <boxGeometry args={[0.12, 0.04, 0.04]} />
          {darkMat()}
        </mesh>
      </group>

      {/* pettable hearts — throttled burst on click, flat-facing-up planes
          (same convention as the moon floor patch) so they read from the
          elevated follow-camera regardless of yaw */}
      {hearts.map((h) => (
        <mesh
          key={h.id}
          ref={(m) => {
            if (m) heartMeshRefs.current.set(h.id, m);
            else heartMeshRefs.current.delete(h.id);
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[h.dx, 0.14, h.dz]}
        >
          <planeGeometry args={[0.045, 0.045]} />
          <meshStandardMaterial
            color={HEART_COLOR}
            emissive={HEART_COLOR}
            emissiveIntensity={0.55}
            transparent
            opacity={1}
          />
        </mesh>
      ))}
    </group>
  );
}
