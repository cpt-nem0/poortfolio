/**
 * Master palette for all /3am pixel art. One source of truth — the room's
 * cohesion comes from every texture/sprite drawing from these ~24 colors.
 * Plain JS so both node generation scripts and vitest can import it.
 */
export const PALETTE = {
  night900: "#12101f", night700: "#1a1630", night500: "#241f3d", night300: "#2e2a4d",
  plaster300: "#d9c49c", plaster500: "#c9b088", plaster700: "#a98f68",
  wood300: "#a06b42", wood500: "#8a5a3b", wood700: "#6b4128", wood900: "#4a3a2e",
  amber300: "#ffd9a0", amber500: "#ffb35c", amber700: "#e89a48",
  salt500: "#ff8f70", green500: "#3f8f5a", green700: "#2e6e54",
  teal500: "#57b6e8", red500: "#b3475f", purple500: "#5b4b8a", purple700: "#453a63",
  cream100: "#f2ecd8", vinyl900: "#151318", vinyl700: "#221e29", mint400: "#7cffb2",
};

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Multiply-and-clamp brightness; returns [r,g,b]. */
export function shade(hex, f) {
  return hexToRgb(hex).map((c) => Math.max(0, Math.min(255, Math.round(c * f))));
}

/** Deterministic 2D hash → [0,1). Same (x,y,seed) always gives same value. */
export function hash2(x, y, seed = 0) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 2147483647;
  h = (h ^ (h >>> 13)) >>> 0;
  h = (h * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
