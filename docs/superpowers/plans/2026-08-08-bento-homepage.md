# Bento Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-column `/` with a full-page 8-tile bento grid under a living night/day sky (drifting clouds, clickable moon/sun theme toggle), per `docs/superpowers/specs/2026-08-08-bento-homepage-design.md`.

**Architecture:** A fixed `SkyBackground` (CSS-only cloud sprites + celestial toggle) behind a 3-column CSS-grid of tile components. Theme = `data-theme` attribute on `<html>` set pre-hydration, driving CSS custom properties. All copy from `src/content/site.ts` + new `src/content/bento.ts`. Pure-logic functions (theme resolution, presence rotation, dodge clamping) are extracted and vitest-tested; no component-render test framework is added.

**Tech Stack:** Next.js App Router, React 19, Tailwind 4 (arbitrary values + CSS vars), vitest. No new dependencies.

## Global Constraints

- **NO GIT COMMITS. Never stage anything.** Leave all changes unstaged in the working tree; Rohan commits himself. Where this plan's steps say "Checkpoint", report files changed instead of committing.
- The tree has unstaged in-flight work (ship-wave + content rewrite). Build on it; never revert anything.
- `/3am` untouched. `src/threeam/**` is off-limits to every task. The shared `layout.tsx` may only gain the theme script + metadata already specified here — `/3am` renders its own full-screen dark UI and must be visually unaffected (its colors are hardcoded, not var-driven).
- `/` stays light: no canvas, no WebGL, no new npm packages. Animations use `transform`/`opacity` only.
- Motion budget (idle): exactly Verse lyric cycle, Plate ring pulse, door window flicker, plus slow background drift. Everything else animates on interaction only.
- All idle animation and the scramble effect must stop under `prefers-reduced-motion: reduce` (gate via the `useReducedMotion` hook defined in Task 4; SkyBackground freezes via the CSS media query in Task 3).
- Copy is lowercase-casual (matches mockups); proper nouns keep their casing (Sekiro, Atlys, Verse).
- Night palette: sky `#0a0a16→#11101f`, tile `#101016`, tile-border `#26262e` (hover `#4a4a58`), text `#f4f2ec`, label `#8f8fa3`, dim `#6d6d80`, amber `#ffb35c`, door-pink `#ff5c7a`, lyric `#e8c98a`, presence-green `#7fd88f`, clickbait-lime `#c8f542`.
- Day palette: sky `#cfe4f5→#eef4f9`, tile `#fbf9f4`, tile-border `#d8d2c4` (hover `#a89f8d`), text `#1c1a24`, label `#6b6577`, dim `#8a8496`, amber `#d98324`. **The door tile keeps night colors in day theme** (the house is always at 3am).
- Gates before reporting any task done: `pnpm test`, `npx tsc --noEmit` (0 errors), `pnpm lint` (0 errors; 13 pre-existing warnings in `scripts/pixelart/*.mjs` are fine), `pnpm build` (if the dev server's `.next` lock blocks an in-tree build, clone the tree with `cp -c -R` to scratchpad, build there, delete the clone).
- Originkit (originkit.dev) is *reference only*. Do not copy its code — every effect here is specified inline and hand-rolled.

**Baseline at plan time:** 145 tests passing. `src/content/site.ts` already contains the rewritten content (8 projects, Atlys experience, new tagline/about).

---

### Task 1: Theme tokens + pre-hydration theme resolution

**Files:**
- Modify: `src/app/globals.css` (append tokens; do not touch existing rules)
- Modify: `src/app/layout.tsx` (inline theme script in `<head>`, `suppressHydrationWarning` on `<html>`)
- Create: `src/components/bento/theme.ts`
- Test: `src/components/bento/__tests__/theme.test.ts`

**Interfaces:**
- Produces: `resolveTheme(stored: string | null, systemPrefersDark: boolean): "night" | "day"`, `THEME_STORAGE_KEY = "poortfolio-theme"`, `themeInitScript: string` (stringified IIFE), and CSS vars `--sky-from --sky-to --tile --tile-border --tile-border-hover --ink --label --dim --amber --door-pink --lyric --presence --lime` defined for `[data-theme="night"]` and `[data-theme="day"]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/bento/__tests__/theme.test.ts
import { describe, expect, it } from "vitest";
import { resolveTheme, THEME_STORAGE_KEY, themeInitScript } from "../theme";

describe("resolveTheme", () => {
  it("honors a stored explicit choice over system preference", () => {
    expect(resolveTheme("day", true)).toBe("day");
    expect(resolveTheme("night", false)).toBe("night");
  });
  it("falls back to system preference when nothing stored", () => {
    expect(resolveTheme(null, true)).toBe("night");
    expect(resolveTheme(null, false)).toBe("day");
  });
  it("treats garbage storage as unset", () => {
    expect(resolveTheme("banana", false)).toBe("day");
    expect(resolveTheme("", true)).toBe("night");
  });
  it("init script references the same storage key and sets data-theme", () => {
    expect(themeInitScript).toContain(THEME_STORAGE_KEY);
    expect(themeInitScript).toContain("data-theme");
  });
});
```

- [ ] **Step 2: Run it** — `pnpm test -- theme` — expect FAIL (module not found).

- [ ] **Step 3: Implement `theme.ts`**

```ts
// src/components/bento/theme.ts
export const THEME_STORAGE_KEY = "poortfolio-theme";

export type ThemeName = "night" | "day";

/** Explicit stored choice wins; otherwise follow the system. */
export function resolveTheme(stored: string | null, systemPrefersDark: boolean): ThemeName {
  if (stored === "night" || stored === "day") return stored;
  return systemPrefersDark ? "night" : "day";
}

/** Runs before hydration in <head> so the first paint has the right theme (no FOUC). */
export const themeInitScript = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=(s==="night"||s==="day")?s:(d?"night":"day");document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","night");}})();`;
```

- [ ] **Step 4: Run it** — `pnpm test -- theme` — expect PASS.

- [ ] **Step 5: Append tokens to `globals.css`** (bottom of file, comment-fenced):

```css
/* ── bento theme tokens (spec 2026-08-08-bento-homepage-design §5) ── */
[data-theme="night"] {
  --sky-from: #0a0a16; --sky-to: #11101f;
  --tile: #101016; --tile-border: #26262e; --tile-border-hover: #4a4a58;
  --ink: #f4f2ec; --label: #8f8fa3; --dim: #6d6d80;
  --amber: #ffb35c; --door-pink: #ff5c7a; --lyric: #e8c98a;
  --presence: #7fd88f; --lime: #c8f542;
}
[data-theme="day"] {
  --sky-from: #cfe4f5; --sky-to: #eef4f9;
  --tile: #fbf9f4; --tile-border: #d8d2c4; --tile-border-hover: #a89f8d;
  --ink: #1c1a24; --label: #6b6577; --dim: #8a8496;
  --amber: #d98324; --door-pink: #ff5c7a; --lyric: #b0842f;
  --presence: #3d9e52; --lime: #6d8a12;
}
```

- [ ] **Step 6: Wire `layout.tsx`** — add `suppressHydrationWarning` to `<html>`, and inside `<head>` (create the tag if the file relies on implicit head) add:

```tsx
import { themeInitScript } from "@/components/bento/theme";
// inside <html suppressHydrationWarning …>, before {children}:
<head>
  <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
</head>
```

Do not alter fonts, metadata, or anything else in layout.tsx in this task.

- [ ] **Step 7: Verify `/3am` unaffected** — `data-theme` lands on `<html>` for every route, but `/3am` uses hardcoded colors. Grep to prove no threeam file consumes the new vars: `grep -rn "var(--sky\|var(--tile\|var(--ink" src/threeam/` → expect no matches.

- [ ] **Step 8: Run all four gates.** Checkpoint: report files changed.

---

### Task 2: Bento micro-copy content module

**Files:**
- Create: `src/content/bento.ts`
- Test: `src/content/__tests__/bento.test.ts`

**Interfaces:**
- Produces: `PRESENCE_LINES: readonly string[]`, `PRESENCE_FOOTNOTE: string`, `presenceLineIndex(visitCount: number, lineCount: number): number`, `DOOR_TEASER: readonly string[]` (3 lines), `FOOTER_WHISPER: string`, `MORE_PROJECT_BLURBS: Record<string, string>` (keyed by `site.ts` project title, one-per short line for the flat list).

- [ ] **Step 1: Write the failing test**

```ts
// src/content/__tests__/bento.test.ts
import { describe, expect, it } from "vitest";
import { PRESENCE_LINES, presenceLineIndex, DOOR_TEASER, MORE_PROJECT_BLURBS } from "../bento";
import { site } from "../site";

describe("bento content", () => {
  it("has at least 4 presence lines, all lowercase-start", () => {
    expect(PRESENCE_LINES.length).toBeGreaterThanOrEqual(4);
    for (const l of PRESENCE_LINES) expect(l[0]).toBe(l[0].toLowerCase());
  });
  it("presenceLineIndex cycles deterministically and in range", () => {
    const n = PRESENCE_LINES.length;
    expect(presenceLineIndex(0, n)).toBe(0);
    expect(presenceLineIndex(n, n)).toBe(0);
    expect(presenceLineIndex(3, n)).toBe(3 % n);
    expect(presenceLineIndex(-2, n)).toBeGreaterThanOrEqual(0);
  });
  it("door teaser is exactly 3 short lines", () => {
    expect(DOOR_TEASER).toHaveLength(3);
    for (const l of DOOR_TEASER) expect(l.length).toBeLessThan(40);
  });
  it("every flat-list blurb key is a real site.ts project title", () => {
    const titles = site.projects.map((p) => p.title);
    for (const key of Object.keys(MORE_PROJECT_BLURBS)) expect(titles).toContain(key);
  });
});
```

- [ ] **Step 2: Run it** — `pnpm test -- bento` — expect FAIL.

- [ ] **Step 3: Implement**

```ts
// src/content/bento.ts
/** Micro-copy for the bento homepage. Tile-specific one-liners only —
 *  everything substantive stays in site.ts. */

export const PRESENCE_LINES = [
  "getting parried in sekiro. attempt 47.",
  "valheim base: structurally questionable, spiritually perfect.",
  "the 3am maggi is experimental tonight.",
  "rereading berserk. still not okay.",
  "frieren rewatch #3. it holds.",
  "one piece, chapter one-thousand-whatever.",
] as const;

export const PRESENCE_FOOTNOTE =
  "also in rotation: cooking · manga · whatever needs building";

/** Stable pick per visit; component passes a persisted visit counter. */
export function presenceLineIndex(visitCount: number, lineCount: number): number {
  if (lineCount <= 0) return 0;
  return ((visitCount % lineCount) + lineCount) % lineCount;
}

export const DOOR_TEASER = [
  "a walkable pixel house.",
  "the record player works.",
  "the cat is asleep.",
] as const;

export const FOOTER_WHISPER =
  'the konami code still does something. so does typing "sekiro".';

export const MORE_PROJECT_BLURBS: Record<string, string> = {
  Whimsy: "llm in your terminal",
  "Pokédex": "the pokéapi, dressed properly",
  "Digi-hex": "blockchain payments ledger",
  "The cliché TODO": "yes, the todo app",
  "This Portfolio": "the door is over there →",
};
```

- [ ] **Step 4: Run it** — expect PASS. Run full gates. Checkpoint: report files changed.

---

### Task 3: SkyBackground (clouds + moon/sun toggle)

**Files:**
- Create: `src/components/bento/SkyBackground.tsx`
- Modify: `src/app/globals.css` (append sky keyframes + reduced-motion freeze)

**Interfaces:**
- Consumes: `THEME_STORAGE_KEY`, `ThemeName` from Task 1.
- Produces: `<SkyBackground />` — self-contained fixed background + theme toggle. No props (the `dive` prop for the future /3am cinematic is *reserved in a comment only*, not implemented).

- [ ] **Step 1: Append sky CSS to `globals.css`**

```css
/* ── bento sky ── */
@keyframes bento-drift { from { transform: translateX(-18vw); } to { transform: translateX(118vw); } }
@keyframes bento-twinkle-soft { 0%, 100% { opacity: 0.85; } 50% { opacity: 0.55; } }
@media (prefers-reduced-motion: reduce) {
  .bento-cloud, .bento-celestial { animation: none !important; }
}
```

- [ ] **Step 2: Implement the component**

```tsx
// src/components/bento/SkyBackground.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { THEME_STORAGE_KEY, type ThemeName } from "./theme";

/* Cloud sprite: layered radial-gradients, no blur filters (GPU cost).
 * Reserved for the /3am entry cinematic: a future `dive` prop will
 * accelerate/scale these layers — do not implement now (spec §4). */

const CLOUD_LAYERS = [
  { top: "12%", scale: 1.0, duration: 140, delay: -30, opacity: 0.5 },
  { top: "38%", scale: 1.5, duration: 190, delay: -110, opacity: 0.35 },
  { top: "64%", scale: 0.8, duration: 240, delay: -60, opacity: 0.25 },
] as const;

function readTheme(): ThemeName {
  return document.documentElement.getAttribute("data-theme") === "day" ? "day" : "night";
}

export function SkyBackground() {
  const [theme, setTheme] = useState<ThemeName | null>(null);
  useEffect(() => setTheme(readTheme()), []);

  const toggle = useCallback(() => {
    const next: ThemeName = readTheme() === "night" ? "day" : "night";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* private mode */ }
    setTheme(next);
  }, []);

  const night = theme !== "day"; // null (pre-mount) renders night visuals; attribute drives colors anyway

  return (
    <div aria-hidden={false} className="fixed inset-0 -z-10 overflow-hidden transition-[background] duration-500"
         style={{ background: "linear-gradient(180deg, var(--sky-from), var(--sky-to))" }}>
      {CLOUD_LAYERS.map((c, i) => (
        <div key={i} aria-hidden className="bento-cloud absolute h-[60px] w-[240px]"
             style={{
               top: c.top, opacity: c.opacity,
               transform: `scale(${c.scale})`,
               animation: `bento-drift ${c.duration}s linear infinite`,
               animationDelay: `${c.delay}s`,
               background:
                 "radial-gradient(closest-side at 30% 65%, var(--cloud, rgba(52,52,84,.55)) 78%, transparent), " +
                 "radial-gradient(closest-side at 55% 40%, var(--cloud, rgba(52,52,84,.5)) 72%, transparent), " +
                 "radial-gradient(closest-side at 75% 70%, var(--cloud, rgba(52,52,84,.45)) 70%, transparent)",
             }} />
      ))}
      <button type="button" onClick={toggle}
              aria-label={night ? "switch to day" : "switch to night"}
              className="bento-celestial pointer-events-auto absolute right-[8%] top-[10%] h-9 w-9 cursor-pointer rounded-full border-0 transition-all duration-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
              style={night
                ? { background: "#e8e4d2", boxShadow: "0 0 28px 10px rgba(232,228,210,.25)", animation: "bento-twinkle-soft 6s ease-in-out infinite" }
                : { background: "#ffd75e", boxShadow: "0 0 40px 16px rgba(255,215,94,.45)" }} />
    </div>
  );
}
```

Add to the day block in `globals.css` (inside `[data-theme="day"]`): `--cloud: rgba(255,255,255,.75);` and to night: `--cloud: rgba(52,52,84,.55);`.

- [ ] **Step 3: Manual dev check (programmatic)** — with the dev server already running on :3000, this component isn't mounted anywhere yet; confirm compile via `npx tsc --noEmit` only. Do NOT start another dev server.

- [ ] **Step 4: Run all gates.** Checkpoint: report files changed.

---

### Task 4: Effects hooks + grid shell + IdentityTile

**Files:**
- Create: `src/components/bento/effects.ts`
- Create: `src/components/bento/Tile.tsx`
- Create: `src/components/bento/tiles/IdentityTile.tsx`
- Test: `src/components/bento/__tests__/effects.test.ts`

**Interfaces:**
- Produces: `useReducedMotion(): boolean`, `useScramble(text: string, enabled: boolean): string` (scrambles in once on mount over ~900ms, returns final text when done or disabled), `<Tile label span className>` wrapper (`span`: `"1x1" | "2x2" | "1x2" | "2x1" | "3x1"`), `<IdentityTile />`.
- Consumes: `site` from `src/content/site.ts`.

- [ ] **Step 1: Failing test for the scramble step function** (pure part extracted so no DOM needed):

```ts
// src/components/bento/__tests__/effects.test.ts
import { describe, expect, it } from "vitest";
import { scrambleFrame } from "../effects";

