import { PALETTE, hexToRgb, shade, hash2 } from "./palette.mjs";
import { writePng } from "./png.mjs";

/**
 * Favicon variant generator (style-gate exploration). Produces three 32×32
 * night-time favicon candidates for /3am — window / moon / cateyes — plus an
 * 8x nearest-neighbor preview of each so a human can judge them at a glance.
 *
 * Standalone: NOT wired into gen-variants.mjs or any JOBS array. Nothing here
 * writes into src/app/ — the owner picks a variant, then it gets promoted to
 * an actual icon.png by hand.
 */

const OUT = "scripts/pixelart/.favicon-preview";

/** Linear blend between two hex colors, t in [0,1]. */
function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return a.map((c, i) => Math.round(c + (b[i] - c) * t));
}

function inRect(x, y, x0, x1, y0, y1) {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

/* ---- window: one small warm glowing window seen from far away at 3am ---- */
const NIGHT_BG = PALETTE.night900; // "#12101f"
const WIN_FRAME = "#0a0916"; // near-black frame, darker than night900
const WIN_FILL = PALETTE.amber500; // "#ffb35c"
const WIN_GLOW = PALETTE.amber300; // "#ffd9a0"

function window32(x, y) {
  const bg = shade(NIGHT_BG, 0.94 + hash2(x, y, 801) * 0.1);

  const FX0 = 11, FX1 = 21, FY0 = 7, FY1 = 23; // frame outer bounds
  const WX0 = 12, WX1 = 20, WY0 = 8, WY1 = 22; // pane fill bounds
  const HX0 = 10, HX1 = 22, HY0 = 6, HY1 = 24; // glow halo bounds

  if (inRect(x, y, HX0, HX1, HY0, HY1) && !inRect(x, y, FX0, FX1, FY0, FY1)) {
    return mix(NIGHT_BG, WIN_GLOW, 0.35); // soft 1px glow halo
  }
  if (inRect(x, y, FX0, FX1, FY0, FY1) && !inRect(x, y, WX0, WX1, WY0, WY1)) {
    return hexToRgb(WIN_FRAME); // thin dark frame
  }
  if (inRect(x, y, WX0, WX1, WY0, WY1)) {
    const cx = 16, cy = 15; // frame cross dividing the pane into four
    if (x === cx || y === cy) return hexToRgb(WIN_FRAME);
    return shade(WIN_FILL, 0.92 + hash2(x, y, 802) * 0.14);
  }
  return bg;
}

/* ---- moon: pale-gold crescent + a couple of 1px stars, night-blue field ---- */
const MOON_COLOR = PALETTE.amber300; // "#ffd9a0" — pale gold
const STAR_COLOR = PALETTE.cream100; // "#f2ecd8"

function moon32(x, y) {
  const bg = shade(NIGHT_BG, 0.94 + hash2(x, y, 811) * 0.08);

  const cx = 14, cy = 16, r = 8;
  const dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= r) {
    const ox = cx + 5, oy = cy - 3; // carve circle, offset to form the crescent
    const ddx = x - ox, ddy = y - oy;
    const odist = Math.sqrt(ddx * ddx + ddy * ddy);
    if (odist > r) return shade(MOON_COLOR, 0.94 + hash2(x, y, 812) * 0.08);
    return bg; // carved (lit-away) side stays background
  }
  if ((x === 25 && y === 7) || (x === 5 && y === 25)) return hexToRgb(STAR_COLOR);
  return bg;
}

/* ---- cateyes: two small glowing amber cat eyes, near-black field ---- */
const CAT_BG = "#0a0916";
const EYE_COLOR = PALETTE.amber500;
const EYE_GLOW = PALETTE.amber300;

function eyeColor(x, y, ex0, ex1, ey0, ey1) {
  if (inRect(x, y, ex0, ex1, ey0, ey1)) return shade(EYE_COLOR, 0.94 + hash2(x, y, 821) * 0.12);
  if (inRect(x, y, ex0 - 1, ex1 + 1, ey0 - 1, ey1 + 1)) return mix(CAT_BG, EYE_GLOW, 0.3);
  return null;
}

function cateyes32(x, y) {
  const bg = shade(CAT_BG, 0.94 + hash2(x, y, 831) * 0.06);
  // slightly different sizes/heights so the pair reads organic, not printed
  const left = eyeColor(x, y, 9, 11, 17, 18);
  if (left) return left;
  const right = eyeColor(x, y, 20, 21, 14, 15);
  if (right) return right;
  return bg;
}

const VARIANTS = [
  { name: "window", fn: window32 },
  { name: "moon", fn: moon32 },
  { name: "cateyes", fn: cateyes32 },
];

// Owner picked "moon" at the style gate — it's the actual site favicon.
// Regenerating this script keeps src/app/icon.png in sync like every other
// texture in this repo.
const CHOSEN_ICON = "moon";
const APP_ICON_PATH = "src/app/icon.png";

const SCALE = 8;
for (const { name, fn } of VARIANTS) {
  await writePng(`${OUT}/${name}-32.png`, 32, 32, fn);
  console.log(`wrote ${OUT}/${name}-32.png (32x32)`);
  await writePng(`${OUT}/${name}-preview.png`, 32 * SCALE, 32 * SCALE, (x, y) =>
    fn(Math.floor(x / SCALE), Math.floor(y / SCALE))
  );
  console.log(`wrote ${OUT}/${name}-preview.png (256x256)`);
}

const chosen = VARIANTS.find((v) => v.name === CHOSEN_ICON);
if (chosen) {
  await writePng(APP_ICON_PATH, 32, 32, chosen.fn);
  console.log(`wrote ${APP_ICON_PATH} (32x32) — chosen site favicon`);
}
