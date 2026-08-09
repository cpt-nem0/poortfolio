"use client";

import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { Tile } from "../Tile";

/** Heat derives from local time: coolest at 9am, ember by midnight (a joke recruiters can feel). */
function heatFractionAt(hour: number): number {
  return Math.min(1, Math.max(0.15, ((hour + 24 - 9) % 24) / 15));
}

export function PlateTile() {
  const [heat, setHeat] = useState(0.6);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the client's current hour on mount is unavoidable; there's no non-effect source for it.
    setHeat(heatFractionAt(new Date().getHours()));
  }, []);
  const plate = site.projects.find((p) => p.title === "Plate");
  const label = heat > 0.85 ? "on fire" : heat > 0.5 ? "getting warm" : "comfortable";
  const deg = Math.round(heat * 360);
  return (
    <Tile label="plate — nothing slips" className="max-md:min-h-[140px]">
      <a href={plate?.href} target="_blank" rel="noreferrer" className="absolute inset-0" aria-label="Plate — open site" />
      <div className="mt-4 flex items-center gap-3.5">
        <span aria-hidden className="bento-ring pointer-events-none relative block h-[52px] w-[52px] rounded-full"
              style={{ background: `conic-gradient(#646470 0deg ${Math.round(deg * 0.55)}deg, #ef9f27 ${Math.round(deg * 0.55)}deg ${Math.round(deg * 0.9)}deg, #e24b4a ${Math.round(deg * 0.9)}deg ${deg}deg, #2a2a33 ${deg}deg)`, animation: "bento-ring 2.4s infinite" }}>
          <span className="absolute inset-[7px] rounded-full bg-[var(--tile)]" />
        </span>
        <p className="font-mono text-[11px] text-[var(--dim)]">deadline heat:<br /><span className="text-[var(--heat)]">{label}</span></p>
      </div>
      <p className="pointer-events-none font-mono text-[9px] text-[var(--dim)] max-md:static max-md:mt-4 md:absolute md:bottom-3">swift · on-device llm ↗</p>
    </Tile>
  );
}
