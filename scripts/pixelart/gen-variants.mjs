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

/* ---- wall option E: charcoal — warm dark gray plaster (32×32 tile) ---- */
const CHARCOAL = "#4a4038";
function wallCharcoal(x, y) {
  const n = hash2(x, y, 231);
  if (n > 0.97) return shade(CHARCOAL, 1.2);
  if (n < 0.03) return shade(CHARCOAL, 0.8);
  return shade(CHARCOAL, 0.94 + hash2(Math.floor(x / 2), Math.floor(y / 2), 232) * 0.1);
}

/* ---- wall option F: midnight — deep desaturated navy plaster (32×32 tile) ---- */
const MIDNIGHT = "#2b2f47";
function wallMidnight(x, y) {
  const n = hash2(x, y, 241);
  if (n > 0.97) return shade(MIDNIGHT, 1.2);
  if (n < 0.03) return shade(MIDNIGHT, 0.8);
  return shade(MIDNIGHT, 0.94 + hash2(Math.floor(x / 2), Math.floor(y / 2), 242) * 0.1);
}

/* ---- wall option G: forest — deep muted green plaster (32×32 tile) ---- */
const FOREST = "#3a4a37";
function wallForest(x, y) {
  const n = hash2(x, y, 251);
  if (n > 0.97) return shade(FOREST, 1.2);
  if (n < 0.03) return shade(FOREST, 0.8);
  return shade(FOREST, 0.94 + hash2(Math.floor(x / 2), Math.floor(y / 2), 252) * 0.1);
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

/* ---- neon "3AM" sign 40×16: coral tubes with a dim halo, transparent bg ---- */
const NEON_ROWS = [
  "1110 0110 10001",
  "0001 1001 11011",
  "0110 1111 10101",
  "0001 1001 10001",
  "1110 1001 10001",
];
function neonSign(x, y) {
  const gx = x - 6;
  const gy = y - 5;
  const row = NEON_ROWS[gy];
  const lit = (rx, ry) =>
    ry >= 0 && ry < 5 && rx >= 0 && NEON_ROWS[ry][rx] === "1";
  if (row && lit(gx, gy)) return [255, 180, 160, 255]; // bright tube core
  // halo: adjacent to a lit pixel
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (lit(gx + dx, gy + dy)) return [255, 106, 69, 140];
    }
  }
  return [0, 0, 0, 0];
}

/* ---- neon "shipped" sign 62×22: red lowercase tubes, dim halo, transparent
   bg — same construction as neon-3am. Glyphs are 3×N on an 8-row grid
   (rows 0-1 ascenders, 2-6 x-height, 6-7 descenders), 1-col gaps, then
   upscaled 2x at render so the tube strokes stay bold enough to survive
   the scene's bloom at walking distance. ---- */
const SHIPPED_GLYPHS = {
  s: { top: 2, rows: ["111", "100", "111", "001", "111"] },
  h: { top: 0, rows: ["100", "100", "111", "101", "101", "101", "101"] },
  i: { top: 0, rows: ["010", "000", "010", "010", "010", "010", "010"] },
  p: { top: 2, rows: ["111", "101", "101", "111", "100", "100"] },
  e: { top: 2, rows: ["111", "101", "111", "100", "111"] },
  d: { top: 0, rows: ["001", "001", "111", "101", "101", "101", "111"] },
};
const SHIPPED_WORD = "shipped";
function neonShipped(x, y) {
  const ox = 4; // left margin (word is 2×27=54 cols on a 62-col canvas)
  const oy = 3; // top margin (2×8=16 glyph rows on a 22-row canvas)
  const lit = (px, py) => {
    const gx = Math.floor((px - ox) / 2); // 2x upscale
    const gy = Math.floor((py - oy) / 2);
    if (px < ox || py < oy || gy > 7) return false;
    const letter = SHIPPED_GLYPHS[SHIPPED_WORD[Math.floor(gx / 4)]];
    if (!letter) return false;
    const col = gx % 4;
    if (col === 3) return false; // inter-letter gap
    const row = letter.rows[gy - letter.top];
    return !!row && row[col] === "1";
  };
  if (lit(x, y)) return [255, 150, 140, 255]; // bright tube core
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (lit(x + dx, y + dy)) return [230, 57, 50, 105]; // dim halo
    }
  }
  return [0, 0, 0, 0];
}

/* ---- bedroom texture set (Task 2): wall/floor toggle options + soft-furnishing
   textures. Same seeded hash2/shade idiom as the workspace/nook set above. ---- */

/* ---- wall option: sand — warm sand plaster, soft noise (bedroom default) ---- */
// creamier than the original sand (Rohan, 2026-07-19: "wall color smth bit
// creamish") — halfway between plaster300 and cream100, kept off pure white
const SAND = "#e6d8b8";
function wallSand(x, y) {
  const n = hash2(x, y, 301);
  if (n > 0.97) return shade(SAND, 1.08);
  if (n < 0.03) return shade(SAND, 0.82);
  return shade(SAND, 0.94 + hash2(Math.floor(x / 2), Math.floor(y / 2), 302) * 0.1);
}

