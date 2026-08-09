import { readFileSync } from "node:fs";
import jpeg from "jpeg-js";
import { writePng } from "./png.mjs";

/**
 * Celestial sprite extractor (Stitch-generated, owner-approved pixel art).
 * Standalone: NOT wired into gen-variants.mjs or any JOBS array.
 *
 * Inputs (design/celestial-raw/*.png) are actually 512x512 baseline JPEGs
 * saved with a .png extension — a checkerboard is baked into the pixels to
 * preview transparency, there's no real alpha channel. This script:
 *   1. decodes the JPEG,
 *   2. detects the sprite's pixel-art grid (verified empirically at 16px
 *      cells -> 32x32 logical pixels for all three sources — see edge-ratio
 *      probe in the task notes; adjust CELL/OFFSET below if a future source
 *      doesn't match),
 *   3. median-samples the center of each cell (shrugs off JPEG ringing),
 *   4. classifies checkerboard cells (neutral, and within the checker
 *      lightness band learned from that source's corners — moon/sun use a
 *      light checker, bloodmoon a dark one) as fully transparent,
 *   5. quantizes the remaining opaque cells to a <=8 color palette per
 *      sprite for crisp flat-shaded output,
 *   6. writes a true-alpha 32x32 PNG to public/9am/celestial/.
 *
 * Deterministic: no Math.random, no Date, no external state — median +
 * threshold + a farthest-point/Lloyd quantizer with fixed iteration counts.
 * Re-running produces byte-identical output.
 */

const CELL = 16; // px per logical pixel in the 512x512 source
const LOGICAL = 512 / CELL; // 32
const OFFSET_X = 0;
const OFFSET_Y = 0;
const SAMPLE = 6; // center patch side length (px) used for the per-cell median
const MAX_COLORS = 8;

const SOURCES = [
  { name: "moon", in: "design/celestial-raw/moon.png", out: "public/9am/celestial/moon.png" },
  { name: "sun", in: "design/celestial-raw/sun.png", out: "public/9am/celestial/sun.png" },
  { name: "bloodmoon", in: "design/celestial-raw/bloodmoon.png", out: "public/9am/celestial/bloodmoon.png" },
];

const PREVIEW_DIR = "scripts/pixelart/.celestial-preview";
const PREVIEW_SCALE = 12;

function decodeSource(path) {
  return jpeg.decode(readFileSync(path), { useTArray: true });
}

