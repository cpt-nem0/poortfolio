# /3am Workspace + Station System — Implementation Plan (Plan 3 of the /3am series)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the gray-box workspace (room x∈[8,16]) into Rohan's art-passed home office AND build the station system — walk up to (or click) the corkboard or the project wall, the camera pushes in, and a content panel opens with the REAL portfolio data from `src/content/site.ts` (2 jobs, 5 projects with pixelated screenshots). Plus the real ladder sprite replacing the green pad, and the deferred fixes from Plan 2's final review.

**Architecture:** Stations follow the proven portal pattern: a pure registry (`world/stations.ts`, rect triggers + camera poses, unit-tested) → Player detects proximity and E-key focuses → zustand `focus` drives a camera override in FollowCamera and a DOM `StationPanel` in the HUD layer. Room content reuses the nook's established patterns exactly: layout colliders as the single source of footprints, surface planes over the gray shell, `usePixelTexture`, visible-fixture-only lighting with soft shadows, style-test toggles (1/2 keys) for Rohan's wall/floor pick at the gate. Portfolio content is never duplicated — panels read `site.ts` directly; project screenshots are auto-pixelated by a new deterministic script.

**Tech Stack:** Existing stack only (Next 16, r3f 9, three 0.185, drei, zustand, vitest, pngjs). No new deps.

**Spec:** `docs/superpowers/specs/2026-07-15-adhd-brain-house-design.md` §3 (workspace station + interaction model), §4 (content mapping), §6 (lighting rules), §11 step 3. Scope split: bedroom (incl. cat, dresser, sword) moves to its own next plan.

## Global Constraints

