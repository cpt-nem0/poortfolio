/**
 * ─────────────────────────────────────────────────────────────
 *  SITE CONTENT — single source of truth for the whole portfolio.
 *  Edit here; the UI reads from this. Faithful to the original
 *  cpt-nem0.github.io content, restructured for reuse.
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
  role: "Software Engineer",
  tagline: "Balancing code, quests, and the occasional culinary experiment.",
  /** Short bio for <meta> / OG only. */
  bio: "Hi! I'm Rohan — a Software Engineer, and I code!!",
  email: "rohany1103@gmail.com",
  resumeHref:
    "https://drive.google.com/file/d/1fiUtvGqhxkTOoIlBrE5Bg2DA_qNwEgXf/view?usp=sharing",

  socials: [
    { label: "Email", href: "mailto:rohany1103@gmail.com", icon: "envelope" },
    { label: "GitHub", href: "https://github.com/cpt-nem0", icon: "github" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/rohan-y/", icon: "linkedin" },
    { label: "X", href: "https://x.com/r0han_Y", icon: "x" },
  ] satisfies Social[],

  nav: [
    { label: "About", href: "#about" },
    { label: "Experience", href: "#experience" },
    { label: "Projects", href: "#projects" },
  ],

  experience: [
    {
      role: "Software Engineer",
      company: "Quantive",
      href: "https://www.quantive.com/",
      period: "2022 — Present",
      summary:
        "Optimized platform performance by enhancing core functionalities and integrating diverse data sources to improve scalability and user experience. Developed a modular analytics platform in collaboration with the Data Science team, focusing on real-time analysis and algorithm design. Integrated a vector database to improve system efficiency and implemented advanced strategies to enhance output accuracy in LLM-based systems. Revitalized a knowledge retrieval platform, streamlining data processing through high-performance vectorization pipelines.",
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
        "Developed and launched a B2B SaaS anomaly detection platform for real-time business performance monitoring, enhancing decision-making with data insights. Revamped core services and APIs to boost system stability and maintainability. Improved data service architecture with a materialized views approach, optimizing scalability for high-volume clients. Built scalable data pipelines to enhance data flow across distributed systems and migrated core services to microservices to streamline feature development and improve system maintainability.",
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
      title: "Whimsy",
      description:
        "A command-line tool for integrating large language models (LLMs) directly into the terminal. It uses command outputs as context for real-time assistance, with support for Google Generative AI and plans for future integration of other LLM backends like OpenAI for broader functionality.",
      href: "https://github.com/cpt-nem0/whimsy",
      image: "/projects/whimsy.png",
      stack: ["Python", "LLMs", "Google GenAI"],
    },
    {
      title: "Pokédex",
      description:
        "Pokedex project leverages the PokeAPI to fetch detailed data on various Pokémon, presenting it in an elegantly designed, user-friendly interface. It's a seamless and visually engaging way for users to explore and learn about Pokémon.",
      href: "https://pokedex-seven-tan.vercel.app/",
      image: "/projects/pokedex.png",
      stack: ["React", "TailwindCSS", "Vite", "Typescript", "PokéAPI"],
    },
    {
      title: "Digi-hex",
      description:
        "A blockchain-based platform for secure management and tracking of business payment transactions. It ensures data integrity and transparency, with real-time validation and tamper detection via blockchain's immutable ledger, protecting against fraud and unauthorized changes.",
      href: "https://github.com/cpt-nem0/digi-hex",
      image: "/projects/digi-hex.png",
      stack: ["Python", "Flask", "HTML", "CSS", "Javascript", "MongoDB", "Blockchain"],
    },
    {
      title: "The cliché TODO",
      description:
        "The quintessential bare-bones to-do app—because every developer has to make one! A minimalist frontend project where you can add, check off, and delete tasks, perfect for ticking the \"I built a todo app\" checkbox on your dev journey.",
      href: "https://cliche-todo.vercel.app/",
      image: "/projects/cliche-todo.png",
      stack: ["Typescript", "HTML", "CSS"],
    },
    {
      title: "This Portfolio",
      description:
        "The site you're on — rebuilt on Next.js and React from the original pure HTML/CSS version, created with the intention of experimenting and evolving as I learn new things in frontend.",
      href: "https://github.com/cpt-nem0",
      image: "/projects/portfolio-site.png",
      stack: ["Next.js", "React", "TypeScript", "Motion"],
    },
  ] satisfies Project[],
} as const;

export type Site = typeof site;
