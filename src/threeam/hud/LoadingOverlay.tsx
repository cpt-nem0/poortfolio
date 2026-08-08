"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

// Grace window before we trust "nothing is loading" as a real signal, not a
// race where useProgress just hasn't seen the first onStart yet.
const GRACE_MS = 1000;
// How long to hold on "found it" once loading is actually done.
const HOLD_MS = 300;
// Must match the transition-duration below.
const FADE_MS = 400;

export function LoadingOverlay() {
  const { progress, active } = useProgress();
  const [hasStarted, setHasStarted] = useState(false);
  const [graceOver, setGraceOver] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGraceOver(true), GRACE_MS);
    return () => clearTimeout(t);
  }, []);

  // Latch "we've seen a real loading phase" once active goes true. Deferred
  // via setTimeout (rather than set synchronously in the effect body) so it
  // reads as reacting to an external signal, not mirroring one.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setHasStarted(true), 0);
    return () => clearTimeout(t);
  }, [active]);

  // Once dismissed, latch forever — later suspense waves (room preloads)
  // must not resurrect this overlay.
  useEffect(() => {
    if (dismissed || fadingOut) return;
    const readyToDismiss = (hasStarted || graceOver) && progress >= 100 && !active;
    if (!readyToDismiss) return;
    const holdTimer = setTimeout(() => setFadingOut(true), HOLD_MS);
    return () => clearTimeout(holdTimer);
  }, [progress, active, hasStarted, graceOver, dismissed, fadingOut]);

  useEffect(() => {
    if (!fadingOut) return;
    const fadeTimer = setTimeout(() => setDismissed(true), FADE_MS);
    return () => clearTimeout(fadeTimer);
  }, [fadingOut]);

  if (dismissed) return null;

  const label = progress >= 85 ? "found it" : progress >= 40 ? "losing train of thought…" : "booting brain…";
  const pct = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div
      className="absolute inset-0 z-50 grid place-items-center bg-[#0a0916] font-mono text-sm text-[#9d8fd8] transition-opacity duration-[400ms]"
      style={{ opacity: fadingOut ? 0 : 1 }}
    >
      <div className="text-center">
        <p>{label}</p>
        <p className="mt-1 text-xs text-[#7d729e]">{pct}%</p>
      </div>
    </div>
  );
}