- All portfolio content comes from `src/content/site.ts` (`site.projects: Project[]` with `{title, description, href, image, stack}`, `site.experience: Experience[]` with `{role, company, href, period, summary, stack}`) — never hardcode copies of it in components.
- **No invisible light sources** (hard rule): every warm light is attached to a visible fixture; emissive screens (monitors) may carry their own small light like the spec's TV rule. Soft shadows only: shadow-casting lights use `shadow-intensity={0.4} shadow-radius={5}` (the nook's settings); never full hard shadow rigs.
- Pixel textures: NearestFilter+sRGB via `usePixelTexture(path, rx?, ry?, ox?, oy?)`; generation scripts deterministic (seeded `hash2`, no `Math.random`); generated PNGs committed.
- Room pattern (copy the nook's): layout colliders in `world/layout.ts` `furniture` = single source of footprints; meshes must sit exactly on them; surface planes offset a few cm off the gray shell; paint every visible wall face (north wall, BOTH divider faces this room shows, south stub band); wall height `WALL_H = 2.8`.
- Doorways (z∈[2.2,3.8] at x=8 and x=16) and the ladder trigger ({14.6, 0.2, 1.2, 1.0}) must stay reachable — the existing invariants + furniture test suites are the guard and must stay green.
- E-key priority: portal beats station when both are armed (they must never overlap anyway).
- `/` route module graph must not gain three/r3f imports. Commit after every task with the given message.
- A dev server may already be running at `http://localhost:3000` (controller says per task); use `npx -y agent-browser` (eval has NO top-level await; real clicks via `mouse move/down/up`); screenshots to the session scratchpad; Read every screenshot you cite. Dev handles: `window.__3am = { playerPosition, store }`, `window.__3amAudio`.
- Deferred-from-Plan-2 items land in Task 1 (texture disposal, near-miss collider tests, palette docstring).
- Deliberate deferrals (later plans, not omissions): bedroom room (next plan), click-to-walk + touch controls, front-door street sliver, ambient crackle final verdict.

---

### Task 1: Plan-2 deferred fixes

**Files:**
- Modify: `src/threeam/scene/usePixelTexture.ts`
- Modify: `scripts/pixelart/palette.mjs` (docstring only)
- Test: `src/threeam/world/__tests__/furniture.test.ts` (add near-miss cases)

**Interfaces:**
- Consumes: existing `usePixelTexture`, `isBlocked`, `HOUSE`.
- Produces: `usePixelTexture` unchanged signature but disposes clones on unmount (later rooms multiply clones).

- [ ] **Step 1: Add clone disposal to the texture hook**

In `src/threeam/scene/usePixelTexture.ts`, add `useEffect` to the imports from react, and after the `useMemo` block (before `return`), restructure so the memoized texture is disposed when replaced/unmounted:

```ts
  const tex = useMemo(() => {
    // ... existing clone+configure body unchanged ...
  }, [base, repeatX, repeatY, offsetX, offsetY]);

  useEffect(() => {
    // GPU texture objects from clones are not auto-disposed by r3f
    return () => {
      tex.dispose();
    };
  }, [tex]);

  return tex;
```

(Keep the existing configure body verbatim inside the `useMemo`; only the variable assignment + effect + return change.)

- [ ] **Step 2: Add near-miss collider tests**

Append to `src/threeam/world/__tests__/furniture.test.ts` inside the describe block:

```ts
  it("near-miss probes just outside footprints stay walkable", () => {
    // just south of the record console's edge (z 1.2) + player radius 0.35
    expect(isBlocked(ground, 19, 1.6)).toBe(false);
    // just east of the sofa's AABB (x 19.9 + 0.35)
    expect(isBlocked(ground, 20.3, 5.2)).toBe(false);
  });

  it("near-miss probes just inside blocked margins are blocked", () => {
    expect(isBlocked(ground, 19, 1.5)).toBe(true); // within radius of console
    expect(isBlocked(ground, 20.2, 5.2)).toBe(true); // within radius of sofa
  });
```

- [ ] **Step 3: Fix the palette docstring**

In `scripts/pixelart/palette.mjs`, change the comment `One source of truth — the room's cohesion comes from every texture/sprite drawing from these ~24 colors.` to say `these 26 colors` (or the actual current count — verify with `node -e "import('./scripts/pixelart/palette.mjs').then(m => console.log(Object.keys(m.PALETTE).length))"`).

- [ ] **Step 4: Run gates**

Run: `pnpm test` (expect 47 + 2 new = 49 passing), `npx tsc --noEmit`, `pnpm lint` — all clean. Browser sanity: reload `/3am`, walk into the nook — textures still render (disposal must not kill live textures).

- [ ] **Step 5: Commit**

```bash
git add -A src scripts
git commit -m "chore(3am): plan-2 deferred fixes — texture clone disposal, near-miss collider tests, palette docstring"
```

---

### Task 2: Workspace art assets — pixelated project screenshots + terminal/cork textures

**Files:**
- Create: `scripts/pixelart/gen-projects.mjs`
- Create: `scripts/pixelart/gen-workspace.mjs`
- Modify: `package.json` (scripts `gen:projects`, `gen:workspace`)
- Output (committed): `public/3am/projects/{whimsy,pokedex,digi-hex,cliche-todo,portfolio-site}.png` (64×48), `public/3am/tex/terminal.png` (64×40), `public/3am/tex/cork.png` (64×48), `public/3am/tex/floor-planks.png` (regenerated via existing `pnpm gen:textures`)

**Interfaces:**
- Consumes: `writePng`, `PALETTE`, `hash2`, `shade` from `scripts/pixelart/`; source images in `public/projects/*.png`.
- Produces: pixelated project thumbs at `/3am/projects/<basename>.png` — path convention: `site.ts`'s `project.image` `"/projects/X.png"` maps to `"/3am/projects/X.png"` (Tasks 10, 11 rely on this). Terminal + cork textures for Tasks 8–9.

- [ ] **Step 1: Write the project pixelator**

Create `scripts/pixelart/gen-projects.mjs`:

```js
import { readdirSync, readFileSync } from "node:fs";
import pkg from "pngjs";
import { writePng } from "./png.mjs";

const { PNG } = pkg;
const W = 64;
const H = 48;
const QUANT = 16;

/** Box-sample source RGBA to W×H with soft channel quantization. */
function downscale(img) {
  const cw = img.width / W;
  const ch = img.height / H;
  return (x, y) => {
    let r = 0, g = 0, b = 0, n = 0;
    const x0 = Math.floor(x * cw), x1 = Math.min(img.width, Math.ceil((x + 1) * cw));
    const y0 = Math.floor(y * ch), y1 = Math.min(img.height, Math.ceil((y + 1) * ch));
    for (let sy = y0; sy < y1; sy++) {
      for (let sx = x0; sx < x1; sx++) {
        const i = (sy * img.width + sx) * 4;
        r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n++;
      }
    }
    const q = (v) => Math.min(255, Math.round(v / n / (256 / QUANT)) * (256 / QUANT));
    return [q(r), q(g), q(b)];
  };
}

for (const f of readdirSync("public/projects").filter((f) => f.endsWith(".png"))) {
  const img = PNG.sync.read(readFileSync(`public/projects/${f}`));
  await writePng(`public/3am/projects/${f}`, W, H, downscale(img));
  console.log(`wrote public/3am/projects/${f}`);
}
```

- [ ] **Step 2: Write the workspace texture generator**

Create `scripts/pixelart/gen-workspace.mjs`:

```js
import { PALETTE, hexToRgb, shade, hash2 } from "./palette.mjs";
import { writePng } from "./png.mjs";

/* terminal screen 64×40: dark editor with glowing green code lines */
function terminal(x, y) {
  let c = hexToRgb("#0a120c");
  if (x < 3 || x > 60 || y < 3 || y > 36) return shade("#1a2a1e", 0.9); // bezel-ish edge glowset
  const row = Math.floor((y - 5) / 4);
  const inRow = (y - 5) % 4 < 2;
  if (inRow && row >= 0 && row < 8) {
    const lineLen = 12 + Math.floor(hash2(0, row, 301) * 40);
    const indent = row % 3 === 0 ? 5 : 9 + Math.floor(hash2(1, row, 302) * 8);
    if (x > indent && x < indent + lineLen && hash2(x, row, 303) > 0.25) {
      c = row % 4 === 1 ? hexToRgb(PALETTE.teal500) : hexToRgb(PALETTE.mint400);
      if (hash2(x, row, 304) > 0.85) c = hexToRgb(PALETTE.amber500); // keyword pops
    }
  }
  // blinking-cursor block on the last line (static in texture)
  if (x >= 6 && x <= 8 && y >= 33 && y <= 35) c = hexToRgb(PALETTE.mint400);
  return c;
}

/* corkboard 64×48: warm tan noise + darker frame */
function cork(x, y) {
  const b = Math.min(x, 63 - x, y, 47 - y);
  if (b < 3) return shade(PALETTE.wood700, 0.95 + hash2(x, y, 311) * 0.08);
  const n = hash2(x, y, 312);
  const base = "#b08a5e";
  if (n > 0.95) return shade(base, 0.78);
  if (n < 0.04) return shade(base, 1.14);
  return shade(base, 0.94 + hash2(Math.floor(x / 2), Math.floor(y / 2), 313) * 0.1);
}

await writePng("public/3am/tex/terminal.png", 64, 40, terminal);
console.log("wrote public/3am/tex/terminal.png");
await writePng("public/3am/tex/cork.png", 64, 48, cork);
console.log("wrote public/3am/tex/cork.png");
```

- [ ] **Step 3: Run all three generators**

Add to `package.json` scripts: `"gen:projects": "node scripts/pixelart/gen-projects.mjs"`, `"gen:workspace": "node scripts/pixelart/gen-workspace.mjs"`.
Run: `pnpm gen:textures && pnpm gen:projects && pnpm gen:workspace`
Expected: floor-planks.png regenerated (it was pruned in the style round), 5 project PNGs + terminal + cork written.

- [ ] **Step 4: Review the art**

Read each `public/3am/projects/*.png`: every screenshot must remain recognizable as its app at 64px (the Pokédex grid, the terminal-y whimsy shot, etc.). Read `terminal.png` (reads as glowing code editor) and `cork.png` (reads as cork). If a project thumb is mush, bump `W/H` to 80×60 and re-run (document it).

- [ ] **Step 5: Commit**

```bash
git add scripts package.json public/3am
git commit -m "feat(3am): pixelated project screenshots + terminal/cork textures"
```

---

### Task 3: Station registry (pure world data)

**Files:**
- Create: `src/threeam/world/stations.ts`
- Test: `src/threeam/world/__tests__/stations.test.ts`

**Interfaces:**
- Consumes: `Rect`, `AreaId` from `layout.ts`.
- Produces (Tasks 4–6, 10, 11 rely on these exact names):

```ts
export type StationId = "projects" | "experience";
export type Station = {
  id: StationId;
  area: AreaId;
  /** standing in this rect arms the station (HUD prompt + E to focus) */
  trigger: Rect;
  label: string; // HUD prompt, e.g. "look at the projects"
  camera: { pos: [number, number, number]; look: [number, number, number] };
};
export const STATIONS: Station[];
export function stationAt(areaId: AreaId, x: number, z: number): Station | null;
```

- [ ] **Step 1: Write the failing test**

Create `src/threeam/world/__tests__/stations.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { STATIONS, stationAt } from "@/threeam/world/stations";
import { HOUSE } from "@/threeam/world/layout";
import { portalAt } from "@/threeam/world/detect";
import { isBlocked } from "@/threeam/world/collision";

describe("stations", () => {
  it("registry has the projects and experience stations on the ground floor", () => {
    expect(STATIONS.map((s) => s.id).sort()).toEqual(["experience", "projects"]);
    for (const s of STATIONS) expect(s.area).toBe("ground");
  });

  it("stationAt finds a station inside its trigger and null elsewhere", () => {
    const exp = STATIONS.find((s) => s.id === "experience")!;
    const cx = exp.trigger.x + exp.trigger.w / 2;
    const cz = exp.trigger.z + exp.trigger.d / 2;
    expect(stationAt("ground", cx, cz)?.id).toBe("experience");
    expect(stationAt("ground", 4, 3)).toBeNull();
    expect(stationAt("roof", cx, cz)).toBeNull();
  });

  it("station triggers never overlap portal triggers (E-key can't conflict)", () => {
    for (const s of STATIONS) {
      const corners = [
        [s.trigger.x, s.trigger.z],
        [s.trigger.x + s.trigger.w, s.trigger.z],
        [s.trigger.x, s.trigger.z + s.trigger.d],
        [s.trigger.x + s.trigger.w, s.trigger.z + s.trigger.d],
        [s.trigger.x + s.trigger.w / 2, s.trigger.z + s.trigger.d / 2],
      ];
      for (const [x, z] of corners) {
        expect(portalAt(HOUSE.portals, s.area, x, z)).toBeNull();
      }
    }
  });

  it("every station trigger center is reachable (not blocked)", () => {
    for (const s of STATIONS) {
      const cx = s.trigger.x + s.trigger.w / 2;
      const cz = Math.max(s.trigger.z + s.trigger.d / 2, 0.36);
      expect(isBlocked(HOUSE.areas[s.area], cx, cz), s.id).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm test` — FAIL, cannot resolve `@/threeam/world/stations`.

- [ ] **Step 3: Implement the registry**

Create `src/threeam/world/stations.ts`:

```ts
import type { AreaId, Rect } from "./layout";

/**
 * Stations: walk-up content hotspots. Standing in the trigger arms the HUD
 * prompt; E (or clicking the station's meshes) focuses it — the camera
 * flies to `camera` and a content panel opens. Pure data, no three/React.
 */
export type StationId = "projects" | "experience";

export type Station = {
  id: StationId;
  area: AreaId;
  trigger: Rect;
  label: string;
  camera: { pos: [number, number, number]; look: [number, number, number] };
};

export const STATIONS: Station[] = [
  {
    id: "projects",
    area: "ground",
    // in front of the polaroid wall on the west divider (x=8), north segment
    trigger: { x: 8.2, z: 0.4, w: 1.4, d: 1.7 },
    label: "look at the projects",
    camera: { pos: [10.4, 1.9, 1.2], look: [8.15, 1.5, 1.2] },
  },
  {
    id: "experience",
    area: "ground",
    // in front of the corkboard on the north wall (right of the desk)
    trigger: { x: 12.5, z: 0.35, w: 2.0, d: 1.6 },
    label: "read the corkboard",
    camera: { pos: [13.5, 2.0, 3.1], look: [13.5, 1.7, 0.2] },
  },
];

export function stationAt(areaId: AreaId, x: number, z: number): Station | null {
  return (
    STATIONS.find(
      (s) =>
        s.area === areaId &&
        x >= s.trigger.x &&
        x <= s.trigger.x + s.trigger.w &&
        z >= s.trigger.z &&
        z <= s.trigger.z + s.trigger.d
    ) ?? null
  );
}
```

- [ ] **Step 4: Run tests, verify pass; commit**

Run: `pnpm test` — all pass (note: the reachability test also passes AFTER Task 7 adds workspace furniture; if Task 7 later breaks it, Task 7 must adjust rects, not this test).

```bash
git add src/threeam/world
git commit -m "feat(3am): station registry — projects + experience hotspots with camera poses"
```

---

### Task 4: Focus state + Player integration + ESC + HUD prompt

**Files:**
- Modify: `src/threeam/state/store.ts` (add `focus`, `activeStation`)
- Modify: `src/threeam/scene/Player.tsx` (station detection, E priority, movement freeze)
- Modify: `src/threeam/ThreeAmApp.tsx` (ESC clears focus)
- Modify: `src/threeam/hud/Hud.tsx` (station prompt; hide walk hints while focused)
- Test: `src/threeam/state/__tests__/store.test.ts` (extend)

**Interfaces:**
- Consumes: `Station`, `stationAt` (Task 3).
- Produces: store fields `focus: StationId | null`, `activeStation: Station | null`, `setFocus(id)`, `setActiveStation(s)`. Rules Tasks 5–6 rely on: Player freezes movement while `focus !== null`; E priority = portal, then station; ESC anywhere clears focus.

- [ ] **Step 1: Extend the store test**

Append to `src/threeam/state/__tests__/store.test.ts` (inside the describe; also reset `focus: null, activeStation: null` in the existing `beforeEach` setState):

```ts
  it("focus and activeStation update and clear", () => {
    const s = useThreeAm.getState();
    s.setActiveStation(STATIONS[0]);
    expect(useThreeAm.getState().activeStation?.id).toBe(STATIONS[0].id);
    s.setFocus("projects");
    expect(useThreeAm.getState().focus).toBe("projects");
    s.setFocus(null);
    expect(useThreeAm.getState().focus).toBeNull();
  });
```

with `import { STATIONS } from "@/threeam/world/stations";` added to the imports. Run `pnpm test` — FAIL (missing fields).

- [ ] **Step 2: Extend the store**

In `src/threeam/state/store.ts`: import `import type { Station } from "@/threeam/world/stations";` and `import type { StationId } from "@/threeam/world/stations";` (one line: `import type { Station, StationId } from "@/threeam/world/stations";`). Add to the type:

```ts
  /** Station currently focused (camera pushed in + panel open). */
  focus: StationId | null;
  /** Station whose trigger the player stands in (HUD prompt). */
  activeStation: Station | null;
  setFocus: (focus: StationId | null) => void;
  setActiveStation: (activeStation: Station | null) => void;
```

and to the creator: `focus: null,`, `activeStation: null,`, `setFocus: (focus) => set({ focus }),`, `setActiveStation: (activeStation) => set({ activeStation }),`. Run `pnpm test` — PASS.

- [ ] **Step 3: Player integration**

In `src/threeam/scene/Player.tsx`:
- Import `import { stationAt } from "@/threeam/world/detect-stations-alias";` — NO: import from the real module: `import { stationAt } from "@/threeam/world/stations";`
- At the top of the `useFrame` body, freeze while focused:

```ts
    if (useThreeAm.getState().focus) return; // station focused: player frozen
```

- After the portal detection block, add station detection (same change-gated pattern):

```ts
    const station = stationAt(s.area, playerPosition.x, playerPosition.z);
    if (station?.id !== s.activeStation?.id) s.setActiveStation(station);
```

- Replace the interact consumption with the priority chain:

```ts
    if (keyboard.consumeInteract()) {
      if (portal) {
        s.travel(portal);
      } else if (station) {
        s.setFocus(station.id);
      }
    }
```

(The existing `if (keyboard.consumeInteract() && portal) { s.travel(portal); }` block is replaced by the above; keep everything else.)

- [ ] **Step 4: ESC clears focus**

In `src/threeam/ThreeAmApp.tsx`, inside the existing unlock `useEffect` (or a sibling one):

```tsx
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.code === "Escape") useThreeAm.getState().setFocus(null);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);
```

with `import { useThreeAm } from "@/threeam/state/store";` added.

- [ ] **Step 5: HUD prompt**

In `src/threeam/hud/Hud.tsx`: read `const activeStation = useThreeAm((s) => s.activeStation);` and `const focus = useThreeAm((s) => s.focus);`. Render (next to the portal prompt; portal wins if both are somehow set):

```tsx
      {!focus && !portal && activeStation && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded bg-black/60 px-4 py-2 text-[#ffd9a0]">
          [E] {activeStation.label}
        </div>
      )}
```

And wrap the bottom controls hint so it hides while focused: `{!focus && (<div className="absolute bottom-4 …">WASD / arrows to walk · E to interact</div>)}` — while focused the panel (Task 5) shows its own "ESC to step back".

- [ ] **Step 6: Verify in the browser**

Dev server: reload `/3am`, teleport into a station trigger (`window.__3am.playerPosition.x = 13.5; window.__3am.playerPosition.z = 1.1`) → HUD shows "[E] read the corkboard"; dispatch KeyE → eval `window.__3am.store.getState().focus` returns `"experience"`, and dispatched ArrowRight no longer moves `playerPosition` (frozen); dispatch Escape → focus null, movement works again. Run `pnpm test`, `npx tsc --noEmit` — green.

- [ ] **Step 7: Commit**

```bash
git add src/threeam
git commit -m "feat(3am): station focus state — E to focus, ESC to exit, player freeze, HUD prompt"
```

---

### Task 5: StationPanel — the content UI (projects + experience)

**Files:**
- Create: `src/threeam/hud/StationPanel.tsx`
- Modify: `src/threeam/ThreeAmApp.tsx` (render `<StationPanel />` after `<Hud />`)

**Interfaces:**
- Consumes: `useThreeAm` (`focus`, `setFocus`), `site` from `@/content/site` (pure data — safe import).
- Produces: a DOM panel that renders the focused station's content; closes via ✕ or ESC (ESC already wired).

- [ ] **Step 1: Write the panel**

Create `src/threeam/hud/StationPanel.tsx`:

```tsx
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
```

- [ ] **Step 2: Mount it**

In `src/threeam/ThreeAmApp.tsx`: `import { StationPanel } from "./hud/StationPanel";` and render `<StationPanel />` as a sibling after `<Hud />`.

- [ ] **Step 3: Verify in the browser**

Reload `/3am`, teleport into the corkboard trigger, dispatch KeyE → panel slides in with the REAL Quantive + Cliff.ai entries (titles, periods, stacks). Set `window.__3am.store.getState().setFocus('projects')` → panel shows all 5 projects with pixelated thumbs (crisp, `image-rendering: pixelated`) + working links. ✕ and Escape both close. Screenshot both panels, Read them. `pnpm lint` clean (note the eslint disable on the img — next/image would blur pixel art; keep the justification comment).

- [ ] **Step 4: Commit**

```bash
git add src/threeam
git commit -m "feat(3am): station content panels — real projects + experience from site.ts"
```

---

### Task 6: Camera focus override

**Files:**
- Modify: `src/threeam/scene/FollowCamera.tsx`

**Interfaces:**
- Consumes: `focus` from store, `STATIONS` (Task 3).
- Produces: while focused, the camera lerps to the station's `camera.pos`/`look`; on clear it resumes the follow rig (same lerp — no snap in either direction).

- [ ] **Step 1: Implement the override**

In `src/threeam/scene/FollowCamera.tsx`, add `import { STATIONS } from "@/threeam/world/stations";` and inside `useFrame`, after computing `dt`, insert before the existing follow logic:

```ts
    const focus = useThreeAm.getState().focus;
    if (focus) {
      const station = STATIONS.find((st) => st.id === focus);
      if (station) {
        const t = 1 - Math.exp(-LERP * dt);
        const [px, py, pz] = station.camera.pos;
        const [lx, ly, lz] = station.camera.look;
        camera.position.x += (px - camera.position.x) * t;
        camera.position.y += (py - camera.position.y) * t;
        camera.position.z += (pz - camera.position.z) * t;
        camera.lookAt(lx, ly, lz);
        return;
      }
    }
```

(The existing follow block runs unchanged when not focused; because both paths lerp `camera.position`, entering/exiting focus glides.)

- [ ] **Step 2: Verify in the browser**

Focus the corkboard station via KeyE from its trigger → camera glides in and frames the north wall (screenshot: corkboard area fills the left of the frame with the panel on the right). ESC → camera glides back to the follow shot. Screenshot both; Read them; tune the two stations' `camera.pos/look` values in `stations.ts` by screenshot iteration until each station's wall content is clearly framed BESIDE the right-hand panel (the panel covers ~28rem on the right; keep the subject left-of-center). Re-run `pnpm test` after any rect/pose tuning.

- [ ] **Step 3: Commit**

```bash
git add src/threeam
git commit -m "feat(3am): camera pushes in on focused station, glides back on exit"
```

---

### Task 7: Workspace furniture colliders

**Files:**
- Modify: `src/threeam/world/layout.ts` (workspace furniture)
- Test: `src/threeam/world/__tests__/furniture.test.ts` (workspace cases)

**Interfaces:**
- Produces exact footprints Tasks 8–11 meshes must sit on: desk `{9.5, 0.3, 3.0, 0.9}`, chair `{10.7, 1.5, 0.8, 0.8}`, shelf unit `{8.15, 4.3, 0.55, 1.1}`, floor lamp `{8.9, 5.3, 0.35, 0.35}`.

- [ ] **Step 1: Write the failing tests**

Append to `furniture.test.ts`:

```ts
describe("workspace furniture colliders", () => {
  it("desk, chair, shelf and floor lamp block", () => {
    expect(isBlocked(ground, 11, 0.75)).toBe(true); // desk
    expect(isBlocked(ground, 11.1, 1.9)).toBe(true); // chair
    expect(isBlocked(ground, 8.4, 4.8)).toBe(true); // shelf unit
    expect(isBlocked(ground, 9.05, 5.45)).toBe(true); // floor lamp
  });

  it("workspace walkways stay open", () => {
    expect(isBlocked(ground, 12, 3)).toBe(false); // room center
    expect(isBlocked(ground, 9.7, 2.9)).toBe(false); // between chair and west door
    expect(isBlocked(ground, 13.5, 1.1)).toBe(false); // corkboard station spot
    expect(isBlocked(ground, 8.9, 1.2)).toBe(false); // projects station spot
  });
});
```

Run `pnpm test` — the blocking assertions FAIL (no furniture yet).

- [ ] **Step 2: Add the furniture**

In `layout.ts` GROUND furniture array, append:

```ts
    // workspace
    { x: 9.5, z: 0.3, w: 3.0, d: 0.9 }, // desk
    { x: 10.7, z: 1.5, w: 0.8, d: 0.8 }, // desk chair
    { x: 8.15, z: 4.3, w: 0.55, d: 1.1 }, // shelf unit (west wall, south of door)
    { x: 8.9, z: 5.3, w: 0.35, d: 0.35 }, // floor lamp
```

- [ ] **Step 3: Run the whole suite**

`pnpm test` — ALL green, especially: the existing invariants (spawn/portals), the station reachability test from Task 3, and the new workspace cases. If a station spot broke, adjust the furniture rects (never the station tests).

- [ ] **Step 4: Commit**

```bash
git add src/threeam/world
git commit -m "feat(3am): workspace furniture colliders (desk, chair, shelf, lamp)"
```

---

### Task 8: Workspace surfaces + style-test toggles

**Files:**
- Create: `src/threeam/scene/rooms/Workspace.tsx` (surfaces + style toggles; later tasks extend it)
- Modify: `src/threeam/scene/Scene.tsx` (mount), `src/threeam/scene/House.tsx` (`ART_PASSED` gains `"workspace"`)

**Interfaces:**
- Consumes: `usePixelTexture`, existing texture pool (`plaster`, `wall-teal`, `wall-plum`, `wall-stripes`, `floor-planks`, `floor-walnut`, `floor-graywash`, `floor-herringbone`).
- Produces: `<Workspace />` with painted surfaces on every visible face (north wall x 8–16, west divider workspace face at x≈8.11 facing +x in two segments, east divider workspace face at x≈15.89 facing −x in two segments, south stub band) + baseboards. Style toggles: **1 cycles walls, 2 cycles floors** (workspace-scoped; removed at the gate). Defaults: cream plaster walls + honey planks floor (deliberately warmer than the nook — the "work happens here" room reads day-ish even at night).

- [ ] **Step 1: Write the Workspace surfaces component**

Create `src/threeam/scene/rooms/Workspace.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { usePixelTexture } from "../usePixelTexture";

const WALL_H = 2.8; // must match House.tsx
export const WORKSPACE = { x: 8, z: 0, w: 8, d: 6 };

/* style-test toggles (1 walls / 2 floors) — removed once Rohan picks */
const WALL_VARIANTS = [
  { label: "cream plaster", path: "/3am/tex/plaster.png", ry: WALL_H },
  { label: "teal + wainscot", path: "/3am/tex/wall-teal.png", ry: 1 },
  { label: "dusty plum", path: "/3am/tex/wall-plum.png", ry: WALL_H },
  { label: "vintage stripes", path: "/3am/tex/wall-stripes.png", ry: WALL_H },
];
const FLOOR_VARIANTS = [
  { label: "honey planks", path: "/3am/tex/floor-planks.png", rx: WORKSPACE.w, ry: WORKSPACE.d },
  { label: "dark walnut", path: "/3am/tex/floor-walnut.png", rx: WORKSPACE.w, ry: WORKSPACE.d },
  { label: "herringbone", path: "/3am/tex/floor-herringbone.png", rx: WORKSPACE.w / 2, ry: WORKSPACE.d / 2 },
  { label: "gray-washed", path: "/3am/tex/floor-graywash.png", rx: WORKSPACE.w, ry: WORKSPACE.d },
];

export function Workspace() {
  const R = WORKSPACE;
  const rootRef = useRef<THREE.Group>(null);
  const [wallIdx, setWallIdx] = useState(0);
  const [floorIdx, setFloorIdx] = useState(0);
  const wallV = WALL_VARIANTS[wallIdx];
  const floorV = FLOOR_VARIANTS[floorIdx];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Digit1") setWallIdx((i) => (i + 1) % WALL_VARIANTS.length);
      if (e.code === "Digit2") setFloorIdx((i) => (i + 1) % FLOOR_VARIANTS.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    rootRef.current?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, []);

  const floor = usePixelTexture(floorV.path, floorV.rx, floorV.ry);
  const wallN = usePixelTexture(wallV.path, R.w, wallV.ry);
  const wallSegW = usePixelTexture(wallV.path, 2.2, wallV.ry === 1 ? 1 : WALL_H);
  const wallSegE = usePixelTexture(wallV.path, 2.2, wallV.ry === 1 ? 1 : WALL_H);
  const wallStub = usePixelTexture(wallV.path, R.w, 0.2, 0, 0.5);

  const segs: Array<{ x: number; rotY: number }> = [
    { x: R.x + 0.11, rotY: Math.PI / 2 }, // west divider, workspace face
    { x: R.x + R.w - 0.11, rotY: -Math.PI / 2 }, // east divider, workspace face
  ];

  return (
    <group ref={rootRef}>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[R.x + R.w / 2, 0.02, R.z + R.d / 2]}>
        <planeGeometry args={[R.w, R.d]} />
        <meshStandardMaterial map={floor} />
      </mesh>
      {/* north wall */}
      <mesh position={[R.x + R.w / 2, WALL_H / 2, R.z + 0.01]}>
        <planeGeometry args={[R.w, WALL_H]} />
        <meshStandardMaterial map={wallN} />
      </mesh>
      {/* divider faces, two segments each (flanking the doors) */}
      {segs.map((seg, i) => (
        <group key={i}>
          <mesh rotation={[0, seg.rotY, 0]} position={[seg.x, WALL_H / 2, 1.1]}>
            <planeGeometry args={[2.2, WALL_H]} />
            <meshStandardMaterial map={i === 0 ? wallSegW : wallSegE} />
          </mesh>
          <mesh rotation={[0, seg.rotY, 0]} position={[seg.x, WALL_H / 2, 4.9]}>
            <planeGeometry args={[2.2, WALL_H]} />
            <meshStandardMaterial map={i === 0 ? wallSegW : wallSegE} />
          </mesh>
        </group>
      ))}
      {/* south stub band */}
      <mesh rotation={[0, Math.PI, 0]} position={[R.x + R.w / 2, 0.275, R.z + R.d - 0.015]}>
        <planeGeometry args={[R.w, 0.55]} />
        <meshStandardMaterial map={wallStub} />
      </mesh>
      {/* baseboards (north + both divider faces) */}
      <mesh position={[R.x + R.w / 2, 0.09, R.z + 0.045]}>
        <boxGeometry args={[R.w, 0.18, 0.07]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>
      {[R.x + 0.145, R.x + R.w - 0.145].map((bx) => (
        <group key={bx}>
          <mesh position={[bx, 0.09, 1.1]}>
            <boxGeometry args={[0.07, 0.18, 2.2]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
          <mesh position={[bx, 0.09, 4.9]}>
            <boxGeometry args={[0.07, 0.18, 2.2]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
```

- [ ] **Step 2: Mount + retire the tint**

Scene.tsx: `import { Workspace } from "./rooms/Workspace";` and render `<Workspace />` inside the same `area === "ground"` Suspense block as `<MusicNook />`. House.tsx: `ART_PASSED` becomes `new Set<string>(["music", "workspace"])`.

- [ ] **Step 3: Verify + note the shared-texture caveat**

Browser: workspace shows cream walls + honey planks; nook unchanged; 1/2 cycle workspace only (NOTE: the nook's toggles were removed, so Digit1/2 are free again). One caveat to verify: `wallSegW`/`wallSegE` intentionally use separate `usePixelTexture` calls (per-consumer clones — same-path repeats can't fight). Check the doorway walls' texture isn't stretched. Screenshot, Read it. Tests/tsc/lint green.

- [ ] **Step 4: Commit**

```bash
git add src/threeam
git commit -m "feat(3am): workspace surfaces — painted walls/floor with style-test toggles"
```

---

### Task 9: Desk hardware — monitors, chair, desk lamp, clutter

**Files:**
- Modify: `src/threeam/scene/rooms/Workspace.tsx` (add furniture section)

**Interfaces:**
- Consumes: colliders from Task 7 (meshes sit exactly on them), `terminal.png` (Task 2).
- Produces: the desk scene. The monitor's screen is emissive `terminal.png` and carries a small green screen-glow light (visible-fixture rule: the screen IS the fixture, like the spec's TV).