describe("scrambleFrame", () => {
  const text = "builds whatever needs building.";
  it("locks characters left-to-right as progress rises", () => {
    const half = scrambleFrame(text, 0.5, () => 0.42);
    expect(half.slice(0, Math.floor(text.length * 0.5))).toBe(text.slice(0, Math.floor(text.length * 0.5)));
    expect(half.length).toBe(text.length);
  });
  it("returns the exact text at progress 1", () => {
    expect(scrambleFrame(text, 1, () => 0.9)).toBe(text);
  });
  it("preserves spaces everywhere", () => {
    const out = scrambleFrame(text, 0.2, () => 0.1);
    for (let i = 0; i < text.length; i++) if (text[i] === " ") expect(out[i]).toBe(" ");
  });
});
```

- [ ] **Step 2: Run** — `pnpm test -- effects` — expect FAIL.

- [ ] **Step 3: Implement `effects.ts`**

```ts
// src/components/bento/effects.ts
"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "abcdefghijklmnopqrstuvwxyz#$%&*+=";

/** Pure scramble frame: chars left of `progress` are final, the rest random glyphs. */
export function scrambleFrame(text: string, progress: number, rand: () => number = Math.random): string {
  const lock = Math.floor(text.length * Math.min(1, Math.max(0, progress)));
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    out += ch === " " || i < lock || progress >= 1 ? ch : GLYPHS[Math.floor(rand() * GLYPHS.length)];
  }
  return out;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Scramble-in once on mount (~900ms). Renders final text immediately when disabled. */
