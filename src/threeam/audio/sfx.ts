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

/**
 * A contented purr, synthesized (no asset): a ~25Hz train of soft low thumps
 * (each a 20ms damped ~62Hz sine over a whisper of low-passed noise) under a
 * slow in/out breath envelope, low-passed so nothing above a rumble gets
 * out. ~2.6s. Routes through `dest` so mute/pause still apply.
 */
export function playPurr(ctx: AudioContext, dest: AudioNode): void {
  const dur = 2.6;
  const sr = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.floor(sr * dur), sr);
  const data = buffer.getChannelData(0);
  const pulseLen = 0.022; // s — each thump decays inside the inter-pulse gap
  let phase = 0; // pulse-train phase, wraps at 1
  let sincePulse = 1; // s since the current thump started
  let lp = 0; // one-pole low-pass state for the noise bed
  for (let i = 0; i < data.length; i++) {
    const t = i / sr;
    // breathing at ~1.05Hz: purr rate nudges up on the inhale, level swells
    const breath = Math.sin(2 * Math.PI * 1.05 * t);
    const rate = 25 + 3 * Math.max(0, breath);
    phase += rate / sr;
    if (phase >= 1) {
      phase -= 1;
      sincePulse = 0;
    }
    sincePulse += 1 / sr;
    const thumpEnv = sincePulse < pulseLen ? Math.exp(-sincePulse * 140) : 0;
    lp += 0.08 * (Math.random() * 2 - 1 - lp);
    const thump = Math.sin(2 * Math.PI * 62 * sincePulse) * 0.7 + lp * 2.2;
    const breathEnv = 0.6 + 0.4 * Math.sin(2 * Math.PI * 1.05 * t - Math.PI / 2);
    const fade = Math.min(1, t / 0.18, (dur - t) / 0.45);
    data[i] = thump * thumpEnv * breathEnv * fade;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 38; // keep the sub out of small speakers
  const lp2 = ctx.createBiquadFilter();
  lp2.type = "lowpass";
  lp2.frequency.value = 420; // a rumble in the chest, not a buzz
  const gain = ctx.createGain();
  gain.gain.value = 0.6; // sits under the 0.35 ambient without summing past 1
  src.connect(hp).connect(lp2).connect(gain).connect(dest);
  src.start();
}