- [ ] **Step 1: Add the furniture JSX**

Inside the `<group ref={rootRef}>` in `Workspace.tsx`, after the baseboards, add (and add `const termTex = usePixelTexture("/3am/tex/terminal.png", 1, 1);` to the hooks):

```tsx
      {/* ── desk — collider {9.5,0.3,3.0,0.9} ── */}
      <group position={[11, 0, 0.75]}>
        <mesh position={[0, 0.72, 0]}>
          <boxGeometry args={[3.0, 0.06, 0.9]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {[
          [-1.42, -0.38], [-1.42, 0.38], [1.42, -0.38], [1.42, 0.38],
        ].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.36, lz]}>
            <boxGeometry args={[0.08, 0.72, 0.08]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
        ))}
        {/* main monitor with glowing terminal */}
        <group position={[-0.35, 0.75, -0.15]} rotation={[0, 0.08, 0]}>
          <mesh position={[0, 0.34, 0]}>
            <boxGeometry args={[0.78, 0.5, 0.05]} />
            <meshStandardMaterial color="#22222c" />
          </mesh>
          <mesh position={[0, 0.34, 0.028]}>
            <planeGeometry args={[0.7, 0.42]} />
            <meshBasicMaterial map={termTex} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.1, 0.12, 0.08]} />
            <meshStandardMaterial color="#22222c" />
          </mesh>
        </group>
        {/* second monitor, vertical, slightly angled */}
        <group position={[0.55, 0.75, -0.12]} rotation={[0, -0.18, 0]}>
          <mesh position={[0, 0.36, 0]}>
            <boxGeometry args={[0.42, 0.56, 0.05]} />
            <meshStandardMaterial color="#22222c" />
          </mesh>
          <mesh position={[0, 0.36, 0.028]} rotation={[0, 0, Math.PI / 2]}>
            <planeGeometry args={[0.48, 0.34]} />
            <meshBasicMaterial map={termTex} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.09, 0.1, 0.08]} />
            <meshStandardMaterial color="#22222c" />
          </mesh>
        </group>
        {/* screen glow — attached to the visible screens */}
        <pointLight position={[0, 1.15, 0.2]} color="#7cffb2" intensity={1.6} distance={2.2} decay={2} />
        {/* keyboard, mouse, mug, paper mess */}
        <mesh position={[-0.3, 0.77, 0.22]}>
          <boxGeometry args={[0.55, 0.03, 0.18]} />
          <meshStandardMaterial color="#3a3244" />
        </mesh>
        <mesh position={[0.12, 0.765, 0.24]}>
          <boxGeometry args={[0.09, 0.025, 0.13]} />
          <meshStandardMaterial color="#3a3244" />
        </mesh>
        <mesh position={[1.05, 0.81, 0.15]}>
          <cylinderGeometry args={[0.05, 0.045, 0.12, 8]} />
          <meshStandardMaterial color="#b3475f" />
        </mesh>
        <mesh position={[-1.05, 0.755, 0.2]} rotation={[0, 0.35, 0]}>
          <boxGeometry args={[0.3, 0.01, 0.22]} />
          <meshStandardMaterial color="#e8e2d0" />
        </mesh>
        {/* desk lamp (visible fixture, warm) — light is desk-group-local */}
        <group position={[1.25, 0.75, -0.25]}>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 0.04, 8]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, 0.18, 0]} rotation={[0, 0, 0.35]}>
            <cylinderGeometry args={[0.015, 0.015, 0.3, 6]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[-0.09, 0.33, 0]} rotation={[0, 0, 1.1]}>
            <coneGeometry args={[0.06, 0.1, 8, 1, true]} />
            <meshStandardMaterial color="#ffb35c" emissive="#ffb35c" emissiveIntensity={0.9} side={2} />
          </mesh>
        </group>
        <pointLight castShadow shadow-mapSize={[256, 256]} shadow-bias={-0.004} shadow-radius={5} shadow-intensity={0.4} position={[1.25, 1.15, -0.25]} color="#ffb35c" intensity={3} distance={3} decay={2} />
      </group>

      {/* ── desk chair — collider {10.7,1.5,0.8,0.8} ── */}
      <group position={[11.1, 0, 1.9]} rotation={[0, 0.25, 0]}>
        <mesh position={[0, 0.44, 0]}>
          <boxGeometry args={[0.5, 0.07, 0.48]} />
          <meshStandardMaterial color="#22222c" />
        </mesh>
        <mesh position={[0, 0.75, -0.22]} rotation={[-0.1, 0, 0]}>
          <boxGeometry args={[0.48, 0.6, 0.07]} />
          <meshStandardMaterial color="#22222c" />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.44, 6]} />
          <meshStandardMaterial color="#3a3244" />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.sin(a) * 0.2, 0.03, Math.cos(a) * 0.2]} rotation={[0, a, 0]}>
              <boxGeometry args={[0.06, 0.04, 0.24]} />
              <meshStandardMaterial color="#3a3244" />
            </mesh>
          );
        })}
      </group>

      {/* ── shelf unit — collider {8.15,4.3,0.55,1.1} ── */}
      <group position={[8.425, 0, 4.85]}>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[0.55, 1.4, 1.1]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {[0.35, 0.8, 1.25].map((sy, row) => (
          <group key={sy}>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} position={[0.2, sy, -0.4 + i * 0.26]} rotation={[0, 0, -0.04 + (((i + row) % 3) as number) * 0.04]}>
                <boxGeometry args={[0.05, 0.24, 0.2]} />
                <meshStandardMaterial
                  color={["#5b4b8a", "#2e6e54", "#c98a2e", "#b3475f"][(i + row) % 4]}
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* ── floor lamp — collider {8.9,5.3,0.35,0.35} ── */}
      <group position={[9.075, 0, 5.475]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.16, 0.18, 0.04, 10]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.55, 8]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[0, 1.68, 0]}>
          <cylinderGeometry args={[0.14, 0.2, 0.26, 10, 1, true]} />
          <meshStandardMaterial color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={0.9} side={2} />
        </mesh>
      </group>
      <pointLight castShadow shadow-mapSize={[512, 512]} shadow-bias={-0.004} shadow-radius={5} shadow-intensity={0.4} position={[9.075, 1.75, 5.475]} color="#ffd9a0" intensity={9} distance={6.5} decay={1.8} />
```

