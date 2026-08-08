"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { playFanfare } from "./konamiFanfare";
import { playSlash } from "./slashSound";

export const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
export const SEKIRO = ["s", "e", "k", "i", "r", "o"];

export function matchSequence(buffer: string[], sequence: string[]): boolean {
  if (buffer.length < sequence.length) return false;
  const tail = buffer.slice(-sequence.length);
  return sequence.every((k, i) => tail[i] === k);
}

/** Fixed spark positions along the slash line's diagonal (bottom-left to
 *  top-right), each with its own fling direction and stagger delay. */
const SPARKS = [
  { left: "14%", top: "86%", tx: "-22px", ty: "18px", delay: "0ms" },
  { left: "24%", top: "76%", tx: "18px", ty: "-26px", delay: "18ms" },
  { left: "36%", top: "64%", tx: "-26px", ty: "-14px", delay: "34ms" },
  { left: "48%", top: "52%", tx: "22px", ty: "20px", delay: "50ms" },
  { left: "58%", top: "42%", tx: "-18px", ty: "-24px", delay: "66ms" },
  { left: "68%", top: "32%", tx: "24px", ty: "16px", delay: "82ms" },
  { left: "78%", top: "22%", tx: "-20px", ty: "-18px", delay: "98ms" },
  { left: "86%", top: "14%", tx: "20px", ty: "-20px", delay: "114ms" },
] as const;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Bright neon palette for the konami tile flashes: door-pink, lime, cyan,
 *  amber, violet, yellow, mint. */
const KONAMI_COLORS = ["#ff5c7a", "#c8f542", "#5cd7ff", "#ffb35c", "#b06bff", "#ffe14d", "#4dffa6"];

function randomKonamiColor(): string {
  return KONAMI_COLORS[Math.floor(Math.random() * KONAMI_COLORS.length)];
}

/** Lights tile(s) for one konami note: notes 0-15 light a single tile each,
 *  cycling `tiles[i % tiles.length]` (two full sweeps of the 8-tile grid);
 *  note 16 (the finale chord) flashes ALL of them at once, harder — every
 *  tile gets its own random neon color. */
function lightTiles(tiles: HTMLElement[], noteIndex: number) {
  const finale = noteIndex >= 16;
  const group = finale ? tiles : [tiles[noteIndex % tiles.length]];
  group.forEach((t) => {
    t.style.setProperty("--konami-color", randomKonamiColor());
    t.classList.add("konami-lit", ...(finale ? ["konami-lit-strong"] : []));
  });
  window.setTimeout(() => {
    group.forEach((t) => {
      t.classList.remove("konami-lit", "konami-lit-strong");
      t.style.removeProperty("--konami-color");
    });
  }, 250);
}

/** Payoffs (reversible, self-cleaning):
 *  sekiro = a diagonal slash sweeps the viewport, the page takes a jolt, sparks fly;
 *  konami = an original chiptune fanfare with a synced tile light-show. */
export function EasterEggs() {
  const [slash, setSlash] = useState<{ reduced: boolean } | null>(null);

  function triggerSlash() {
    const reduced = prefersReducedMotion();
    setSlash({ reduced });
    playSlash(); // fired at impact — same tick as the data-slash jolt below
    window.setTimeout(() => setSlash(null), reduced ? 220 : 600);
    if (!reduced) {
      document.documentElement.setAttribute("data-slash", "");
      window.setTimeout(() => document.documentElement.removeAttribute("data-slash"), 450);
    }
  }

  function triggerKonami() {
    const tiles = Array.from(document.querySelectorAll<HTMLElement>(".bento-tile"));
    const reduced = prefersReducedMotion();
    void playFanfare((noteIndex) => {
      if (tiles.length === 0) return;
      if (reduced) {
        // single gentle all-tile glow, no per-note flashing
        if (noteIndex === 0) {
          tiles.forEach((t) => {
            t.style.setProperty("--konami-color", randomKonamiColor());
            t.classList.add("konami-lit");
          });
          window.setTimeout(() => {
            tiles.forEach((t) => {
              t.classList.remove("konami-lit");
              t.style.removeProperty("--konami-color");
            });
          }, 400);
        }
        return;
      }
      lightTiles(tiles, noteIndex);
    });
  }

  useEffect(() => {
    let buf: string[] = [];
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      buf = [...buf.slice(-19), e.key];
      if (matchSequence(buf, SEKIRO)) { triggerSlash(); buf = []; }
      else if (matchSequence(buf, KONAMI)) { triggerKonami(); buf = []; }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  if (!slash) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70]">
      <div className="absolute inset-0 bento-slash-flash" />
      {!slash.reduced && (
        <>
          <div className="absolute left-1/2 top-1/2 h-[3px] w-[160vmax] bento-slash-line" />
          {SPARKS.map((s, i) => (
            <span
              key={i}
              aria-hidden
              className="bento-spark"
              style={{ left: s.left, top: s.top, animationDelay: s.delay, "--tx": s.tx, "--ty": s.ty } as CSSProperties}
            />
          ))}
        </>
      )}
    </div>
  );
}
