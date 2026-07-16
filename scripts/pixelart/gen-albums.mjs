import { readFileSync } from "node:fs";
import pkg from "pngjs";
import jpeg from "jpeg-js";
import { writePng } from "./png.mjs";

const { PNG } = pkg;
const SIZE = 48; // output px — reads as pixel art, covers stay recognizable
const QUANT = 16; // color levels per channel (soft crunch, keeps identity)

const source = JSON.parse(readFileSync("src/threeam/content/music-source.json", "utf8"));

async function fetchArtwork(itunesId) {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${itunesId}`);
  if (!res.ok) throw new Error(`lookup ${itunesId}: HTTP ${res.status}`);
  const data = await res.json();
  const url100 = data.results?.[0]?.artworkUrl100;
  if (!url100) throw new Error(`lookup ${itunesId}: no artworkUrl100`);
  const bigUrl = url100.replace("100x100bb", "600x600bb");
  const img = await fetch(bigUrl);
  if (!img.ok) throw new Error(`artwork ${itunesId}: HTTP ${img.status}`);
  const buf = Buffer.from(await img.arrayBuffer());
  const type = img.headers.get("content-type") ?? "";
  if (type.includes("png")) {
    const p = PNG.sync.read(buf);
    return { width: p.width, height: p.height, data: p.data };
  }
  return jpeg.decode(buf, { useTArray: true }); // {width, height, data RGBA}
}

/** Box-sample the source image down to SIZE×SIZE and quantize channels. */
function downscale(img) {
  const cell = img.width / SIZE;
  return (x, y) => {
    let r = 0, g = 0, b = 0, n = 0;
    const x0 = Math.floor(x * cell), x1 = Math.min(img.width, Math.ceil((x + 1) * cell));
    const y0 = Math.floor(y * cell), y1 = Math.min(img.height, Math.ceil((y + 1) * cell));
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

for (const entry of source) {
  const img = await fetchArtwork(entry.itunesId);
  await writePng(`public/3am/albums/${entry.key}.png`, SIZE, SIZE, downscale(img));
  console.log(`wrote public/3am/albums/${entry.key}.png (${entry.artist} — ${entry.title})`);
}
