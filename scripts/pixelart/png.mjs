import pkg from "pngjs";
import { mkdirSync, createWriteStream } from "node:fs";
import { dirname } from "node:path";

const { PNG } = pkg;

/**
 * Write a PNG by evaluating colorAt(x, y) -> [r,g,b] | [r,g,b,a] per pixel.
 */
export function writePng(path, w, h, colorAt) {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = colorAt(x, y);
      const i = (y * w + x) * 4;
      png.data[i] = c[0];
      png.data[i + 1] = c[1];
      png.data[i + 2] = c[2];
      png.data[i + 3] = c.length > 3 ? c[3] : 255;
    }
  }
  mkdirSync(dirname(path), { recursive: true });
  return new Promise((resolve, reject) => {
    png.pack().pipe(createWriteStream(path)).on("finish", resolve).on("error", reject);
  });
}