/* ---- wall option: sage — muted sage-green plaster (bedroom toggle) ---- */
const SAGE = "#8b9574";
function wallSage(x, y) {
  const n = hash2(x, y, 311);
  if (n > 0.97) return shade(SAGE, 1.15);
  if (n < 0.03) return shade(SAGE, 0.82);
  return shade(SAGE, 0.94 + hash2(Math.floor(x / 2), Math.floor(y / 2), 312) * 0.1);
}

/* ---- wall option: dusk — dusty blue-violet plaster (bedroom toggle) ---- */
const DUSK = "#5f6a8c";
function wallDusk(x, y) {
  const n = hash2(x, y, 321);
  if (n > 0.97) return shade(DUSK, 1.18);
  if (n < 0.03) return shade(DUSK, 0.82);
  return shade(DUSK, 0.94 + hash2(Math.floor(x / 2), Math.floor(y / 2), 322) * 0.1);
}

/* ---- floor option: oak — lighter warmer ramp on floorWalnut's exact plank
   geometry (same seams/rows) so the toggle compare is apples-to-apples ---- */
const OAK_TONES = [PALETTE.wood300, "#c9a06a", PALETTE.wood300, PALETTE.wood500];
function floorOak(x, y) {
  // parallel lining (Rohan, 2026-07-19): no stagger, no cross seams — clean
  // continuous parallel board lines; per-row tone keeps boards distinct
  const row = Math.floor(y / 8);
  const tone = OAK_TONES[Math.floor(hash2(0, row, 331) * OAK_TONES.length)];
  if (y % 8 === 0) return shade(tone, 0.55);
  const grain = hash2(x, y, 332);
  if (grain > 0.93) return shade(tone, 0.8);
  if (grain < 0.04) return shade(tone, 1.15);
  return shade(tone, 0.95 + hash2(x, Math.floor(y / 8), 333) * 0.1);
}

/* ---- linen quilt (64×64): 8px diamond grid via 45°-rotated lattice
   (u=x+y, v=x-y), two-tone warm cream/terracotta with stitched seams and a
   soft puffed highlight toward each diamond's center ---- */
function linenQuilt(x, y) {
  const u = x + y;
  const v = x - y;
  const modU = ((u % 8) + 8) % 8;
  const modV = ((v % 8) + 8) % 8;
  const cellU = Math.floor(u / 8);
  const cellV = Math.floor(v / 8);
  const tone = (cellU + cellV) % 2 === 0 ? PALETTE.cream100 : PALETTE.wood300;
  if (modU < 1 || modU > 6 || modV < 1 || modV > 6) return shade(tone, 0.78); // stitch seam
  const puff = 1 - Math.max(Math.abs(modU - 3.5), Math.abs(modV - 3.5)) / 3.5;
  return shade(tone, 0.92 + puff * 0.14 + hash2(x, y, 341) * 0.04);
}

/* ---- curtain weave (32×64): loose vertical fabric weave, pale cream, with a
   gentle sinusoidal wobble on the fold columns and offset weft dashes for a
   woven (not printed) look ---- */
const CURTAIN = PALETTE.cream100;
function curtainWeave(x, y) {
  const wobble = Math.round(Math.sin(y / 9) * 1.5);
  const colPhase = ((x + wobble) % 4 + 4) % 4;
  if (colPhase === 0) return shade(CURTAIN, 0.82 + hash2(x, y, 351) * 0.05); // fold shadow
  const weftPhase = (y + Math.floor((x + wobble) / 4) * 2) % 3;
  const base = weftPhase === 0 ? 0.88 : 0.96;
  return shade(CURTAIN, base + hash2(x, y, 352) * 0.05);
}

/* ---- braided bedroom rug (64×64, oval-ish, alpha outside): warm-neutral
   braid rings (tan/cream/brown), distinct palette from rug-kilim/rug-persian
   which lean red/mustard/purple/teal ---- */
const BEDROOM_BRAID = [PALETTE.plaster500, PALETTE.cream100, PALETTE.wood500, PALETTE.plaster700];
function rugBedroom(x, y) {
  const dx = (x - 31.5) / 1.15; // squash horizontally wider than tall
  const dy = y - 31.5;
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r > 29) return [0, 0, 0, 0];
  const ring = Math.floor(r / 5) % BEDROOM_BRAID.length;
  const c = BEDROOM_BRAID[ring];
  const seam = Math.abs((r % 5) - 2.5) > 2.1;
  return [...shade(c, (seam ? 0.84 : 0.97) + hash2(x, y, 361) * 0.06), 255];
}

/* ---- bedroom rug options (Plan 4 follow-up): five more rugs for the style
   gate, all full 64×64 rectangular canvases (same non-alpha convention as
   rug-kilim/rug-persian/rug-teal-field/rug-berber above) so they drop onto
   the bedroom rug's existing 2.4×1.7 plane cleanly. Deliberately different
   characters from rug-bedroom's warm-neutral braid so the owner has a real
   choice; each stays legible against sage walls + oak floor under warm
   lamplight. ---- */

