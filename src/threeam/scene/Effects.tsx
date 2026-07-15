"use client";

import {
  Bloom,
  EffectComposer,
  Pixelation,
  Vignette,
} from "@react-three/postprocessing";

/**
 * HD-2D look: pixel grid, glow on emissives, framed edges.
 * Granularity 6 chosen by feel (Rohan, 2026-07); re-taste once real
 * pixel-art textures land in Plan 2 — the grid should roughly match
 * the art's texel density.
 */
export function Effects() {
  return (
    <EffectComposer>
      <Pixelation granularity={6} />
      <Bloom intensity={0.5} luminanceThreshold={0.6} mipmapBlur />
      <Vignette eskil={false} offset={0.15} darkness={0.75} />
    </EffectComposer>
  );
}
