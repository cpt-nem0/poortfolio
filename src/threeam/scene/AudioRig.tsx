"use client";

import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { audioEngine } from "@/threeam/audio/engine";
import { useAudioStore } from "@/threeam/state/audio";
import { TURNTABLE_POS } from "./rooms/musicNook.constants";

/** Puts the audio listener on the camera and the emitters at the turntable. */
export function AudioRig() {
  const camera = useThree((s) => s.camera);
  const mountRef = useRef<THREE.Group>(null);
  const listener = useMemo(() => new THREE.AudioListener(), []);

  useEffect(() => {
    camera.add(listener);
    if (mountRef.current) audioEngine.attach(listener, mountRef.current);
    if (process.env.NODE_ENV !== "production") {
      const w = window as unknown as Record<string, unknown>;
      w.__3amAudio = { store: useAudioStore, engine: audioEngine };
    }
    return () => {
      audioEngine.detach();
      camera.remove(listener);
      if (process.env.NODE_ENV !== "production") {
        delete (window as unknown as Record<string, unknown>).__3amAudio;
      }
    };
  }, [camera, listener]);

  return <group ref={mountRef} position={TURNTABLE_POS} />;
}
