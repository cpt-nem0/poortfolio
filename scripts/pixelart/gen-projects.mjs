import { readdirSync, readFileSync } from "node:fs";
import pkg from "pngjs";
import { writePng } from "./png.mjs";

const { PNG } = pkg;
const W = 80;
const H = 60;
const QUANT = 16;

/** Box-sample source RGBA to W×H with soft channel quantization. */
function downscale(img) {
  const cw = img.width / W;
  const ch = img.height / H;
  return (x, y) => {
    let r = 0, g = 0, b = 0, n = 0;
    const x0 = Math.floor(x * cw), x1 = Math.min(img.width, Math.ceil((x + 1) * cw));
    const y0 = Math.floor(y * ch), y1 = Math.min(img.height, Math.ceil((y + 1) * ch));
    for (let sy = y0; sy < y1; sy++) {
      for (let sx = x0; sx < x1; sx++) {
        const i = (sy * img.width + sx) * 4;
        r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n++;
      }
    }
    const q = (v) => Math.min(255, Math.round(v / n / (256 / QUANT)) * (256 / QUANT));
    return [q(r), q(g), q(b)];
  };
}

for (const f of readdirSync("public/projects").filter((f) => f.endsWith(".png"))) {
  const img = PNG.sync.read(readFileSync(`public/projects/${f}`));
  await writePng(`public/3am/projects/${f}`, W, H, downscale(img));
  console.log(`wrote public/3am/projects/${f}`);
}
