import type { ReactNode } from "react";
import { clsx } from "clsx";

const SPANS: Record<string, string> = {
  "1x1": "", "2x1": "md:col-span-2", "1x2": "md:row-span-2",
  "2x2": "md:col-span-2 md:row-span-2", "3x1": "md:col-span-3",
};

export function Tile({ label, span = "1x1", className, children }: {
  // ReactNode, not string — a label can emphasise part of itself (the
  // identity tile brightens the name inside its own label).
  label: ReactNode; span?: keyof typeof SPANS; className?: string; children: ReactNode;
}) {
  return (
    <section className={clsx(
      "bento-tile relative overflow-hidden rounded-lg border p-4 backdrop-blur-[2px] transition-colors",
      "border-[var(--tile-border)] bg-[color-mix(in_srgb,var(--tile)_85%,transparent)] hover:border-[var(--tile-border-hover)]",
      SPANS[span], className)}>
      <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--label)]">{label}</h2>
      {children}
    </section>
  );
}
