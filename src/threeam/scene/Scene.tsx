"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { House } from "./House";
import { Player } from "./Player";
import { FollowCamera } from "./FollowCamera";
import { Effects } from "./Effects";
import { AudioRig } from "./AudioRig";
import { MusicNook } from "./rooms/MusicNook";
import { Workspace } from "./rooms/Workspace";
import { Bedroom } from "./rooms/Bedroom";
import { useThreeAm } from "@/threeam/state/store";
import { playerPosition } from "@/threeam/world/runtime";

/**
 * Renders its room only while the player is within `margin` of the room's
 * x-band; an off-screen room's meshes AND its fixture lights are then culled
 * whole by the renderer (an invisible group is pruned in projectObject,
 * lights included). This matters because forward-render cost is lights×meshes
 * and the ground floor grew to 24 lights / ~950 meshes lit at once (engawa
 * ran 27fps). Why player-distance and not a camera frustum/floor test: those
 * are occlusion-blind — the wide dollhouse view geometrically includes the
 * neighbour's floor *behind the dividing wall*, so they render everything
 * (40fps). Player-band is the cheap stand-in for "which rooms can I actually
 * see," since walls mean you only see your room plus a neighbour once you're
 * near its doorway. `margin` (4.5m) ≈ the on-screen half-width, so a
 * neighbour renders as soon as its doorway *could* edge into frame — that's
 * what kills the void the owner caught (too-tight margin dropped a room while
 * its doorway was still visible). Rooms stay MOUNTED (no GLB/texture reload).
 */
function RoomCull({
  minX,
  maxX,
  margin = 4.5,
  children,
}: {
  minX: number;
  maxX: number;
  margin?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const x = playerPosition.x;
    ref.current.visible = x >= minX - margin && x <= maxX + margin;
  });
  return <group ref={ref}>{children}</group>;
}

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
          {/* per-room culling by visible-floor overlap — see RoomCull. Bands:
              bedroom (+engawa) x -2.9..8, workspace 8..16, music 16..22. A
              room renders only when the floor it stands on is on screen, so
              no void ever shows and 60fps holds. */}
          <RoomCull minX={-2.9} maxX={8}>
            <Bedroom />
          </RoomCull>
          <RoomCull minX={8} maxX={16}>
            <Workspace />
          </RoomCull>
          <RoomCull minX={16} maxX={22}>
            <MusicNook />
          </RoomCull>
        </Suspense>
      )}
      <Player />
      <AudioRig />
      <FollowCamera />
      <Effects />
    </Canvas>
  );
}
