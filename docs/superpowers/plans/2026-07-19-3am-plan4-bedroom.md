# Plan 4: Bedroom — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Read `docs/superpowers/HANDOFF.md` FIRST** — it carries the conventions, bug classes, and verification protocol this plan assumes. The owner (Rohan) does all visual verification via checklists; implementer agents run only `pnpm test` + `npx tsc --noEmit` + static arithmetic.

**Goal:** Furnish the bedroom (ground area, x 0–8, z 0–6) at full art quality: bed + bedding under a west-wall window, sleeping black cat, manga dresser with figurines, the Dragonslayer, an "about" content station, and a bedside-lamp lighting story — plus the deferred `travel()` state-hardening fix.

**Architecture:** Mirrors the proven room-build pattern (MusicNook → Workspace): colliders in `layout.ts` are the single source of truth; a `Bedroom.tsx` room component layers surface planes over the gray shell (`ART_PASSED`); the station system (`stations.ts` registry + `StationPanel`) gains an `"about"` entry; deterministic pixel textures come from the `scripts/pixelart` generators. Bedroom geometry is Layout-v2-stable (same slot; the v2 restructure later only adds the west window this plan already builds).

**Tech stack:** react-three-fiber 9 / three 0.185 / drei 10 / zustand / vitest (config `vitest.config.mts`, alias `@`→`./src`). Branch: `3am-bedroom` off `main`.

## Global Constraints (binding for every task)

- NO invisible light sources: every warm light nested INSIDE its visible fixture group at the bulb/shade position (rotation-safe). NO new shadow-casting lights (budget stays 2, both in MusicNook). `Scene.tsx` ambient (0.3 `#8d9bd6`) + directional (0.4 `#7684c9`) and the `dpr={1}` / `FrameLimiter fps=60` / `Pixelation granularity={3}` config: UNTOUCHED.
- ≥6mm offsets between stacked coplanar surfaces (house rule tightened at the dpr-1 change; 4mm floor absolute minimum).
- Colliders first, meshes on rects, TDD: every new furniture rect lands with failing-first non-overlap/walkway assertions extended in `src/threeam/world/__tests__/furniture.test.ts`. The exhaustive STATIONS×furniture AABB test and portal-trigger tests must stay green.
- Emissive discipline: any emissive material near Bloom (threshold 0.6) sized/clamped so it glows without clipping (see HANDOFF §6 clipped-pixel methodology; the owner eyeballs final).
- Generator hygiene: every new texture gets BOTH a fn and a JOBS/TILES entry; never delete a PNG without pruning its entry (both generators carry the warning comment).
- Music nook + workspace rooms: untouched except where a task names a file. `/` route imports nothing from `src/threeam`.
- Commit messages exactly as written per task. Baseline at branch start: 69 tests green.

## File map

- Modify: `src/threeam/state/store.ts` (travel hardening), `src/threeam/world/layout.ts` (bedroom furniture rects), `src/threeam/world/stations.ts` (+about), `src/threeam/scene/House.tsx` (ART_PASSED + west window hole is NOT needed — window is a surface-mounted unit), `src/threeam/scene/Scene.tsx` (mount Bedroom), `src/threeam/hud/StationPanel.tsx` (+AboutContent), `scripts/pixelart/gen-variants.mjs` (+bedroom textures), `src/content/site.ts` (about data if absent — Task 8 checks)
- Create: `src/threeam/scene/rooms/Bedroom.tsx`, `src/threeam/scene/rooms/Cat.tsx`
- Tests: `src/threeam/world/__tests__/furniture.test.ts`, `src/threeam/state/__tests__/store.test.ts`, `src/threeam/world/__tests__/stations.test.ts`

---

### Task 1: `travel()` clears focus state (deferred final-review directive)

**Files:** Modify `src/threeam/state/store.ts`, test `src/threeam/state/__tests__/store.test.ts`

The P3 final review found `travel()` leaves `focus`/`activeStation` intact — currently safe only because the single call site sits below the focus freeze, which future click-to-walk work would silently break.