- [ ] **Step 2: Verify in the browser**

Walk the workspace: desk with two glowing terminal monitors (crisp green pixel code), chair, packed shelf, two warm lamps + green screen glow; collision matches every footprint (walk against each). Screenshot from the room center and from the doorway. Tests/tsc/lint green (suite unchanged).

- [ ] **Step 3: Commit**

```bash
git add src/threeam
git commit -m "feat(3am): workspace desk hardware — terminal monitors, chair, shelf, lamps"
```

---

### Task 10: Corkboard + red string (experience station)

**Files:**
- Modify: `src/threeam/scene/rooms/Workspace.tsx` (corkboard section)

**Interfaces:**
- Consumes: `cork.png` (Task 2), `site.experience` (for the note COUNT and pin layout only — full text lives in the panel), station focus (`setFocus("experience")` on click).
- Produces: the corkboard wall piece wired to the experience station.

- [ ] **Step 1: Add the corkboard JSX**

Add to `Workspace.tsx` hooks: `const corkTex = usePixelTexture("/3am/tex/cork.png", 1, 1);`, import `useThreeAm` from the store and `site` from `@/content/site`, and add after the desk section:

```tsx
      {/* ── corkboard (experience station) — north wall, right of the desk ── */}
      <group
        position={[13.5, 1.75, 0.045]}
        onClick={(e) => {
          e.stopPropagation();
          useThreeAm.getState().setFocus("experience");
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <mesh>
          <boxGeometry args={[1.7, 1.15, 0.05]} />
          <meshStandardMaterial map={corkTex} />
        </mesh>
        {/* one pinned note per job + red string connecting the pins */}
        {site.experience.map((e2, i) => (
          <group key={e2.company} position={[-0.45 + i * 0.9, 0.15 - (i % 2) * 0.35, 0.035]}>
            <mesh rotation={[0, 0, i % 2 ? 0.06 : -0.05]}>
              <planeGeometry args={[0.42, 0.34]} />
              <meshStandardMaterial color="#f2ecd8" />
            </mesh>
            <mesh position={[0, 0.15, 0.01]}>
              <sphereGeometry args={[0.02, 6, 5]} />
              <meshStandardMaterial color="#b3475f" />
            </mesh>
            {/* scribble lines (illegible on purpose — the panel has the words) */}
            {[0, 1, 2].map((l) => (
              <mesh key={l} position={[0, 0.05 - l * 0.08, 0.005]}>
                <planeGeometry args={[0.3 - l * 0.06, 0.02]} />
                <meshStandardMaterial color="#7d729e" />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[0, 0.06, 0.045]} rotation={[0, 0, -0.36]}>
          <planeGeometry args={[1.0, 0.012]} />
          <meshStandardMaterial color="#c9302f" />
        </mesh>
        {/* a couple of extra empty pins for mess */}
        <mesh position={[0.65, 0.42, 0.03]}>
          <sphereGeometry args={[0.018, 6, 5]} />
          <meshStandardMaterial color="#c98a2e" />
        </mesh>
      </group>
```

