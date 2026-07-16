"use client";

import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

/** Loads a texture with crisp-pixel settings (NearestFilter, sRGB, repeat).
 *  offsetX/offsetY sample a sub-band of the texture (e.g. only the teal zone
 *  of the wainscot wall texture for low stub walls). */
export function usePixelTexture(
  path: string,
  repeatX = 1,
  repeatY = 1,
  offsetX = 0,
  offsetY = 0
): THREE.Texture {
  const base = useTexture(path); // suspends until loaded; shared cached instance
  return useMemo(() => {
    // Clone per consumer: the drei cache shares one instance per path, and
    // .repeat lives on the instance — two consumers with different repeats
    // would otherwise fight over it (last configure wins).
    const tex = base.clone();
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.offset.set(offsetX, offsetY);
    tex.needsUpdate = true;
    return tex;
  }, [base, repeatX, repeatY, offsetX, offsetY]);
}
