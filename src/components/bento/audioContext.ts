/**
 * Shared lazy AudioContext for the bento easter eggs (konami fanfare, sekiro
 * slash). Created only on first use — always from within a real user
 * gesture (the konami/sekiro keypresses), so autoplay policies are happy.
 */
let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