/* rug-shag-cream: thick plush pile, no pattern — soft cream/oatmeal clumps
   with a per-column brushed-pile banding for a subtle directional grain. */
const SHAG_OATMEAL = PALETTE.plaster300;
function rugShagCream(x, y) {
  const clump = hash2(Math.floor(x / 4), Math.floor(y / 4), 701);
  const base = clump > 0.4 ? PALETTE.cream100 : SHAG_OATMEAL;
  const pile = hash2(x, y, 702);
  const streak = (hash2(Math.floor(x / 2), 0, 703) - 0.5) * 0.08; // brushed pile direction
  return shade(base, 0.88 + pile * 0.12 + streak);
}

/* rug-tatami: fine woven straw weave — alternating wheat/olive warp/weft
   cells with grooved strand edges, dark cloth border (heri) on all four
   sides. Ties to the engawa/zen side of the room. */
const TATAMI_WHEAT = "#c9b673";
const TATAMI_OLIVE = "#9a9260";
const TATAMI_HERI = "#33362e";
function rugTatami(x, y) {
  const border = Math.min(x, 63 - x, y, 63 - y);
  if (border < 3) return shade(TATAMI_HERI, 0.82 + hash2(x, y, 711) * 0.22);
  const cell = 4;
  const fx = x - 3, fy = y - 3;
  const cx = Math.floor(fx / cell), cy = Math.floor(fy / cell);
  const warpCell = (cx + cy) % 2 === 0;
  const lx = fx - cx * cell, ly = fy - cy * cell;
  const grainLine = warpCell ? (lx === 0 || lx === cell - 1) : (ly === 0 || ly === cell - 1);
  const base = warpCell ? TATAMI_WHEAT : TATAMI_OLIVE;
  let f = 0.92 + hash2(x, y, 712) * 0.1;
  if (grainLine) f *= 0.85;
  return shade(base, f);
}

/* rug-midcentury: bold retro geometric — mustard bar, rust triangle, teal
   arc, cream dot accent on a warm sand ground. Graphic, not busy. */
const MC_MUSTARD = "#c98a2e";
const MC_TEAL = "#1f5c55";
function rugMidcentury(x, y) {
  let c = shade(SAND, 0.94 + hash2(x, y, 721) * 0.08); // warm ground
  if (y > 26 && y < 38) c = shade(MC_MUSTARD, 0.92 + hash2(x, y, 722) * 0.08); // bar
  if (x < 64 - y && y > 34) c = shade(RUST, 0.9 + hash2(x, y, 723) * 0.1); // triangle
  const adx = x - 63, ady = y;
  const ar = Math.sqrt(adx * adx + ady * ady);
  if (ar < 30 && ar > 18) c = shade(MC_TEAL, 0.9 + hash2(x, y, 724) * 0.1); // arc
  const cdx = x - 16, cdy = y - 16;
  if (cdx * cdx + cdy * cdy < 36) c = shade(PALETTE.cream100, 0.94 + hash2(x, y, 725) * 0.06); // dot
  return c;
}

/* rug-moroccan: cream/ivory field, charcoal diamond lattice, tassel-strand
   hints at the two short (top/bottom) edges. High contrast, modern-boho. */
function rugMoroccan(x, y) {
  if (y < 3 || y > 60) {
    const strand = Math.floor(x / 2) % 2 === 0;
    return shade(strand ? PALETTE.cream100 : PALETTE.plaster500, 0.85 + hash2(x, y, 731) * 0.15); // fringe
  }
  const b = Math.min(x, 63 - x, y - 3, 60 - y);
  if (b < 2) return shade(CHARCOAL, 0.9 + hash2(x, y, 732) * 0.16); // ink frame
  const gx = (((x - 4) % 16) + 16) % 16 - 8;
  const gy = (((y - 3) % 16) + 16) % 16 - 8;
  const diamond = Math.abs(gx) + Math.abs(gy);
  let c = shade(PALETTE.cream100, 0.94 + hash2(x, y, 733) * 0.08);
  if (Math.abs(diamond - 7) < 1.2) c = shade(CHARCOAL, 0.92 + hash2(x, y, 734) * 0.14); // lattice
  if (diamond < 2) c = shade(CHARCOAL, 0.85); // center dot
  return c;
}

/* rug-faded-vintage: dusty-blue/rust/sand medallion (same border→medallion
   shape as rug-persian) with a low-frequency worn-patch fade that blends
   large blotches toward the sand ground so parts of the pattern nearly
   vanish — deliberately uneven, antique. */
function rugFadedVintage(x, y) {
  const b = Math.min(x, 63 - x, y, 63 - y);
  let base;
  if (b < 2) base = shade(DUSK, 0.8);
  else if (b < 5) base = hexToRgb(SAND);
  else {
    const dx = Math.abs(x - 32), dy = Math.abs(y - 32);
    const dia = dx + dy;
    if (dia < 5) base = hexToRgb(SAND);
    else if (dia < 9) base = shade(RUST, 0.95);
    else if (dia < 11) base = hexToRgb(SAND);
    else base = shade(DUSK, 0.85 + hash2(x, y, 741) * 0.12);
  }
  const fade = hash2(Math.floor(x / 6), Math.floor(y / 6), 742);
  const t = fade < 0.35 ? (0.35 - fade) / 0.35 : 0; // worn-patch fade amount
  const sandRgb = hexToRgb(SAND);
  return base.map((c, i) => Math.round(c * (1 - t * 0.7) + sandRgb[i] * t * 0.7));
}

