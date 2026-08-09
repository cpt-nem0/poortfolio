"use client";

import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { useReducedMotion } from "../effects";
import { Tile } from "../Tile";

const LINES = [
  "♪ and the city hums along in gold…",
  "♪ the streetlights hum our tune…",
  "♪ gold in the dark of the rain…",
] as const;

const PILL_BASE_SHADOW = "0 12px 34px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.06)";
const PILL_HOVER_SHADOW = "0 18px 44px -12px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.1)";

/** Ported from the owner's own Verse site (verse/docs/index.html) — the pill, the wipe, the hover tease. */
export function VerseTile() {
  const verse = site.projects.find((p) => p.title === "Verse");
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % LINES.length), 4000);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <Tile label="verse — lyrics in a pill" className="max-md:min-h-[150px]">
      <a href={verse?.href} target="_blank" rel="noreferrer" className="absolute inset-0" aria-label="Verse — open site" />
      <div className="pointer-events-none relative mt-5 flex justify-center max-md:mb-6">
        {/* the pill stays dark-glass in both themes — product-accurate, not theme-driven, like the door tile.
            Its own <a> (sibling of the full-tile overlay link) so the pill navigates instead of dead-clicking,
            while keeping the hover tease; aria-hidden + tabIndex={-1} since the overlay link already covers
            the accessible name/action for the tile. */}
        <a
          href={verse?.href}
          target="_blank"
          rel="noreferrer"
          aria-hidden="true"
          tabIndex={-1}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="pointer-events-auto inline-flex items-center justify-center rounded-full"
          style={{
            height: 40,
            padding: "0 20px",
            maxWidth: "88%",
            background: "rgba(8, 8, 10, 0.55)",
            backdropFilter: "blur(16px) saturate(1.3)",
            WebkitBackdropFilter: "blur(16px) saturate(1.3)",
            border: `1px solid rgba(255, 255, 255, ${hovered ? 0.22 : 0.12})`,
            boxShadow: hovered ? PILL_HOVER_SHADOW : PILL_BASE_SHADOW,
            transform: hovered ? "translateY(3px) scale(1.02)" : "none",
            transition: "transform 0.4s cubic-bezier(0.34, 1.3, 0.5, 1), border-color 0.4s ease, box-shadow 0.4s ease",
          }}
        >
          {reduced ? (
            <span
              className="pointer-events-none overflow-hidden whitespace-nowrap text-[13.5px] italic text-[#e8b168]"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: "0.01em" }}
            >
              {LINES[0]}
            </span>
          ) : (
            <span
              key={index}
              className="pointer-events-none overflow-hidden whitespace-nowrap text-[13.5px] italic"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                letterSpacing: "0.01em",
                background: "linear-gradient(90deg, #f2f0ec 0%, #f2f0ec 38%, #e8b168 50%, #6b6a68 62%, #6b6a68 100%)",
                backgroundSize: "300% 100%",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "bento-verse-wipe 4s linear infinite",
              }}
            >
              {LINES[index]}
            </span>
          )}
        </a>
      </div>
      <p className="pointer-events-none font-mono text-[9px] text-[var(--dim)] max-md:static max-md:mt-2 md:absolute md:bottom-3">swift · macos ↗</p>
    </Tile>
  );
}