- [ ] **Step 1: failing test** — in the store test file add:

```ts
it("travel clears focus and activeStation", () => {
  const s = useThreeAm.getState();
  s.setActiveStation(STATIONS[0]);
  s.setFocus(STATIONS[0].id);
  s.travel(HOUSE.portals[0]);
  expect(useThreeAm.getState().focus).toBeNull();
  expect(useThreeAm.getState().activeStation).toBeNull();
});
```

(import `STATIONS` from `@/threeam/world/stations`, `HOUSE` from `@/threeam/world/layout`; reset player position + area in an `afterEach` mirroring the file's existing pattern.)

- [ ] **Step 2:** run `pnpm test` — expect this test RED (focus survives travel).
- [ ] **Step 3:** in `store.ts`, extend travel's `set` call:

```ts
set({ area: portal.toArea, activePortal: null, focus: null, activeStation: null });
```

- [ ] **Step 4:** `pnpm test` all green + `npx tsc --noEmit` clean.
- [ ] **Step 5:** commit: `fix(3am): travel() clears station focus state — hardening for future entry paths`

---

### Task 2: bedroom textures (generator)

**Files:** Modify `scripts/pixelart/gen-variants.mjs`; commit generated PNGs under `public/3am/tex/`

Seven textures, all through the existing seeded `hash2`/`PALETTE`/`shade` helpers (study `wallMidnight`, `floorWalnut`, `rugKilim` in the file for the idiom — new fns follow it):

| name | size | look |
|---|---|---|
| `wall-sand` | 32×32 | warm sand plaster, soft noise (default wall) |
| `wall-sage` | 32×32 | muted sage-green plaster (toggle option) |
| `wall-dusk` | 32×32 | dusty blue-violet plaster (toggle option) |
| `floor-oak` | 32×32 | lighter oak planks, same plank layout as `floorWalnut` (toggle option; walnut is the other option and already exists) |
| `linen-quilt` | 64×64 | quilted bedding: 8px diamond grid, two-tone warm cream/terracotta |
| `curtain-weave` | 32×64 | loose vertical fabric weave, pale cream, slight column waviness |
| `rug-bedroom` | 64×64 | soft oval-ish braided rug, warm neutrals (distinct from kilim/persian) |

- [ ] **Step 1:** add the seven fns + JOBS entries (prune-comment rules apply).
- [ ] **Step 2:** `node scripts/pixelart/gen-variants.mjs` — PNGs appear; re-run to confirm byte-stable (deterministic).
- [ ] **Step 3:** `git add` script + the seven PNGs + regenerated `_contact-sheet.png` if the generator emits it.
- [ ] **Step 4:** commit: `feat(3am): bedroom texture set — sand/sage/dusk walls, oak floor, quilt, curtain, braided rug`

---

### Task 3: bedroom furniture colliders (TDD)

**Files:** Modify `src/threeam/world/layout.ts`, test `src/threeam/world/__tests__/furniture.test.ts`

Rects (bedroom bounds x 0–8, z 0–6; door gap in the x=8 divider at z 2.2–3.8 must stay reachable; SPAWN is {4, 3} — it must remain outside all furniture expanded by player radius 0.35):

```ts
// bedroom
{ x: 0.35, z: 2.5, w: 2.1, d: 1.7 },   // bed (headboard west, under the window)
{ x: 0.35, z: 1.85, w: 0.55, d: 0.5 }, // nightstand (north of bed head)
{ x: 2.8, z: 0.3, w: 1.6, d: 0.55 },   // manga dresser (north wall)
{ x: 5.6, z: 0.32, w: 0.85, d: 0.5 },  // dragonslayer lean-zone (north wall, east of dresser)
{ x: 0.45, z: 5.1, w: 0.4, d: 0.4 },   // plant (SW corner)
```

- [ ] **Step 1: failing tests first** — extend the furniture suite: (a) each rect present verbatim; (b) SPAWN point + 0.35 radius clear of all bedroom rects; (c) walkway probes: (4.5, 3.0) [center], (7.5, 3.0) [door approach], (1.6, 4.6) [foot of bed → rug zone], (3.6, 1.15) [dresser front / about-station standing zone] all walkable; (d) the existing STATIONS×furniture exhaustive test picks the new rects up automatically — after Task 4 adds the about station, re-run confirms no overlap.
- [ ] **Step 2:** RED → add rects → GREEN. `npx tsc --noEmit` clean.
- [ ] **Step 3:** commit: `feat(3am): bedroom furniture colliders (bed, nightstand, dresser, dragonslayer, plant)`

---

### Task 4: "about" station

**Files:** Modify `src/threeam/world/stations.ts`, `src/threeam/hud/StationPanel.tsx`; tests `src/threeam/world/__tests__/stations.test.ts`

- [ ] **Step 1:** extend the union and registry:

```ts
export type StationId = "projects" | "experience" | "about";
// registry entry:
{
  id: "about",
  area: "ground",
  trigger: { x: 2.7, z: 1.0, w: 1.9, d: 1.15 },  // standing zone in front of the dresser
  label: "about me",
  camera: {
    pos: [5.4, 3.3, 3.2],   // SE of the dresser, above head height
    look: [3.0, 1.35, 0.4], // dresser + wall composition
  },
},
```

Sightline rule (HANDOFF §6): pos and look share NO axis coordinate, and the pos→look ray must clear 1.4m head height over the whole trigger — verify arithmetically in the task report (ray height at trigger corners; the T6-P3 methodology).

- [ ] **Step 2: failing tests** — `stationAt` hits for a point inside the new trigger, misses at (2.7−0.01, 1.0); trigger vs furniture AABB (auto via exhaustive test); camera pos inside room bounds.
- [ ] **Step 3:** `StationPanel.tsx`: add `about: "who i am"` to `PANEL_TITLES` and an `AboutContent` component following `ProjectsContent`'s structure. Content source: `site.ts` — **first read `src/content/site.ts`**; if it exports about/bio data, render it (short bio paragraphs + socials links). If it does NOT, add a minimal `about` export there sourcing copy from the `/` page's existing about section (do not invent new copy — lift what the normal site already says), then render it. The panel keeps the "ESC to step back" footer.
- [ ] **Step 4:** green + tsc clean.
- [ ] **Step 5:** commit: `feat(3am): about station — dresser trigger, camera pose, panel content from site.ts`

---

### Task 5: bedroom surfaces + style toggles

**Files:** Create `src/threeam/scene/rooms/Bedroom.tsx`; modify `src/threeam/scene/House.tsx` (add `"bedroom"` to `ART_PASSED`), `src/threeam/scene/Scene.tsx` (mount `<Bedroom />` beside the other rooms in the same Suspense)

Follow `Workspace.tsx`'s surface section verbatim as the pattern (it survived two reviews): floor plane, north wall, EAST divider faces (two door-flanking segments on the x=8 divider's bedroom side at x 7.89, z-centers 1.1 and 4.9), south stub band, baseboards, all ≥6mm offsets, `usePixelTexture` repeats matching texel-density conventions (generic 32×32 walls: `repeatY = WALL_H`).

