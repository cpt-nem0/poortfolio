"use client";

import { useEffect, useState } from "react";
import {
  Bloom,
  EffectComposer,
  Pixelation,
  Vignette,
} from "@react-three/postprocessing";

/** Pixel sizes for the HD-2D look; index 0 (Rohan-approved) is the default,
 *  P cycles the alternatives live for tuning. */
const GRANULARITY_STEPS = [7, 6, 8, 3.5];

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
