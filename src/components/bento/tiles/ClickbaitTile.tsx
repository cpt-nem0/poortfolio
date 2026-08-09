"use client";

import { useRef, useState } from "react";
import { site } from "@/content/site";
import { Tile } from "../Tile";

const EVADE_RADIUS = 46;
const MARGIN = 6;

/** Pure: where the target should jump to (tile-local coords), or null if cursor isn't close. */
export function dodgePosition(tileW: number, tileH: number, targetX: number, targetY: number, cursorX: number, cursorY: number, size: number): { x: number; y: number } | null {
  const cx = targetX + size / 2, cy = targetY + size / 2;
  const dx = cursorX - cx, dy = cursorY - cy;
  if (Math.hypot(dx, dy) >= EVADE_RADIUS) return null;
  const x = Math.max(MARGIN, Math.min(tileW - size - MARGIN, targetX - dx * 1.2));
  const y = Math.max(MARGIN, Math.min(tileH - size - MARGIN, targetY - dy * 1.2));
  return { x, y };
}

export function ClickbaitTile() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [hits, setHits] = useState(0);
  const cb = site.projects.find((p) => p.title === "clickbait");
  const size = 22;
  return (
    <Tile label="clickbait — reaction game" className="max-md:min-h-[170px]">
      <div ref={ref} className="absolute inset-0"
           onMouseMove={(e) => {
             const el = ref.current; if (!el) return;
             const r = el.getBoundingClientRect();
             const t = pos ?? { x: r.width - size - 16, y: r.height - size - 16 };
             const next = dodgePosition(r.width, r.height, t.x, t.y, e.clientX - r.left, e.clientY - r.top, size);
             if (next) setPos(next);
           }}>
        <a href={cb?.href} target="_blank" rel="noreferrer" className="absolute inset-0" aria-label="clickbait — play it" />
        <p className="pointer-events-none mt-9 px-4 font-mono text-[11px] leading-relaxed text-[var(--dim)]">click the target.<br />that&apos;s the whole game.</p>
        <button type="button" aria-label="the target. good luck."
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setHits((h) => h + 1); }}
                className="absolute h-[22px] w-[22px] cursor-crosshair border-0 transition-all duration-200"
                style={{ left: pos ? pos.x : undefined, top: pos ? pos.y : undefined, right: pos ? undefined : 16, bottom: pos ? undefined : 16, background: hits >= 3 ? "var(--door-pink)" : "var(--lime)" }}>
          {hits >= 3 ? "🎉" : ""}
        </button>
        <p className="pointer-events-none font-mono text-[9px] text-[var(--dim)] max-md:static max-md:mt-3 max-md:px-4 md:absolute md:bottom-3 md:left-4">ts · postgres ↗</p>
      </div>
    </Tile>
  );
}
