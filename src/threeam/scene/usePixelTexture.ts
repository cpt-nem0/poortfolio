"use client";

import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

/** Loads a texture with crisp-pixel settings (NearestFilter, sRGB, repeat). */
export function usePixelTexture(path: string, repeatX = 1, repeatY = 1): THREE.Texture {
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
    tex.needsUpdate = true;
    return tex;
  }, [base, repeatX, repeatY]);
}
