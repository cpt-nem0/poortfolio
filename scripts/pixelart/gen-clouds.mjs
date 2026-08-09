import { readFileSync } from "node:fs";
import jpeg from "jpeg-js";
import { writePng } from "./png.mjs";

/**
 * Cloud sprite-sheet extractor (Stitch-generated, owner-approved pixel art).
 * Standalone: NOT wired into gen-variants.mjs or any JOBS array.
 *
 * Inputs (design/cloud-raw/*.png) are 512x512 baseline JPEGs saved with a
 * .png extension — same quirk as design/celestial-raw. Each sheet stacks
 * THREE cloud sprites vertically on a checkerboard transparency preview:
 * cloud 1 = wide flat, cloud 2 = tall puffy, cloud 3 = small wispy.
 *
 * This is a superset of gen-celestial.mjs's problem (see that file for the
 * single-sprite case) plus segmentation:
 *   1. decode the JPEG,
 *   2. learn the checkerboard's lightness band from the source's corners
 *      (guaranteed background — identical technique to gen-celestial),
 *   3. classify the image into an 8x8-block grid via per-block majority
 *      vote over the per-pixel checkerboard test — this denoises JPEG
 *      ringing far better than a raw per-pixel test (a single fringe pixel
 *      can't flip a whole block), which a first attempt at row-band
 *      detection needed and lacked,
 *   4. project that grid onto rows, run a length-3 median filter to drop
 *      isolated one-block noise spikes, then take runs as the three sprite
 *      bands (top-to-bottom order = cloud 1, 2, 3),
 *   5. for each band, project columns the same way (restricted to that
 *      band's rows) to get a tight bounding box, padded 1 block per edge,
 *   6. median-sample an 8px logical grid inside each crop (same per-cell
 *      median-of-center-patch technique as gen-celestial, just re-based at
 *      the crop's own origin instead of the whole image), quantize to a
 *      small flat palette per sprite, and write a true-alpha PNG.
 *
 * Deterministic: no Math.random, no Date, no external state — median +
 * threshold + fixed-iteration Lloyd quantization, fixed-radius median
 * filter for band detection. Re-running produces byte-identical output.
 *
 * Segmentation is derived at runtime, not hardcoded from eyeballing —
 * verified against all three sources (see task notes / clouds-report.md
 * for the resulting band boxes, which land in the same ballpark across
 * sources: wide-flat ~320-416w x 112-128h, tall-puffy ~304-368w x
 * 184-216h, small-wispy ~208-240w x 72-88h, at CELL=8 that's roughly
 * 38-52 x 9-27 logical pixels per sprite).
 */

const BLOCK = 8; // px per segmentation block (majority-vote denoising grid)
const CELL = 8; // px per logical pixel when sampling each cropped sprite
const SAMPLE = 4; // center patch side length (px) used for the per-cell median
const MAX_COLORS = 8;

const SOURCES = [
  { name: "night", in: "design/cloud-raw/night-raw.png" },
  { name: "day", in: "design/cloud-raw/day-raw.png" },
  { name: "bloodmoon", in: "design/cloud-raw/bloodmoon-raw.png" },
];

const OUT_DIR = "public/9am/clouds";
const PREVIEW_DIR = "scripts/pixelart/.clouds-preview";
const PREVIEW_SCALE = 10;

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

/** Checkerboard lightness band, learned per-source from its corners — see
 * gen-celestial.mjs's checkerLightnessRange for the full rationale. */
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
        if (spread >= 12) continue;
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

function isCheckerboard([r, g, b], [lo, hi]) {
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (spread >= 10) return false;
  const lightness = (r + g + b) / 3 / 255;
  return lightness >= lo && lightness <= hi;
}

/** BLOCK x BLOCK grid of 0/1, 1 = majority of pixels in that block are
 * opaque (not checkerboard). Denoises JPEG ringing that flips isolated
 * pixels near-checker before it can pollute band/column detection. */
