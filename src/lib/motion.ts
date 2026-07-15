import type { Variants, Transition } from "motion/react";

/**
 * Shared motion vocabulary. Import these instead of redefining
 * variants per-component so the whole site moves with one accent.
 */

export const easeOutExpo: Transition["ease"] = [0.16, 1, 0.3, 1];

export const springSoft: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 20,
  mass: 0.6,
};

/** Fade + rise. Snappy default for blocks entering on scroll. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeOutExpo },
  },
};

/** Stagger container — pair with `fadeUp` children. */
export const stagger = (delayChildren = 0, stagger = 0.05): Variants => ({
  hidden: {},
  show: {
    transition: { delayChildren, staggerChildren: stagger },
  },
});

/** Per-word/char reveal for headline text. */
export const revealChild: Variants = {
  hidden: { opacity: 0, y: "0.5em" },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeOutExpo },
  },
};

/**
 * Viewport config for scroll-triggered reveals. Small negative bottom margin so
 * a block animates in the moment it enters — it keeps pace with the scroll
 * instead of lagging behind it.
 */
export const inView = { once: true, margin: "0px 0px -8% 0px" } as const;
