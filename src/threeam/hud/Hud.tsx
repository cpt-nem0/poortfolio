"use client";

import Link from "next/link";
import { useThreeAm } from "@/threeam/state/store";
import { useAudioStore } from "@/threeam/state/audio";
import { audioEngine } from "@/threeam/audio/engine";
import type { RoomId } from "@/threeam/world/layout";

const ROOM_LABELS: Record<RoomId, string> = {
  bedroom: "the bedroom",
  workspace: "the workspace",
  music: "the music nook",
  rooftop: "the rooftop",
};

export function Hud() {
  const room = useThreeAm((s) => s.room);
  const portal = useThreeAm((s) => s.activePortal);
  const unlocked = useAudioStore((s) => s.unlocked);
  const nowPlaying = useAudioStore((s) => s.nowPlaying);
  const muted = useAudioStore((s) => s.muted);
  const paused = useAudioStore((s) => s.paused);
  const audioError = useAudioStore((s) => s.error);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 font-mono text-sm">
      {room && (
        <div className="absolute left-5 top-4 rounded bg-black/50 px-3 py-1.5 text-[#cfc6ee]">
          {ROOM_LABELS[room]}
        </div>
      )}

      <Link
        href="/"
        className="pointer-events-auto absolute right-5 top-4 rounded bg-black/50 px-3 py-1.5 text-[#cfc6ee] transition-colors hover:text-[#ffb35c]"
      >
        ← back to normal
      </Link>

      {portal && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded bg-black/60 px-4 py-2 text-[#7cffb2]">
          [E] {portal.label}
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-[#7d729e]">
        WASD / arrows to walk · E to interact
      </div>

      {!unlocked && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded bg-black/60 px-4 py-2 text-xs text-[#ffd9a0]">
          🔊 press any key — the record player is waiting
        </div>
      )}

      {nowPlaying && (
        <div className="absolute bottom-4 left-5 flex items-center gap-2 rounded bg-black/60 px-3 py-2 text-xs text-[#cfc6ee]">
          <button
            type="button"
            onClick={() => audioEngine.togglePause()}
            aria-label={paused ? "play music" : "pause music"}
            className="pointer-events-auto -my-1 rounded px-1 py-1 text-[#ffd9a0] transition-colors hover:text-[#ffb35c]"
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
        <div className="absolute bottom-16 left-5 rounded bg-black/60 px-3 py-1.5 text-xs text-[#ff8f70]">
          {audioError}
        </div>
      )}
    </div>
  );
}
