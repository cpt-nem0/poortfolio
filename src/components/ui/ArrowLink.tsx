import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

type ArrowLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** Bungee display heading treatment (used for card titles). */
  display?: boolean;
  external?: boolean;
};

/**
 * Link that reveals a nudging ↗ arrow on hover — the signature interaction
 * from the original site (.anchor-container). The `group` class makes the
 * arrow and text respond together, and a parent `.group` (e.g. a whole card)
 * can drive it too via group-hover.
 */
export function ArrowLink({
  href,
  children,
  className,
  display,
  external = true,
}: ArrowLinkProps) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={cn(
        "group/link inline-flex items-center gap-2 text-highlight no-underline transition-colors duration-200 hover:text-accent group-hover:text-accent",
        display && "font-display text-xl leading-tight",
        className,
      )}
    >
      <span>{children}</span>
      <ArrowUpRight
        weight="bold"
        className="shrink-0 transition-transform duration-200 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
    </a>
  );
}