/* ---- bedroom poster wall (FURNISHING WAVE): four non-branded, textless
   posters for the "many posters, different alignments" salon wall behind
   the headboard. Same seeded hash2/shade idiom + 1px night900 frame border
   as posterGig/posterWave/posterMoons above; distinct subjects so a
   6-7-poster hang (some panels reusing the same texture) still reads as
   varied. ---- */

/* sunset gradient bars 32×44: six warm-to-cool horizontal bands (dawn
   amber down to dusk purple) with a partially-set sun disc on the horizon
   and thin cross-lines through it (retro sunset-poster motif). */
const SUNSET_BANDS = [PALETTE.amber300, PALETTE.amber500, PALETTE.salt500, PALETTE.red500, PALETTE.purple500, PALETTE.purple700];
function posterSunsetBars(x, y) {
  if (x === 0 || x === 31 || y === 0 || y === 43) return shade(PALETTE.night900, 1.4);
  const band = Math.min(Math.floor((y - 1) / 7), SUNSET_BANDS.length - 1);
  let c = shade(SUNSET_BANDS[band], 0.94 + hash2(x, y, 401) * 0.08);
  const cx = 16, cy = 28, r = 9;
  const dx = x - cx, dy = y - cy;
  if (dx * dx + dy * dy < r * r) c = shade(PALETTE.cream100, 0.96 + hash2(x, y, 402) * 0.06);
  if (y > 29 && (y - 29) % 3 === 0 && dx * dx + dy * dy < r * r) c = shade(SUNSET_BANDS[band], 0.9); // eclipse lines through the sun
  if (y === 30) c = shade(PALETTE.night900, 1.2); // horizon line
  return c;
}

/* pixel mountain ridge 40×32 (landscape): cool dusk sky over three
   silhouette ridge layers (far → near), each a simple triangular-wave
   skyline at a different height/tone so they read as receding depth. */
const RIDGE_LAYERS = [
  { amp: 5, base: 14, period: 13, phase: 2, tone: "#5f6a8c" },
  { amp: 7, base: 19, period: 9, phase: 5, tone: "#453a63" },
  { amp: 9, base: 25, period: 11, phase: 0, tone: "#241f3d" },
];
function posterMountainRidge(x, y) {
  if (x === 0 || x === 39 || y === 0 || y === 31) return shade(PALETTE.night900, 1.4);
  let c = shade("#8b9574", 0.7 + (y / 31) * 0.35 + hash2(x, y, 411) * 0.05); // dusk sky gradient
  for (const layer of RIDGE_LAYERS) {
    const ridgeY = layer.base + Math.round(Math.sin((x + layer.phase) / layer.period * Math.PI * 2) * layer.amp * 0.5 + layer.amp * 0.5);
    if (y >= ridgeY) c = shade(layer.tone, 0.94 + hash2(x, y, 412) * 0.08);
  }
  return c;
}

/* retro space / ringed planet 36×48: near-black sky, sparse hashed stars,
   one banded planet with a tilted ring ellipse crossing it. */
function posterSpacePlanet(x, y) {
  if (x === 0 || x === 35 || y === 0 || y === 47) return shade(PALETTE.night900, 1.4);
  let c = shade(PALETTE.night900, 0.85 + hash2(x, y, 421) * 0.15);
  const star = hash2(x, y, 422);
  if (star > 0.985) c = shade(PALETTE.cream100, 0.8 + hash2(x, y, 423) * 0.2);
  const cx = 22, cy = 20, r = 8;
  const dx = x - cx, dy = y - cy;
  const rr = Math.sqrt(dx * dx + dy * dy);
  if (rr < r) {
    const bandTone = Math.floor((dy + r) / 3) % 2 === 0 ? PALETTE.amber500 : "#e89a48";
    c = shade(bandTone, 0.94 + hash2(x, y, 424) * 0.08);
  }
  // tilted ring ellipse: rotate (dx,dy) -0.4 rad, test a flat ellipse band
  const ang = -0.4;
  const rx = dx * Math.cos(ang) - dy * Math.sin(ang);
  const ry = dx * Math.sin(ang) + dy * Math.cos(ang);
  const ellipse = (rx * rx) / (14 * 14) + (ry * ry) / (3.2 * 3.2);
  if (ellipse > 0.75 && ellipse < 1.15 && !(rr < r * 0.55)) c = shade(PALETTE.cream100, 0.85);
  return c;
}

/* minimal wave / arc 32×40: plain dark field, a few concentric arcs low on
   the canvas, textless and deliberately sparse. */
