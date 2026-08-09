import { site } from "@/content/site";
import { Tile } from "../Tile";

const ONE_LINERS: Record<string, string> = {
  Atlys: "cross-sell · visa infra · ai-native",
  Quantive: "llm systems · vector retrieval",
  "Cliff.ai": "anomaly detection · acquired",
};

export function JobsTile() {
  return (
    <Tile label="the day jobs" span="2x1">
      <ul className="mt-2">
        {site.experience.map((e) => (
          <li key={e.company} className="border-t border-[var(--tile-border)] first:border-t-0">
            <a href={e.href} target="_blank" rel="noreferrer" className="group flex flex-col items-start gap-0.5 py-1.5 md:flex-row md:items-baseline md:justify-between md:gap-4">
              <span className="font-mono text-xs font-semibold text-[var(--ink)] group-hover:text-[var(--amber)]">{e.company.toLowerCase()}</span>
              <span className="font-mono text-[10px] text-[var(--dim)] md:truncate">{(ONE_LINERS[e.company] ?? e.role.toLowerCase())} · {e.period.toLowerCase()}</span>
            </a>
          </li>
        ))}
      </ul>
    </Tile>
  );
}
