"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Pixel-art speech bubble (site-wide primitive — Rohan 2026-10-18: "we need
 * dialogue boxes like this across the website", reference: retro 8-bit
 * bubbles with stepped corners, a 1px-unit outline and a stair-step tail).
 *
 * Pure CSS, content-sized: the box is clipped to a two-step pixel corner
 * polygon in `unit`-px steps, the outline is the outer element's background
 * showing through a `unit` inset, and the tail is one `unit`×`unit` element
 * drawn with box-shadow "pixels". No blur, no border-radius, no SVG — it
 * stays crisp at any size and the fill can be translucent without the
 * outline going soft.
 *
 * Fill defaults to #21242A at 0.85 alpha (owner-picked: "10–20% transparent"),
 * outline to a dark grey a step above the fill (owner: "so it don't stand
 * out too much"). Content gets 2u+2 / 3u+3 padding (owner: "a lil big").
 */

export type PixelBubbleProps = {
  children: ReactNode;
  /** Pixel size in CSS px. 3 reads as chunky-retro at HUD scale. */
  unit?: number;
  /** Stair-step tail hanging off the bottom edge, or none. */
  tail?: "bottom" | "none";
  /** 0–1: where along the bottom edge the tail sits (0.5 = centre). */
  tailAt?: number;
  fill?: string;
  outline?: string;
  className?: string;
  style?: CSSProperties;
};

export const PIXEL_BUBBLE_FILL = "rgba(33, 36, 42, 0.85)"; // #21242A, ~15% see-through
export const PIXEL_BUBBLE_OUTLINE = "#454a56"; // dark grey — a step lighter than the fill, reads as an edge without glowing

/** Two-step pixel corner, as a clip-path polygon in px steps of `u`. */
function steppedCorners(u: number): string {
  const a = `${u}px`;
  const b = `${2 * u}px`;
  const A = `calc(100% - ${u}px)`;
  const B = `calc(100% - ${2 * u}px)`;
  return `polygon(${[
    `${b} 0`, `${B} 0`, `${B} ${a}`, `${A} ${a}`, `${A} ${b}`, `100% ${b}`,
    `100% ${B}`, `${A} ${B}`, `${A} ${A}`, `${B} ${A}`, `${B} 100%`, `${b} 100%`,
    `${b} ${A}`, `${a} ${A}`, `${a} ${B}`, `0 ${B}`, `0 ${b}`, `${a} ${b}`, `${a} ${a}`, `${b} ${a}`,
  ].join(", ")})`;
}

/** Down-pointing stair-step tail, 5 px wide × 4 px tall (in units), drawn
 *  as box-shadow pixels off a 1×1 anchor whose top-left is the tail's
 *  (0,0). Row 0 overlaps the bubble's bottom outline to open it up. */
function tailPixels(u: number, fill: string, outline: string): string {
  const px = (x: number, y: number, c: string) => `${x * u}px ${y * u}px 0 0 ${c}`;
  return [
    // row 0 (sits on the bubble's outline row): punch the fill through
    px(1, 0, fill), px(2, 0, fill), px(3, 0, fill),
    // row 1: outline walls, 3 fill
    px(0, 1, outline), px(1, 1, fill), px(2, 1, fill), px(3, 1, fill), px(4, 1, outline),
    // row 2: step in
    px(1, 2, outline), px(2, 2, fill), px(3, 2, outline),
    // row 3: tip
    px(2, 3, outline),
  ].join(", ");
}

export function PixelBubble({
  children,
  unit = 3,
  tail = "bottom",
  tailAt = 0.5,
  fill = PIXEL_BUBBLE_FILL,
  outline = PIXEL_BUBBLE_OUTLINE,
  className,
  style,
}: PixelBubbleProps) {
  const clip = steppedCorners(unit);
  return (
    <div
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        // leave room under the box for the tail so layout (and `center`
        // math in callers) includes it
        paddingBottom: tail === "bottom" ? 3 * unit : 0,
        ...style,
      }}
    >
      <div style={{ position: "relative", background: outline, clipPath: clip }}>
        <div
          style={{
            position: "absolute",
            inset: unit,
            background: fill,
            clipPath: clip,
          }}
        />
        <div style={{ position: "relative", padding: `${2 * unit + 2}px ${3 * unit + 3}px` }}>{children}</div>
      </div>
      {tail === "bottom" && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: `calc(${tailAt * 100}% - ${2.5 * unit}px)`,
            // bottom padding is 3u, so a 1u-tall anchor at bottom:3u sits
            // exactly on the box's bottom outline row — row 0 of the tail
            bottom: 3 * unit,
            width: unit,
            height: unit,
            // the anchor pixel itself is transparent; everything is shadows
            background: "transparent",
            boxShadow: tailPixels(unit, fill, outline),
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