function posterWaveArc(x, y) {
  if (x === 0 || x === 31 || y === 0 || y === 39) return shade(PALETTE.night900, 1.4);
  let c = shade(PALETTE.night500, 0.92 + hash2(x, y, 431) * 0.08);
  const cx = 16, cy = 46; // arc center below the canvas so only the tops show
  const dx = x - cx, dy = y - cy;
  const r = Math.sqrt(dx * dx + dy * dy);
  for (const ring of [10, 16, 22]) {
    if (Math.abs(r - ring) < 0.8) c = shade(PALETTE.teal500, 0.9 + hash2(x, y, 432) * 0.1);
  }
  if (Math.abs(r - 28) < 0.9) c = shade(PALETTE.cream100, 0.85);
  return c;
}

/* ---- movie-poster gallery wall (plan 4): five ORIGINAL movie-poster-style
   textures, sized like real posters — 2:3, 64×96 (bigger than the
   32×88/40×56 gig/wave/moons set and the 32-40px bedroom furnishing-wave
   posters above) for a bigger, better-organised salon wall behind the bed.
   Every design is invented from scratch: no real film titles, logos,
   studio marks, actor likenesses, or copyrighted character designs — these
   only borrow the movie-poster FORM (dramatic central image over the upper
   ~70%, a bold title block band, a thin illegible "credits" strip). Same
   seeded hash2/shade idiom + 1px night900 frame as every poster above. ---- */
const MP_W = 64, MP_H = 96;
const MP_IMG_Y1 = 65; // rows 1-65 of 96 (~68%) — dramatic central image
const MP_TITLE_Y0 = 66, MP_TITLE_Y1 = 87; // bold title block band
const MP_CREDIT_Y0 = 88, MP_CREDIT_Y1 = 94; // thin illegible "credits" strip

/* shared bottom credit strip: a few rows of alternating dark/light 1px
   marks that read as a credit block from a distance — deliberately never
   actual lettering. Reused verbatim by all five posters below. */
function posterCredits(x, y, tone, seed) {
  if (y < MP_CREDIT_Y0 || y > MP_CREDIT_Y1) return null;
  const on = hash2(Math.floor(x / 2), (y - MP_CREDIT_Y0) * 17, seed) > 0.5;
  return shade(tone, on ? 1.4 : 0.6);
}

/* 1. mecha 64×96 — tall angular violet humanoid silhouette backlit by a
   stark disc, dark ground, one neon-green accent slash. Deliberately a
   blocky abstract silhouette, not any specific mecha design. */
const MECHA_BODY = PALETTE.purple700;
function posterMecha(x, y) {
  if (x === 0 || x === MP_W - 1 || y === 0 || y === MP_H - 1) return shade(PALETTE.night900, 1.4);
  if (y <= MP_IMG_Y1) {
    const cx = 32, cy = 24, r = 19;
    const dx = x - cx, dy = y - cy;
    const rr = Math.sqrt(dx * dx + dy * dy);
    let c = shade(PALETTE.night700, 0.72 + (y / MP_IMG_Y1) * 0.15 + hash2(x, y, 601) * 0.05);
    if (rr < r) c = shade(PALETTE.amber300, 0.68 + ((r - rr) / r) * 0.28); // backlit disc
    if (y > 50) c = shade(PALETTE.night900, 1.05 + hash2(x, y, 602) * 0.1); // dark ground
    const bx = x - 32;
    const shoulderY = 16, hipY = 38, footY = 58;
    let onBody = false;
    if (y > 7 && y <= shoulderY) onBody = Math.abs(bx) < 3; // narrow head/helmet
    else if (y > shoulderY && y < hipY) onBody = Math.abs(bx) < 9 - ((y - shoulderY) / (hipY - shoulderY)) * 4; // torso taper, chest to waist
    else if (y >= hipY && y < footY) onBody = Math.abs(bx - 3) < 2 || Math.abs(bx + 3) < 2; // two-column legs
    if (onBody) c = shade(MECHA_BODY, 0.82 + hash2(x, y, 603) * 0.16);
    if (y > shoulderY - 4 && y < shoulderY + 3 && Math.abs(bx) > 7 && Math.abs(bx) < 13) c = shade(MECHA_BODY, 0.65); // wide shoulder blocks (epaulettes)
    if (Math.abs(bx + (y - 28) * 0.55) < 1.1 && y > 18 && y < 46) c = shade(PALETTE.mint400, 0.75 + hash2(x, y, 604) * 0.15); // neon accent slash
    return c;
  }
  if (y <= MP_TITLE_Y1) {
    let c = shade(PALETTE.night900, 1.05 + hash2(x, y, 605) * 0.06);
    if (y > MP_TITLE_Y0 + 2 && y < MP_TITLE_Y0 + 9 && y % 4 < 2 && x > 7 && x < 57 - ((y * 5) % 11)) c = shade(MECHA_BODY, 1.3);
    if (y > MP_TITLE_Y0 + 11 && y < MP_TITLE_Y0 + 17 && y % 3 < 1 && x > 12 && x < 52) c = shade(PALETTE.mint400, 0.55);
    return c;
  }
  return posterCredits(x, y, PALETTE.night900, 606) ?? shade(PALETTE.night900, 0.95);
}

/* 2. eclipse 64×96 — black sun disc with a burning corona ring on a deep
   blood-red sky, jagged horizon silhouette below. Ominous dark fantasy,
   wholly invented. */