Style toggles (temp code, stripped after the gate — precedent commits e545fd1/6347c04): key **1** cycles walls `wall-sand → wall-sage → wall-dusk → wall-midnight`, key **2** cycles floors `floor-walnut → floor-oak`. Defaults: sand + walnut. Same `useEffect` keydown pattern Workspace used (guard `e.repeat`, cleanup on unmount; keys 1/2 are free again since the workspace strip).

- [ ] Build → tests stay green (no collider changes) + tsc → commit: `feat(3am): bedroom surfaces — sand walls, walnut floor, style toggles`

**Owner checklist (paste in reply to Rohan):** walk into the bedroom — walls/floor read at both toggle positions, no gray shell bleed, no flicker on divider faces, baseboards contrast.

---

### Task 6: bed, bedding, nightstand + lamp, rug, plant

**Files:** Modify `src/threeam/scene/rooms/Bedroom.tsx`

All on the Task 3 rects (meshes sit ON collider rects — derive positions from the rect constants, don't re-hardcode):

- **Bed** (rect {0.35, 2.5, 2.1, 1.7}): low wooden frame (walnut-family flat colors), headboard slab against the west wall (x≈0.36 face, clear of the Task 7 window's visual frame — window sill sits at y 1.0, headboard tops at 0.9), mattress box, `linen-quilt` textured duvet slab with a folded-back band, two pillows (soft-white boxes, slight random yaw). Chunky proportions; the duvet overhangs the frame 3–4cm each side.
- **Nightstand** ({0.35, 1.85, 0.55, 0.5}): small two-tone cabinet, one drawer line + knob, and the **bedside lamp**: short base + warm fabric shade, `pointLight` nested INSIDE the shade group at the bulb position — warm `#ffcf9e`, intensity ~7, distance ~4.5, decay 2, castShadow ABSENT. This is the room's primary warm pool.
- **Rug** (no collider): `rug-bedroom` plane at y 0.035, centered ≈ (2.9, 3.9), ~2.4×1.7, receiveShadow.
- **Plant** ({0.45, 5.1, 0.4, 0.4}): reuse the potted-plant idiom from MusicNook (pot + 2-3 leaf blades); vary the pot color from every existing plant.
- [ ] Tests green + tsc → commit: `feat(3am): bed + bedding, nightstand lamp, braided rug, corner plant`

**Owner checklist:** bed reads cozy from walk-by; lamp pool warm not blown out; rug under foot-of-bed zone; collision matches visuals on all bed sides.

---

### Task 7: west window + curtain (moonlight, no new lights)

**Files:** Modify `src/threeam/scene/rooms/Bedroom.tsx`

Layout v2 places a window mid-west-wall (z ≈ 2.3–4.2). Build as a surface-mounted unit on the west wall's interior face (x ≈ 0.011 plane + offsets):

- Frame: dark wood border box set, sill ledge at y 1.0, unit spans z 2.55–3.95, top y 2.3.
- "Glass": emissive night-sky plane INSIDE the frame — deep blue `#101830` base with a `meshBasicMaterial` texture-free gradient feel via vertex-less flat color + 2-3 tiny emissive star dots and a small moon disc (pale `#dfe6ff`, emissiveIntensity ≤ 0.8 — must NOT clip under Bloom). This is an emissive *surface*, not a light: the no-invisible-lights rule stays intact (spec §6 sanctions emissives-without-light).
- Curtain: `curtain-weave` textured plane hung from a thin rod above the frame, covering ~40% of the window from one side, very slight z-tilt so it reads as fabric, transparent:false.
- Moon patch: a barely-visible cool overlay plane on the floor sloping from the window (flat `#26304d` at opacity ~0.18, y 0.04, receiveShadow false) — fake light pool, zero lights added. If it reads wrong at the gate, deleting it is one mesh.
- [ ] ≥6mm stack arithmetic in the report (wall plane → frame → glass → curtain) → tests green + tsc → commit: `feat(3am): west window — night sky, moon, curtain, faux moon patch`

**Owner checklist:** window reads as night from walk-by; moon doesn't bloom-blob; curtain overlap looks like fabric not a board; faux floor patch — keep or kill?

---

### Task 8: manga dresser, figurines, Dragonslayer

**Files:** Modify `src/threeam/scene/rooms/Bedroom.tsx`

- **Dresser** ({2.8, 0.3, 1.6, 0.55}): waist-high, `cabinet-wood` texture family or flat two-tone, 2×2 drawer faces + knobs. ON TOP, asymmetric: a stack of 5-6 manga volumes (thin colored boxes, spines varied — NO real titles/logos, abstract spine bands only), one standing volume leaning on the stack, 2 small figurines (generic chunky pixel characters ~12cm, distinct silhouettes — one humanoid, one round critter; NO IP), and a tiny cactus.
- **Dragonslayer** ({5.6, 0.32, 0.85, 0.5} lean zone): the Berserk slab — deliberately oversized (blade ~1.9 long, ~0.28 wide, thick), flat iron grays with edge highlight band, simple crossguard + wrapped grip, leaning against the north wall at ~12° with the tip up-wall and a floor contact shadow decal (dark oval, opacity 0.3). NO interaction this plan (the eclipse wires it later — leave a `{/* eclipse trigger lands here (plan 8) */}` comment).
- [ ] Nothing exceeds collider rects (arithmetic in report) → tests green + tsc → commit: `feat(3am): manga dresser + figurines, the dragonslayer leans on the north wall`

**Owner checklist:** dresser clutter reads lived-in; figurines charming at pixel scale; sword reads HEAVY and unmistakably That Sword.

---

### Task 9: the cat

**Files:** Create `src/threeam/scene/rooms/Cat.tsx`; mount from `Bedroom.tsx`

Black cat asleep on the bed (foot corner, on the duvet):

```tsx
// Shape: chunky curled loaf — body ellipsoid-ish from 2 stacked boxes,
// head box tucked against body, 2 ear wedges, tail box curled around the
// front, all near-black #16161c with a #232330 top highlight band.
// Materials matte (roughness 1, metalness 0).
```

- Breathing: `useFrame` scales the body group `y` by `1 + 0.03 * Math.sin(t * 1.4)` (clamped-dt clock accumulation like the Turntable pattern — never `Date.now()`).
- Ear twitch: every 6–9s (accumulator + threshold from a `hash`-seeded interval, NOT `Math.random()` per frame) one ear wedge rotates ~0.2 rad for 150ms and back.
- Interaction: `onClick` / station-style proximity NOT used — simple `onClick` on the cat mesh spawns 1-2 tiny heart planes (pink `#ff7d9c`, emissive ≤0.6) that float up ~0.3m and fade over ~1s, max one burst per 2s. Cursor pointer on hover (existing convention). No sound.
- castShadow on body parts via the room's traverse.
- [ ] Tests green + tsc → commit: `feat(3am): sleeping black cat — breathing, ear twitches, pettable hearts`

**Owner checklist:** breathing subtle (not balloon), twitch frequency feels alive, hearts charming not spammy. (Dark-mode glowing eyes + following-you behavior land in the lighting plan — this cat sleeps through Plan 4.)

---

### Task 10: lighting pass + integration sweep

**Files:** Modify `src/threeam/scene/rooms/Bedroom.tsx` only (intensities/positions of ITS fixtures)

- Balance: bedside lamp is the hero pool; if the room's far half reads illegible add ONE more fixture-attached source max (e.g. a tiny dresser lamp or wall sconce above the dragonslayer — same family as Wave D's sconce, intensity ≤4) — never a bare light.
- Sweep (agent-run, static): `pnpm test` full suite, `npx tsc --noEmit`, `pnpm build` clean; grep the diff for `castShadow` on lights (must be none), for lights outside fixture groups (rotation-aware check per HANDOFF §6), and re-verify all stack offsets ≥6mm.
- [ ] Commit (only if changes): `polish(3am): bedroom lighting balance`
- [ ] Final report: full owner walkthrough checklist for the style gate — toggles (1/2), bed/cat/dresser/sword/window checks from Tasks 5–9, station E/ESC flow at the dresser, and confirm workspace + music nook unaffected (walk through all three rooms).

---

## After the plan

Owner style gate (Rohan walks, picks wall/floor, verdicts per checklist) → lock picks + strip toggle code (same commit pattern as 6347c04) → whole-branch review on the most capable available model (HANDOFF §3 routing) → fix wave if needed → merge on Rohan's word. Then next in series: Layout v2 restructure plan.
