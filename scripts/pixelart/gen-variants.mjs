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

/* ---- posters ---- */
/* tall gig poster 32×88: sunburst over mountains, "text" bars below */
function posterGig(x, y) {
  if (x === 0 || x === 31 || y === 0 || y === 87) return shade(PALETTE.night900, 1.4);
  // sky
  let c = y < 40 ? shade(PALETTE.night500, 1 + (40 - y) * 0.004) : hexToRgb(PALETTE.night700);
  const dx = x - 16;
  const dy = y - 22;
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r < 9) c = hexToRgb(PALETTE.amber500);
  else if (r < 11) c = hexToRgb(PALETTE.amber700);
  else if (y < 40 && Math.abs(Math.atan2(dy, dx) * 8 - Math.round(Math.atan2(dy, dx) * 8)) < 0.14 && r < 22)
    c = shade(PALETTE.amber700, 0.75); // rays
  // mountains
  const ridge = 46 + Math.abs(((x * 13) % 17) - 8);
  if (y > 40 && y > ridge) c = shade(PALETTE.purple700, y > ridge + 6 ? 0.65 : 0.9);
  // text bars
  if (y > 66 && y < 84 && y % 5 < 2 && x > 5 && x < 27 - (y % 7)) c = hexToRgb(PALETTE.cream100);
  return c;
}

/* wave poster 40×56 */
function posterWave(x, y) {
  if (x === 0 || x === 39 || y === 0 || y === 55) return shade(PALETTE.night900, 1.4);
  const wave = Math.sin(x * 0.35) * 5 + Math.sin(x * 0.13 + 2) * 4;
  const band = y - 30 - wave;
  let c = hexToRgb(PALETTE.night700);
  if (band > 8) c = hexToRgb("#1f5c55");
  else if (band > 4) c = hexToRgb(PALETTE.cream100);
  else if (band > 0) c = hexToRgb("#4a736c");
  const dx = x - 29;
  const dy = y - 12;
  if (dx * dx + dy * dy < 25) c = hexToRgb(PALETTE.red500); // sun
  return c;
}

/* moon phases poster 40×56 */
function posterMoons(x, y) {
  if (x === 0 || x === 39 || y === 0 || y === 55) return shade(PALETTE.night900, 1.4);
  let c = shade(PALETTE.night700, 0.9 + hash2(x, y, 121) * 0.06);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cx = 9 + col * 11;
      const cy = 12 + row * 16;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < 16) {
        const phase = row * 3 + col;
        const cut = dx + (phase - 4); // crude phase mask
        c = cut < 0 ? shade(PALETTE.night500, 1.1) : hexToRgb(PALETTE.cream100);
      }
    }
  }
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
  ["poster-gig", 32, 88, posterGig],
  ["poster-wave", 40, 56, posterWave],
  ["poster-moons", 40, 56, posterMoons],
];

for (const [name, w, h, fn] of JOBS) {
  await writePng(`${OUT}/${name}.png`, w, h, fn);
  console.log(`wrote ${OUT}/${name}.png (${w}x${h})`);
}
