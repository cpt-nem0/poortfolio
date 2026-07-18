"use client";

import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { House } from "./House";
import { Player } from "./Player";
import { FollowCamera } from "./FollowCamera";
import { Effects } from "./Effects";
import { AudioRig } from "./AudioRig";
import { MusicNook } from "./rooms/MusicNook";
import { Workspace } from "./rooms/Workspace";
import { useThreeAm } from "@/threeam/state/store";

/**
 * Drives the render loop at a fixed cadence instead of raw vsync, so rooms
 * with GPU headroom (nook ran ~104fps post-dpr-cap) don't feel faster than
 * heavy ones (workspace ~60) when walking between them.
 */
function FrameLimiter({ fps }: { fps: number }) {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    const interval = 1000 / fps;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const delta = t - last;
      if (delta >= interval - 1) {
        last = t - (delta % interval); // keep cadence, don't drift
        advance(t / 1000);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [advance, fps]);
  return null;
}

/** The 3D world. Extended by House/Player/FollowCamera/Effects tasks. */
export default function Scene() {
  const area = useThreeAm((s) => s.area);
  return (
    <Canvas
      shadows
      // dpr capped at 1: the Pixelation pass discards sub-block detail anyway,
      // so retina rendering paid 4x fill-rate for zero visual gain (46fps → low
      // in the workspace on a 2x display). Granularity in Effects.tsx is sized
      // for dpr 1 — change them together.
      dpr={1}
      frameloop="never" // FrameLimiter drives rendering at a fixed 60
      camera={{ fov: 35, position: [11, 9, 11] }}
      style={{ position: "absolute", inset: 0 }}
    >
      <FrameLimiter fps={60} />
      <color attach="background" args={["#0a0916"]} />
      <ambientLight intensity={0.3} color="#8d9bd6" />
      <directionalLight position={[6, 10, 4]} intensity={0.4} color="#7684c9" />
      <House />
      {area === "ground" && (
        <Suspense fallback={null}>
          <MusicNook />
          <Workspace />
        </Suspense>
      )}
      <Player />
      <AudioRig />
      <FollowCamera />
      <Effects />
    </Canvas>
  );
}
