"use client";

import { useEffect } from "react";
import {
  Bloom,
  EffectComposer,
  Pixelation,
  Vignette,
} from "@react-three/postprocessing";
import { useThreeAm } from "@/threeam/state/store";

/** Pixel sizes for the HD-2D look; the store's default (7, Rohan-approved)
 *  leads; P cycles the alternatives live for tuning. */
const GRANULARITY_STEPS = [7, 6, 8, 3.5];

/** Soft HD-2D look: pixel grid, glow on emissives, framed edges. */
export function Effects() {
  const pixelSize = useThreeAm((s) => s.pixelSize);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyP" && !e.repeat) {
        const s = useThreeAm.getState();
        const i = GRANULARITY_STEPS.indexOf(s.pixelSize);
        s.setPixelSize(GRANULARITY_STEPS[(i + 1) % GRANULARITY_STEPS.length]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <EffectComposer>
      <Pixelation granularity={pixelSize} />
      <Bloom intensity={0.5} luminanceThreshold={0.6} mipmapBlur />
      <Vignette eskil={false} offset={0.15} darkness={0.75} />
    </EffectComposer>
  );
}