export function useScramble(text: string, enabled: boolean): string {
  const [display, setDisplay] = useState(enabled ? "" : text);
  const done = useRef(false);
  useEffect(() => {
    if (!enabled || done.current) { setDisplay(text); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 900);
      setDisplay(scrambleFrame(text, p));
      if (p < 1) raf = requestAnimationFrame(tick);
      else done.current = true;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, enabled]);
  return display;
}
```

- [ ] **Step 4: Run** — expect PASS.

- [ ] **Step 5: Implement `Tile.tsx`**

```tsx
// src/components/bento/Tile.tsx
import type { ReactNode } from "react";
import { clsx } from "clsx";

const SPANS: Record<string, string> = {
  "1x1": "", "2x1": "md:col-span-2", "1x2": "md:row-span-2",
  "2x2": "md:col-span-2 md:row-span-2", "3x1": "md:col-span-3",
};

export function Tile({ label, span = "1x1", className, children }: {
  label: string; span?: keyof typeof SPANS; className?: string; children: ReactNode;
}) {
  return (
    <section className={clsx(
      "relative overflow-hidden rounded-lg border p-4 backdrop-blur-[2px] transition-colors",
      "border-[var(--tile-border)] bg-[color-mix(in_srgb,var(--tile)_85%,transparent)] hover:border-[var(--tile-border-hover)]",
      SPANS[span], className)}>
      <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--label)]">{label}</h2>
      {children}
    </section>
  );
}
```

- [ ] **Step 6: Implement `IdentityTile.tsx`**

```tsx
// src/components/bento/tiles/IdentityTile.tsx
"use client";

