# Bento Homepage (`/` revamp) — Design

**Date:** 2026-08-08
**Status:** Approved direction (brainstormed with live mockups, decisions below are Rohan's picks)
**Owner:** Rohan Yadav

## 1. Concept

Replace the current two-column, text-heavy `/` with a **full-page bento grid** under a
**living sky**. Rohan's principle, verbatim: *"I personally don't like words to read, I'm more
on visuals — so why ask people to read and do what I don't like."* The page shows instead of
tells: tiles do things, text is labels not paragraphs.

Lore: `/` is **standing outside the house at night**. The background is the night sky with
drifting clouds and a moon; the "after hours" tile is the door into `/3am`. When the entry
cinematic ships (future plan), clicking the door dives through these same clouds — the two
halves of the site share one world.

Reference taste (Rohan): agentmail.to (dark, mono-caps labels, dashed details, engineering-
clean) + originkit.dev (animated components, "clean modern minimal with a hint of fun").

## 2. Decisions locked during brainstorm

- **Structure:** Bento (option B), calmer v2 composition — 8 tiles, 3-column rhythm, clear
  reading order: who → three live project tiles → the door → jobs → the rest.
- **Identity tile:** tagline-as-hero ("builds whatever needs building.") in huge type — NOT
  the name huge; name lives in the mono label line.
- **Full page:** the grid fills the viewport (desktop); background visible through gaps;
  tiles slightly translucent over it.
- **Background:** custom **night clouds + moon** (option F). Fallback if it reads muddy in
  the real build: starfield (option A) — same palette, drop-in swap, tiles unchanged.
- **Light mode required.** Same sky by day: soft blue, white clouds, sun replacing moon.
- **Theme toggle = the moon/sun itself.** Clicking the celestial body swaps theme. A
  conventional accessible control (keyboard-focusable button, `prefers-color-scheme`
  default) backs it.
- **Killed:** stack marquee tile, "how i work" tile, the phrase "feel > specs", all
  paragraph-length text.
- **Motion budget:** exactly 3 idle animations on screen (Verse lyric cycle, Plate heat
  ring, house window flicker). Everything else animates only on hover/interaction.
  Background drift is slow enough to read as still.
- **meanwhile tile → live presence card:** pulsing status dot, label "meanwhile, somewhere
  in bangalore", rotating one-liners (one per visit + slow cycle): sekiro attempt counter,
  valheim base "structurally questionable, spiritually perfect", 3am maggi, berserk "still
  not okay", frieren rewatch, one piece chapter one-thousand-whatever. Copy lives in a
  const list, easy for Rohan to extend.

## 3. Tile inventory (desktop, 3-col grid)

| # | Tile | Span | Content | Behavior/gimmick |
|---|---|---|---|---|
| 1 | Identity | 2×2 | mono label: `rohan yadav · bangalore · <live clock>`; hero type tagline; `engineer · senior swe @ atlys`; socials + resume links | tagline scramble-in once on load; clock ticks real time (visitor-local, lowercase) |
| 2 | After hours (door) | 1×2, tinted | "it's 3am in here →" glow-pink; 3-line teaser; tiny house silhouette with lit window | window flickers (idle budget); hover = door-creak micro-anim; links `/3am` |
| 3 | Verse | 1×1 | label + cycling lyric lines, italic amber | lyric cycle (idle budget); links site ↗; stack chips tiny in corner |
| 4 | Plate | 1×1 | label + heat ring + "deadline heat: getting warm" | conic-gradient ring pulses (idle budget); ring % can derive from time-of-day |
| 5 | clickbait | 1×1 | label + "click the target. that's the whole game." + small lime square | target dodges cursor within tile; 3 hits = confetti burst (egg) |
| 6 | The day jobs | 2×1 | 3 mono rows: atlys / quantive / cliff.ai with one-line summaries + periods | hover row = accent + slightly expanded detail; links out |
| 7 | Meanwhile | 1×1 | presence card (see §2) | rotating copy; status dot pulse counts toward hover-only? No — dot pulse is subtle, allowed as 4th micro-motion ONLY if it survives the perf/visual pass, else static dot |
| 8 | More things i've built | 3×1 | whimsy, pokédex, digi-hex, this-site as two-column typographic rows | hover = ASCII/pixel motif accent per project — **never a weak screenshot** |

Footer strip (not a tile): `© rohan · credits · <whisper: "the konami code still does
something. so does typing 'sekiro'.">`

Verse/Plate/clickbait are the only projects with tiles because they're the only ones with
strong visual identities. All 8 projects remain in `site.ts`; the flat list renders the rest.

## 4. Background system

- **Component:** `SkyBackground` — fixed, full-viewport, behind the grid, `aria-hidden`.
- **Night (default when `prefers-color-scheme: dark` or toggled):** deep navy gradient
  (`#0a0a16 → #11101f` family), 2–3 cloud layers drifting at different speeds (parallax),
  small moon with soft glow. Cloud shapes: pre-rendered soft PNG/SVG sprites — **no
  full-viewport CSS blur** (GPU cost); transform-only animation.
- **Day:** soft blue gradient, same cloud sprites tinted white, sun with warm glow.
- **Toggle:** moon/sun is a button (`aria-label="switch to day/night"`); crossfade ≤600ms;
  choice persisted (localStorage) and defaulting to `prefers-color-scheme`.
- **Originkit note:** the chosen background is custom-built (F). Originkit remains the
  reference for *tile* effects (text scramble, hover effects). Before copying any Originkit
  code verbatim, check its license/terms at build time; if unclear, reimplement the effect
  from scratch (all effects here are small enough to hand-roll).
- **Cinematic reuse:** cloud layers built as a standalone component with a `dive` prop
  reserved (no implementation now) so the future /3am entry cinematic can reuse them.

## 5. Theming

- CSS custom properties on `:root`, `data-theme="night" | "day"` attribute.
- Night: near-black tiles (`#101016` on `#0a0a16` sky), cream text, amber accent
  (`#ffb35c`), pink 3am glow (`#ff5c7a`), mono labels `#8f8fa3`.
- Day: paper tiles (warm white), ink text, amber stays, 3am tile keeps its dark tint (the
  house is always at 3am — the door tile is a little piece of night embedded in day; this
  contrast is intentional and on-lore).
- Both themes ship in v1. No FOUC: theme attribute set pre-hydration via inline script.

## 6. Content & code mapping

- All copy from `src/content/site.ts` (already rewritten 2026-08-08: Atlys experience,
  8 projects incl. clickbait, new about/tagline). Tiles read the same source; no duplicated
  strings except tile-specific micro-copy (presence lines, teaser lines) which live in a new
  `src/content/bento.ts`.
- New components under `src/components/bento/` (Grid, Tile, SkyBackground, per-tile
  components). Old `Sidebar/About/Experience/Projects/Footer` components and their
  section styles are **deleted** once the bento ships (git history keeps them). The
  about paragraphs stay in `site.ts` — the /3am about station still reads them.
- `/3am` untouched. The `<a href="/3am">` inline link in the old About dies with the old
  About; the door tile replaces it.
- Eggs: konami code + typing "sekiro" → small payoffs (implementation's choice, cheap and
  reversible — e.g. sky briefly rains pixels / a parry flash). Documented in code, not in UI.

## 7. Responsive & accessibility

- **Mobile:** grid stacks to 1 column in reading order (identity → door → verse → plate →
  clickbait → jobs → meanwhile → more). Full-page constraint relaxes to natural scroll.
  Tap replaces hover; the clickbait target just sits still and takes taps on mobile.
- `prefers-reduced-motion`: all idle animations stop (static lyric line, static ring,
  steady window, no scramble, background frozen); content unaffected.
- Recruiter reality check: name, role, company, projects, contact all visible without any
  interaction. Tiles are links with real hrefs; keyboard tab order follows reading order.
- **Recruiter-mode toggle** (Rohan's idea: a button rearranging into a conventional
  resume view) is explicitly **future work**, not in this build.

## 8. Performance

- No canvas/WebGL on `/` — CSS transforms + a handful of DOM sprites only. `/3am` stays
  the only heavy route; `/` must stay instant (it's the recruiter door).
- Lighthouse budget: no regression vs current `/` beyond +≤50KB (sprites + tile code).
- Animations `transform`/`opacity` only; no layout-thrashing keyframes; `will-change`
  sparingly.

## 9. Testing

- Vitest: bento data mapping (site.ts → tiles), presence-line rotation logic, theme
  persistence + default resolution (system pref vs stored choice).
- Visual verification: Rohan walkthrough (both themes, mobile width, reduced-motion) — his
  checklist provided at review time; coordinator browser-verifies structure before handoff.

## 10. Out of scope

Recruiter-mode rearrange toggle · entry-cinematic dive · any /3am change · light-mode for
/3am (the house is always at night) · blog/anything new.
