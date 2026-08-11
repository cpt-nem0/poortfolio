import { readFileSync } from "node:fs";
import pkg from "pngjs";
import { writePng } from "./png.mjs";

const { PNG } = pkg;

/**
 * Extracts the 死 glyph from the owner-supplied death-screen reference into a
 * transparent PNG. Standalone, NOT wired into gen-variants.mjs — same pattern
 * as gen-celestial.mjs / gen-clouds.mjs / gen-akira.mjs.
 *
 * Why an image rather than a font: the glyph has to carry real brush strokes,
 * and a calligraphic CJK font is multiple megabytes for a single character.
 * Keying it out of the reference gives the exact strokes for ~10KB, renders
 * identically on every platform, and lets CSS `drop-shadow()` trace the stroke
 * silhouette — which is what the shrinking-glow animation needs.
 *
 * The reference's own baked glow is deliberately thrown away: only the solid
 * core survives, so the glow can be driven (and animated) in CSS instead of
 * being burned into the pixels.
 *
 * Deterministic: fixed crop, fixed thresholds, no Math.random, no Date.
 */

const SRC = "design/death-raw/death-screen.png";
const OUT = "public/9am/death-kanji.png";

// Glyph bounds in the 1920x1080 source, measured by scanning for red pixels:
// the kanji occupies y265-628, the "DEATH" wordmark sits separately at y684-718
// (a 55-row gap between them) and is NOT included — that word is real text in
// the overlay so it can inherit the same CSS treatment.
const CROP = { x: 740, y: 258, w: 448, h: 378 };

// Alpha ramp on the red channel. Below LO is the reference's own glow halo and
// is discarded; above HI is solid stroke. Between them the source's own
// anti-aliasing is preserved, which keeps the brush edges smooth.
const LO = 60;
const HI = 125;

const src = PNG.sync.read(readFileSync(SRC));

function pixel(x, y) {
  const sx = CROP.x + x;
  const sy = CROP.y + y;
  const i = (sy * src.width + sx) * 4;
  const r = src.data[i];
  const g = src.data[i + 1];
  const b = src.data[i + 2];

  // Reject anything that isn't distinctly red — guards against stray
  // near-black noise sneaking in via the ramp.
  if (!(r > g * 1.6 && r > b * 1.6)) return [0, 0, 0, 0];

  let a;
  if (r <= LO) a = 0;
  else if (r >= HI) a = 255;
  else a = Math.round(((r - LO) / (HI - LO)) * 255);
  if (a === 0) return [0, 0, 0, 0];

  // Flat stroke colour — owner-picked #b5251b, fixed here so the output
  // doesn't inherit the reference halo's darker falloff.
  return [181, 37, 27, a];
}

await writePng(OUT, CROP.w, CROP.h, pixel);
console.log(`wrote ${OUT} (${CROP.w}x${CROP.h}) from ${SRC}`);
