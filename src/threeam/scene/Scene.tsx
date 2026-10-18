"use client";

import { Suspense, memo, useEffect, useRef, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Preload, useProgress } from "@react-three/drei";
import type { Group } from "three";
import { WebGLRenderTarget } from "three";
import { House } from "./House";
import { Player } from "./Player";
import { FollowCamera } from "./FollowCamera";
import { Effects } from "./Effects";
import { AudioRig } from "./AudioRig";
import { MusicNook } from "./rooms/MusicNook";
import { CommonArea } from "./rooms/CommonArea";
import { Bedroom } from "./rooms/Bedroom";
import { useThreeAm } from "@/threeam/state/store";
import {
  playerPosition,
  roomBand,
  nextRoomBand,
  updateVisibleBands,
  clearVisibleBands,
  isBandVisible,
  type AreaId,
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
 *
 * LAYOUT V2 (Task 2): while the camera area is "workstation", none of the
 * ground front-row bands (bedroom/workspace/music) are visible — the player
 * is behind the shared wall, in a different area entirely. `roomBand`
 * itself keeps tracking `x` as usual (harmless: `x` never leaves the
 * workstation's own 8-16 range while back there, so it settles back to the
 * correct band the moment the player returns to ground), but
 * `visibleBands` is force-cleared instead of recomputed.
 */
function RoomBandUpdater() {
  useFrame(() => {
    roomBand.current = nextRoomBand(roomBand.current, playerPosition.x);
    if (useThreeAm.getState().area === "workstation") {
      clearVisibleBands();
    } else {
      updateVisibleBands(roomBand.current, playerPosition.x);
    }
  });
  return null;
}

/**
 * Renders its room while it is VISIBLE — the current band always, plus at
 * most ONE adjacent band once the player is within DOOR_MARGIN of the
 * doorway that borders it (see `visibleBands`/`updateVisibleBands`/
 * `selectNeighbourBand` in runtime.ts). Never more than 2 rooms' worth of
 * lights are active, even at the workspace centre where both doorways are
 * simultaneously in margin — `selectNeighbourBand` picks the nearer one,
 * with hysteresis so it doesn't flicker between them. The approaching room
 * fades in ahead of arrival instead of hard-cutting at the threshold, which
 * is the point. A room with neither the player nor an approaching neighbour
 * reads as dark void — intended, it's night and unentered rooms are unlit.
 * Rooms stay MOUNTED (no GLB/texture reload) — only `visible` toggles.
 */
function RoomCull({ band, children }: { band: RoomBand; children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.visible = isBandVisible(band);
  });
  // `userData.bands` lets ShaderWarmup (below) find and toggle these groups
  // synchronously; the per-frame writer above stays the only runtime driver.
  return (
    <group ref={ref} userData={{ bands: [band] }}>
      {children}
    </group>
  );
}

/**
 * One-shot shader warm-up, run once all assets are in (useProgress idle)
 * and BEFORE LoadingOverlay's 300ms hold ends, so it hides inside the
 * loading screen. Why: three.js builds a separate program variant per
 * material per visible-light COUNT, and the count changes with the
 * two-band culling (bedroom+common ≠ common+music ≠ a single band). drei's
 * `<Preload all/>` compiles against ONE state (everything visible), so the
 * first walk into a differently-lit band still compiled ~6 programs and
 * dropped a 100ms frame (measured 2026-10-19, music-nook entry). Here we
 * put the band groups into each configuration the runtime can actually
 * produce (RoomBandUpdater: a current band, plus at most one neighbour),
 * call `gl.compile` for each — it reads lights via traverseVisible and
 * materials via traverse — then restore. The per-frame RoomCull /
 * StructureBand writers re-apply the live state on the next frame anyway.
 */
