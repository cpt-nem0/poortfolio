/**
 * Synthesized vinyl sound effects — no asset files needed.
 * Both take an explicit destination so they route through the master gain.
 */

/**
 * The stylus touching vinyl: a light, papery friction hiss with a couple of
 * faint pops — deliberately NO low end (the old version had a bass spike
 * that read as a thump; style-gate feedback asked for a soft touch sound).
 */
export function playNeedleDrop(ctx: AudioContext, dest: AudioNode): void {
  // Sparse crackle, NOT a noise burst — continuous noise with a sharp
  // envelope reads as a snare hit (style-gate feedback). A real stylus
  // touch is a dense flurry of tiny pops that thins out, over a whisper
  // of surface noise.
  const dur = 0.55;
  const sr = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sr * dur, sr);
  const data = buffer.getChannelData(0);
  const popLen = Math.floor(sr * 0.0012);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    // pop density: dense in the first ~100ms, thinning to sparse
    const density = t < 0.18 ? 0.003 : 0.0006 * (1 - t);
    if (Math.random() < density) {
      const amp = (Math.random() * 2 - 1) * (0.5 + Math.random() * 0.3);
      for (let j = 0; j < popLen && i + j < data.length; j++) {
        data[i + j] += amp * Math.exp(-5 * (j / popLen)) * Math.sin(j * 1.1);
      }
      i += popLen;
    } else {
      data[i] += (Math.random() * 2 - 1) * 0.045; // whisper of surface noise
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 900; // no thump
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3800; // gentle, not screechy
  const gain = ctx.createGain();
  gain.gain.value = 0.5;
  src.connect(hp).connect(lp).connect(gain).connect(dest);
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
