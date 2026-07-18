# /3am Handoff — from Fable 5 to whoever builds next

**Written 2026-07-18** by the model that ran Plans 1–3. Rohan's Fable budget ran out mid-house;
this doc + the plan series in `docs/superpowers/plans/` is everything you need to finish his
dream website without me. Read this once, fully, before touching anything.

## 1. Who you're working with

Rohan (github `cpt-nem0`) — software engineer, types fast and lowercase, typos are noise not
signal. He gives blunt corrections ("nah i dont like this", "looks weird") — that's the good
outcome, act on it immediately and don't over-apologize. He explicitly wants you to bring your
own ideas ("it's an open plane for you as well"). He decides by FEEL, not by description:
never ask him to choose between prose options when you can show him live toggles or
screenshots. He will keep adding scope — that's the museum-of-scope-hell joke, and it's fine;
capture new asks in the plan series, don't fight them.

## 2. Project state at handoff

- `/` — normal portfolio, untouched by /3am work. Zero /3am imports allowed on this route.
- `/3am` — walkable HD-2D pixel house (react-three-fiber 9 / three 0.185 / drei 10 / zustand /
  vitest). Ground floor: bedroom gray-box (x 0–8, SPAWN 4,3), workspace FULLY BUILT (x 8–16),
  music nook FULLY BUILT + style-locked (x 16–22). Roof: empty + stairs arrival.
- Branch `3am-workspace` is COMPLETE and reviewed (69/69 tests) but **NOT MERGED** —
  Rohan gives the merge word. Before merge: nothing pending; after merge: visible CC-BY
  credits (see §8).
- The durable ledger is `.superpowers/sdd/progress.md` (gitignored). It is the recovery map:
  every task, review verdict, fix round, lesson, and parked issue. TRUST IT over your memory.
  Auto-memory `3am-portfolio-project.md` holds the taste decisions + easter-egg registry.
- Spec: `docs/superpowers/specs/2026-07-15-adhd-brain-house-design.md`. Remaining v1 work =
  plans 4–9 in `docs/superpowers/plans/` (written alongside this doc).

## 3. The process that works here (don't reinvent it)

Subagent-driven development (superpowers:subagent-driven-development), exactly as the skill
says, with these session-proven calibrations:

- **Model routing:** haiku for verbatim-code transcription tasks; sonnet for implementation,
  integration, visual work, and task reviews; the most capable model available for plan
  writing, final whole-branch reviews, and taste-critical judgment. You (Opus) sit at the
  top of this stack now — spend yourself on coordination, plans, and final reviews; let
  sonnet subagents do the building. That division did ~90% of the labor of Plans 1–3.
- **Every implementer dispatch carries:** exact file paths, exact values, the locked rules
  (§5), a browser-verification contract, an exact commit message, a report-file path, and
  "reply with ONLY: status / SHA / one-line test summary / concerns".
- **Every task gets a reviewer** (sonnet, fresh) with the diff packaged via
  `scripts/review-package BASE HEAD` (superpowers skill dir). Record the base SHA BEFORE
  dispatching the implementer. Reviewers here have caught real bugs in ~40% of tasks —
  never skip the loop, never pre-judge findings for them.
- **Owner feedback comes in waves** (10+ items at once). Split by file-ownership (stairs/House
  vs interior/Workspace), run waves SERIALLY (never two implementers at once — same files),
  one review pass over the whole wave at the end, one fix round, then hand Rohan the room.
- **Style gates:** for aesthetic choices, build live keyboard toggles (1/2/3 keys cycling
  variants) + labeled screenshots, let Rohan walk the room and pick, then LOCK the pick and
  strip the toggle code (precedent commits: e545fd1 nook, 6347c04 workspace).
- **Continuous execution:** don't check in between tasks. Stop only for taste gates, plan
  contradictions, or destructive actions.

## 4. Verification contract (non-negotiable)

- `pnpm test` (vitest, config `vitest.config.mts`, alias `@`→`./src`) green + `npx tsc
  --noEmit` clean before every commit. 69 tests at handoff; the invariant tests
  (station×furniture AABB non-overlap, portal-trigger reachability, walkway probes) are the
  geometry safety net — extend them TDD-style with every collider change.