type WarmupConfig = { area: AreaId; bands: RoomBand[] };
const WARMUP_CONFIGS: WarmupConfig[] = [
  { area: "ground", bands: [0] },
  { area: "ground", bands: [1] },
  { area: "ground", bands: [2] },
  { area: "ground", bands: [0, 1] },
  { area: "ground", bands: [1, 2] },
  { area: "workstation", bands: [] },
  { area: "roof", bands: [] },
];
const WARMUP_SAFETY_MS = 8000;
function ShaderWarmup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const { active, progress } = useProgress();
  const startedRef = useRef(false);
  useFrame(() => {
    if (startedRef.current || active || progress < 100) return;
    startedRef.current = true;
    const t0 = performance.now();
    const bandGroups: Group[] = [];
    const areaGroups: Group[] = [];
    scene.traverse((o) => {
      if (Array.isArray((o as Group).userData?.bands)) bandGroups.push(o as Group);
      if (typeof (o as Group).userData?.area === "string") areaGroups.push(o as Group);
    });
    const apply = (config: WarmupConfig | null) => {
      const liveArea = useThreeAm.getState().area;
      for (const g of areaGroups) g.visible = (config ? config.area : liveArea) === g.userData.area;
      for (const g of bandGroups) {
        const bands = g.userData.bands as RoomBand[];
        g.visible = config ? bands.some((b) => config.bands.includes(b)) : bands.some(isBandVisible);
      }
    };
    const finish = () => {
      useThreeAm.getState().setWarmupDone(true);
      if (process.env.NODE_ENV !== "production") {
        console.info(`[3am] shader warm-up: ${gl.info.programs?.length ?? "?"} programs in ${Math.round(performance.now() - t0)}ms`);
      }
    };
    const safety = setTimeout(finish, WARMUP_SAFETY_MS);
    (async () => {
      // Phase 1 — per configuration, kick off the compiles. The browser
      // links shaders on background threads (KHR_parallel_shader_compile);
      // compileAsync captures the light set synchronously at call time and
      // resolves once every program is actually linked, without blocking
      // the main thread — so the loading screen stays animated.
      for (const config of WARMUP_CONFIGS) {
        apply(config);
        try {
          await gl.compileAsync(scene, camera);
        } catch {
          // a lost context or an unsupported extension just means a
          // slower first entry, same as before this warm-up existed
        }
        apply(null); // hand visibility back to the live state between awaits
      }
      // Phase 2 — one 1×1 render per configuration. compile keys programs
      // per MATERIAL; the final variant also keys on per-OBJECT flags
      // (receiveShadow…), and only a real render list walks those. Cheap
      // now: the heavy links already happened above.
      const target = new WebGLRenderTarget(1, 1);
      const prevTarget = gl.getRenderTarget();
      for (const config of WARMUP_CONFIGS) {
        apply(config);
        gl.setRenderTarget(target);
        gl.render(scene, camera);
      }
      gl.setRenderTarget(prevTarget);
      target.dispose();
      apply(null);
      clearTimeout(safety);
      finish();
    })();
  });
  return null;
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


// memo: Scene re-renders on area switch; the ground rooms must not reconcile
// for that (see HouseArea in House.tsx for the measured cost).
const GroundRooms = memo(function GroundRooms() {
  return (
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
        <CommonArea />
      </RoomCull>
      <RoomCull band={2}>
        <MusicNook />
      </RoomCull>
      {/* forces every loaded material/geometry onto the GPU once, so a
          GLB that resolved while its room was culled doesn't pay its
          first-frame shader-compile hitch when the room becomes visible.
          This only covers what's mounted UNDER THIS Suspense (Bedroom/
          CommonArea/MusicNook) — House.tsx mounts Workstation/Genkan
          from a separate Suspense tree entirely (House sits outside
          this boundary), so each of those carries its OWN local
          `<Preload all/>` for the same reason (T8 finale — see
          House.tsx's PRELOAD REGRESSION FIX comments). Safe to have
          multiple: Preload traverses the whole r3f scene regardless of
          which Suspense mounted it, and a redundant gl.compile() on an
          already-compiled program is a cheap no-op. */}
      <Preload all />
      <ShaderWarmup />
    </Suspense>
  );
});

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
      {/* Ground-floor room content stays MOUNTED on every floor and is only
          hidden off the ground (2026-10-19, see HouseArea's note): an unmount
          here used to throw away every room's shaders + GPU buffers each
          time the player went up the stairs. `userData.area` is read by
          ShaderWarmup below. */}
      <group visible={area === "ground"} userData={{ area: "ground" }}>
        <GroundRooms />
      </group>
      <Player />
      <AudioRig />
      <FollowCamera />
      <Effects />
    </Canvas>
  );
}
