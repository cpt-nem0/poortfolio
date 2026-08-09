"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MEANWHILE_LOG } from "@/content/bento";
import { Tile } from "../Tile";
import { useReducedMotion } from "../effects";

type Category = keyof typeof MEANWHILE_LOG;
const CATEGORIES = Object.keys(MEANWHILE_LOG) as Category[];
const TAG: Record<Category, string> = { play: "PLAY", read: "READ", cook: "COOK", loop: "LOOP" };
const TAG_COLOR: Record<Category, string> = {
  play: "var(--lime)", read: "var(--lyric)", cook: "var(--amber)", loop: "var(--presence)",
};

const ROW_H = 17; // px, one log row (desktop, single line)
const ROW_H_MOBILE = 30; // px, one log row (mobile, text wraps up to 2 lines)
const APPEND_MS = 8000;
const SHIFT_MS = 400;

type LogLine = { id: number; time: string; category: Category; text: string };

/** Below md, log lines wrap to 2 lines and the visible feed caps at 3 rows instead of 4 —
 *  a fixed-height feed with wrapping text needs a taller, capped row count to keep the
 *  shift animation's translateY math correct. */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading matchMedia's current value on mount is unavoidable; there's no non-effect source for it.
    setIsMobile(mq.matches);
    const on = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return isMobile;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickCategory(exclude: Category | null): Category {
  const pool = exclude ? CATEGORIES.filter((c) => c !== exclude) : CATEGORIES;
  return pool[randInt(0, pool.length - 1)];
}

function pickLine(category: Category, exclude?: string): string {
  const pool = MEANWHILE_LOG[category];
  const options = exclude ? pool.filter((l) => l !== exclude) : pool;
  const choices = options.length > 0 ? options : pool;
  return choices[randInt(0, choices.length - 1)];
}

/** Fake 3am clock: minutes elapsed since 03:00, wrapping past the hour. */
function formatClock(minutesSince3am: number): string {
  const hour = (3 + Math.floor(minutesSince3am / 60)) % 24;
  const minute = minutesSince3am % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function MeanwhileTile() {
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();
  const capacity = isMobile ? 3 : 4;
  const rowH = isMobile ? ROW_H_MOBILE : ROW_H;
  const [lines, setLines] = useState<LogLine[]>([]);
  const [pending, setPending] = useState<LogLine | null>(null);
  const [shifting, setShifting] = useState(false);

  const idRef = useRef(0);
  const offsetRef = useRef(0);
  const lastCategoryRef = useRef<Category | null>(null);
  const lastLineRef = useRef<Partial<Record<Category, string>>>({});
  const linesRef = useRef<LogLine[]>([]);
  useEffect(() => { linesRef.current = lines; }, [lines]);

  const nextLine = useCallback((forceCategory?: Category): LogLine => {
    const isFirst = idRef.current === 0;
    const category = forceCategory ?? pickCategory(lastCategoryRef.current);
    const text = pickLine(category, lastLineRef.current[category]);
    lastCategoryRef.current = category;
    lastLineRef.current = { ...lastLineRef.current, [category]: text };
    offsetRef.current += isFirst ? randInt(0, 20) : randInt(2, 7);
    const line: LogLine = { id: idRef.current, time: formatClock(offsetRef.current), category, text };
    idRef.current += 1;
    return line;
  }, []);

  useEffect(() => {
    const seed = reduced
      ? shuffle(CATEGORIES).slice(0, capacity).map((c) => nextLine(c))
      : shuffle(CATEGORIES).slice(0, Math.min(3, capacity)).map((c) => nextLine(c));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed lines are random per mount; there's no non-effect source for them.
    setLines(seed);
  }, [reduced, capacity, nextLine]);

  const appendLine = useCallback(() => {
    const line = nextLine();
    const hasRoom = linesRef.current.length < capacity;
    setPending(line);
    requestAnimationFrame(() => requestAnimationFrame(() => setShifting(true)));
    window.setTimeout(() => {
      setLines((prev) => (hasRoom ? [...prev, line] : [...prev, line].slice(-capacity)));
      setPending(null);
      setShifting(false);
    }, SHIFT_MS);
  }, [nextLine, capacity]);

  useEffect(() => {
    if (reduced) return;
    const iv = setInterval(appendLine, APPEND_MS);
    return () => clearInterval(iv);
  }, [reduced, appendLine]);

  const visible = pending ? [...lines, pending] : lines;
  const evicting = pending !== null && lines.length >= capacity;

  return (
    <Tile label="meanwhile, somewhere on earth-616">
      <span aria-hidden className="absolute right-4 top-4 block h-2 w-2 rounded-full bg-[var(--presence)]" />
      <div className="relative mt-3 overflow-hidden" style={{ height: rowH * capacity }}>
        <div
          className={shifting && evicting ? "bento-log-shift" : undefined}
          style={{ transform: shifting && evicting ? `translateY(-${rowH}px)` : "translateY(0)" }}
        >
          {visible.map((line, i) => {
            const isLeaving = evicting && i === 0;
            const isEntering = pending !== null && line.id === pending.id;
            const cls = isLeaving ? "bento-log-leave" : isEntering ? "bento-log-enter" : undefined;
            return (
              <div
                key={line.id}
                className={`flex min-w-0 gap-1.5 font-mono text-[10px] leading-tight ${isMobile ? "items-start" : "items-center"} ${cls ?? ""}`}
                style={{ height: rowH }}
              >
                <span className="shrink-0 text-[var(--dim)]">{line.time}</span>
                <span className="shrink-0 font-semibold" style={{ color: TAG_COLOR[line.category] }}>{TAG[line.category]}</span>
                <span className={`min-w-0 flex-1 text-[var(--ink)] ${isMobile ? "line-clamp-2" : "truncate"}`}>{line.text}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="flex items-baseline gap-1.5 border-t border-[var(--tile-border)] pt-2 font-mono text-[9px] text-[var(--dim)] max-md:mt-3 md:absolute md:inset-x-4 md:bottom-3">
        <span className="font-semibold" style={{ color: "var(--door-pink)" }}>ERR</span>
        <button
          type="button"
          onClick={toggleEclipse}
          aria-label="an eclipse is coming"
          className="cursor-pointer border-0 bg-transparent p-0 font-mono text-[9px] text-[var(--dim)] underline decoration-dotted decoration-transparent underline-offset-2 transition-[text-decoration-color] hover:decoration-current"
        >
          berserk
        </button>
        <span>— permanent condition</span>
      </p>
    </Tile>
  );
}

function toggleEclipse() {
  document.documentElement.toggleAttribute("data-eclipse");
}
