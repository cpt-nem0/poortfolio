"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
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
import {
  playerPosition,
  roomBand,
  nextRoomBand,
  updateVisibleBands,
  isBandVisible,
  type RoomBand,
} from "@/threeam/world/runtime";

/**
 * Advances the single shared `roomBand.current` (see runtime.ts) once per
 * frame from the player's x, with hysteresis so standing on x=8/x=16 can't
 * flicker two rooms in and out — then recomputes `visibleBands` from that
 * same current band + the player's raw x, so an adjacent room starts
 * rendering once the player is within DOOR_MARGIN of its doorway (smooth
 * approach instead of a hard swap at the threshold). This is the ONLY
 * writer of either — RoomCull below and House's StructureBand only READ
 * `visibleBands`, so room CONTENT and the structural shell (floors/walls/
 * stairs) can never disagree about which rooms are visible within a frame.
 * Mounted once, ahead of the RoomCull/House readers, so they never read a
 * stale prior-frame value.
 */
function RoomBandUpdater() {
  useFrame(() => {
    roomBand.current = nextRoomBand(roomBand.current, playerPosition.x);
    updateVisibleBands(roomBand.current, playerPosition.x);
  });
  return null;
}

/**
 * Renders its room while it is VISIBLE — the current band always, plus an
 * adjacent band once the player is within DOOR_MARGIN of the doorway that
 * borders it (see `visibleBands`/`updateVisibleBands` in runtime.ts).
 * Usually 1-2 rooms' worth of lights are active; at the owner-chosen
 * DOOR_MARGIN of 4.5 all 3 render in the ~1m strip at the workspace centre
 * where both near-door zones overlap (accepted — see the DOOR_MARGIN doc).
 * The approaching room fades in ahead of arrival instead of hard-cutting at
 * the threshold, which is the point. A room with neither the
 * player nor an approaching neighbour reads as dark void — intended, it's
 * night and unentered rooms are unlit. Rooms stay MOUNTED (no GLB/texture
 * reload) — only `visible` toggles.
 */
function RoomCull({ band, children }: { band: RoomBand; children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.visible = isBandVisible(band);
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
        // dev-only: counts actual advance()/logical-frame calls, for browser
        // QA to read a true fps (renderer.info.render.frame overcounts —
        // postprocessing invokes render() multiple times per logical frame).
        if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
          const w = window as unknown as Record<string, unknown>;
          w.__3amFrameCount = ((w.__3amFrameCount as number) ?? 0) + 1;
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [advance, fps]);
  return null;
}

// Render-buffer width cap: the Pixelation pass (Effects.tsx) discards
// sub-block detail anyway, so rendering past this is wasted fill-rate — a
// maximized 3840px-wide window was dropping to ~42-49fps. Below this width,
// dpr stays 1 (unchanged, existing behaviour); above it, dpr scales down so
// the render buffer holds at ~MAX_RENDER_WIDTH px and the canvas upscales to
// fill the window. Granularity in Effects.tsx is already at its floor (2 —
// the postprocessing lib rounds up to the nearest even number), so it can't
// be scaled down further to compensate; large windows read very slightly
// chunkier as a result — see Effects.tsx.
const MAX_RENDER_WIDTH = 1920;

function cappedDpr() {
  return Math.min(1, MAX_RENDER_WIDTH / window.innerWidth);
}

/** Recomputes the dpr cap on resize so a maximized/restored window keeps the
 * render buffer capped, not just on initial mount. */
function useCappedDpr() {
  const [dpr, setDpr] = useState(cappedDpr);
  useEffect(() => {
    const onResize = () => setDpr(cappedDpr());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return dpr;
}

/** The 3D world. Extended by House/Player/FollowCamera/Effects tasks. */
export default function Scene() {
  const area = useThreeAm((s) => s.area);
  const dpr = useCappedDpr();
  return (
    <Canvas
      shadows
      dpr={dpr}
      frameloop="never" // FrameLimiter drives rendering at a fixed 60
      camera={{ fov: 35, position: [11, 9, 11] }}
      style={{ position: "absolute", inset: 0 }}
    >
      <FrameLimiter fps={60} />
      <color attach="background" args={["#0a0916"]} />
      <ambientLight intensity={0.3} color="#8d9bd6" />
      <directionalLight position={[6, 10, 4]} intensity={0.4} color="#7684c9" />
      {/* advances roomBand.current once per frame — must mount before
          House/RoomCull so neither reads a stale prior-frame band */}
      <RoomBandUpdater />
      <House />
      {area === "ground" && (
        <Suspense fallback={null}>
          {/* adjacent-room culling — see RoomCull/updateVisibleBands
              (runtime.ts). Current band always renders; bedroom (+engawa)
              x<8, workspace 8<=x<16, music x>=16, with ±0.4m hysteresis at
              each boundary so the CURRENT room can't flicker at x=8 / x=16.
              On top of that, whichever neighbour borders the nearest
              doorway also renders once the player is within DOOR_MARGIN
              (4.5m) of it, so it's visible through the doorway before
              arrival instead of popping in at the threshold. House reads
              the SAME visibleBands to
              cull its own structural shell (floors/walls/stairs) to
              match. */}
          <RoomCull band={0}>
            <Bedroom />
          </RoomCull>
          <RoomCull band={1}>
            <Workspace />
          </RoomCull>
          <RoomCull band={2}>
            <MusicNook />
          </RoomCull>
          {/* forces every loaded material/geometry onto the GPU once, so a
              GLB that resolved while its room was culled doesn't pay its
              first-frame shader-compile hitch when the room becomes visible */}
          <Preload all />
        </Suspense>
      )}
      <Player />
      <AudioRig />
      <FollowCamera />
      <Effects />
    </Canvas>
  );
}
