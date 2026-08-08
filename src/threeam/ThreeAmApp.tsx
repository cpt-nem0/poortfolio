"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Hud } from "./hud/Hud";
import { StationPanel } from "./hud/StationPanel";
import { LoadingOverlay } from "./hud/LoadingOverlay";
import { MobileGate } from "./hud/MobileGate";
import { CreditsPanel } from "./hud/CreditsPanel";
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

function isTouchViewport() {
  return (
    window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    window.innerWidth < 768
  );
}

export function ThreeAmApp() {
  const [isMobileGate, setIsMobileGate] = useState<boolean | null>(null);
  const [creditsOpen, setCreditsOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobileGate(isTouchViewport());
    check();
  }, []);

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
      {isMobileGate === null ? null : isMobileGate ? (
        <MobileGate />
      ) : (
        <>
          <Scene />
          <Hud onOpenCredits={() => setCreditsOpen(true)} />
          <StationPanel />
          <LoadingOverlay />
          {creditsOpen && <CreditsPanel onClose={() => setCreditsOpen(false)} />}
        </>
      )}
    </div>
  );
}
