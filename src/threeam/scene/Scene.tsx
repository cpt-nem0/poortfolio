"use client";

import { Canvas } from "@react-three/fiber";
import { House } from "./House";
import { Player } from "./Player";
import { FollowCamera } from "./FollowCamera";
import { Effects } from "./Effects";
import { AudioRig } from "./AudioRig";

/** The 3D world. Extended by House/Player/FollowCamera/Effects tasks. */
export default function Scene() {
  return (
    <Canvas
      camera={{ fov: 35, position: [11, 9, 11] }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#0a0916"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 10, 4]} intensity={1.2} />
      <House />
      <Player />
      <AudioRig />
      <FollowCamera />
      <Effects />
    </Canvas>
  );
}
