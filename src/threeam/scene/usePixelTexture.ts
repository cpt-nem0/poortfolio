"use client";

import { useTexture } from "@react-three/drei";
import * as THREE from "three";

/** Loads a texture with crisp-pixel settings (NearestFilter, sRGB, repeat). */
export function usePixelTexture(path: string, repeatX = 1, repeatY = 1): THREE.Texture {
  // Configured via drei's onLoad (runs in its own effect) rather than mutating
  // the hook's return value directly during render.
  return useTexture(path, (tex) => {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  });
}
