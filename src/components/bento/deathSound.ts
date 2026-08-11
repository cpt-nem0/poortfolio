/**
 * Audio half of the sekiro 死 easter egg.
 *
 * Plays public/9am/sfx/death.mp3 — the game sound, supplied by the owner and
 * used here at his direction (this is the one exception to the "synthesize,
 * don't self-host" rule the other eggs follow; see konamiFanfare.ts).
 *
 * Fetched lazily on first trigger and cached, so the page never pays for it
 * unless someone actually finds the egg. If the fetch or decode fails for any
 * reason, playSynthToll() covers it — an original struck-bell approximation,
 * so the egg is never silent.
 */

import { getAudioContext } from "./audioContext";

const SFX_URL = "/9am/sfx/death.mp3";
const MASTER_GAIN = 0.55;

let cached: AudioBuffer | null = null;
/** In-flight fetch, so rapid re-triggers don't stack requests. */
let pending: Promise<AudioBuffer | null> | null = null;

function loadBuffer(audioCtx: AudioContext): Promise<AudioBuffer | null> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = fetch(SFX_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => audioCtx.decodeAudioData(buf))
      .then((decoded) => {
        cached = decoded;
        return decoded;
      })
      .catch(() => null); // fall through to the synth toll
  }
  return pending;
}

/** Original struck-bell toll — the fallback if the mp3 can't be played.
 *  Mallet transient + low fundamental + inharmonic partials that decay
 *  faster than it, which is what makes struck metal read as metal. */
function playSynthToll(audioCtx: AudioContext, dest: AudioNode): void {
  const t0 = audioCtx.currentTime;

  const noiseDur = 0.12;
  const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * noiseDur), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const lp = audioCtx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 400;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.5, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);
  noise.connect(lp).connect(noiseGain).connect(dest);
  noise.start(t0);
  noise.stop(t0 + noiseDur + 0.01);

  const tones = [
    { freq: 58, gain: 0.9, dur: 2.6 },
    { freq: 139, gain: 0.24, dur: 1.7 },
    { freq: 232, gain: 0.16, dur: 1.2 },
    { freq: 349, gain: 0.1, dur: 0.9 },
  ];
  tones.forEach(({ freq, gain: g, dur }) => {
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(g, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  });
}

export function playDeath(): void {
  const audioCtx = getAudioContext();
  const master = audioCtx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(audioCtx.destination);

  void loadBuffer(audioCtx).then((buf) => {
    if (buf) {
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.connect(master);
      src.start();
    } else {
      playSynthToll(audioCtx, master);
    }
  });
}
