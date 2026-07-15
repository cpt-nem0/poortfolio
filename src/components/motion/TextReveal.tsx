"use client";

import { motion } from "motion/react";
import { revealChild, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

type TextRevealProps = {
  text: string;
  className?: string;
  /** Reveal per "word" or per "char". */
  by?: "word" | "char";
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span";
};

/**
 * Splits text and reveals each unit with a stagger. Purely presentational —
 * the full string still renders for screen readers via aria-label.
 */
export function TextReveal({
  text,
  className,
  by = "word",
  delay = 0,
  as = "span",
}: TextRevealProps) {
  const units = by === "word" ? text.split(" ") : text.split("");
  const Comp = motion[as];

  return (
    <Comp
      className={cn("inline-block", className)}
      aria-label={text}
      variants={stagger(delay, by === "word" ? 0.08 : 0.02)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      {units.map((unit, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom" aria-hidden>
          <motion.span className="inline-block" variants={revealChild}>
            {unit}
            {by === "word" && i < units.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Comp>
  );
}
