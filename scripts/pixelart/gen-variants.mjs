import { PALETTE, hexToRgb, shade, hash2 } from "./palette.mjs";
import { writePng } from "./png.mjs";

/**
 * Style-gate option textures: wall + rug variants (cycled live in the nook
 * with the 1/2 keys until Rohan picks) and the first poster art set.
 */

const OUT = "public/3am/tex";

/* ---- wall option B: muted teal plaster over cream wainscot (photo ref) ----
   32×80 = one full 2.5m wall column; repeatY must be 1. Bottom 26px ≈ 0.8m. */
const TEAL = "#4a736c";
function wallTeal(x, y) {
  if (y >= 54) {
    // wainscot: cream panels, groove every 8px, top rail
    if (y === 54 || y === 55) return shade(PALETTE.plaster700, 0.9);
    if (x % 8 === 0) return shade(PALETTE.plaster500, 0.82);
    return shade(PALETTE.plaster300, 0.97 + hash2(x, y, 61) * 0.06);
  }
  const n = hash2(x, y, 62);
  if (n > 0.97) return shade(TEAL, 1.18);
  if (n < 0.03) return shade(TEAL, 0.85);
  return shade(TEAL, 0.94 + hash2(Math.floor(x / 2), Math.floor(y / 2), 63) * 0.1);
}

/* ---- wall option C: dusty plum night plaster (32×32 tile) ---- */
const PLUM = "#655073";
function wallPlum(x, y) {
  const n = hash2(x, y, 71);
  if (n > 0.97) return shade(PLUM, 1.2);
  if (n < 0.03) return shade(PLUM, 0.8);
  return shade(PLUM, 0.94 + hash2(Math.floor(x / 2), Math.floor(y / 2), 72) * 0.1);
}

/* ---- wall option D: vintage vertical stripes (32×32 tile) ---- */
function wallStripes(x, y) {
  const band = Math.floor(x / 8) % 2;
  const base = band ? PALETTE.plaster500 : PALETTE.plaster300;
  const n = hash2(x, y, 81);
  if (x % 8 === 0) return shade(base, 0.88);
  return shade(base, 0.96 + n * 0.06);
}

/* ---- rug option B: kilim bands (64×64) ---- */
const KILIM_BANDS = [
  PALETTE.red500, PALETTE.cream100, "#c98a2e", "#1f5c55",
  PALETTE.purple500, PALETTE.cream100,
];
function rugKilim(x, y) {
  const band = Math.floor(y / 10.7) % KILIM_BANDS.length;
  const c = KILIM_BANDS[band];
  if (y % 11 === 10 || y % 11 === 0) return shade(c, 0.8);
  if ((x + band * 3) % 8 < 2 && y % 11 > 3 && y % 11 < 8) return shade(c, 0.78); // dashes
  return shade(c, 0.94 + hash2(x, y, 91) * 0.1);
}

/* ---- rug option C: deep teal field, double mustard border (64×64) ---- */
function rugTealField(x, y) {
  const b = Math.min(x, 63 - x, y, 63 - y);
  if (b < 2) return shade("#1f5c55", 0.75);
  if (b < 5) return hexToRgb("#c98a2e");
  if (b < 7) return shade("#1f5c55", 0.9);
  if (b < 9) return hexToRgb("#c98a2e");
  const dx = Math.abs(x - 32);
  const dy = Math.abs(y - 32);
  if (dx < 3 && dy < 3) return hexToRgb("#c98a2e"); // small medallion
  return shade("#1f5c55", 0.92 + hash2(x, y, 101) * 0.12);
}

/* ---- rug option D: round braided (64×64 with alpha outside the circle) ---- */
const BRAID = ["#a04b3a", PALETTE.cream100, "#8a5a3b", PALETTE.purple500, "#c98a2e"];
function rugRound(x, y) {
  const dx = x - 31.5;
  const dy = y - 31.5;
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r > 31) return [0, 0, 0, 0];
  const ring = Math.floor(r / 4.5) % BRAID.length;
  const c = BRAID[ring];
  const seam = Math.abs((r % 4.5) - 4.5 / 2) > 1.9;
  return [...shade(c, (seam ? 0.82 : 0.96) + hash2(x, y, 111) * 0.08), 255];
}

/* ---- rug option E: persian rust — terracotta field, cream medallion ---- */
const RUST = "#a04b3a";
function rugPersian(x, y) {
  const b = Math.min(x, 63 - x, y, 63 - y);
  if (b < 2) return shade("#6e3325", 0.9);
  if (b < 5) return hexToRgb(PALETTE.cream100);
  if (b < 6) return shade(RUST, 0.8);
  const dx = Math.abs(x - 32);
  const dy = Math.abs(y - 32);
  const dia = dx + dy;
  if (dia < 5) return hexToRgb(PALETTE.cream100);
  if (dia < 8) return shade("#6e3325", 1.0);
  if (dia < 10) return hexToRgb(PALETTE.cream100);
  // corner motifs
  if ((dx > 20 && dy > 12) && (dx + dy) % 9 < 2) return shade(PALETTE.cream100, 0.92);
  // field texture
  const n = hash2(x, y, 131);
  if (n > 0.96) return shade(RUST, 1.15);
  return shade(RUST, 0.92 + hash2(Math.floor(x / 2), y, 132) * 0.12);
}

