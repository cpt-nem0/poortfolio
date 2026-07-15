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
├─ content/site.ts          ← ALL data (name, stats, experience, projects, socials).
├─ lib/
│  ├─ motion.ts             ← shared animation vocabulary (variants, easings)
│  └─ utils.ts              ← cn() + math helpers
├─ components/
│  ├─ layout/               ← Sidebar, Nav, Footer, SmoothScroll, ScrollToTop
│  ├─ motion/               ← reusable primitives: Reveal, TextReveal, Magnetic
│  ├─ ui/                   ← SkillTag, ArrowLink, SocialLinks, SectionHeading
│  └─ sections/             ← About, Experience, Projects
└─ app/
   ├─ layout.tsx            ← fonts (Inter + Bungee) + providers + underlay
   └─ page.tsx              ← the two-column grid: <Sidebar/> + <main>
```

**To add content:** edit `src/content/site.ts`.

**To add a new section:** create `components/sections/Foo.tsx` using
`<SectionHeading>` + the motion primitives, drop `<Foo />` into `<main>` in
`page.tsx`, and add an entry to `site.nav`.

**To add a wild visual (the "blackhole" stuff):** swap or layer inside
`components/layout/Background.tsx` — it's the designated slot for canvas /
shaders / particles. `three`, `@react-three/fiber`, `drei`, and `gsap` are
already installed for exactly this.

**To re-theme the whole site:** change the tokens in the `@theme` block at the
top of `src/app/globals.css`.
