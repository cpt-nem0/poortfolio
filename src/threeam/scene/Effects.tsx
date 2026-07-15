"use client";

import {
  Bloom,
  EffectComposer,
  Pixelation,
  Vignette,
} from "@react-three/postprocessing";

/** Soft HD-2D look: mild pixel grid, glow on emissives, framed edges. */
export function Effects() {
  return (
    <EffectComposer>
      <Pixelation granularity={3.5} />
      <Bloom intensity={0.5} luminanceThreshold={0.6} mipmapBlur />
      <Vignette eskil={false} offset={0.15} darkness={0.75} />
    </EffectComposer>
  );
}