function foregroundBlockGrid(img, range) {
  const blocksX = Math.floor(img.width / BLOCK);
  const blocksY = Math.floor(img.height / BLOCK);
  const grid = [];
  for (let by = 0; by < blocksY; by++) {
    const row = [];
    for (let bx = 0; bx < blocksX; bx++) {
      let fg = 0, total = 0;
      for (let y = by * BLOCK; y < by * BLOCK + BLOCK; y++) {
        for (let x = bx * BLOCK; x < bx * BLOCK + BLOCK; x++) {
          total++;
          if (!isCheckerboard(pixelAt(img, x, y), range)) fg++;
        }
      }
      row.push(fg / total > 0.5 ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}

/** Length-3 median filter over a 0/1 sequence — removes single-sample
 * spikes/dips without blurring real run boundaries. */
function medianFilter1D(bin) {
  const out = bin.slice();
  for (let i = 1; i < bin.length - 1; i++) {
    out[i] = [bin[i - 1], bin[i], bin[i + 1]].sort((a, b) => a - b)[1];
  }
  return out;
}

/** Runs of 1s at least minLen long, as [start, end] inclusive indices. */
function findRuns(bin, minLen) {
  const runs = [];
  let start = null;
  for (let i = 0; i < bin.length; i++) {
    if (bin[i] && start === null) start = i;
    if (!bin[i] && start !== null) {
      if (i - start >= minLen) runs.push([start, i - 1]);
      start = null;
    }
  }
  if (start !== null && bin.length - start >= minLen) runs.push([start, bin.length - 1]);
  return runs;
}

/** Median RGB of a small center patch inside logical cell (gx, gy), based
 * at crop origin (x0, y0). Mirrors gen-celestial's sampleCell. */
function sampleCell(img, x0, y0, gx, gy) {
  const cellX0 = x0 + gx * CELL;
  const cellY0 = y0 + gy * CELL;
  const pad = Math.floor((CELL - SAMPLE) / 2);
  const rs = [], gs = [], bs = [];
  for (let y = cellY0 + pad; y < cellY0 + pad + SAMPLE; y++) {
    for (let x = cellX0 + pad; x < cellX0 + pad + SAMPLE; x++) {
      if (x >= img.width || y >= img.height) continue;
      const [r, g, b] = pixelAt(img, x, y);
      rs.push(r); gs.push(g); bs.push(b);
    }
  }
  return [median(rs), median(gs), median(bs)];
}

/** Keep only the largest 4-connected component of opaque cells, flattening
 * the rest to transparent. Each cloud is a single silhouette, so isolated
 * opaque speckles here are JPEG-ringing false positives near the
 * checkerboard/cloud edge (the corner-learned checker range doesn't
 * account for compression halos right against a hard-edged sprite) —
 * this is a cheap, deterministic way to drop them without loosening the
 * checkerboard classifier and risking real cloud-edge pixels instead. */
function keepLargestComponent(grid) {
  const h = grid.length, w = grid[0].length;
  const visited = Array.from({ length: h }, () => new Array(w).fill(false));
  let best = null, bestSize = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x].transparent || visited[y][x]) continue;
      const stack = [[x, y]];
      const cells = [];
      visited[y][x] = true;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        cells.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (visited[ny][nx] || grid[ny][nx].transparent) continue;
          visited[ny][nx] = true;
          stack.push([nx, ny]);
        }
      }
      if (cells.length > bestSize) { bestSize = cells.length; best = cells; }
    }
  }
  const keep = new Set((best ?? []).map(([x, y]) => `${x},${y}`));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!grid[y][x].transparent && !keep.has(`${x},${y}`)) grid[y][x].transparent = true;
    }
  }
}

