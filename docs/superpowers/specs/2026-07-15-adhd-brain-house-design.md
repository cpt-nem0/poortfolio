# ADHD Brain House — Portfolio Experience Design

**Date:** 2026-07-15
**Status:** Approved direction, pending final user review
**Owner:** Rohan Yadav

## 1. Concept

The portfolio has two modes:

- **Normal mode (`/`)** — the existing polished two-column portfolio. Untouched except for one addition: an "enter my brain 🧠" button. This is the recruiter-safe default.
- **Brain mode (`/brain`)** — a full-screen, explorable HD-2D pixel-art world: Rohan's house at night. The visitor controls a tiny pixel Rohan and walks through 4 rooms. The experience *simulates ADHD* — distractions, interruptions, hyperfocus — while still delivering all real portfolio content (projects, experience, contact). Experience it, don't read about it.

Success criteria: memorable enough that visitors share it; functional enough that a recruiter can find projects, experience, and contact without instructions; performant on a mid-range laptop at 60fps.

## 2. Rendering style

- **Eastward × Octopath Traveler ("HD-2D")**: pixel-art surfaces and sprites inside a real 3D scene, with modern lighting — bloom, soft shadows, pooled warm light, depth-of-field/tilt-shift at the edges.
- Ambient lighting is the star. Every room has a light story (see §6).
- Palette: Ghibli-cozy — warm wood, cream plaster, brass, plant greens, lantern amber against deep night blues.
- Dense, lived-in, "messy as hell but cozy": walls full of shelves, frames, plants, clutter. Empty wall space is a bug.

## 3. World structure

### Establishing shot (entry sequence)
Clicking "enter my brain" on the normal site: CRT-glitch takeover → camera high over a tiny pixel town at night (lanterns, distant train, one warm glowing window) → dives through that window → lands in the bedroom, pixel-Rohan wakes up, visitor takes control. The click doubles as the browser audio-unlock gesture; music fades in during the dive.

The town is painted parallax layers (not walkable in v1) and is reused as the rooftop skyline.

### The four rooms (v1)

1. **Bedroom** — bed, sleeping black cat, manga dresser + figurines, Dragonslayer sword (eclipse trigger), lamps, window with curtain + outside view. Content: about-me.
2. **Workspace/study** — overloaded desk, monitors (terminal), corkboard with experience (Quantive, Cliff.ai) + red string, project polaroids/posters. Content: projects + experience.
3. **Music nook** — turntable on a cabinet, wall of record sleeves (click sleeve → that track plays, needle-scratch on swap, sleeve glows "now playing"), beanbag, the warmest light in the house. Music is positional audio — louder near the nook.
4. **Rooftop/balcony** — up a ladder: night sky, town skyline (establishing-shot art), string lights. Content: contact — fold a paper plane, throw your message into the town. Weather-API-driven sky is a future extension designed for from day one (outside view is a swappable component).

Front door: opens onto a 10-meter walkable sliver of dark street ("it's 2am. where would you even go.") — plants the town flag.

### Character & controls
- Tiny pixel Rohan sprite, 4-direction walk cycle. WASD/arrows + click-to-walk. Interact: E / click / tap.
- Camera follows character with smoothing + parallax; gentle push-in when entering a room "station"; content panels (project details, experience, contact form) slide in as UI over the world.
- Simple 2D collision grid mapped onto the 3D floor plan.
- The cat sometimes follows you between rooms.

## 4. Content mapping

All portfolio data continues to live in `src/content/site.ts` — both modes read the same source. Projects → workspace polaroids/monitor; experience → corkboard; socials/contact → rooftop paper plane + stickies; about → bedroom objects.

## 5. ADHD layer

- **Thought ticker** — rambling internal monologue strip that reacts to the current room.
- **BRAIN ALERT notifications** — absurd interruptions ("did you leave the stove on? …you don't own a stove").
- **Distraction pull** — idle ~20s and the character/camera drifts toward the TV or cat until input resumes.
- **Hyperfocus** — linger in one station >30s: everything else dims/desaturates, music muffles. Leave → world returns.
- **Mess accrues** — occasional new clutter items pop into existence over a session.
- All chaos respects `prefers-reduced-motion` (reduced to zero) and never blocks navigation or content.

## 6. Lighting & lamp system

