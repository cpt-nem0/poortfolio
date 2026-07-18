"use client";

import {
  Bloom,
  EffectComposer,
  Pixelation,
  Vignette,
} from "@react-three/postprocessing";


export function Effects() {
  return (
    <EffectComposer>
      <Pixelation granularity={2} />
      <Bloom intensity={0.5} luminanceThreshold={0.6} mipmapBlur />
      <Vignette eskil={false} offset={0.15} darkness={0.75} />
    </EffectComposer>
  );
}
