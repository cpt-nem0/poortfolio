import { readFileSync } from "node:fs";
import jpeg from "jpeg-js";
import { writePng } from "./png.mjs";

/**
 * Akira one-sheet extractor (owner-supplied artwork, owner-directed swap
 * 2026-08-09 — replaces the earlier from-scratch homage in gen-variants).
 * Standalone: NOT wired into gen-variants.mjs or any JOBS array, same
 * pattern as gen-celestial.mjs.
 *
 * Input design/akira-raw/akira.jpg (1000x1500, 2:3) is the 1988 theatrical
 * poster, © 1988 Akira Committee / Toho — included at the owner's explicit
 * direction for personal-site fan use. This script:
 *   1. decodes the JPEG,
 *   2. area-averages each output cell (integer accumulation, ~7.8px cells),
 *   3. quantizes channels to 8-level steps for a light pixel-art flatness,
 *   4. writes a 128x192 PNG to public/3am/tex/poster-akira-film.png.
 *
 * ("-film" suffix: the path deliberately differs from the retired homage's
 * poster-akira.png so stale browser caches can never show the old art.)
 *
 * 128x192 keeps the house's chunky-pixel feel while the bike, the rider,
 * and the title still read; the credits block dissolves into texture.
 * Deterministic: no Math.random, no Date — re-running is byte-identical.
 */

const SRC = "design/akira-raw/akira.jpg";
const OUT = "public/3am/tex/poster-akira-film.png";
const TW = 128, TH = 192;

const img = jpeg.decode(readFileSync(SRC), { useTArray: true });

function cellAvg(tx, ty) {
  const x0 = Math.floor((tx * img.width) / TW);
  const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * img.width) / TW));
  const y0 = Math.floor((ty * img.height) / TH);
  const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * img.height) / TH));
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * img.width + x) * 4;
      r += img.data[i];
      g += img.data[i + 1];
      b += img.data[i + 2];
      n++;
    }
  }
  const q = (v) => Math.min(255, Math.round(v / n / 8) * 8);
  return [q(r), q(g), q(b)];
}

await writePng(OUT, TW, TH, cellAvg);
console.log(`wrote ${OUT} (${TW}x${TH}) from ${SRC} (${img.width}x${img.height})`);
