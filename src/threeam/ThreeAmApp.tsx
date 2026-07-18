"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { Hud } from "./hud/Hud";
import { StationPanel } from "./hud/StationPanel";
import { audioEngine } from "@/threeam/audio/engine";
import { useThreeAm } from "@/threeam/state/store";

const Scene = dynamic(() => import("./scene/Scene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-[#0a0916] font-mono text-sm text-[#9d8fd8]">
      booting brain… losing train of thought… found it
    </div>
  ),
});

export function ThreeAmApp() {
  useEffect(() => {
    const unlock = () => audioEngine.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.code === "Escape") useThreeAm.getState().setFocus(null);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0916]">
      <Scene />
      <Hud />
      <StationPanel />
    </div>
  );
}
