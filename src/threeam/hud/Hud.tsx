"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useThreeAm } from "@/threeam/state/store";
import { useAudioStore } from "@/threeam/state/audio";
import { audioEngine } from "@/threeam/audio/engine";
import type { RoomId, Rect } from "@/threeam/world/layout";
import { GENKAN_ROOM, FRONT_DOOR_LO, FRONT_DOOR_HI } from "@/threeam/world/layout";
import { playerPosition } from "@/threeam/world/runtime";

// LAYOUT V2 (Task 4, rename): "the workspace" → "the common area" — the
// room's desk/EVA/coffee-corner identity moved out to the new workstation
// (Task 3); this is what's left. "workstation" is a NEW key here, not a
// RoomId (layout.ts's RoomId is off-limits this pass — see the `labelKey`
// comment below for why it's needed).
//
// LAYOUT V2 (Task 6): "genkan" is the SAME situation as "workstation" — not
// a RoomId (GENKAN_ROOM never made it into layout.ts's `rooms[]`, and
// adding it there is off-limits this task too) — but it can't reuse the
// `area === "workstation"` trick either: genkan shares the ordinary
// "ground" camera area with the front row, it isn't its own area. So this
// file tracks it directly: polls `playerPosition` (runtime.ts, already
// mutated every frame outside React — same live reference Player.tsx
// writes) against GENKAN_ROOM's own rect. See the `inGenkan` effect below.
// T8 finale (label pass, decision recorded): the roof's stair-room
// (STAIR_ROOM, layout.ts) does NOT get its own label — its footprint
// (x10.2-13.8, z1.25-2.75) sits entirely inside roof's one "rooftop" room
// rect (x8-16, z0-6, HOUSE.areas.roof.rooms), so `room` already reads
// "rooftop" the whole time the player is inside it; no gap to fix. Treated
// as part of the rooftop, not a distinct room identity — same call as the
// engawa/bedroom relationship below, for the same reason (a small enclosure
// that's conceptually part of its parent room, not a room of its own).
const ROOM_LABELS: Record<RoomId | "workstation" | "genkan", string> = {
  bedroom: "the bedroom",
  workspace: "the common area",
  workstation: "the workstation",
  genkan: "the genkan",
  music: "the music nook",
  rooftop: "the rooftop",
};

function inRect(x: number, z: number, r: Rect) {
  return x >= r.x && x <= r.x + r.w && z >= r.z && z <= r.z + r.d;
}

// front door [E] trigger: a small band just inside the genkan's front wall
// (GK_FRONT_WALL, layout.ts, z8.1-8.3 — solid, the door is locked), centered
// on the door leaf's own x-span with a little extra reach either side. No
// `stations.ts`/`layout.ts` Station for this on purpose — the front door
// doesn't navigate anywhere (it's blocked), so it doesn't fit that shared
// mechanism's shape (trigger → travel/focus). Consolidation candidate if a
// future room needs the same "prompt + ephemeral toast, no travel" pattern.
const FRONT_DOOR_TRIGGER: Rect = {
  x: FRONT_DOOR_LO - 0.3,
  z: 7.0,
  w: FRONT_DOOR_HI - FRONT_DOOR_LO + 0.6,
  d: GENKAN_ROOM.z + GENKAN_ROOM.d - 7.0,
};
const DOOR_TOAST_MS = 3200;

