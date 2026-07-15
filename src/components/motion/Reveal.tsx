"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { fadeUp, inView, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Render as a stagger container for <Reveal.Item> children. */
  as?: "div" | "section" | "ul" | "li" | "article";
  delay?: number;
};

/** Single fade-up block. */
export function Reveal({ children, className, as = "div", delay = 0 }: RevealProps) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={inView}
      transition={{ delay }}
    >
      {children}
    </Comp>
  );
}

/** Container that staggers its <RevealItem> children into view. */
export function RevealGroup({
  children,
  className,
  as = "div",
  delayChildren = 0,
  gap = 0.08,
}: RevealProps & { delayChildren?: number; gap?: number }) {
  const Comp = motion[as];
  return (
    <Comp
      className={cn(className)}
      variants={stagger(delayChildren, gap)}
      initial="hidden"
      whileInView="show"
      viewport={inView}
    >
      {children}
    </Comp>
  );
}

/** Child of RevealGroup. */
export function RevealItem({
  children,
  className,
  as = "div",
}: Omit<RevealProps, "delay">) {
  const Comp = motion[as];
  return (
    <Comp className={className} variants={fadeUp}>
      {children}
    </Comp>
  );
}