import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { Tile } from "../Tile";
import { useReducedMotion, useScramble } from "../effects";

function useLocalClock(): string {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase());
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);
  return t ?? "3:04 am"; // static pre-mount placeholder, on-lore
}

export function IdentityTile() {
  const reduced = useReducedMotion();
  const tagline = useScramble(site.tagline, !reduced);
  const clock = useLocalClock();
  const links = [
    ...site.socials.map((s) => ({ label: s.label.toLowerCase(), href: s.href })),
    { label: "resume", href: site.resumeHref },
  ];
  return (
    <Tile label={`rohan yadav · bangalore · ${clock}`} span="2x2">
      <p className="mt-5 font-sans text-5xl font-extrabold leading-[1.04] tracking-tight text-[var(--ink)] lg:text-6xl">
        {tagline.replace(/\.$/, "")}
        <span className="text-[var(--amber)]">.</span>
      </p>
      <p className="mt-4 font-mono text-xs text-[var(--dim)]">
        engineer · senior swe @ <a href="https://atlys.com" target="_blank" rel="noreferrer" className="text-[var(--ink)] underline-offset-2 hover:underline">atlys</a>
      </p>
      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-[var(--dim)]">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} target="_blank" rel="noreferrer" className="hover:text-[var(--amber)]">{l.label}</a>
          </li>
        ))}
      </ul>
    </Tile>
  );
}
```

Note: `useScramble` returns `""` on the server/first paint when enabled — acceptable (the hero types itself in). The trailing-dot split keeps the amber period stable during scramble.

- [ ] **Step 7: Run all gates.** Checkpoint: report files changed.

---

### Task 5: DoorTile, VerseTile, PlateTile (the idle-budget tiles)

**Files:**
- Create: `src/components/bento/tiles/DoorTile.tsx`
- Create: `src/components/bento/tiles/VerseTile.tsx`
- Create: `src/components/bento/tiles/PlateTile.tsx`
- Modify: `src/app/globals.css` (append tile keyframes)

**Interfaces:**
- Consumes: `Tile`, `useReducedMotion`, `DOOR_TEASER` (Task 2), `site.projects` (Verse and Plate entries by title).
- Produces: three tile components, no props.

- [ ] **Step 1: Append keyframes to `globals.css`**

```css
/* ── bento tile animations (idle budget: these three only) ── */
@keyframes bento-lyric { 0%, 28% { opacity: 1; transform: translateY(0); } 33%, 95% { opacity: 0; transform: translateY(-6px); } 100% { opacity: 1; } }
@keyframes bento-ring { 0%, 100% { box-shadow: 0 0 0 0 rgba(226, 75, 74, 0.35); } 50% { box-shadow: 0 0 0 8px rgba(226, 75, 74, 0); } }
@keyframes bento-window { 0%, 92%, 100% { opacity: 1; } 94% { opacity: 0.55; } 96% { opacity: 0.9; } 98% { opacity: 0.7; } }
@media (prefers-reduced-motion: reduce) {
  .bento-lyric span, .bento-ring, .bento-window { animation: none !important; }
  .bento-lyric span:not(:first-child) { display: none; }
}
```

- [ ] **Step 2: `DoorTile.tsx`** — always-night tile (hardcoded night colors, not vars — spec §5):

```tsx
// src/components/bento/tiles/DoorTile.tsx
import Link from "next/link";
import { DOOR_TEASER } from "@/content/bento";