- [ ] **Step 2: Verify end-to-end**

Browser: corkboard renders right of the desk with 2 pinned notes + red string; hovering shows pointer; a REAL mouse click (`mouse move/down/up` at its screen coords) sets `focus === "experience"`, camera pushes in, panel opens with Quantive/Cliff.ai; ESC exits. Also verify the E-key path from the trigger. Screenshots of the focused view.

- [ ] **Step 3: Commit**

```bash
git add src/threeam
git commit -m "feat(3am): corkboard with pinned notes + red string, wired to the experience station"
```

---

### Task 11: Project polaroid wall (projects station)

**Files:**
- Modify: `src/threeam/scene/rooms/Workspace.tsx` (polaroid section)

**Interfaces:**
- Consumes: pixelated thumbs (Task 2 path convention), `site.projects`, `setFocus("projects")`.
- Produces: 5 taped polaroids of the REAL projects on the west divider (workspace face), each clickable → projects station.

- [ ] **Step 1: Add the Polaroid child component**

Hooks can't be called in a loop, so each polaroid's texture loads inside its own component. Add to `Workspace.tsx` (module scope, above `Workspace`):

```tsx
/** One taped polaroid; the texture hook lives here so the projects loop stays hook-legal. */
function Polaroid({ image }: { image: string }) {
  const tex = usePixelTexture(image.replace("/projects/", "/3am/projects/"), 1, 1);
  return (
    <mesh position={[0, 0.035, 0.002]}>
      <planeGeometry args={[0.44, 0.33]} />
      <meshStandardMaterial map={tex} />
    </mesh>
  );
}
```

