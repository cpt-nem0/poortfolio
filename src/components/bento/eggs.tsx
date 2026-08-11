"use client";

import { useEffect, useState } from "react";
import { playFanfare } from "./konamiFanfare";
import { playDeath } from "./deathSound";

export const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
export const SEKIRO = ["s", "e", "k", "i", "r", "o"];

export function matchSequence(buffer: string[], sequence: string[]): boolean {
  if (buffer.length < sequence.length) return false;
  const tail = buffer.slice(-sequence.length);
  return sequence.every((k, i) => tail[i] === k);
}

/** How long the 死 overlay stays up, start to finish. Must outlast the CSS
 *  keyframes in globals.css (bento-death-*) or it unmounts mid-fade. */
const DEATH_MS = 3000;
const DEATH_MS_REDUCED = 1600;

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
 *  sekiro = the screen dies — everything drops to black and the red 死 burns in;
 *  konami = an original chiptune fanfare with a synced tile light-show. */
export function EasterEggs() {
  const [death, setDeath] = useState<{ reduced: boolean } | null>(null);

  function triggerDeath() {
    const reduced = prefersReducedMotion();
    setDeath({ reduced });
    playDeath(); // struck on the same tick the black starts falling
    window.setTimeout(() => setDeath(null), reduced ? DEATH_MS_REDUCED : DEATH_MS);
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
      if (matchSequence(buf, SEKIRO)) { triggerDeath(); buf = []; }
      else if (matchSequence(buf, KONAMI)) { triggerKonami(); buf = []; }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  if (!death) return null;
  return (
    // The whole page dies: an opaque black sheet swallows the bento, then the
    // 死 burns in over it. 死 is a plain Unicode glyph — no image asset, so it
    // stays razor-sharp at any viewport size.
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[70] grid place-items-center bg-black ${
        death.reduced ? "bento-death-sheet-reduced" : "bento-death-sheet"
      }`}
    >
      <div className="flex flex-col items-center">
        <span className={death.reduced ? "bento-death-kanji-reduced" : "bento-death-kanji"}>死</span>
        <span className={death.reduced ? "bento-death-word-reduced" : "bento-death-word"}>DEATH</span>
      </div>
    </div>
  );
}