export function DoorTile() {
  return (
    <Link href="/3am" className="group relative overflow-hidden rounded-lg border border-[#26262e] bg-[#120d14]/90 p-4 transition-colors hover:border-[#ff5c7a66] md:row-span-2">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8fa3]">after hours</h2>
      <p className="mt-4 font-sans text-2xl font-extrabold leading-tight text-[#ff5c7a] [text-shadow:0_0_12px_rgba(255,92,122,.6)] transition-transform duration-300 group-hover:translate-x-1">
        it&apos;s 3am<br />in here →
      </p>
      <p className="mt-3 font-mono text-[11px] leading-relaxed text-[#6d6d80]">
        {DOOR_TEASER.map((l) => (<span key={l}>{l}<br /></span>))}
      </p>
      <span aria-hidden className="absolute bottom-3 right-3 block h-[52px] w-[76px] bg-[#16121d] [clip-path:polygon(0_40%,50%_0,100%_40%,100%_100%,0_100%)]">
        <span className="bento-window absolute bottom-2 right-3 block h-4 w-3.5 bg-[#ffb35c] shadow-[0_0_16px_5px_rgba(255,179,92,.55)]" style={{ animation: "bento-window 5s infinite" }} />
      </span>
    </Link>
  );
}
```

- [ ] **Step 3: `VerseTile.tsx`**

```tsx
// src/components/bento/tiles/VerseTile.tsx
import { site } from "@/content/site";
import { Tile } from "../Tile";

const LINES = [
  "♪ and the city hums along in gold…",
  "♪ the streetlights hum our tune…",
  "♪ gold in the dark of the rain…",
] as const;

export function VerseTile() {
  const verse = site.projects.find((p) => p.title === "Verse");
  return (
    <Tile label="verse — lyrics in a pill">
      <a href={verse?.href} target="_blank" rel="noreferrer" className="absolute inset-0" aria-label="Verse — open site" />
      <div className="bento-lyric relative mt-4 h-11">
        {LINES.map((l, i) => (
          <span key={l} className="absolute font-mono text-xs italic text-[var(--lyric)]"
                style={{ animation: "bento-lyric 6s infinite", animationDelay: `${i * 2}s` }}>{l}</span>
        ))}
      </div>
      <p className="absolute bottom-3 font-mono text-[9px] text-[var(--dim)]">swift · macos ↗</p>
    </Tile>
  );
}
```

- [ ] **Step 4: `PlateTile.tsx`**

```tsx
// src/components/bento/tiles/PlateTile.tsx
"use client";

import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { Tile } from "../Tile";

/** Heat derives from local time: coolest at 9am, ember by midnight (a joke recruiters can feel). */
function heatFractionAt(hour: number): number {
  return Math.min(1, Math.max(0.15, ((hour + 24 - 9) % 24) / 15));
}

export function PlateTile() {
  const [heat, setHeat] = useState(0.6);
  useEffect(() => { setHeat(heatFractionAt(new Date().getHours())); }, []);
  const plate = site.projects.find((p) => p.title === "Plate");
  const label = heat > 0.85 ? "on fire" : heat > 0.5 ? "getting warm" : "comfortable";
  const deg = Math.round(heat * 360);
  return (
    <Tile label="plate — nothing slips">
      <a href={plate?.href} target="_blank" rel="noreferrer" className="absolute inset-0" aria-label="Plate — open site" />
      <div className="mt-4 flex items-center gap-3.5">
        <span aria-hidden className="bento-ring relative block h-[52px] w-[52px] rounded-full"
              style={{ background: `conic-gradient(#646470 0deg, #ef9f27 ${Math.min(deg, 270)}deg, #e24b4a ${deg}deg, #2a2a33 ${deg}deg)`, animation: "bento-ring 2.4s infinite" }}>
          <span className="absolute inset-[7px] rounded-full bg-[var(--tile)]" />
        </span>
        <p className="font-mono text-[11px] text-[var(--dim)]">deadline heat:<br /><span className="text-[#ef9f27]">{label}</span></p>
      </div>
      <p className="absolute bottom-3 font-mono text-[9px] text-[var(--dim)]">swift · on-device llm ↗</p>
    </Tile>
  );
}
```

- [ ] **Step 5: Run all gates.** Checkpoint: report files changed.

---

### Task 6: ClickbaitTile, JobsTile, MeanwhileTile, MoreTile

**Files:**
- Create: `src/components/bento/tiles/ClickbaitTile.tsx`
- Create: `src/components/bento/tiles/JobsTile.tsx`
- Create: `src/components/bento/tiles/MeanwhileTile.tsx`
- Create: `src/components/bento/tiles/MoreTile.tsx`
- Test: `src/components/bento/__tests__/dodge.test.ts`

**Interfaces:**
- Consumes: `Tile`, Task 2 exports, `site.experience`, `site.projects`.
- Produces: four tile components; `dodgePosition(tileW, tileH, targetX, targetY, cursorX, cursorY, size): {x,y} | null` exported from `ClickbaitTile.tsx` (null = no move needed).

- [ ] **Step 1: Failing test for the dodge math**

```ts
// src/components/bento/__tests__/dodge.test.ts
import { describe, expect, it } from "vitest";
import { dodgePosition } from "../tiles/ClickbaitTile";

