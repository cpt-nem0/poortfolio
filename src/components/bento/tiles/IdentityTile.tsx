"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { site } from "@/content/site";
import { HERO_QUOTES } from "@/content/bento";
import { Tile } from "../Tile";
import { useReducedMotion } from "../effects";

const QUOTE_INTERVAL_MS = 7000;
const QUOTE_TRANSITION_MS = 650;

function useLocalClock(): string {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase());
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);
  return t ?? "3:04 am"; // static pre-mount placeholder, on-lore
}

/** Renders a quote with its trailing . ? ! or … colored amber — the tile's signature. */
function renderQuote(quote: string): ReactNode {
  const m = quote.match(/[.?!…]$/);
  if (!m) return quote;
  return (
    <>
      {quote.slice(0, -1)}
      <span className="text-[var(--amber)]">{m[0]}</span>
    </>
  );
}

/** Cycles HERO_QUOTES every 7s with a crossfade. SSR renders index 0 (no hydration
 *  mismatch); on mount it jumps once to a random start index, then cycles from there.
 *  Reduced motion: one random quote for the whole visit, no cycling, no animation. */
function useHeroQuote(reduced: boolean): { idx: number; prevIdx: number | null } {
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const idxRef = useRef(0);

  useEffect(() => {
    const start = Math.floor(Math.random() * HERO_QUOTES.length);
    idxRef.current = start;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- picking a random start quote requires client-only randomness; SSR must render index 0 first to avoid a hydration mismatch.
    setIdx(start);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const iv = setInterval(() => {
      const next = (idxRef.current + 1) % HERO_QUOTES.length;
      setPrevIdx(idxRef.current);
      idxRef.current = next;
      setIdx(next);
    }, QUOTE_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [reduced]);

  useEffect(() => {
    if (prevIdx === null) return;
    const t = setTimeout(() => setPrevIdx(null), QUOTE_TRANSITION_MS);
    return () => clearTimeout(t);
  }, [prevIdx]);

  return { idx, prevIdx };
}

export function IdentityTile() {
  const reduced = useReducedMotion();
  const { idx, prevIdx } = useHeroQuote(reduced);
  const clock = useLocalClock();
  const links = [
    ...site.socials.map((s) => ({ label: s.label.toLowerCase(), href: s.href })),
    { label: "resume", href: site.resumeHref },
  ];
  return (
    <Tile label={`rohan yadav · earth-616 · ${clock}`} span="2x2">
      <h1 className="relative mt-5 h-[3.2em] overflow-hidden font-sans text-4xl font-extrabold leading-[1.04] tracking-tight text-[var(--ink)] md:h-[3.25em] md:text-5xl lg:text-6xl xl:h-[2.2em]">
        {prevIdx !== null && (
          <span key={`out-${prevIdx}`} className={clsx("absolute inset-0 top-0", !reduced && "bento-quote-out")}>
            {renderQuote(HERO_QUOTES[prevIdx])}
          </span>
        )}
        <span key={`in-${idx}`} className={clsx("absolute inset-0 top-0", !reduced && "bento-quote-in")}>
          {renderQuote(HERO_QUOTES[idx])}
        </span>
      </h1>
      <p className="mt-4 font-mono text-xs text-[var(--dim)]">
        engineer · senior swe @ <a href="https://atlys.com" target="_blank" rel="noreferrer" className="text-[var(--ink)] underline-offset-2 hover:underline">atlys</a>
      </p>
      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-[var(--dim)]">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} target="_blank" rel="noreferrer" className="hover:text-[var(--amber)]">{l.label}</a>
          </li>
        ))}
      </ul>
    </Tile>
  );
}