- [ ] **Step 2: Add the polaroid wall JSX**

Inside the `Workspace` group, after the corkboard section:

```tsx
      {/* ── project polaroids (projects station) — west divider, north segment ── */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          useThreeAm.getState().setFocus("projects");
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        {site.projects.map((p, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          return (
            <group
              key={p.title}
              position={[8.12, 2.25 - row * 0.62, 0.55 + col * 0.62 + (row % 2) * 0.3]}
              rotation={[0, Math.PI / 2, (i % 3) * 0.045 - 0.045]}
            >
              {/* white polaroid frame */}
              <mesh>
                <planeGeometry args={[0.5, 0.46]} />
                <meshStandardMaterial color="#f2ecd8" />
              </mesh>
              <Polaroid image={p.image} />
              {/* tape */}
              <mesh position={[0, 0.235, 0.003]} rotation={[0, 0, 0.15]}>
                <planeGeometry args={[0.16, 0.05]} />
                <meshStandardMaterial color="#f2ecd8" opacity={0.6} transparent />
              </mesh>
            </group>
          );
        })}
      </group>
```

- [ ] **Step 3: Verify end-to-end**

Browser: 5 polaroids on the west wall in a loose 2-column scatter, each screenshot recognizable; click any → camera pushes to face the wall, projects panel opens with all 5 entries; links work; ESC exits. E-key path from the trigger too. Screenshot focused + unfocused.

