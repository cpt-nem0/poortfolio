"use client";

import { useEffect, useState } from "react";
import {
  Bloom,
  EffectComposer,
  Pixelation,
  Vignette,
} from "@react-three/postprocessing";

/** Candidate pixel sizes for the HD-2D look; P cycles through them live. */
const GRANULARITY_STEPS = [3.5, 6, 8];

/** Soft HD-2D look: pixel grid, glow on emissives, framed edges. */
export function Effects() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyP" && !e.repeat) {
        setStep((s) => (s + 1) % GRANULARITY_STEPS.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <EffectComposer>
      <Pixelation granularity={GRANULARITY_STEPS[step]} />
      <Bloom intensity={0.5} luminanceThreshold={0.6} mipmapBlur />
      <Vignette eskil={false} offset={0.15} darkness={0.75} />
    </EffectComposer>
  );
}