describe("dodgePosition", () => {
  it("does not move when the cursor is far away", () => {
    expect(dodgePosition(300, 150, 250, 120, 20, 20, 22)).toBeNull();
  });
  it("moves away from a near cursor and stays inside the tile", () => {
    const p = dodgePosition(300, 150, 250, 120, 245, 115, 22);
    expect(p).not.toBeNull();
    expect(p!.x).toBeGreaterThanOrEqual(6);
    expect(p!.x).toBeLessThanOrEqual(300 - 22 - 6);
    expect(p!.y).toBeGreaterThanOrEqual(6);
    expect(p!.y).toBeLessThanOrEqual(150 - 22 - 6);
    const away = Math.hypot(p!.x - 245, p!.y - 115) > Math.hypot(250 - 245, 120 - 115);
    expect(away).toBe(true);
  });
});
```

- [ ] **Step 2: Run** — `pnpm test -- dodge` — expect FAIL.

- [ ] **Step 3: `ClickbaitTile.tsx`**

```tsx
// src/components/bento/tiles/ClickbaitTile.tsx
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
    <Tile label="clickbait — reaction game">
      <div ref={ref} className="absolute inset-0"
           onMouseMove={(e) => {
             const el = ref.current; if (!el) return;
             const r = el.getBoundingClientRect();
             const t = pos ?? { x: r.width - size - 16, y: r.height - size - 16 };
             const next = dodgePosition(r.width, r.height, t.x, t.y, e.clientX - r.left, e.clientY - r.top, size);
             if (next) setPos(next);
           }}>
        <a href={cb?.href} target="_blank" rel="noreferrer" className="absolute inset-0" aria-label="clickbait — play it" />
        <p className="mt-9 px-4 font-mono text-[11px] leading-relaxed text-[var(--dim)]">click the target.<br />that&apos;s the whole game.</p>
        <button type="button" aria-label="the target. good luck."
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setHits((h) => h + 1); }}
                className="absolute h-[22px] w-[22px] cursor-crosshair border-0 transition-all duration-200"
                style={{ left: pos ? pos.x : undefined, top: pos ? pos.y : undefined, right: pos ? undefined : 16, bottom: pos ? undefined : 16, background: hits >= 3 ? "var(--door-pink)" : "var(--lime)" }}>
          {hits >= 3 ? "🎉" : ""}
        </button>
        <p className="absolute bottom-3 left-4 font-mono text-[9px] text-[var(--dim)]">ts · postgres ↗</p>
      </div>
    </Tile>
  );
}
```

Mobile note (spec §7): on touch devices there's no mousemove, so the target simply sits still and takes taps — no extra code needed.

- [ ] **Step 4: Run dodge test** — expect PASS.

- [ ] **Step 5: `JobsTile.tsx`**

```tsx
// src/components/bento/tiles/JobsTile.tsx
import { site } from "@/content/site";
import { Tile } from "../Tile";

const ONE_LINERS: Record<string, string> = {
  Atlys: "cross-sell · visa infra · ai-native",
  Quantive: "llm systems · vector retrieval",
  "Cliff.ai": "anomaly detection · acquired",
};

export function JobsTile() {
  return (
    <Tile label="the day jobs" span="2x1">
      <ul className="mt-2">
        {site.experience.map((e) => (
          <li key={e.company} className="border-t border-[var(--tile-border)] first:border-t-0">
            <a href={e.href} target="_blank" rel="noreferrer" className="group flex items-baseline justify-between gap-4 py-1.5">
              <span className="font-mono text-xs font-semibold text-[var(--ink)] group-hover:text-[var(--amber)]">{e.company.toLowerCase()}</span>
              <span className="truncate font-mono text-[10px] text-[var(--dim)]">{(ONE_LINERS[e.company] ?? e.role.toLowerCase())} · {e.period.toLowerCase()}</span>
            </a>
          </li>
        ))}
      </ul>
    </Tile>
  );
}
```

- [ ] **Step 6: `MeanwhileTile.tsx`**

```tsx
// src/components/bento/tiles/MeanwhileTile.tsx
"use client";

import { useEffect, useState } from "react";
import { PRESENCE_LINES, PRESENCE_FOOTNOTE, presenceLineIndex } from "@/content/bento";
import { Tile } from "../Tile";
import { useReducedMotion } from "../effects";

const VISIT_KEY = "poortfolio-visits";

