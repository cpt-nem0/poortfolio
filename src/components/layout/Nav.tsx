"use client";

import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

/**
 * Vertical nav for the sticky rail. Hidden on mobile (the original relies on
 * sticky section headers there). Adds subtle scroll-spy highlighting — a small,
 * restrained flourish for the dev audience without adding visual noise.
 */
export function Nav() {
  const [active, setActive] = useState<string>(site.nav[0]?.href.slice(1) ?? "");

  useEffect(() => {
    const ids = site.nav.map((n) => n.href.slice(1));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="hidden flex-col gap-4 py-8 lg:flex" aria-label="Section navigation">
      {site.nav.map((item) => {
        const id = item.href.slice(1);
        const isActive = active === id;
        return (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "font-display w-fit text-lg transition-all duration-200 hover:text-accent",
              isActive
                ? "translate-x-1 text-accent"
                : "text-text",
            )}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
