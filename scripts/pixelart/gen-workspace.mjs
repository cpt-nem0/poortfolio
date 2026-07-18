import { PALETTE, hexToRgb, shade, hash2 } from "./palette.mjs";
import { writePng } from "./png.mjs";

/* terminal screen 64×40: dark editor with glowing green code lines */
function terminal(x, y) {
  let c = hexToRgb("#0a120c");
  if (x < 3 || x > 60 || y < 3 || y > 36) return shade("#1a2a1e", 0.9); // bezel-ish edge glowset
  const row = Math.floor((y - 5) / 4);
  const inRow = (y - 5) % 4 < 2;
  if (inRow && row >= 0 && row < 8) {
    const lineLen = 12 + Math.floor(hash2(0, row, 301) * 40);
    const indent = row % 3 === 0 ? 5 : 9 + Math.floor(hash2(1, row, 302) * 8);
    if (x > indent && x < indent + lineLen && hash2(x, row, 303) > 0.25) {
      c = row % 4 === 1 ? hexToRgb(PALETTE.teal500) : hexToRgb(PALETTE.mint400);
      if (hash2(x, row, 304) > 0.85) c = hexToRgb(PALETTE.amber500); // keyword pops
    }
  }
  // blinking-cursor block on the last line (static in texture)
  if (x >= 6 && x <= 8 && y >= 33 && y <= 35) c = hexToRgb(PALETTE.mint400);
  return c;
}

/* corkboard 64×48: warm tan noise + darker frame */
function cork(x, y) {
  const b = Math.min(x, 63 - x, y, 47 - y);
  if (b < 3) return shade(PALETTE.wood700, 0.95 + hash2(x, y, 311) * 0.08);
  const n = hash2(x, y, 312);
  const base = "#b08a5e";
  if (n > 0.95) return shade(base, 0.78);
  if (n < 0.04) return shade(base, 1.14);
  return shade(base, 0.94 + hash2(Math.floor(x / 2), Math.floor(y / 2), 313) * 0.1);
}

await writePng("public/3am/tex/terminal.png", 64, 40, terminal);
console.log("wrote public/3am/tex/terminal.png");
await writePng("public/3am/tex/cork.png", 64, 48, cork);
console.log("wrote public/3am/tex/cork.png");
