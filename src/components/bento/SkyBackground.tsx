"use client";

import { useCallback, useEffect, useState } from "react";
import { THEME_STORAGE_KEY, type ThemeName } from "./theme";

/* Cloud layer: drifting box, contents are pixel-art sprites (see
 * PIXELATED sprites below). Reserved for the /3am entry cinematic: a
 * future `dive` prop will accelerate/scale these layers — do not
 * implement now (spec §4). */

const CLOUD_LAYERS = [
  { variant: 1, top: "6%", scale: 1.3, duration: 150, delay: -20, opacity: 0.45 },
  { variant: 2, top: "20%", scale: 0.7, duration: 190, delay: -80, opacity: 0.55 },
  { variant: 3, top: "33%", scale: 1.6, duration: 230, delay: -140, opacity: 0.3 },
  { variant: 1, top: "48%", scale: 0.6, duration: 260, delay: -40, opacity: 0.25 },
  { variant: 2, top: "61%", scale: 1.1, duration: 120, delay: -95, opacity: 0.5 },
  { variant: 3, top: "75%", scale: 0.9, duration: 205, delay: -10, opacity: 0.35 },
] as const;

/* Deterministic integer hash (bitwise/Math.imul only, no Math.random or
 * transcendental fns) so star positions are identical on server and client
 * render — avoids hydration mismatches. */
function starHash(seed: number): number {
  let x = (seed * 2654435761) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  x = Math.imul(x, 3266489917);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

const STAR_COUNT = 40;
const STARS = Array.from({ length: STAR_COUNT }, (_, i) => {
  const base = i * 6 + 1;
  return {
    left: `${(starHash(base) * 100).toFixed(2)}%`,
    top: `${(starHash(base + 1) * 64).toFixed(2)}%`,
    size: starHash(base + 2) > 0.75 ? 2 : 1,
    duration: 4 + starHash(base + 3) * 4,
    delay: -(starHash(base + 4) * 8),
  };
});

/* Pixel-art sprites (owner-approved, Stitch-generated), extracted by
 * scripts/pixelart/gen-celestial.mjs (moon/sun/bloodmoon) and
 * scripts/pixelart/gen-clouds.mjs (clouds) into true-alpha PNGs. Plain
 * <img>, not next/image — tiny local pixel art, next/image blurs it. */
const PIXELATED = { imageRendering: "pixelated" } as const;

const CLOUD_THEMES = ["night", "day", "bloodmoon"] as const;

function readTheme(): ThemeName {
  return document.documentElement.getAttribute("data-theme") === "day" ? "day" : "night";
}

export function SkyBackground() {
  const [theme, setTheme] = useState<ThemeName | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the DOM theme attribute after mount, avoids SSR/CSR hydration mismatch
  useEffect(() => setTheme(readTheme()), []);

  const toggle = useCallback(() => {
    const next: ThemeName = readTheme() === "night" ? "day" : "night";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* private mode */ }
    setTheme(next);
  }, []);

  const night = theme !== "day"; // null (pre-mount) renders night visuals; attribute drives colors anyway

  return (
    <>
      <div aria-hidden={false} className="fixed inset-0 -z-10 overflow-hidden transition-[background] duration-500"
           style={{ background: "linear-gradient(180deg, var(--sky-from), var(--sky-2), var(--sky-3), var(--sky-to))" }}>
        <div aria-hidden className="bento-stars pointer-events-none absolute inset-0 overflow-hidden">
          {STARS.map((s, i) => (
            <span key={i} className="bento-star absolute rounded-full"
                  style={{
                    left: s.left, top: s.top, width: s.size, height: s.size,
                    background: "var(--star)",
                    animation: `bento-twinkle-soft ${s.duration}s ease-in-out infinite`,
                    animationDelay: `${s.delay}s`,
                  }} />
          ))}
        </div>
        {CLOUD_LAYERS.map((c, i) => (
          <div key={i} aria-hidden className="bento-cloud absolute h-20 w-60"
               style={{
                 top: c.top, opacity: c.opacity,
                 scale: String(c.scale),
                 animation: `bento-drift ${c.duration}s linear infinite`,
                 animationDelay: `${c.delay}s`,
               }}>
            {/* All three theme variants live in the DOM; [data-theme]/
                [data-eclipse] attribute selectors crossfade them, same
                pattern as the celestial sprites below. */}
            {CLOUD_THEMES.map((cloudTheme) => (
              // eslint-disable-next-line @next/next/no-img-element -- tiny local pixel art, next/image blurs it
              <img key={cloudTheme} src={`/9am/clouds/${cloudTheme}-${c.variant}.png`} alt=""
                   className={`bento-cloud-sprite bento-cloud-sprite-${cloudTheme} absolute inset-0 h-full w-full object-contain`}
                   style={PIXELATED} />
            ))}
          </div>
        ))}
      </div>
      {/* Button box sized to the larger sprite (sun); the smaller moon sprite
          is centered inside it. */}
      <button type="button" onClick={toggle}
              aria-label={night ? "switch to day" : "switch to night"}
              className="bento-celestial absolute right-4 top-4 z-20 h-16 w-16 cursor-pointer rounded-full border-0 p-0 transition-all duration-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)] md:fixed">
        {/* Both bodies live in the DOM; the "eclipse pass" transition between
            them is driven purely by the [data-theme] attribute selector. */}
        <span aria-hidden className="bento-celestial-slot bento-moon-slot absolute inset-0">
          <span className="bento-celestial-drift relative block h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny local pixel art, next/image blurs it */}
            <img src="/9am/celestial/moon.png" alt="" className="bento-moon-sprite absolute left-1/2 top-1/2 h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2" style={PIXELATED} />
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny local pixel art, next/image blurs it */}
            <img src="/9am/celestial/bloodmoon.png" alt="" className="bento-bloodmoon-sprite absolute left-1/2 top-1/2 h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2" style={PIXELATED} />
          </span>
        </span>
        <span aria-hidden className="bento-celestial-slot bento-sun-slot absolute inset-0">
          <span className="bento-celestial-drift block h-full w-full">
            <span className="bento-sun-breathe block h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny local pixel art, next/image blurs it */}
              <img src="/9am/celestial/sun.png" alt="" className="block h-full w-full" style={PIXELATED} />
            </span>
          </span>
        </span>
      </button>
    </>
  );
}