- Browser verification via `agent-browser` against the ALREADY-RUNNING dev server
  (localhost:3000) — never start a second one. Quirks: `eval` has NO top-level await;
  `click x y` isn't real (use `mouse move/down/up`); dev handle `window.__3am =
  {playerPosition, store}` exists NODE_ENV-gated. Real-input testing (dispatch KeyE, walk
  with held keys) beats store manipulation for user-facing flows.
- Screenshots into `.superpowers/sdd/gate3/`-style dirs per wave; before/after for anything
  visual; two consecutive frames to prove no z-fighting flicker.

## 5. Locked rules (Rohan's taste, do not re-litigate — reviewers enforce these)

1. **No invisible light sources.** Every warm light sits AT/IN a visible fixture. Check with
   rotation-aware math: a light that's a *sibling* of a rotated fixture group ends up ~0.1m+
   from the bulb (this exact bug shipped twice — bookshelf picture-light, stairs sconce).
   Nest lights INSIDE the rotated group at the bulb's local position.
2. **Shadow budget: exactly 2 soft casters**, both in the music nook (floor lamp + neon,
   `shadow-intensity 0.4, radius 5`). Full shadow rigs were tried and REVERTED (too dark).
   New lights: `castShadow` off, always.
3. **Scene.tsx ambient (0.3 #8d9bd6) + directional (0.4 #7684c9) untouched.** Room mood comes
   from fixture lights.
4. **Pixelation granularity 6** — locked at the feel round. Small text/detail must be sized
   for it (the neon "shipped" sign is at its legibility floor; don't shrink further).
5. **4mm minimum offset** between stacked coplanar surfaces (z-fighting; album-art flicker
   was the founding bug). Derive related transforms from SHARED constants (corkboard string
   is computed from its pin consts — "never hand-tune the string separately").
6. **Colliders in `layout.ts` are the single source of truth** — meshes sit ON rects, tests
   assert non-overlap. Change collider and mesh together.
7. **Emissive × Bloom discipline:** GLB materials often ship hot emissives (EVA eyes were
   intensity 10). Clamp them; verify with the clipped-pixel methodology (count pure-white
   pixels in a crop window — target ~0 while the fixture still reads as glowing).
8. **Audio:** no self-hosted copyrighted audio ever; iTunes 30s previews via the allowlisted
   proxy only; CC0/Pixabay tracks license-verified and recorded in
   `public/3am/audio/ATTRIBUTION.md`. No SFX on music resume (Rohan removed it — don't
   bring it back).
9. **Music nook is style-LOCKED.** Only additive, Rohan-requested changes (e.g. the turntable
   glass lid). Never retune its lighting/layout.

## 6. Bug classes this project actually hit (review checklist)

- Fixture/light offset under rotation (×2) — see §5.1.
- Camera look-target snapping when only position is eased — ease BOTH through a persistent
  smoothed Vector3 (FollowCamera pattern, clamped dt `Math.min(rawDt, 0.05)`).
- Sightline collinearity: station camera pos sharing an axis coordinate with its look target
  puts the player in their own shot — break shared coordinates, verify ray height clears
  head height (~1.4m) across the whole trigger rect.
- Stale input across freeze boundaries: `interactQueued` set while the player is frozen fires
  on unfreeze — drain queues inside the frozen branch.
- Corner-sampling overlap "tests" that assert nothing — always use true AABB intersection
  over ALL pairs (the desk/trigger overlap shipped past a corner-sampled test).
- Generator JOBS resurrection: deleting a texture PNG without pruning its generator JOBS
  entry means the next generator run silently recreates it (bit us twice). Prune both
  together; the generators carry a comment saying exactly this.
- GLB drill: inspect `asset.extras` for attribution (comment above the useGLTF call);
  check rig sanity (EVA shipped a skeleton/body ~150x scale mismatch → static bind-pose
  bake at load, documented in EvaModel); optimize with gltf-transform weld/simplify/prune,
  NO draco/meshopt (no decoders wired), NO quantize on broken-rig skinned files; keep
  photoreal textures on LINEAR filtering (NearestFilter on them reads as distortion).
- Plan-internal contradictions: when a plan's literal code violates the plan's own global
  constraint, the CONSTRAINT governs; fix and note it (the brief may also delegate — e.g.
  "adjust the furniture rects" — read for that before escalating).

## 7. Known parked issues (don't "discover" these; they're documented)

- Divider-wall light bleed (three.js has no per-light object masking; layers approach failed;
  full shadows rejected). Revisit only with a deliberate design, likely Plan 5.
- "Void kite" artifact + over-the-wall sightlines near doorways from the follow camera —
  pre-existing, cosmetic, tolerated.
- East/west-wall objects read edge-on from the follow camera (no x-yaw). Bookshelf + polaroids
  live with it; station cameras are the close-up answer.
- Stair run is at max length (d 2.56) — extending would choke the music doorway. If Rohan
  wants shallower again, relocate the flight, don't lengthen.
- Floating-shelf-to-light-bar clearance at standing desk height is 0.29m — recheck if desk
  stack or shelf height ever changes.
- Neon "shipped" is soft at walking distance (granularity floor) — accepted for now.

## 8. Pending at handoff

- **Merge `3am-workspace` → main when Rohan says so** (69/69 green at `14db521`+). Use
  superpowers:finishing-a-development-branch.
- **CC-BY visible credits** (required before the site is truly public): eva-01 (XxAugustoxX),
  katana (aneeqayounas), coffee machine (vervoortward), pixar lamp (yacinebel) — all
  Sketchfab, CC-BY-4.0, source URLs in code comments above each useGLTF call. Plan 9 has the
  credits task (README + an in-world or footer credits surface).
- `public/3am/audio/cupboard-magic.mp3` committed + attributed, awaiting the Plan 8 cupboard
  easter egg.
- Plan 4 Task 1 MUST make `travel()` clear `focus`/`activeStation` (final-review finding:
  currently safe only by call-site geometry; click-to-walk would break it silently).

## 9. The plan series (execute in order, one branch each)

| Plan | File | Delivers |
|------|------|----------|
| 4 | `2026-07-18-3am-plan4-bedroom.md` | Bedroom room + about station + cat (sleeping) + travel() hardening |
| 5 | `2026-07-18-3am-plan5-lamps-darkmode-cat.md` | Clickable lamps, dark mode, cat eyes, day-window patch |
| 6 | `2026-07-18-3am-plan6-adhd-layer.md` | Ticker, BRAIN ALERTs, distraction pull, hyperfocus, mess |
| 7 | `2026-07-18-3am-plan7-entry-rooftop-street.md` | Entry cinematic, rooftop contact (paper plane), street sliver |
| 8 | `2026-07-18-3am-plan8-eclipse-museum-eggs.md` | Eclipse, museum of scope hell (basement), cupboard, friend cameos, toys |
| 9 | `2026-07-18-3am-plan9-polish.md` | Perf, a11y, mobile, credits |

Plans are code-complete where a wrong guess is expensive (state, camera, audio, cinematics)
and pattern-referenced where the repo already IS the spec (room furnishing follows
MusicNook/Workspace patterns — this exact split built the workspace successfully). Every
plan ends with a Rohan style gate; his feedback waves AFTER the gate are normal, budget for
1–2 per room.

Good luck. Keep the lights attached to their fixtures.