function posterEclipse(x, y) {
  if (x === 0 || x === MP_W - 1 || y === 0 || y === MP_H - 1) return shade(PALETTE.night900, 1.4);
  if (y <= MP_IMG_Y1) {
    let c = shade(PALETTE.red500, 0.42 + (1 - y / MP_IMG_Y1) * 0.4 + hash2(x, y, 611) * 0.06);
    const cx = 32, cy = 30, r = 13;
    const dx = x - cx, dy = y - cy;
    const rr = Math.sqrt(dx * dx + dy * dy);
    if (rr < r) c = shade(PALETTE.night900, 1.15); // black sun disc
    else if (rr < r + 4) {
      const ang = Math.atan2(dy, dx);
      const spike = Math.sin(ang * 9 + hash2(Math.floor((ang + Math.PI) * 6), 0, 612) * 2.5) > 0.15;
      c = spike ? shade(PALETTE.amber500, 0.85 + hash2(x, y, 613) * 0.15) : shade(PALETTE.red500, 0.6); // burning corona
    }
    if (y > 50) {
      const ridgeY = 50 + Math.round(Math.sin(x / 5.2) * 3 + Math.sin(x / 2.1) * 1.6);
      if (y >= ridgeY) c = shade(PALETTE.night900, 1.1 + hash2(x, y, 614) * 0.08); // jagged horizon
    }
    return c;
  }
  if (y <= MP_TITLE_Y1) {
    let c = shade(PALETTE.night900, 1.0 + hash2(x, y, 615) * 0.06);
    if (y > MP_TITLE_Y0 + 2 && y < MP_TITLE_Y0 + 9 && y % 4 < 2 && x > 6 && x < 58 - ((y * 7) % 9)) c = shade(PALETTE.red500, 1.15);
    if (y > MP_TITLE_Y0 + 11 && y < MP_TITLE_Y0 + 17 && y % 3 < 1 && x > 10 && x < 54) c = shade(PALETTE.amber500, 0.55);
    return c;
  }
  return posterCredits(x, y, PALETTE.night900, 616) ?? shade(PALETTE.night900, 0.9);
}

/* 3. lone samurai 64×96 — small dark figure with a diagonal blade line, a
   huge pale moon behind, muted indigo/ink palette, deliberately minimal. */
function posterSamurai(x, y) {
  if (x === 0 || x === MP_W - 1 || y === 0 || y === MP_H - 1) return shade(PALETTE.night900, 1.4);
  if (y <= MP_IMG_Y1) {
    let c = shade(PALETTE.night500, 0.5 + (y / MP_IMG_Y1) * 0.3 + hash2(x, y, 621) * 0.05);
    const cx = 42, cy = 16, r = 16;
    const dx = x - cx, dy = y - cy;
    const rr = Math.sqrt(dx * dx + dy * dy);
    if (rr < r) c = shade(PALETTE.cream100, 0.66 + ((r - rr) / r) * 0.16); // huge pale moon
    if (y > 56) c = shade(PALETTE.night900, 1.05 + hash2(x, y, 622) * 0.08); // ground
    const bx = x - 19, by = y - 48;
    if (Math.abs(bx) < 2.5 && by > -14 && by < 10) c = shade(PALETTE.night900, 1.3); // body
    if (Math.abs(bx) < 1.8 && by > -17 && by < -13) c = shade(PALETTE.night900, 1.3); // head
    if (Math.abs(bx - 3.5 - by * 0.4) < 0.9 && by > -19 && by < -1) c = shade(PALETTE.cream100, 0.55); // diagonal blade
    return c;
  }
  if (y <= MP_TITLE_Y1) {
    let c = shade(PALETTE.night900, 1.02 + hash2(x, y, 623) * 0.05);
    if (y > MP_TITLE_Y0 + 3 && y < MP_TITLE_Y0 + 9 && y % 4 < 2 && x > 14 && x < 50 - ((y * 4) % 8)) c = shade(PALETTE.night500, 1.5);
    return c;
  }
  return posterCredits(x, y, PALETTE.night900, 624) ?? shade(PALETTE.night900, 0.9);
}

/* 4. noir city 64×96 — high-contrast rain-streaked city blocks in
   near-monochrome, one warm lit window, dramatic vertical light shafts. */