/* ---- rug option F: berber cream — light field, dark diamond lattice ---- */
function rugBerber(x, y) {
  const b = Math.min(x, 63 - x, y, 63 - y);
  if (b < 2) return shade("#4a3a2e", 1.0);
  if (b < 3) return hexToRgb(PALETTE.cream100);
  const gx = ((x - 4) % 14) - 7;
  const gy = ((y - 4) % 14) - 7;
  if (Math.abs(Math.abs(gx) + Math.abs(gy) - 7) < 1) return shade("#4a3a2e", 1.15);
  const n = hash2(x, y, 141);
  if (n > 0.97) return shade(PALETTE.plaster500, 0.95);
  return shade(PALETTE.cream100, 0.94 + hash2(Math.floor(x / 3), Math.floor(y / 3), 142) * 0.06);
}

/* ---- floor option B: dark walnut planks (32×32, same layout as original) ---- */
const WALNUT_TONES = [PALETTE.wood700, PALETTE.wood900, PALETTE.wood700, "#3a2c22"];
function floorWalnut(x, y) {
  const row = Math.floor(y / 8);
  const stagger = (row % 2) * 16;
  const seg = Math.floor(((x + stagger) % 32) / 16);
  const tone = WALNUT_TONES[Math.floor(hash2(seg, row, 151) * WALNUT_TONES.length)];
  if (y % 8 === 0) return shade(tone, 0.55);
  if ((x + stagger) % 16 === 0) return shade(tone, 0.6);
  const grain = hash2(x, y, 152);
  if (grain > 0.93) return shade(tone, 0.8);
  if (grain < 0.04) return shade(tone, 1.15);
  return shade(tone, 0.95 + hash2(x, Math.floor(y / 8), 153) * 0.1);
}

/* ---- floor option C: herringbone parquet (64×64; repeat at half density) ---- */
function floorHerringbone(x, y) {
  const lane = Math.floor((x + y) / 8) % 2;
  const u = lane === 0 ? x - y : x + y;
  const v = lane === 0 ? x + y : x - y;
  const plankId = Math.floor((u + 128) / 8) * 31 + Math.floor((v + 128) / 8) * 7 + lane;
  const tone = PLANK_TONES_H[Math.floor(hash2(plankId, lane, 161) * PLANK_TONES_H.length)];
  if ((u + 128) % 8 === 0 || (x + y) % 8 === 0) return shade(tone, 0.6);
  const grain = hash2(x, y, 162);
  if (grain > 0.94) return shade(tone, 0.82);
  return shade(tone, 0.95 + hash2(plankId, 0, 163) * 0.1);
}
const PLANK_TONES_H = [PALETTE.wood300, PALETTE.wood500, "#96653e", PALETTE.wood700];

/* ---- floor option D: gray-washed boards (32×32) ---- */
const GRAY_TONES = ["#8d8478", "#7d7468", "#867d72", "#6e665c"];
function floorGraywash(x, y) {
  const row = Math.floor(y / 8);
  const stagger = (row % 2) * 16;
  const tone = GRAY_TONES[Math.floor(hash2(Math.floor(((x + stagger) % 32) / 16), row, 171) * GRAY_TONES.length)];
  if (y % 8 === 0) return shade(tone, 0.62);
  if ((x + stagger) % 16 === 0) return shade(tone, 0.68);
  const grain = hash2(x, y, 172);
  if (grain > 0.94) return shade(tone, 0.85);
  return shade(tone, 0.96 + hash2(x, row, 173) * 0.07);
}

/* ---- floor option E: café checkerboard, cream + deep teal (32×32) ---- */
function floorChecker(x, y) {
  const check = (Math.floor(x / 16) + Math.floor(y / 16)) % 2;
  const base = check ? "#2e4f4a" : PALETTE.plaster300;
  if (x % 16 === 0 || y % 16 === 0) return shade(base, 0.8);
  return shade(base, 0.95 + hash2(x, y, 181) * 0.08);
}

/* ---- posters (music-centric set, locked at the style gate) ---- */
/* tall concert poster 32×88: speaker stack radiating sound rings,
   headline bar up top, illegible lineup bars below */