export function MeanwhileTile() {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    let visits = 0;
    try {
      visits = Number(localStorage.getItem(VISIT_KEY) ?? "0");
      localStorage.setItem(VISIT_KEY, String(visits + 1));
    } catch { /* private mode */ }
    setIdx(presenceLineIndex(visits, PRESENCE_LINES.length));
  }, []);
  useEffect(() => {
    if (reduced) return;
    const iv = setInterval(() => setIdx((i) => presenceLineIndex(i + 1, PRESENCE_LINES.length)), 9000);
    return () => clearInterval(iv);
  }, [reduced]);
  return (
    <Tile label="meanwhile, somewhere in bangalore">
      <p className="mt-4 flex items-start gap-2 font-mono text-xs leading-relaxed text-[var(--ink)]">
        <span aria-hidden className="mt-1 block h-2 w-2 shrink-0 rounded-full bg-[var(--presence)]" />
        {PRESENCE_LINES[idx]}
      </p>
      <p className="absolute bottom-3 font-mono text-[9px] text-[var(--dim)]">{PRESENCE_FOOTNOTE}</p>
    </Tile>
  );
}
```

(The status-dot pulse from the mockup is dropped — spec §3 row 7 allows it only if it survives review; a static dot ships first. The slow line cycle pauses under reduced motion.)

- [ ] **Step 7: `MoreTile.tsx`**

```tsx
// src/components/bento/tiles/MoreTile.tsx
import { site } from "@/content/site";
import { MORE_PROJECT_BLURBS } from "@/content/bento";
import { Tile } from "../Tile";

const TILED = new Set(["Verse", "Plate", "clickbait"]);

export function MoreTile() {
  const rest = site.projects.filter((p) => !TILED.has(p.title));
  return (
    <Tile label="more things i've built" span="3x1">
      <ul className="mt-2 grid gap-x-6 md:grid-cols-2">
        {rest.map((p) => (
          <li key={p.title} className="border-t border-[var(--tile-border)]">
            <a href={p.href} target="_blank" rel="noreferrer" className="group flex items-baseline justify-between gap-4 py-1.5">
              <span className="font-mono text-xs font-semibold text-[var(--ink)] group-hover:text-[var(--amber)]">{p.title.toLowerCase()}</span>
              <span className="truncate font-mono text-[10px] text-[var(--dim)]">{MORE_PROJECT_BLURBS[p.title] ?? p.stack.slice(0, 3).join(" · ").toLowerCase()}</span>
            </a>
          </li>
        ))}
      </ul>
    </Tile>
  );
}
```

- [ ] **Step 8: Run all gates.** Checkpoint: report files changed.

---

### Task 7: Easter eggs (konami + "sekiro")

**Files:**
- Create: `src/components/bento/eggs.tsx`
- Test: `src/components/bento/__tests__/eggs.test.ts`

**Interfaces:**
- Produces: `matchSequence(buffer: string[], sequence: string[]): boolean` (suffix match), `<EasterEggs />` (mounts key listeners + renders payoff overlays), `KONAMI: string[]`, `SEKIRO: string[]`.

- [ ] **Step 1: Failing test**

```ts
// src/components/bento/__tests__/eggs.test.ts
import { describe, expect, it } from "vitest";
import { matchSequence, KONAMI, SEKIRO } from "../eggs";

describe("matchSequence", () => {
  it("matches when the buffer ends with the sequence", () => {
    expect(matchSequence(["x", ...SEKIRO], SEKIRO)).toBe(true);
  });
  it("rejects partial or interrupted sequences", () => {
    expect(matchSequence(SEKIRO.slice(0, -1), SEKIRO)).toBe(false);
    expect(matchSequence([...SEKIRO.slice(0, 3), "q", ...SEKIRO], SEKIRO)).toBe(true); // retyping the full word after junk works
    expect(matchSequence(["s", "e", "k", "q", "i", "r", "o"], SEKIRO)).toBe(false); // junk mid-word breaks the suffix
  });
  it("konami is the classic 10 inputs", () => {
    expect(KONAMI).toHaveLength(10);
  });
});
```

- [ ] **Step 2: Run** — expect FAIL.

- [ ] **Step 3: Implement `eggs.tsx`**

```tsx
// src/components/bento/eggs.tsx
"use client";

import { useEffect, useState } from "react";

export const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
export const SEKIRO = ["s", "e", "k", "i", "r", "o"];

export function matchSequence(buffer: string[], sequence: string[]): boolean {
  if (buffer.length < sequence.length) return false;
  const tail = buffer.slice(-sequence.length);
  return sequence.every((k, i) => tail[i] === k);
}

/** Payoffs (cheap, reversible): sekiro = amber "parry" flash ring from screen center;
 *  konami = the sky briefly rains pixel squares. Both auto-clean after ~1.2s. */
