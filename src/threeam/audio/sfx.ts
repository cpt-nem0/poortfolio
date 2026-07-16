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
  // Sparse SOFT pops: each is a tiny decaying burst (~60 samples), not a
  // single-sample impulse — raw impulses read as harsh clicks/screech on
  // real speakers (style-gate feedback), bursts read as dusty vinyl.
  const popLen = Math.floor(ctx.sampleRate * 0.0015);
  for (let i = 0; i < data.length; i++) {
    if (Math.random() < 0.00018) {
      const amp = (Math.random() * 2 - 1) * 0.25;
      for (let j = 0; j < popLen && i + j < data.length; j++) {
        data[i + j] += amp * Math.exp(-4 * (j / popLen)) * Math.sin(j * 0.9);
      }
      i += popLen;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 900;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 4500;
  const gain = ctx.createGain();
  gain.gain.value = 0.03;
  src.connect(hp).connect(lp).connect(gain).connect(dest);
  src.start();
  return () => src.stop();
}
