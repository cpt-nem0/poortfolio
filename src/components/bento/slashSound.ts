/**
 * Original synthesized metallic clash for the sekiro "slash" easter egg.
 * NOT a sample — no parry/clang audio is reused from anywhere, this is
 * three layered WebAudio components triggered together: a noise impact,
 * an inharmonic metal ring, and a swept-noise "shing". ~350ms total.
 */

import { getAudioContext } from "./audioContext";

const MASTER_GAIN = 0.15;

/** White-noise burst through a highpass — the hit itself. */
function playImpact(audioCtx: AudioContext, dest: AudioNode): void {
  const dur = 0.06;
  const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * dur), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const hp = audioCtx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2000;
  const gain = audioCtx.createGain();
  const t0 = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.2, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(hp).connect(gain).connect(dest);
  src.start(t0);
  src.stop(t0 + dur + 0.01);
}

/** Three inharmonic partials ringing out — the metallic "clang" tail. */
function playMetalRing(audioCtx: AudioContext, dest: AudioNode): void {
  const partials: { freq: number; type: OscillatorType }[] = [
    { freq: 2470, type: "sine" },
    { freq: 3680, type: "triangle" },
    { freq: 5210, type: "sine" },
  ];
  const t0 = audioCtx.currentTime;
  partials.forEach(({ freq, type }) => {
    const osc = audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq + (Math.random() * 2 - 1) * 20; // ±20Hz detune, per trigger
    const gain = audioCtx.createGain();
    const dur = (250 + Math.random() * 50) / 1000; // 250-300ms
    gain.gain.setValueAtTime(0.05, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  });
}

/** Bandpass-filtered noise sweeping low to high — the "shing". */
function playShing(audioCtx: AudioContext, dest: AudioNode): void {
  const dur = 0.12;
  const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * dur), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const bp = audioCtx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 4;
  const t0 = audioCtx.currentTime;
  bp.frequency.setValueAtTime(1200, t0);
  bp.frequency.exponentialRampToValueAtTime(6000, t0 + dur);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.08, t0);
  gain.gain.linearRampToValueAtTime(0, t0 + dur);
  src.connect(bp).connect(gain).connect(dest);
  src.start(t0);
  src.stop(t0 + dur + 0.01);
}

/** Plays the slash clash: impact + metal ring + shing, layered together. */
export function playSlash(): void {
  const audioCtx = getAudioContext();
  const master = audioCtx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(audioCtx.destination);

  playImpact(audioCtx, master);
  playMetalRing(audioCtx, master);
  playShing(audioCtx, master);
}