export function Hud({ onOpenCredits }: { onOpenCredits: () => void }) {
  const room = useThreeAm((s) => s.room);
  const area = useThreeAm((s) => s.area);
  const portal = useThreeAm((s) => s.activePortal);
  const activeStation = useThreeAm((s) => s.activeStation);
  const focus = useThreeAm((s) => s.focus);
  const unlocked = useAudioStore((s) => s.unlocked);
  const nowPlaying = useAudioStore((s) => s.nowPlaying);
  const muted = useAudioStore((s) => s.muted);
  const paused = useAudioStore((s) => s.paused);
  const audioError = useAudioStore((s) => s.error);

  // "workstation" is a camera-only area (layout.ts's LAYOUT V2 comment) —
  // it isn't a RoomId, so `room` (roomAt only knows ground/roof's real room
  // rects) reads null the whole time the player's back there and this label
  // went blank. Key off `area` first when it's "workstation"; every other
  // area falls back to `room`, unchanged.
  const [inGenkan, setInGenkan] = useState(false);
  // T8 finale (label pass): the engawa deck (x<0, ENGAWA_DECK_X0=-2.7 in
  // layout.ts, not exported) has the SAME problem workstation/genkan had —
  // it isn't its own RoomId, and GROUND.rooms' "bedroom" rect only spans
  // x0-8, so `room` (roomAt, Player.tsx) reads null the whole time the
  // player stands on the deck: the label went blank. x<0 is a safe,
  // export-free proxy for "on the deck" — nothing else in the house
  // (workstation x8-16, roof's stair-room x10.2-13.8) ever has a negative
  // x, so this can't misfire elsewhere. Reuses the "bedroom" label text —
  // the engawa is explicitly ONE unit with the bedroom throughout this
  // plan (Bedroom.tsx renders both, House bands them together), not a
  // separate room identity that needs its own string.
  const [onEngawa, setOnEngawa] = useState(false);
  const [nearFrontDoor, setNearFrontDoor] = useState(false);
  const [doorToast, setDoorToast] = useState(false);
  const nearFrontDoorRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Position poll (Task 6): Hud renders OUTSIDE the r3f <Canvas> (mounted by
  // ThreeAmApp.tsx as a plain DOM overlay), so it has no `useFrame` — a
  // rAF loop reading the same live `playerPosition` ref Player.tsx writes
  // every frame is the equivalent here. setState only fires on an actual
  // boolean flip, so this is cheap (no re-render most frames).
  useEffect(() => {
    let raf: number;
    const tick = () => {
      const { x, z } = playerPosition;
      const genkan = inRect(x, z, GENKAN_ROOM);
      setInGenkan((prev) => (prev === genkan ? prev : genkan));
      const engawa = x < 0;
      setOnEngawa((prev) => (prev === engawa ? prev : engawa));
      const door = inRect(x, z, FRONT_DOOR_TRIGGER);
      if (door !== nearFrontDoorRef.current) {
        nearFrontDoorRef.current = door;
        setNearFrontDoor(door);
        if (!door) {
          setDoorToast(false);
          if (toastTimer.current) clearTimeout(toastTimer.current);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // E press near the front door → ephemeral toast (not a real portal: the
  // door is locked, there's nowhere to travel — see FRONT_DOOR_TRIGGER's
  // comment for why this doesn't reuse the Station/Portal [E] mechanism).
  // A second, independent `keydown` listener, same "KeyE, ignore repeats"
  // filter useKeyboard.ts uses for the real interact key — doesn't
  // conflict with it (Player.tsx's own E handling finds no station/portal
  // at these coordinates and no-ops).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "KeyE" || e.repeat) return;
      if (!nearFrontDoorRef.current) return;
      setDoorToast(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setDoorToast(false), DOOR_TOAST_MS);
    };
    window.addEventListener("keydown", down);
    return () => {
      window.removeEventListener("keydown", down);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const labelKey =
    area === "workstation" ? "workstation" : inGenkan ? "genkan" : onEngawa ? "bedroom" : room;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 font-mono text-sm">
      {labelKey && (
        <div className="absolute left-5 top-4 rounded bg-black/50 px-3 py-1.5 text-[#cfc6ee]">
          {ROOM_LABELS[labelKey]}
        </div>
      )}

      <Link
        href="/9am"
        className="pointer-events-auto absolute right-5 top-4 rounded bg-black/50 px-3 py-1.5 text-[#cfc6ee] transition-colors hover:text-[#ffb35c]"
      >
        ← the 9am version
      </Link>

      {portal && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded bg-black/60 px-4 py-2 text-[#7cffb2]">
          [E] {portal.label}
        </div>
      )}

      {!focus && !portal && activeStation && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded bg-black/60 px-4 py-2 text-[#ffd9a0]">
          [E] {activeStation.label}
        </div>
      )}

      {!focus && !portal && !activeStation && nearFrontDoor && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded bg-black/60 px-4 py-2 text-[#ffd9a0]">
          {doorToast ? "it's 3am. where would you even go." : "[E] the front door"}
        </div>
      )}

      {!focus && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-[#7d729e]">
          WASD / arrows to walk · E to interact
        </div>
      )}

      {!unlocked && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded bg-black/60 px-4 py-2 text-xs text-[#ffd9a0]">
          🔊 press any key — the record player is waiting
        </div>
      )}

      {nowPlaying && (
        <div className="absolute bottom-4 left-5 flex items-center gap-2 rounded bg-black/60 px-3 py-2 text-xs text-[#cfc6ee]">
          <button
            type="button"
            onClick={(e) => {
              audioEngine.togglePause();
              e.currentTarget.blur(); // don't hold the focus ring after a mouse click
            }}
            aria-label={paused ? "play music" : "pause music"}
            className="pointer-events-auto -my-1 rounded px-1 py-1 text-base leading-none text-[#ffd9a0] outline-none transition-colors hover:text-[#ffb35c] focus:outline-none focus-visible:text-[#ffb35c]"
          >
            {paused ? "▶" : "⏸"}
          </button>
          <span aria-hidden>{muted ? "🔇" : "♫"}</span>
          <span>
            {nowPlaying.artist} — {nowPlaying.title}
          </span>
          {nowPlaying.kind === "preview" && nowPlaying.storeUrl && (
            <a
              href={nowPlaying.storeUrl}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto text-[#ffb35c] hover:underline"
            >
              full song ↗
            </a>
          )}
        </div>
      )}

      {audioError && (
        <div className="absolute bottom-28 left-5 rounded bg-black/60 px-3 py-1.5 text-xs text-[#ff8f70]">
          {audioError}
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          onOpenCredits();
          e.currentTarget.blur();
        }}
        className="pointer-events-auto absolute bottom-16 left-5 rounded bg-black/50 px-2 py-1 text-xs text-[#7d729e] outline-none transition-colors hover:text-[#ffb35c] focus:outline-none"
      >
        credits
      </button>
    </div>
  );
}
