import { site } from "@/content/site";
import { MORE_PROJECT_BLURBS } from "@/content/bento";
import { Tile } from "../Tile";

const TILED = new Set(["Verse", "Plate", "clickbait"]);

export function MoreTile() {
  const rest = site.projects.filter((p) => !TILED.has(p.title));
  return (
    <Tile label="more things i've built" span="3x1">
      <ul className="mt-2 grid gap-x-6 md:grid-cols-2">
        {rest.map((p) => (
          <li key={p.title} className="border-t border-[var(--tile-border)]">
            <a href={p.href} target="_blank" rel="noreferrer" className="group flex flex-col items-start gap-0.5 py-1.5 md:flex-row md:items-baseline md:justify-between md:gap-4">
              <span className="font-mono text-xs font-semibold text-[var(--ink)] group-hover:text-[var(--amber)]">{p.title.toLowerCase()}</span>
              <span className="font-mono text-[10px] text-[var(--dim)] md:truncate">{MORE_PROJECT_BLURBS[p.title] ?? p.stack.slice(0, 3).join(" · ").toLowerCase()}</span>
            </a>
          </li>
        ))}
      </ul>
    </Tile>
  );
}