function colorDist(a, b) {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

/** Deterministic quantizer — identical technique to gen-celestial.mjs:
 * frequency-mode init (robust to rare JPEG blend-edge outliers), then
 * fixed Lloyd iterations. */
function quantize(colors, k) {
  const unique = [];
  for (const c of colors) {
    if (!unique.some((u) => u[0] === c[0] && u[1] === c[1] && u[2] === c[2])) unique.push(c);
  }
  if (unique.length <= k) return (c) => c;

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

async function extractSprite(img, range, name, box, index) {
  const { x0, y0, w, h } = box;
  const logicalW = Math.max(1, Math.round(w / CELL));
  const logicalH = Math.max(1, Math.round(h / CELL));

  const grid = [];
  for (let gy = 0; gy < logicalH; gy++) {
    const row = [];
    for (let gx = 0; gx < logicalW; gx++) {
      const rgb = sampleCell(img, x0, y0, gx, gy);
      row.push({ rgb, transparent: isCheckerboard(rgb, range) });
    }
    grid.push(row);
  }
  keepLargestComponent(grid);
  const opaqueColors = grid.flat().filter((c) => !c.transparent).map((c) => c.rgb);

  const snap = quantize(opaqueColors, MAX_COLORS);
  const outPath = `${OUT_DIR}/${name}-${index}.png`;

  await writePng(outPath, logicalW, logicalH, (x, y) => {
    const cell = grid[y][x];
    if (cell.transparent) return [0, 0, 0, 0];
    const [r, g, b] = snap(cell.rgb);
    return [r, g, b, 255];
  });
  console.log(`wrote ${outPath} (${logicalW}x${logicalH}, source box ${w}x${h} @ ${x0},${y0})`);

  await writePng(`${PREVIEW_DIR}/${name}-${index}-preview.png`, logicalW * PREVIEW_SCALE, logicalH * PREVIEW_SCALE, (x, y) => {
    const gx = Math.floor(x / PREVIEW_SCALE), gy = Math.floor(y / PREVIEW_SCALE);
    const cell = grid[gy][gx];
    if (cell.transparent) {
      const checker = (Math.floor(x / 6) + Math.floor(y / 6)) % 2 === 0;
      return [checker ? 230 : 190, checker ? 230 : 190, checker ? 230 : 190];
    }
    return [...snap(cell.rgb), 255];
  });
}

async function extract({ name, in: inPath }) {
  const img = decodeSource(inPath);
  const range = checkerLightnessRange(img);
  const blockGrid = foregroundBlockGrid(img, range);

  // Segment into row bands, then column bounds within each band — see
  // segmentBands' companion logic inlined here (kept together instead of
  // split across the awkward helper above, which only computed y0).
  const rowFg = blockGrid.map((row) => row.reduce((a, b) => a + b, 0));
  const rowRuns = findRuns(medianFilter1D(rowFg.map((c) => (c > 0 ? 1 : 0))), 3);
  if (rowRuns.length !== 3) {
    throw new Error(`${name}: expected 3 cloud bands, found ${rowRuns.length}`);
  }
  const blocksX = blockGrid[0].length;

  const boxes = rowRuns.map(([b0, b1]) => {
    const py0 = Math.max(0, b0 - 1);
    const py1 = Math.min(blockGrid.length - 1, b1 + 1);
    const colFg = new Array(blocksX).fill(0);
    for (let j = py0; j <= py1; j++) {
      for (let i = 0; i < blocksX; i++) colFg[i] += blockGrid[j][i];
    }
    const colRuns = findRuns(medianFilter1D(colFg.map((c) => (c > 0 ? 1 : 0))), 2);
    colRuns.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
    const [c0, c1] = colRuns[0];
    const y0 = py0 * BLOCK;
    const y1 = Math.min(img.height - 1, (py1 + 1) * BLOCK - 1);
    const x0 = c0 * BLOCK;
    const x1 = Math.min(img.width - 1, (c1 + 1) * BLOCK - 1);
    return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  });

  for (let i = 0; i < boxes.length; i++) {
    await extractSprite(img, range, name, boxes[i], i + 1);
  }
}

for (const source of SOURCES) {
  await extract(source);
}
