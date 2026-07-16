/**
 * Synthesized vinyl sound effects — no asset files needed.
 * Both take an explicit destination so they route through the master gain.
 */

/** Short filtered-noise thump+hiss: the needle landing on a record. */
export function playNeedleDrop(ctx: AudioContext, dest: AudioNode): void {
  const dur = 0.22;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-6 * t) * (t < 0.02 ? 2.5 : 0.6);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1200;
  const gain = ctx.createGain();
  gain.gain.value = 0.5;
  src.connect(lp).connect(gain).connect(dest);
  src.start();
}

/** Continuous faint vinyl crackle loop. Returns a stop function. */
export function startCrackle(ctx: AudioContext, dest: AudioNode): () => void {
  const dur = 2;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() < 0.0007 ? (Math.random() * 2 - 1) * 0.8 : 0;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1800;
  const gain = ctx.createGain();
  gain.gain.value = 0.12;
  src.connect(hp).connect(gain).connect(dest);
  src.start();
  return () => src.stop();
}
