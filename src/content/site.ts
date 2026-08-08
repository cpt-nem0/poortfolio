/**
 * ─────────────────────────────────────────────────────────────
 *  SITE CONTENT — single source of truth for the whole portfolio.
 *  Edit here; the UI reads from this.
 *
 *  NOTE: `about.paragraphs` is consumed by the /3am about station.
 *  (The old `/` About section that mirrored it was removed in the
 *  bento revamp.)
 * ─────────────────────────────────────────────────────────────
 */

export type Social = {
  label: string;
  href: string;
  /** Phosphor icon name (see components that map these). */
  icon: "envelope" | "github" | "linkedin" | "x";
};

export type Experience = {
  role: string;
  company: string;
  href: string;
  period: string;
  summary: string;
  stack: string[];
};

export type Project = {
  title: string;
  description: string;
  href: string;
  image: string;
  stack: string[];
};

export const site = {
  name: "Rohan Yadav",
  role: "Engineer",
  tagline: "builds whatever needs building — usually at 3am.",
  /** Short bio for <meta> / OG only. */
  bio: "Rohan Yadav — engineer. Backends by trade, Mac apps and a walkable pixel-art house after midnight.",
  email: "rohany1103@gmail.com",
  resumeHref:
    "https://drive.google.com/file/d/1fiUtvGqhxkTOoIlBrE5Bg2DA_qNwEgXf/view?usp=sharing",

  /**
   * Full about-me paragraphs. Plain-text mirror of the `/` About section
   * (which adds inline hyperlinks); consumed by the /3am about station.
   */
  about: {
    paragraphs: [
      "It started in high school with a TV show about the world's coolest offices — Google's slides, the nap pods, the free food. That, plus the fact that my only other elective was Hindi, got me into computer science and Java. The offices turned out to be mostly normal, but the job stuck: three startups later I've gone from my first CRUD endpoints to owning entire product lines end to end.",
      "People ask what kind of engineer I am — backend, frontend, hardware — and the category is the part I've stopped caring about. I'm an engineer; the point is being able to build whatever the problem needs. I'm still learning full-stack, still learning everything — I suspect that part is permanent. Lately it means LLM systems and browser automation at work, and native Mac apps and a walkable pixel-art house when it's late.",
      "Off the clock I'm getting parried in Sekiro, building questionable base layouts in Valheim with friends, or cooking — an actual passion, not resume filler. And when I'm not in the kitchen I'm deep in manga and anime: One Piece and Berserk forever, and Frieren has quietly earned its place next to them.",
    ],
  },

  socials: [
    { label: "Email", href: "mailto:rohany1103@gmail.com", icon: "envelope" },
    { label: "GitHub", href: "https://github.com/cpt-nem0", icon: "github" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/rohan-y/", icon: "linkedin" },
    { label: "X", href: "https://x.com/n3m0_sama", icon: "x" },
  ] satisfies Social[],

  nav: [
    { label: "About", href: "#about" },
    { label: "Experience", href: "#experience" },
    { label: "Projects", href: "#projects" },
  ],

  experience: [
    {
      role: "Senior Software Engineer",
      company: "Atlys",
      href: "https://atlys.com",
      period: "Dec 2024 — Present",
      summary:
        "Started as the sole backend engineer on cross-sell — travel insurance and forex cards — owning everything end to end: planning, building, shipping, maintaining. Moved to post-checkout and built the internal tooling behind the human calling operation — a call-sentry layer for managing, tracking, and reviewing every agent call. Did a stint on core visa infrastructure owning country-specific backends, which in practice meant heavy browser automation and reverse engineering of flows that were never designed to have an API. When cross-sell rebooted, came back owning six verticals — travel & visa insurance, eSIMs, a leaner rebuilt forex, activities, hotels, and flights — while keeping insurance running throughout. Currently on the new AI-native dev team, rebuilding all of cross-sell for an AI-native Atlys.",
      stack: [
        "Golang",
        "Python",
        "TypeScript",
        "FastAPI",
        "NATS",
        "Redis",
        "PostgreSQL",
        "ClickHouse",
        "Firebase",
        "GCP",
        "Kubernetes",
        "Docker",
      ],
    },
    {
      role: "Software Engineer",
      company: "Quantive",
      href: "https://www.quantive.com/",
      period: "2022 — Sep 2024",
      summary:
        "Worked the platform's data and AI surface. Built a modular real-time analytics platform with the data-science team, wired a vector database into the retrieval stack, and spent real time making LLM-based features accurate instead of merely impressive. Rebuilt a knowledge-retrieval product around high-performance vectorization pipelines.",
      stack: [
        "Python",
        "Golang",
        "Java",
        "Django",
        "gRPC",
        "Redis",
        "LLMs",
        "Azure Synapse",
        "Azure OAI",
      ],
    },
    {
      role: "Software Engineer",
      company: "Cliff.ai",
      href: "https://quantive.com/resources/blog/cliffai-acquisition/",
      period: "2022 — 2022",
      summary:
        "First job, small team, big surface: built and launched a B2B anomaly-detection platform for real-time business monitoring. Rebuilt core services and APIs for stability, moved the data layer to materialized views so high-volume clients could actually scale, and helped carve the monolith into microservices. Cliff was acquired by Quantive — I went with the furniture.",
      stack: [
        "Python",
        "Django",
        "DRF",
        "FastAPI",
        "Celery",
        "Kafka",
        "Clickhouse",
        "MongoDB",
        "PostgresSQL",
        "ElasticSearch",
        "Redis",
        "Docker",
        "Data Engineering",
      ],
    },
  ] satisfies Experience[],

  projects: [
    {
      title: "Verse",
      description:
        "Time-synced lyrics for whatever's playing, in a slim draggable glass pill that floats above every app on your Mac — click it and it unfurls into a translucent karaoke card. The fun parts: lyric matching against LRCLIB's open catalog, a MediaRemote workaround for macOS 15.4+, and a local playback clock interpolating between polls so the animation never stutters.",
      href: "https://cpt-nem0.github.io/verse/",
      image: "/projects/verse.png",
      stack: ["Swift", "SwiftUI", "AppKit", "macOS"],
    },
    {
      title: "Plate",
      description:
        "A free, fully-local macOS menu bar app that catches tasks before they slip — someone hands you work on Slack or in the hallway, and it lands on your plate. Natural-language capture in under three seconds, a zero-server Slack inbox over Socket Mode, an on-device LLM doing the parsing, and a menu bar icon that warms from ash to ember as deadlines close in. No accounts, no server, no subscription.",
      href: "https://cpt-nem0.github.io/plate/",
      image: "/projects/plate.png",
      stack: ["Swift", "SwiftUI", "GRDB", "Slack Socket Mode", "Apple Foundation Models"],
    },
    {
      title: "clickbait",
      description:
        "A brutalist reaction-speed game with global leaderboards. Click the target — that's the whole game. It's harder than it sounds. Four difficulties (the last one evades your cursor), unlockable target skins, combo multipliers, and a news ticker of fake headlines judging you. Vanilla TypeScript, no framework, with a real Postgres leaderboard behind it.",
      href: "https://clickbait-game.vercel.app",
      image: "/projects/clickbait.png",
      stack: ["TypeScript", "PostgreSQL", "Vercel Functions", "CSS"],
    },
    {
      title: "Whimsy",
      description:
        "A command-line tool that puts an LLM inside your terminal, using your actual command output as live context for real-time help. Built on Google GenAI, with the backend kept pluggable for other models.",
      href: "https://github.com/cpt-nem0/whimsy",
      image: "/projects/whimsy.png",
      stack: ["Python", "LLMs", "Google GenAI"],
    },
    {
      title: "Pokédex",
      description:
        "The PokéAPI dressed up properly — a fast, clean pokédex for browsing and learning about every Pokémon. Built as an excuse to make a genuinely pretty frontend, which is harder than backend engineers like to admit.",
      href: "https://pokedex-seven-tan.vercel.app/",
      image: "/projects/pokedex.png",
      stack: ["React", "TailwindCSS", "Vite", "Typescript", "PokéAPI"],
    },
    {
      title: "Digi-hex",
      description:
        "A blockchain-based platform for secure tracking of business payment transactions — immutable ledger, real-time validation, tamper detection. The fraud-protection design still holds up.",
      href: "https://github.com/cpt-nem0/digi-hex",
      image: "/projects/digi-hex.png",
      stack: ["Python", "Flask", "HTML", "CSS", "Javascript", "MongoDB", "Blockchain"],
    },
    {
      title: "The cliché TODO",
      description:
        "The quintessential bare-bones to-do app — because every developer has to make one. Add, check off, delete. The \"I built a todo app\" checkbox, ticked.",
      href: "https://cliche-todo.vercel.app/",
      image: "/projects/cliche-todo.png",
      stack: ["Typescript", "HTML", "CSS"],
    },
    {
      title: "This Portfolio",
      description:
        "The site you're on — a normal two-column portfolio with a door in it. Through \"it's 3am in here\" is a walkable pixel-art house where the projects hang as polaroids, the record player actually plays, and the scope creep got bad enough that it's getting its own museum. The normal half is Next.js and Motion; the house is react-three-fiber.",
      href: "https://github.com/cpt-nem0/poortfolio",
      image: "/projects/portfolio-site.png",
      stack: ["Next.js", "React", "TypeScript", "react-three-fiber", "three.js"],
    },
  ] satisfies Project[],
} as const;

export type Site = typeof site;