const NOIR = "#4a4a56"; // cool near-monochrome slate, indigo-tinted to stay in the house's night-blue family
const NOIR_BUILDINGS = [
  { x0: 2, x1: 14, top: 30 }, { x0: 14, x1: 24, top: 20 }, { x0: 24, x1: 30, top: 38 },
  { x0: 30, x1: 40, top: 14 }, { x0: 40, x1: 48, top: 34 }, { x0: 48, x1: 58, top: 24 },
  { x0: 58, x1: 62, top: 42 },
];
const NOIR_LIT_WINDOW = { x: 34, y: 22 }; // one warm lit window, in the tall central tower
function posterNoirCity(x, y) {
  if (x === 0 || x === MP_W - 1 || y === 0 || y === MP_H - 1) return shade(PALETTE.night900, 1.4);
  if (y <= MP_IMG_Y1) {
    let c = shade(NOIR, 0.46 + (y / MP_IMG_Y1) * 0.26 + hash2(x, y, 631) * 0.05); // sky
    let inBuilding = false;
    for (const b of NOIR_BUILDINGS) {
      if (x >= b.x0 && x < b.x1 && y >= b.top) {
        inBuilding = true;
        c = shade(PALETTE.night900, 1.0 + hash2(x, y, 632) * 0.08);
        if ((x - b.x0) % 3 === 1 && (y - b.top) % 4 === 1 && hash2(x, y, 633) > 0.55) c = shade(NOIR, 0.55); // sparse dim window
      }
    }
    if (x === NOIR_LIT_WINDOW.x && y === NOIR_LIT_WINDOW.y) c = shade(PALETTE.amber500, 0.95); // the one warm lit window
    if (!inBuilding && (x === 19 || x === 20 || x === 46 || x === 47)) c = shade(NOIR, 0.85 + hash2(x, y, 635) * 0.06); // vertical light shafts
    if (!inBuilding && (x + y * 2) % 19 === 0) c = shade(NOIR, 1.3); // rain streaks (sky only, keeps buildings crisp)
    return c;
  }
  if (y <= MP_TITLE_Y1) {
    let c = shade(PALETTE.night900, 1.0 + hash2(x, y, 636) * 0.06);
    if (y > MP_TITLE_Y0 + 2 && y < MP_TITLE_Y0 + 9 && y % 4 < 2 && x > 6 && x < 58 - ((y * 6) % 10)) c = shade(NOIR, 1.5);
    if (y > MP_TITLE_Y0 + 11 && y < MP_TITLE_Y0 + 17 && y % 3 < 1 && x > 10 && x < 54) c = shade(PALETTE.amber500, 0.5);
    return c;
  }
  return posterCredits(x, y, PALETTE.night900, 637) ?? shade(PALETTE.night900, 0.9);
}

/* 5. retro sci-fi 64×96 — ringed planet + small ship silhouette over a
   horizon gradient, chunky 80s colour banding (teal→magenta), starfield
   speckle. */
const RETRO_BANDS = [PALETTE.teal500, "#3f7fae", PALETTE.purple500, "#8a4a72", PALETTE.red500];
function posterRetroSpace(x, y) {
  if (x === 0 || x === MP_W - 1 || y === 0 || y === MP_H - 1) return shade(PALETTE.night900, 1.4);
  if (y <= MP_IMG_Y1) {
    const band = Math.min(Math.floor(y / 13), RETRO_BANDS.length - 1);
    let c = shade(RETRO_BANDS[band], 0.8 + hash2(x, y, 641) * 0.1);
    const star = hash2(x, y, 642);
    if (band < 3 && star > 0.975) c = shade(PALETTE.cream100, 0.7 + hash2(x, y, 643) * 0.2); // starfield, upper bands only
    const cx = 44, cy = 24, r = 10;
    const dx = x - cx, dy = y - cy;
    const rr = Math.sqrt(dx * dx + dy * dy);
    if (rr < r) {
      const ringTone = Math.floor((dy + r) / 3) % 2 === 0 ? PALETTE.amber500 : "#e89a48";
      c = shade(ringTone, 0.85 + hash2(x, y, 644) * 0.1); // ringed planet
    }
    const ang = -0.35;
    const rx = dx * Math.cos(ang) - dy * Math.sin(ang);
    const ry = dx * Math.sin(ang) + dy * Math.cos(ang);
    const ellipse = (rx * rx) / (17 * 17) + (ry * ry) / (3.6 * 3.6);
    if (ellipse > 0.75 && ellipse < 1.15 && !(rr < r * 0.55)) c = shade(PALETTE.cream100, 0.75); // tilted ring
    const sx = x - 16, sy = y - 52;
    if (Math.abs(sx) < 5 - Math.abs(sy) * 0.6 && sy > -3 && sy < 2) c = shade(PALETTE.night900, 1.2); // small ship silhouette
    return c;
  }
  if (y <= MP_TITLE_Y1) {
    let c = shade(PALETTE.purple700, 0.85 + hash2(x, y, 645) * 0.06);
    if (y > MP_TITLE_Y0 + 2 && y < MP_TITLE_Y0 + 9 && y % 4 < 2 && x > 6 && x < 58 - ((y * 5) % 12)) c = shade(PALETTE.teal500, 1.05);
    if (y > MP_TITLE_Y0 + 11 && y < MP_TITLE_Y0 + 17 && y % 3 < 1 && x > 10 && x < 54) c = shade(PALETTE.red500, 0.9);
    return c;
  }
  return posterCredits(x, y, PALETTE.purple700, 646) ?? shade(PALETTE.purple700, 0.85);
}

/* ---- zen garden inset (bedroom engawa, south end): raked gravel bed,
   moss between stones, stepping-stone/rock surface. Same seeded hash2/shade
   idiom as the rest of this file. ---- */

