"use client";

import { site } from "@/content/site";
import { useThreeAm } from "@/threeam/state/store";

/** Maps a site.ts project image ("/projects/x.png") to its pixelated twin. */
function pixelThumb(image: string): string {
  return image.replace("/projects/", "/3am/projects/");
}

function Chip({ children }: { children: string }) {
  return (
    <span className="rounded border border-[#453a63] bg-[#241f3d] px-2 py-0.5 text-[10px] text-[#9d8fd8]">
      {children}
    </span>
  );
}

function ProjectsContent() {
  return (
    <div className="flex flex-col gap-5">
      {site.projects.map((p) => (
        <a
          key={p.title}
          href={p.href}
          target="_blank"
          rel="noreferrer"
          className="group flex gap-3 rounded border border-[#453a63] bg-[#14101f]/80 p-3 transition-colors hover:border-[#ffb35c]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny local pixel art, next/image blurs it */}
          <img
            src={pixelThumb(p.image)}
            alt={p.title}
            width={96}
            height={72}
            className="h-[72px] w-[96px] shrink-0 border border-[#453a63] [image-rendering:pixelated]"
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-[#f2ecd8] group-hover:text-[#ffb35c]">
              {p.title} ↗
            </span>
            <span className="line-clamp-3 text-xs leading-relaxed text-[#9d8fd8]">
              {p.description}
            </span>
            <span className="flex flex-wrap gap-1">
              {p.stack.slice(0, 5).map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

function ExperienceContent() {
  return (
    <div className="flex flex-col gap-5">
      {site.experience.map((e) => (
        <a
          key={e.company}
          href={e.href}
          target="_blank"
          rel="noreferrer"
          className="group rounded border border-[#453a63] bg-[#14101f]/80 p-4 transition-colors hover:border-[#ffb35c]"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-[#f2ecd8] group-hover:text-[#ffb35c]">
              {e.role} · {e.company} ↗
            </span>
            <span className="shrink-0 text-[10px] text-[#7d729e]">{e.period}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#9d8fd8]">{e.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {e.stack.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        </a>
      ))}
    </div>
  );
}

const PANEL_TITLES = {
  projects: "things i've built",
  experience: "places i've worked",
} as const;

export function StationPanel() {
  const focus = useThreeAm((s) => s.focus);
  const setFocus = useThreeAm((s) => s.setFocus);
  if (!focus) return null;

  return (
    <aside className="pointer-events-auto absolute right-0 top-0 z-20 flex h-full w-full max-w-md flex-col border-l border-[#453a63] bg-[#0a0916]/95 font-mono backdrop-blur-sm">
      <header className="flex items-center justify-between border-b border-[#453a63] px-5 py-4">
        <h2 className="text-sm tracking-wide text-[#ffd9a0]">{PANEL_TITLES[focus]}</h2>
        <button
          type="button"
          onClick={(e) => {
            setFocus(null);
            e.currentTarget.blur();
          }}
          aria-label="close panel"
          className="rounded px-2 py-1 text-[#cfc6ee] outline-none transition-colors hover:text-[#ffb35c] focus:outline-none"
        >
          ✕
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {focus === "projects" ? <ProjectsContent /> : <ExperienceContent />}
      </div>
      <footer className="border-t border-[#453a63] px-5 py-2 text-[10px] text-[#7d729e]">
        ESC to step back
      </footer>
    </aside>
  );
}
