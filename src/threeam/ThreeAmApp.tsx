"use client";

import dynamic from "next/dynamic";
import { Hud } from "./hud/Hud";

const Scene = dynamic(() => import("./scene/Scene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-[#0a0916] font-mono text-sm text-[#9d8fd8]">
      booting brain… losing train of thought… found it
    </div>
  ),
});

export function ThreeAmApp() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0916]">
      <Scene />
      <Hud />
    </div>
  );
}
