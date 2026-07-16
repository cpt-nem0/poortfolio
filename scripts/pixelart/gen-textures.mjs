import { PALETTE, hexToRgb, shade, hash2 } from "./palette.mjs";
import { writePng } from "./png.mjs";

const OUT = "public/3am/tex";

/* ---- floor planks: 32×32, horizontal planks 8px tall, staggered seams ---- */
const PLANK_TONES = [PALETTE.wood300, PALETTE.wood500, PALETTE.wood500, PALETTE.wood700];
function floorPlanks(x, y) {
  const row = Math.floor(y / 8);
  const stagger = (row % 2) * 16;
  const seg = Math.floor(((x + stagger) % 32) / 16);
  const tone = PLANK_TONES[Math.floor(hash2(seg, row, 11) * PLANK_TONES.length)];
  if (y % 8 === 0) return shade(tone, 0.55); // horizontal seam
  if ((x + stagger) % 16 === 0) return shade(tone, 0.6); // butt joint
  const grain = hash2(x, y, 12);
  if (grain > 0.93) return shade(tone, 0.8); // grain fleck
  if (grain < 0.04) return shade(tone, 1.12); // highlight fleck
  return shade(tone, 0.95 + hash2(x, Math.floor(y / 8), 13) * 0.1);
}

/* ---- plaster wall: 32×32 cream with soft noise + sparse specks ---- */
function plaster(x, y) {
  const base = PALETTE.plaster300;
  const n = hash2(x, y, 21);
  if (n > 0.97) return shade(PALETTE.plaster700, 1.0);
  if (n < 0.02) return shade(PALETTE.cream100, 0.98);
  return shade(base, 0.96 + hash2(Math.floor(x / 2), Math.floor(y / 2), 22) * 0.08);
}

/* ---- cabinet wood: 16×16 vertical grain, darker ---- */
function cabinetWood(x, y) {
  const tone = PALETTE.wood700;
  if (x % 8 === 0) return shade(tone, 0.6);
  const g = hash2(Math.floor(x / 2), y, 31);
  if (g > 0.9) return shade(tone, 0.78);
  return shade(tone, 0.95 + hash2(x, 0, 32) * 0.12);
}

/* ---- rug: 64×64, border + diamond motif ---- */
function rug(x, y) {
  const bx = Math.min(x, 63 - x);
  const by = Math.min(y, 63 - y);
  const b = Math.min(bx, by);
  if (b < 2) return shade(PALETTE.purple700, 0.9);
  if (b < 4) return hexToRgb(PALETTE.cream100);
  if (b < 6) return hexToRgb(PALETTE.red500);
  const dx = Math.abs(x - 32);
  const dy = Math.abs(y - 32);
  if (dx + dy < 10) return hexToRgb(PALETTE.red500);
  if (dx + dy < 13) return hexToRgb(PALETTE.cream100);
  const w = hash2(x, y, 41);
  return shade(PALETTE.purple500, 0.92 + w * 0.12);
}

const TILES = [
  { name: "floor-planks", size: 32, fn: floorPlanks },
  { name: "plaster", size: 32, fn: plaster },
  { name: "cabinet-wood", size: 16, fn: cabinetWood },
  { name: "rug", size: 64, fn: rug },
];

for (const t of TILES) {
  await writePng(`${OUT}/${t.name}.png`, t.size, t.size, t.fn);
  console.log(`wrote ${OUT}/${t.name}.png (${t.size}x${t.size})`);
}

/* ---- contact sheet: every tile 8x upscaled, side by side, for human review ---- */
const SCALE = 8;
const PAD = 8;
const sheetW = TILES.reduce((w, t) => w + t.size * SCALE + PAD, PAD);
const sheetH = Math.max(...TILES.map((t) => t.size * SCALE)) + PAD * 2;
await writePng(`${OUT}/_contact-sheet.png`, sheetW, sheetH, (x, y) => {
  let ox = PAD;
  for (const t of TILES) {
    const w = t.size * SCALE;
    if (x >= ox && x < ox + w && y >= PAD && y < PAD + w) {
      return t.fn(Math.floor((x - ox) / SCALE), Math.floor((y - PAD) / SCALE));
    }
    ox += w + PAD;
  }
  return hexToRgb(PALETTE.night900);
});
console.log(`wrote ${OUT}/_contact-sheet.png`);