/* raked zen gravel (64×64, tiling): pale warm grey-tan gravel with smooth
   curved rake furrows (ridge→trough sine shading, period 8 so it divides
   the 64px tile cleanly) plus fine speckle. The sin() curve term uses the
   tile's own width as its period so it closes up seamlessly at the x=0/63
   wrap; the furrow period (8) divides both 64 and the y wrap too. */
const GRAVEL = "#cec5ae";
function zenGravel(x, y) {
  const curve = Math.sin((x / 64) * Math.PI * 2) * 2.5; // seamless S-curve
  const period = 8;
  const phase = (((y + curve) % period) + period) % period;
  const ridge = Math.sin((phase / period) * Math.PI * 2); // -1 trough .. +1 ridge
  let c = shade(GRAVEL, 0.92 + ridge * 0.08);
  if (phase > period - 1) c = shade(GRAVEL, 0.8); // furrow line at the trough floor
  const speck = hash2(x, y, 501);
  if (speck > 0.985) c = shade(GRAVEL, 1.12);
  else if (speck < 0.02) c = shade(GRAVEL, 0.82);
  return c;
}

/* zen moss (32×32, tiling): mottled deep/mid green clumps between stones,
   tiny darker flecks. Two-tone clump field straight from PALETTE's green
   pair, no new hue introduced. */
function zenMoss(x, y) {
  const clump = hash2(Math.floor(x / 3), Math.floor(y / 3), 511);
  const base = clump > 0.45 ? PALETTE.green700 : PALETTE.green500;
  const n = hash2(x, y, 512);
  let c = shade(base, 0.85 + n * 0.2);
  const fleck = hash2(x, y, 513);
  if (fleck > 0.94) c = shade(base, 0.55); // tiny dark flecks
  return c;
}

/* stone slab (32×32, tiling): flat warm-grey stepping-stone surface, subtle
   mottling, a soft diagonal mineral streak, and a hairline crack kept clear
   of the tile edges (x 4..27) so it doesn't need seam-matching. */
const STONE = "#8a8072";
function stoneSlab(x, y) {
  const n = hash2(x, y, 521);
  let c = shade(STONE, 0.92 + n * 0.14);
  const diag = (x + y) % 32; // wraps cleanly on a 32px tile
  if (diag > 14 && diag < 17) c = shade(STONE, 1.08 + hash2(x, y, 522) * 0.05);
  const crackY = 20 + Math.round(Math.sin(x / 6) * 2);
  if (y === crackY && x > 4 && x < 27) c = shade(STONE, 0.78);
  if (y === crackY + 1 && x > 10 && x < 20 && hash2(x, y, 523) > 0.6) c = shade(STONE, 0.83);
  return c;
}

/* Only textures referenced by src/ belong here — a JOBS entry for a deleted
   PNG silently resurrects it on the next generator run. Prune both together.
   (Variant fns for rejected style-gate options are kept below for reference.) */
const JOBS = [
  ["neon-3am", 40, 16, neonSign],
  ["neon-shipped", 62, 22, neonShipped],
  ["wall-teal", 32, 80, wallTeal],
  ["wall-midnight", 32, 32, wallMidnight],
  ["rug-kilim", 64, 64, rugKilim],
  ["rug-persian", 64, 64, rugPersian],
  ["floor-walnut", 32, 32, floorWalnut],
  ["poster-gig", 32, 88, posterGig],
  ["poster-wave", 40, 56, posterWave],
  ["poster-moons", 40, 56, posterMoons],
  ["wall-sand", 32, 32, wallSand],
  ["wall-sage", 32, 32, wallSage],
  ["wall-dusk", 32, 32, wallDusk],
  ["floor-oak", 32, 32, floorOak],
  ["linen-quilt", 64, 64, linenQuilt],
  ["curtain-weave", 32, 64, curtainWeave],
  ["rug-bedroom", 64, 64, rugBedroom],
  ["rug-shag-cream", 64, 64, rugShagCream],
  ["rug-tatami", 64, 64, rugTatami],
  ["rug-midcentury", 64, 64, rugMidcentury],
  ["rug-moroccan", 64, 64, rugMoroccan],
  ["rug-faded-vintage", 64, 64, rugFadedVintage],
  ["poster-sunset-bars", 32, 44, posterSunsetBars],
  ["poster-mountain-ridge", 40, 32, posterMountainRidge],
  ["poster-space-planet", 36, 48, posterSpacePlanet],
  ["poster-wave-arc", 32, 40, posterWaveArc],
  ["poster-mecha", 64, 96, posterMecha],
  ["poster-eclipse", 64, 96, posterEclipse],
  ["poster-samurai", 64, 96, posterSamurai],
  ["poster-noir-city", 64, 96, posterNoirCity],
  ["poster-retro-space", 64, 96, posterRetroSpace],
  ["zen-gravel", 64, 64, zenGravel],
  ["zen-moss", 32, 32, zenMoss],
  ["stone-slab", 32, 32, stoneSlab],
];

for (const [name, w, h, fn] of JOBS) {
  await writePng(`${OUT}/${name}.png`, w, h, fn);
  console.log(`wrote ${OUT}/${name}.png (${w}x${h})`);
}