- [ ] **Step 4: Commit**

```bash
git add src/threeam
git commit -m "feat(3am): project polaroid wall — real screenshots, wired to the projects station"
```

---

### Task 12: Real ladder + workspace lighting polish

**Files:**
- Modify: `src/threeam/scene/House.tsx` (replace the green pad with a ladder)
- Modify: `src/threeam/scene/rooms/Workspace.tsx` (lighting tune pass if needed)

**Interfaces:**
- Consumes: `HOUSE.portals` (positions), existing portal glow behavior.
- Produces: a wooden ladder mesh at the ladder portal (both areas), with a small soft emissive marker at its base (subtler than the old pad — the HUD prompt does the talking).

- [ ] **Step 1: Replace the pad**

In `House.tsx`, replace the portal-marker `<mesh>` map (the `planeGeometry` + `#7cffb2` emissive) with a `Ladder` component rendered at each portal of the current area:

```tsx
function Ladder({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {[-0.28, 0.28].map((rx) => (
        <mesh key={rx} position={[rx, 1.3, 0.06]} rotation={[0.22, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 2.7, 6]} />
          <meshStandardMaterial color="#8a5a3b" />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[0, 0.35 + i * 0.42, 0.06 + (1.35 - (0.35 + i * 0.42)) * 0.22]}>
          <boxGeometry args={[0.56, 0.05, 0.05]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
      ))}
      {/* soft floor marker so the interactive spot still reads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0.3]}>
        <circleGeometry args={[0.32, 12]} />
        <meshStandardMaterial color="#7cffb2" emissive="#7cffb2" emissiveIntensity={0.25} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}
```