- All room light comes from in-world warm lamps (point lights with falloff + bloom). Every lamp is clickable on/off.
- All lamps off → near-black room; emissives remain: TV flicker (with its own dim blue light), monitor glow, string lights, power LEDs, moonlight through the curtain.
- Dark room wakes the cat: glowing eyes (emissive + bloom), head tracks cursor. Lamp back on → back to sleep.
- Late-night dark mode flips the thought ticker to whispery; BRAIN ALERT: "it is 3am. go to sleep."

## 7. Music system

- Turntable is the physical music player. 3–4 tracks (lo-fi / synthwave / breakcore; CC-licensed or user-provided), each a wall sleeve.
- Interactions: click sleeve → swap (scratch SFX); lift tonearm → mute. One-shot SFX: paper, thuds, meow, clicks, ladder.
- Positional audio via three.js; global volume control in a corner of the HUD.

## 8. Easter eggs

- **The Eclipse (Berserk)** — click the Dragonslayer/manga: lamps die, window sky becomes the black sun, blood-red light floods every room, music warps to grim chanting. On the rooftop: blood rain particles, winged silhouettes circling the sun, the town dark except red windows; the cat is up there, staring at the sun. Paper plane thrown during eclipse becomes a crow. Toggle back = slow warm heal. (v1 = cinematic only; "hide from monsters" chase game is v2, see §10.)
- **Museum of scope creep** — a gallery wall of framed abandoned versions of this website (sticky-note desk mockup, purple CSS room, a frame reading "town???", *untitled (final) (final2) (ACTUAL-final-v3)*). Clicking the main painting opens a museum plaque telling the story of this brainstorm: "The artist kept adding new shit. The AI kept saying 'feasible.' It eventually rained blood."
- Small toys: mug steam, figurine spins, TV channel change, drawer of "misc facts," soot-sprite-style dust bunnies whose eyes appear in the dark.

## 9. Technical architecture

- **Route split**: `/brain` is fully client-side and lazy-loaded (`next/dynamic`); zero impact on `/` performance. Themed loading state ("booting brain… losing train of thought… found it").
- **Scene**: react-three-fiber + drei (installed). Orthographic-ish camera; `@react-three/postprocessing` for bloom, DoF/tilt-shift, vignette, mild color grade. Rooms modeled as simple 3D geometry with pixel-art textures; props as textured meshes or billboarded sprites; character as animated sprite.
- **Art pipeline (open decision, resolved during planning)**: base pixel-art interior/character asset packs (e.g. LimeZu Modern Interiors — paid, cheap, license-check) adapted + AI-assisted generation for custom pieces (record sleeves, paintings, town backdrop), cleaned by hand. Stitch MCP for 2D design assets where useful.
- **State**: one zustand store (current room/station, now-playing, lamp states, eclipse flag, chaos timers). Content from `src/content/site.ts`.
- **Animation**: GSAP for camera flights and cinematics; sprite-sheet animation for characters.
- **Audio**: three.js positional audio + HTMLAudio SFX pool.
- **Performance**: pixel aesthetic permits reduced render resolution; shadow budget 1–2 lights, rest faked; target 60fps mid-range laptop.
- **Accessibility**: keyboard-navigable content panels; all portfolio content reachable without precise mouse work; reduced-motion mode; captions/alt for content panels; escape hatch always visible ("back to normal" exit sign).

## 10. Scope: v1 vs v2

**v1 (this project):** establishing shot, 4 walkable rooms, character, music system, lamp/dark system, ADHD layer, eclipse cinematic, museum painting, front-door street sliver, desktop-first (mobile: touch controls + reduced density — after desktop works).

**v2 (roadmap, not in this spec's plan):** walkable town (record shop, arcade, noodle stand as new content rooms; locked/dark buildings visible in v1 art), eclipse "hide from monsters" chase mini-game, weather-API rooftop sky, day/night cycle.

## 11. Build order (v1)

1. Gray-box: 4 rooms as untextured geometry, walkable character, camera follow, collision, room transitions — validate feel first.
2. Music nook fully art-passed end-to-end (the signature room) → sets the art pipeline.
3. Remaining rooms art + interactions.
4. Lighting/lamp system + dark mode + cat.
5. ADHD layer + audio.
6. Entry sequence + establishing shot + rooftop.
7. Eclipse cinematic + museum + toys.
8. Polish: performance, accessibility, mobile adaptation.

## 12. Open questions

- Music tracks: source CC-licensed during build (default) unless Rohan supplies picks.
- Asset pack licensing check before purchase/use (itch.io asset licenses generally permit web embedding; verify no redistribution of raw files).
- Character design: pixel Rohan look (hair/outfit) — needs one reference photo or a quick approval round on sprite drafts.
