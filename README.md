# Portfolio — Rohan Yadav

The original pure-HTML/CSS portfolio (cpt-nem0.github.io) rebuilt on Next.js —
same design (black + orange `#ff6500`, Bungee display font, two-column sticky
layout), restructured to be content-driven and easy to extend.

Improvements folded in from
[9 tips for a better portfolio](https://dev.to/kethmars/what-i-learned-after-reviewing-over-40-developer-portfolios-9-tips-for-a-better-portfolio-4me7):
quantified stats instead of skill bars (#6), contact in header **and** footer
(#8), semantic HTML + `next/font` + `next/image` with alt text for Lighthouse
(#9), and restrained motion (#4).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — design tokens (the exact original palette) in `globals.css`
- **Motion** (framer-motion) — subtle scroll reveals
- **Lenis** — smooth scroll
- **@phosphor-icons/react** — the same icon set as the original
- Installed and ready for later experiments: **three / @react-three/fiber / drei** + **gsap**

## Run

```bash
pnpm dev      # dev server → http://localhost:3000
pnpm build    # production build (fully static)
pnpm start    # serve the build
```

## Architecture — how to extend

Everything is deliberately decoupled so adding to it is cheap:

```
src/
├─ content/
│  ├─ site.ts               ← ALL data (name, stats, experience, projects, socials).
│  └─ bento.ts               ← presence lines, door teaser, footer whisper, project blurbs
├─ components/
│  └─ bento/                ← the homepage: BentoGrid, Tile, SkyBackground, eggs, tiles/*
└─ app/
   ├─ layout.tsx            ← fonts (Inter + Bungee) + theme init script
   └─ page.tsx              ← renders <BentoGrid />
```

**To add content:** edit `src/content/site.ts` (or `src/content/bento.ts` for
homepage-only copy).

**To add a tile:** create `components/bento/tiles/Foo.tsx` using `<Tile>`,
drop `<FooTile />` into `<main>` in `BentoGrid.tsx`, and give it a `span` if
it's not 1×1.

**To re-theme the whole site:** change the tokens in the `[data-theme="night"]`
/ `[data-theme="day"]` blocks in `src/app/globals.css`.

## Credits

The `/3am` route uses a few third-party assets, credited here and in an
in-app "credits" panel (bottom-left of the HUD).

**3D models** (via [Sketchfab](https://sketchfab.com)):

- [Neon Genesis Evangelion Unit-01](https://sketchfab.com/3d-models/neon-genesis-evangelion-unit-01-5bc7a4fd7ee64fcb8ba2bb3f4832e343) by [XxAugustoxX](https://sketchfab.com/garaujoaugusto) — [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- [Katana](https://sketchfab.com/3d-models/katana-b061754e94ce434cbe1396b3bb6d8abc) by [aneeqayounas](https://sketchfab.com/aneeqayounas) — [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- [Canarian Cafe - Coffee Machine](https://sketchfab.com/3d-models/canarian-cafe-coffee-machine-17042d9af8c5461e98876064fd80385d) by [Lanzaman](https://sketchfab.com/lanzaboy) — [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- [Pixar Lamp](https://sketchfab.com/3d-models/pixar-lamp-f97d17ac89a14ff68c3e488c69340b44) by [yacinebel](https://sketchfab.com/yacinebel) — [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- [Gaming Chair - Grey Cushioned](https://sketchfab.com/3d-models/gaming-chair-grey-cushioned-c39430b3f91b43f7937174a9c27998f1) by [kanesk06](https://sketchfab.com/kanesk06) — [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- [Ficus Lyrata - Plants](https://sketchfab.com/3d-models/ficus-lyrata-plants-161df9b2f7124549a2cfa4c33104046e) by [LadyCris](https://sketchfab.com/ladycris) — [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- [Indoor Plants Pack](https://sketchfab.com/3d-models/indoor-plants-pack-fc04bd613c154e20800f242bf1233e1e) by [Domenico.Pentangelo](https://sketchfab.com/Domenico.Pentangelo) — [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- [Ficus Bonsai](https://sketchfab.com/3d-models/ficus-bonsai-f420ea9edb914e1b9b7adebbacecc7d8) by [Zgon](https://sketchfab.com/Z-gon) — [Sketchfab Standard](https://sketchfab.com/licenses)
- [Bed with Lamp](https://sketchfab.com/3d-models/bed-with-lamp-b9b6f7dce9df4d719acc37b5e05a3ea3) by [GreenG](https://sketchfab.com/AngelNebesniy) — [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)

Some of these models were modified for this scene — re-rigged, cut down, split into
separate pieces, and/or geometry-optimized (mesh simplification, texture downscaling) —
beyond simple resizing or placement.

**Music:**

- Ambient jazz track — sourced from [Pixabay](https://pixabay.com) (Pixabay Content License, no attribution required — credited anyway)
- "School of Magic (inspired by Harry Potter)" by Luis Humanoide, from [Pixabay](https://pixabay.com) (Pixabay Content License, no attribution required — credited anyway)
- All music previews stream from Apple's iTunes preview API at runtime and are never stored in this repository.

Everything else in `/3am` — the pixel art — is hand-built and generated in
this repo.
