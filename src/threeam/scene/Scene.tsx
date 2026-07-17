"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { House } from "./House";
import { Player } from "./Player";
import { FollowCamera } from "./FollowCamera";
import { Effects } from "./Effects";
import { AudioRig } from "./AudioRig";
import { MusicNook } from "./rooms/MusicNook";
import { Workspace } from "./rooms/Workspace";
import { useThreeAm } from "@/threeam/state/store";

/** The 3D world. Extended by House/Player/FollowCamera/Effects tasks. */
export default function Scene() {
  const area = useThreeAm((s) => s.area);
  return (
    <Canvas
      shadows
      camera={{ fov: 35, position: [11, 9, 11] }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#0a0916"]} />
      <ambientLight intensity={0.3} color="#8d9bd6" />
      <directionalLight position={[6, 10, 4]} intensity={0.4} color="#7684c9" />
      <House />
      {area === "ground" && (
        <Suspense fallback={null}>
          <MusicNook />
          <Workspace />
        </Suspense>
      )}
      <Player />
      <AudioRig />
      <FollowCamera />
      <Effects />
    </Canvas>
  );
}