function posterGig(x, y) {
  if (x === 0 || x === 31 || y === 0 || y === 87) return shade(PALETTE.night900, 1.4);
  let c = shade(PALETTE.night700, 0.95 + hash2(x, y, 201) * 0.06);
  // headline bar
  if (y > 4 && y < 10 && x > 4 && x < 28) c = hexToRgb(PALETTE.amber500);
  // speaker cabinet
  if (x > 8 && x < 24 && y > 26 && y < 52) {
    c = shade(PALETTE.wood900, 1.05);
    const dxw = x - 16;
    const dyw = y - 33;
    const dyt = y - 45;
    if (dxw * dxw + dyw * dyw < 20) c = dxw * dxw + dyw * dyw < 6 ? hexToRgb(PALETTE.night900) : hexToRgb("#3a3244");
    if (dxw * dxw + dyt * dyt < 9) c = dxw * dxw + dyt * dyt < 3 ? hexToRgb(PALETTE.night900) : hexToRgb("#3a3244");
  }
  // sound rings radiating up from the cabinet
  const dxr = x - 16;
  const dyr = y - 26;
  const rr = Math.sqrt(dxr * dxr + dyr * dyr);
  if (y < 26 && (Math.abs(rr - 7) < 0.9 || Math.abs(rr - 12) < 0.9 || Math.abs(rr - 17) < 0.9))
    c = hexToRgb([PALETTE.teal500, PALETTE.amber500, PALETTE.red500][Math.round(rr / 5) % 3]);
  // lineup text bars
  if (y > 58 && y < 84 && y % 4 < 2 && x > 5 && x < 27 - ((y * 7) % 9)) c = hexToRgb(PALETTE.cream100);
  return c;
}

/* cassette poster 40×56 */
function posterWave(x, y) {
  if (x === 0 || x === 39 || y === 0 || y === 55) return shade(PALETTE.night900, 1.4);
  let c = shade("#1f5c55", 0.9 + hash2(x, y, 211) * 0.08);
  // cassette shell
  if (x > 5 && x < 34 && y > 14 && y < 36) {
    c = hexToRgb("#22222c");
    if (y > 16 && y < 24) c = hexToRgb(PALETTE.red500); // label band
    // reels
    const dl = (x - 13) * (x - 13) + (y - 29) * (y - 29);
    const dr = (x - 26) * (x - 26) + (y - 29) * (y - 29);
    if (dl < 8 || dr < 8) c = hexToRgb(PALETTE.cream100);
    if (dl < 2 || dr < 2) c = hexToRgb("#22222c");
    // window between reels
    if (x > 16 && x < 23 && y > 27 && y < 31) c = shade(PALETTE.wood900, 0.8);
  }
  // title bars below
  if (y > 42 && y < 52 && y % 4 < 2 && x > 7 && x < 32 - ((y * 3) % 6)) c = hexToRgb(PALETTE.cream100);
  return c;
}

/* vinyl close-up poster 40×56 */
function posterMoons(x, y) {
  if (x === 0 || x === 39 || y === 0 || y === 55) return shade(PALETTE.night900, 1.4);
  let c = shade(PALETTE.night500, 0.9 + hash2(x, y, 221) * 0.06);
  const dx = x - 20;
  const dy = y - 24;
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r < 17) {
    // grooved disc with a subtle highlight arc
    const ring = Math.floor(r) % 3 === 0 ? 0.85 : 1.0;
    c = shade(PALETTE.vinyl700, ring);
    if (Math.abs(Math.atan2(dy, dx) - 2.3) < 0.35 && r > 6) c = shade("#3a3244", 1.15);
    if (r < 5.5) c = hexToRgb(PALETTE.amber500); // label
    if (r < 1.2) c = hexToRgb(PALETTE.night900); // spindle hole
  }
  // caption bars
  if (y > 45 && y < 53 && y % 4 < 2 && x > 8 && x < 31 - ((y * 5) % 7)) c = hexToRgb(PALETTE.cream100);
  return c;
}

const JOBS = [
  ["wall-teal", 32, 80, wallTeal],
  ["wall-plum", 32, 32, wallPlum],
  ["wall-stripes", 32, 32, wallStripes],
  ["rug-kilim", 64, 64, rugKilim],
  ["rug-tealfield", 64, 64, rugTealField],
  ["rug-round", 64, 64, rugRound],
  ["rug-persian", 64, 64, rugPersian],
  ["rug-berber", 64, 64, rugBerber],
  ["floor-walnut", 32, 32, floorWalnut],
  ["floor-herringbone", 64, 64, floorHerringbone],
  ["floor-graywash", 32, 32, floorGraywash],
  ["floor-checker", 32, 32, floorChecker],
  ["poster-gig", 32, 88, posterGig],
  ["poster-wave", 40, 56, posterWave],
  ["poster-moons", 40, 56, posterMoons],
];

for (const [name, w, h, fn] of JOBS) {
  await writePng(`${OUT}/${name}.png`, w, h, fn);
  console.log(`wrote ${OUT}/${name}.png (${w}x${h})`);
}