and where portals were rendered:

```tsx
      {HOUSE.portals
        .filter((p) => p.area === area)
        .map((p) => (
          <Ladder key={p.id} x={p.trigger.x + p.trigger.w / 2} z={p.trigger.z + 0.1} />
        ))}
```

(The ladder leans against the north wall — the trigger sits at z 0.2–1.2 by the wall in both areas, so one component serves both.)

- [ ] **Step 2: Lighting sanity pass**

Walk both rooms: the workspace should read a touch cooler/paler than the nook (cream + planks + peach lamp) but warm enough to feel alive; the ladder must be visible without the old neon-green glare. If the desk corner is too dark, raise the desk lamp light intensity (max 4) — never add unfixtured lights. Screenshot: workspace wide, desk close, ladder area, doorway-to-nook (both rooms lit, each with its own character).

- [ ] **Step 3: Commit**

```bash
git add src/threeam
git commit -m "feat(3am): real wooden ladder replaces the green pad + workspace lighting pass"
```

---

### Task 13: Verification sweep + style gate

**Files:** none new (fixes only).

- [ ] **Step 1: Full gates**

`pnpm test` (expect ~55+), `npx tsc --noEmit`, `pnpm lint`, `pnpm build` (stop any dev server first; `/` first-load unchanged; restart after).

- [ ] **Step 2: E2E walkthrough**

- [ ] Fresh load → walk from spawn through the bedroom (gray) into the workspace: painted room, desk glowing, corkboard + polaroids visible.
- [ ] Projects station: E from trigger AND real click on a polaroid → camera push + panel with 5 real projects, thumbs crisp, links valid; ESC returns cleanly (camera glides back, movement resumes).
- [ ] Experience station: both paths → Quantive/Cliff.ai panel.
- [ ] Focus edge cases: E on station while panel open does nothing weird; ladder E still travels when standing on the ladder trigger (priority test); music keeps playing through focus.
- [ ] Ladder renders as wood ladder in BOTH areas; travel works both ways.
- [ ] Nook regression: turntable, album clicks, pause — all still work.
- [ ] Style toggles: 1/2 cycle workspace walls/floors only.
- [ ] No real console errors; fps ≥50 in the workspace (measure via the window.__fps pattern).

- [ ] **Step 3: Style-gate package**

Screenshots to scratchpad with `gate3-` prefix: workspace wide, desk close-up, corkboard focused (panel open), polaroids focused (panel open), ladder, doorway shot showing nook + workspace both lit. List paths in the report — the controller presents these plus the wall/floor toggle instructions for Rohan's pick.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore(3am): workspace milestone verification fixes"
```

(`--allow-empty` with the same message if nothing needed fixing.)
