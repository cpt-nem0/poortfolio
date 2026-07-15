"use client";

import Link from "next/link";
import { useThreeAm } from "@/threeam/state/store";
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
        WASD / arrows to walk · E to interact · P to cycle pixel size
      </div>
    </div>
  );
}
