"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

import { useReducedMotion } from "@/components/bento/effects";
import { audioEngine } from "@/threeam/audio/engine";
import { CatModel } from "../models/CatModel";
import { PixelBubble } from "@/components/PixelBubble";

// The cat is a painted GLB now (see models/CatModel.tsx for the model +
// attribution). This file owns the *petting*: click → hearts rise, a pixel
// speech bubble pops open over her head, and she purrs (synthesized, see
// audio/sfx.ts). The hand-built sphere cat it replaces is in git history.
const HEART_COLOR = "#ff7d9c";

const HEART_SHAPE = new THREE.Shape();
HEART_SHAPE.moveTo(0, -0.025);
HEART_SHAPE.bezierCurveTo(-0.065, 0.012, -0.028, 0.062, 0, 0.031);
HEART_SHAPE.bezierCurveTo(0.028, 0.062, 0.065, 0.012, 0, -0.025);

const PET_COOLDOWN = 2; // one pet (hearts + purr + bubble) per 2s
const HEART_RISE = 0.3; // float up 0.3m
const HEART_FADE = 1; // fade over ~1s
const HEART_BASE_Y = 0.46; // just above the loaf's ears (she's ~0.37m tall)
const BUBBLE_Y = 0.4; // anchor = tail tip, just over her ears (she's ~0.37m tall)
const BUBBLE_MS = 1700;
const PURR_LINES = ["purr", "purrr", "prrr~", "…purr"];

// Speech bubble: the site-wide PixelBubble (stepped pixel corners, #21242A
// translucent fill, stair-step tail). Opens with a short fade+rise, eases
// out before unmount.
const BUBBLE_IN_MS = 320;
const BUBBLE_OUT_MS = 240;

/**
 * Deterministic pseudo-random in [0,1), seeded by an integer. Only called on
 * discrete events (a click), never per frame with a free-running seed.
 */
function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
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

interface Bubble {
  id: number;
  text: string;
}

export function Cat({ x, y, z, rotationY = -0.55 }: CatProps) {
  const reducedMotion = useReducedMotion();
  const heartMeshRefs = useRef(new Map<number, THREE.Mesh>());

  const clockRef = useRef(0);
  const lastPetRef = useRef(-Infinity);
  const heartIdRef = useRef(0);
  const petCountRef = useRef(0);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleElRef = useRef<HTMLDivElement | null>(null);

  const [hearts, setHearts] = useState<Heart[]>([]);
  const [bubble, setBubble] = useState<Bubble | null>(null);

  useEffect(
    () => () => {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (bubbleOutTimerRef.current) clearTimeout(bubbleOutTimerRef.current);
    },
    []
  );

  useFrame((_, rawDt) => {
    // clamped dt, same pattern as Turntable — never Date.now()/Math.random()
    // per frame; all timing derives from this accumulated clock.
    const dt = Math.min(rawDt, 0.05);
    clockRef.current += dt;
    const t = clockRef.current;

    // hearts — rise + fade off the clamped clock, then drop out
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
        mesh.position.y = HEART_BASE_Y + (reducedMotion ? 0 : HEART_RISE * p);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = 1 - p;
      }
      if (anyDone) {
        setHearts((prev) => prev.filter((h) => t - h.spawnT < HEART_FADE));
      }
    }
  });

  function pet() {
    const t = clockRef.current;
    if (t - lastPetRef.current < PET_COOLDOWN) return;
    lastPetRef.current = t;
    const n = ++petCountRef.current;

    // hearts
    const count = hash(n + 7) > 0.5 ? 2 : 1;
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

    // bubble — a fresh id remounts the div so the open animation replays;
    // the close eases out first, then the element is dropped
    setBubble({ id: n, text: PURR_LINES[Math.floor(hash(n + 3) * PURR_LINES.length)] });
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    if (bubbleOutTimerRef.current) clearTimeout(bubbleOutTimerRef.current);
    bubbleOutTimerRef.current = setTimeout(() => {
      const el = bubbleElRef.current;
      if (el && !reducedMotion) {
        el.animate(
          [
            { opacity: 1, transform: "scale(1) translateY(0)" },
            { opacity: 0, transform: "scale(0.94) translateY(4px)" },
          ],
          { duration: BUBBLE_OUT_MS, easing: "cubic-bezier(0.4, 0, 0.6, 1)", fill: "forwards" }
        );
      }
    }, BUBBLE_MS - BUBBLE_OUT_MS);
    bubbleTimerRef.current = setTimeout(() => setBubble(null), BUBBLE_MS);

    // sound — the click is a user gesture, so this also unlocks audio
    audioEngine.purr();
  }

  // open: fade + rise + ease from 0.9 to 1 (expo-out, no bounce). Guarded
  // by a dataset flag: React re-invokes a callback ref on every render
  // (new function identity), and re-running animate() here would restart
  // the fade from 0 each time a heart mounts/unmounts — a visible blink.
  function animateBubbleIn(el: HTMLDivElement | null) {
    bubbleElRef.current = el;
    if (!el || reducedMotion || el.dataset.animatedIn) return;
    el.dataset.animatedIn = "1";
    el.animate(
      [
        { opacity: 0, transform: "scale(0.9) translateY(6px)" },
        { opacity: 1, transform: "scale(1) translateY(0)" },
      ],
      { duration: BUBBLE_IN_MS, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" }
    );
  }

  return (
    <group
      name="sleeping-cat"
      position={[x, y, z]}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        pet();
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <Suspense fallback={null}>
        <CatModel />
      </Suspense>

      {bubble && (
        <Html position={[0, BUBBLE_Y, 0]} zIndexRange={[12, 12]} style={{ pointerEvents: "none" }}>
          {/* outer div: hang the bubble ABOVE the anchor (tail tip at the
              anchor, 6px clear) so it never covers the cat; inner div is
              what animates, so the offset transform and the animation
              transform don't fight over one element */}
          <div style={{ transform: "translate(-50%, calc(-100% - 3px))" }}>
            <div key={bubble.id} ref={animateBubbleIn} style={{ transformOrigin: "50% 100%" }}>
              <PixelBubble className="select-none font-mono text-[11px] tracking-[0.12em] text-[#e9ecf4]">
                {bubble.text}
              </PixelBubble>
            </div>
          </div>
        </Html>
      )}

      {/* Heart silhouettes rise above the head when petted. */}
      {hearts.map((h) => (
        <mesh
          key={h.id}
          ref={(m) => {
            if (m) heartMeshRefs.current.set(h.id, m);
            else heartMeshRefs.current.delete(h.id);
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[h.dx, HEART_BASE_Y, h.dz]}
        >
          <shapeGeometry args={[HEART_SHAPE, 10]} />
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