function pixelAt(img, x, y) {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Median RGB of a small center patch inside logical cell (cx, cy). */
function sampleCell(img, cx, cy) {
  const cellX0 = OFFSET_X + cx * CELL;
  const cellY0 = OFFSET_Y + cy * CELL;
  const pad = Math.floor((CELL - SAMPLE) / 2);
  const rs = [], gs = [], bs = [];
  for (let y = cellY0 + pad; y < cellY0 + pad + SAMPLE; y++) {
    for (let x = cellX0 + pad; x < cellX0 + pad + SAMPLE; x++) {
      const [r, g, b] = pixelAt(img, x, y);
      rs.push(r); gs.push(g); bs.push(b);
    }
  }
  return [median(rs), median(gs), median(bs)];
}

/** The checkerboard's lightness band, learned per-source from its corners
 * (guaranteed background, since every sprite here is a centered disc well
 * short of the 512x512 edges). moon/sun use a light checker, bloodmoon a
 * dark one, and anti-aliased blending against ray tips widens the band
 * beyond a clean two-tone alternation — so a min/max range (trimmed of
 * outliers, padded slightly) is more robust here than matching against a
 * fixed pair of tones. */
function checkerLightnessRange(img) {
  const margin = 24, step = 3;
  const corners = [
    [0, 0], [img.width - margin, 0],
    [0, img.height - margin], [img.width - margin, img.height - margin],
  ];
  const lightnesses = [];
  for (const [cx0, cy0] of corners) {
    for (let y = cy0; y < cy0 + margin; y += step) {
      for (let x = cx0; x < cx0 + margin; x += step) {
        const [r, g, b] = pixelAt(img, x, y);
        const spread = Math.max(r, g, b) - Math.min(r, g, b);
        if (spread >= 12) continue; // skip JPEG-blur transition pixels
        lightnesses.push((r + g + b) / 3 / 255);
      }
    }
  }
  lightnesses.sort((a, b) => a - b);
  const trim = Math.floor(lightnesses.length * 0.03);
  const lo = lightnesses[trim];
  const hi = lightnesses[lightnesses.length - 1 - trim];
  const pad = 0.03;
  return [Math.max(0, lo - pad), Math.min(1, hi + pad)];
}

/** Checkerboard cell: neutral (low channel spread) AND within this
 * source's learned checker lightness band. */
function isCheckerboard([r, g, b], [lo, hi]) {
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (spread >= 10) return false;
  const lightness = (r + g + b) / 3 / 255;
  return lightness >= lo && lightness <= hi;
}

function colorDist(a, b) {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

/** Deterministic quantizer: frequency-mode init (robust to one-off JPEG
 * blend-edge outliers), then fixed Lloyd iterations. Farthest-point init
 * was tried first but wastes palette slots chasing rare anti-aliased
 * diagonal-edge pixels instead of the sprite's real flat-shaded colors. */
function quantize(colors, k) {
  const unique = [];
  for (const c of colors) {
    if (!unique.some((u) => u[0] === c[0] && u[1] === c[1] && u[2] === c[2])) unique.push(c);
  }
  if (unique.length <= k) {
    return (c) => c;
  }

  const BIN = 16;
  const bins = new Map();
  for (const c of colors) {
    const key = [Math.round(c[0] / BIN), Math.round(c[1] / BIN), Math.round(c[2] / BIN)].join(",");
    let bin = bins.get(key);
    if (!bin) { bin = { sum: [0, 0, 0], count: 0 }; bins.set(key, bin); }
    bin.sum[0] += c[0]; bin.sum[1] += c[1]; bin.sum[2] += c[2]; bin.count++;
  }
  const ranked = [...bins.values()].sort((a, b) => b.count - a.count);
  const centroids = ranked.slice(0, k).map((bin) => [
    Math.round(bin.sum[0] / bin.count),
    Math.round(bin.sum[1] / bin.count),
    Math.round(bin.sum[2] / bin.count),
  ]);

  for (let iter = 0; iter < 12; iter++) {
    const sums = centroids.map(() => [0, 0, 0, 0]);
    for (const c of colors) {
      let bi = 0, bd = Infinity;
      for (let i = 0; i < centroids.length; i++) {
        const d = colorDist(c, centroids[i]);
        if (d < bd) { bd = d; bi = i; }
      }
      sums[bi][0] += c[0]; sums[bi][1] += c[1]; sums[bi][2] += c[2]; sums[bi][3]++;
    }
    for (let i = 0; i < centroids.length; i++) {
      if (sums[i][3] > 0) {
        centroids[i] = [
          Math.round(sums[i][0] / sums[i][3]),
          Math.round(sums[i][1] / sums[i][3]),
          Math.round(sums[i][2] / sums[i][3]),
        ];
      }
    }
  }

  return (c) => {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < centroids.length; i++) {
      const d = colorDist(c, centroids[i]);
      if (d < bd) { bd = d; bi = i; }
    }
    return centroids[bi];
  };
}

async function extract({ name, in: inPath, out: outPath }) {
  const img = decodeSource(inPath);
  const refRange = checkerLightnessRange(img);
  const grid = [];
  const opaqueColors = [];
  for (let gy = 0; gy < LOGICAL; gy++) {
    const row = [];
    for (let gx = 0; gx < LOGICAL; gx++) {
      const rgb = sampleCell(img, gx, gy);
      const transparent = isCheckerboard(rgb, refRange);
      row.push({ rgb, transparent });
      if (!transparent) opaqueColors.push(rgb);
    }
    grid.push(row);
  }

  const snap = quantize(opaqueColors, MAX_COLORS);

  await writePng(outPath, LOGICAL, LOGICAL, (x, y) => {
    const cell = grid[y][x];
    if (cell.transparent) return [0, 0, 0, 0];
    const [r, g, b] = snap(cell.rgb);
    return [r, g, b, 255];
  });
  console.log(`wrote ${outPath} (${LOGICAL}x${LOGICAL})`);

  // Nearest-neighbor preview at PREVIEW_SCALE for visual QA — checkerboard
  // shown behind transparent cells so alpha holes are easy to spot.
  await writePng(`${PREVIEW_DIR}/${name}-preview.png`, LOGICAL * PREVIEW_SCALE, LOGICAL * PREVIEW_SCALE, (x, y) => {
    const gx = Math.floor(x / PREVIEW_SCALE), gy = Math.floor(y / PREVIEW_SCALE);
    const cell = grid[gy][gx];
    if (cell.transparent) {
      const checker = (Math.floor(x / 6) + Math.floor(y / 6)) % 2 === 0;
      return checker ? [230, 230, 230] : [190, 190, 190];
    }
    return [...snap(cell.rgb), 255];
  });
  console.log(`wrote ${PREVIEW_DIR}/${name}-preview.png`);
}

for (const source of SOURCES) {
  await extract(source);
}