export function EasterEggs() {
  const [payoff, setPayoff] = useState<"none" | "parry" | "pixels">("none");
  useEffect(() => {
    let buf: string[] = [];
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      buf = [...buf.slice(-19), e.key];
      if (matchSequence(buf, SEKIRO)) { setPayoff("parry"); buf = []; }
      else if (matchSequence(buf, KONAMI)) { setPayoff("pixels"); buf = []; }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
  useEffect(() => {
    if (payoff === "none") return;
    const t = setTimeout(() => setPayoff("none"), 1200);
    return () => clearTimeout(t);
  }, [payoff]);
  if (payoff === "none") return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 grid place-items-center">
      {payoff === "parry" ? (
        <div className="h-24 w-24 animate-ping rounded-full border-4 border-[var(--amber)] [animation-iteration-count:2]" />
      ) : (
        <div className="grid grid-cols-8 gap-3">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="h-2 w-2 animate-bounce bg-[var(--amber)]" style={{ animationDelay: `${(i % 8) * 60}ms` }} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run** — expect PASS. Run all gates. Checkpoint: report files changed.

---

### Task 8: Page swap, footer, old-component teardown, responsive pass

**Files:**
- Create: `src/components/bento/BentoGrid.tsx`
- Modify: `src/app/page.tsx` (full replacement)
- Modify: `src/app/layout.tsx` (metadata `description` → `site.bio` if not already)
- Delete: `src/components/layout/Sidebar.tsx`, `src/components/sections/About.tsx`, `src/components/sections/Experience.tsx`, `src/components/sections/Projects.tsx`, `src/components/layout/Footer.tsx`, `src/components/layout/ScrollToTop.tsx`
- Delete (only if grep-orphaned): `src/components/ui/SectionHeading.tsx`, `ArrowLink.tsx`, `SkillTag.tsx`, `SocialLinks.tsx`, `src/components/motion/Reveal.tsx`

**Interfaces:**
- Consumes: every component from Tasks 3–7.

- [ ] **Step 1: `BentoGrid.tsx`**

```tsx
// src/components/bento/BentoGrid.tsx
import { FOOTER_WHISPER } from "@/content/bento";
import { SkyBackground } from "./SkyBackground";
import { EasterEggs } from "./eggs";
import { IdentityTile } from "./tiles/IdentityTile";
import { DoorTile } from "./tiles/DoorTile";
import { VerseTile } from "./tiles/VerseTile";
import { PlateTile } from "./tiles/PlateTile";
import { ClickbaitTile } from "./tiles/ClickbaitTile";
import { JobsTile } from "./tiles/JobsTile";
import { MeanwhileTile } from "./tiles/MeanwhileTile";
import { MoreTile } from "./tiles/MoreTile";

export function BentoGrid() {
  return (
    <div className="relative min-h-dvh">
      <SkyBackground />
      <EasterEggs />
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-3.5 px-4 py-6 md:grid-cols-3 md:auto-rows-[minmax(150px,auto)] lg:px-8">
        <IdentityTile />
        <DoorTile />
        <VerseTile />
        <PlateTile />
        <ClickbaitTile />
        <JobsTile />
        <MeanwhileTile />
        <MoreTile />
      </main>
      <footer className="pb-6 text-center font-mono text-[10px] text-[var(--dim)]">
        © rohan · <a href="https://github.com/cpt-nem0/poortfolio" target="_blank" rel="noreferrer" className="hover:text-[var(--amber)]">source</a> · <span className="opacity-60">{FOOTER_WHISPER}</span>
      </footer>
    </div>
  );
}
```

Mobile reading order (spec §7) is the JSX order above; `md:` prefixes keep 1-column stacking below 768px. `DoorTile` self-spans `md:row-span-2`.

- [ ] **Step 2: Replace `page.tsx`**

```tsx
import { BentoGrid } from "@/components/bento/BentoGrid";

export default function Home() {
  return <BentoGrid />;
}
```

- [ ] **Step 3: Teardown** — delete the six components listed above. Then `grep -rn "SectionHeading\|ArrowLink\|SkillTag\|SocialLinks\|motion/Reveal" src/ --include="*.tsx"` — delete each ui/motion component only if it has zero remaining imports. If `Reveal` or others are still imported anywhere, leave them and note it in the report.

- [ ] **Step 4: Body background guard** — check `globals.css`/`layout.tsx` for a hardcoded page background that would sit on top of the fixed sky (e.g. `bg-slate-900` on `<body>`); if present, make `/`'s body transparent by moving that background into the `/3am` layer or scoping it — smallest correct change, report what you did.

- [ ] **Step 5: Run all four gates** (expect test count ≥ baseline+new; tsc/lint clean; build green — the deleted components must leave no dangling imports).

- [ ] **Step 6: Programmatic sanity via the running dev server** (do not start a second): `curl -s localhost:3000 | grep -o "after hours\|the day jobs\|meanwhile" | sort -u` → expect all three strings. Checkpoint: report files changed + deletions.

---

### Task 9 (coordinator, not an agent): browser verification + Rohan walkthrough

- [ ] Coordinator browser-verifies (agent-browser): night theme default, moon click → day (door tile stays dark), theme persists on reload, scramble runs once, clock ticks, clickbait target dodges, mobile 390px stacks in reading order, reduced-motion via `agent-browser media reduced-motion` freezes idle animation, `/3am` completely unaffected (visual spot-check + credits button still present).
- [ ] Rohan walkthrough checklist (his eyes, both themes): tagline type feel, cloud speed/opacity, tile density at his window size, presence-line tone, egg payoffs, day-palette taste. Feel fixes iterate inline.

---

## Self-review notes

- Spec §2 "killed: marquee/how-i-work" — no task builds them ✓. Motion budget: lyric (T5), ring (T5), window (T5), presence dot shipped static (T6) ✓. Scramble is a one-shot, not idle ✓.
- Spec §4 `dive` prop reserved-as-comment only (T3) ✓; §5 day door-tile stays night (T5 DoorTile hardcodes) ✓; §6 old components deleted (T8), about paragraphs untouched in site.ts ✓; §7 mobile stack + reduced-motion (T4 hook, T3/T5 CSS, T6 interval pause) ✓; §8 no new deps, transform/opacity only ✓; §9 tests: theme (T1), content (T2), scramble (T4), dodge (T6), eggs (T7) ✓.
- Type consistency: `ThemeName` defined T1, consumed T3; `presenceLineIndex(visitCount, lineCount)` defined T2, consumed T6; `Tile` span keys defined T4, used T5/T6 ✓.
- Known judgment calls left to review: `color-mix` in Tile background (supported in all evergreen browsers), `min-h-dvh`, and the `useScramble` empty-first-paint tradeoff (documented in T4).
