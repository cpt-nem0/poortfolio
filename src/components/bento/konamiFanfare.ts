/**
 * Original 8-bit arcade-style chiptune for the konami easter egg.
 * NOT the Konami melody — an original 150bpm riff over a 16th-note grid
 * (lead + bass + noise percussion) resolving into a held finale chord.
 * ~4.5s total.
 */

import { getAudioContext } from "./audioContext";

const STEP_MS = 100; // 16th note at 150bpm
const LEAD_GATE_MS = 85;
const BASS_GATE_MS = 90;
const LEAD_GAIN = 0.1;
const BASS_GAIN = 0.12;
const PERC_GAIN = 0.06;
const CHORD_START_MS = 16 * STEP_MS; // right after the 16-note riff
const CHORD_HOLD_MS = 500;
const CHORD_TAIL_MS = 2400; // ring-out, gives the finale its length
const CHORD_TOTAL_MS = CHORD_HOLD_MS + CHORD_TAIL_MS;
const CHORD_VOICE_GAIN = 0.07; // four stacked lead voices — trimmed for headroom

// E5 G5 A5 G5 · E5 G5 A5 C6 · B5 G5 E5 G5 · A5 G5 E5 D5
const LEAD_NOTES = [659.25, 783.99, 880, 783.99, 659.25, 783.99, 880, 1046.5, 987.77, 783.99, 659.25, 783.99, 880, 783.99, 659.25, 587.33];
// C3 C3 G2 G2 · A2 A2 E2 E2 · F2 F2 C3 C3 · G2 G2 G2 G2
const BASS_NOTES = [130.81, 130.81, 98, 98, 110, 110, 82.41, 82.41, 87.31, 87.31, 130.81, 130.81, 98, 98, 98, 98];
const FINALE_CHORD = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
const FINALE_BASS_ROOT = 65.41; // C2

/** Quick attack + decay-to-silence envelope, for a single short note. */
function playTone(audioCtx: AudioContext, freq: number, type: OscillatorType, startMs: number, durationMs: number, gain: number): void {
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = audioCtx.currentTime + startMs / 1000;
  const t1 = t0 + durationMs / 1000;
  gainNode.gain.setValueAtTime(0, t0);
  gainNode.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

/** Attack, hold at gain, then a long decay tail — used for the finale. */
function playSustain(audioCtx: AudioContext, freq: number, type: OscillatorType, startMs: number, holdMs: number, tailMs: number, gain: number): void {
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = audioCtx.currentTime + startMs / 1000;
  const tHold = t0 + holdMs / 1000;
  const tEnd = tHold + tailMs / 1000;
  gainNode.gain.setValueAtTime(0, t0);
  gainNode.gain.linearRampToValueAtTime(gain, t0 + 0.02);
  gainNode.gain.setValueAtTime(gain, tHold);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, tEnd);
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(tEnd + 0.02);
}

/** A single noise hit (hat/snare) through a bandpass filter. */
function playNoiseHit(audioCtx: AudioContext, startMs: number, durationMs: number, freq: number, q: number, gain: number): void {
  const dur = durationMs / 1000;
  const buffer = audioCtx.createBuffer(1, Math.max(1, Math.floor(audioCtx.sampleRate * dur)), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const bandpass = audioCtx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = freq;
  bandpass.Q.value = q;
  const gainNode = audioCtx.createGain();
  const t0 = audioCtx.currentTime + startMs / 1000;
  gainNode.gain.setValueAtTime(gain, t0);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bandpass).connect(gainNode).connect(audioCtx.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.01);
}

/**
 * Plays the fanfare and calls `onNote(noteIndex)` at the moment each lead
 * note starts (indices 0-15 for the 16th-note riff, 16 for the closing
 * finale chord) so callers can sync a visual light-show. Uses setTimeout
 * for the visual callbacks (±30ms tolerance is fine) alongside
 * sample-accurate WebAudio scheduling for the actual sound. Resolves once
 * the fanfare (including the finale's ring-out) has finished.
 */
export function playFanfare(onNote: (noteIndex: number) => void): Promise<void> {
  const audioCtx = getAudioContext();

  // Lead + bass: one hit per 16th-note slot.
  LEAD_NOTES.forEach((freq, i) => playTone(audioCtx, freq, "square", i * STEP_MS, LEAD_GATE_MS, LEAD_GAIN));
  BASS_NOTES.forEach((freq, i) => playTone(audioCtx, freq, "triangle", i * STEP_MS, BASS_GATE_MS, BASS_GAIN));

  // Percussion: closed hat on every eighth note, snare on beats 2 and 4.
  for (let i = 0; i < 8; i++) playNoiseHit(audioCtx, i * 200, 25, 9000, 1, PERC_GAIN);
  playNoiseHit(audioCtx, 400, 140, 2000, 0.7, PERC_GAIN);
  playNoiseHit(audioCtx, 1200, 140, 2000, 0.7, PERC_GAIN);

  // Finale: held chord + root, both ring out together.
  FINALE_CHORD.forEach((freq) => playSustain(audioCtx, freq, "square", CHORD_START_MS, CHORD_HOLD_MS, CHORD_TAIL_MS, CHORD_VOICE_GAIN));
  playSustain(audioCtx, FINALE_BASS_ROOT, "triangle", CHORD_START_MS, CHORD_HOLD_MS, CHORD_TAIL_MS, BASS_GAIN);

  const noteEvents = [...LEAD_NOTES.map((_, i) => i * STEP_MS), CHORD_START_MS];
  const totalMs = CHORD_START_MS + CHORD_TOTAL_MS;

  return new Promise((resolve) => {
    noteEvents.forEach((t, i) => window.setTimeout(() => onNote(i), t));
    window.setTimeout(resolve, totalMs);
  });
}
