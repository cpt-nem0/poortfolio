import {
  EnvelopeSimple,
  GithubLogo,
  LinkedinLogo,
  XLogo,
} from "@phosphor-icons/react/dist/ssr";
import type { Social } from "@/content/site";
import { cn } from "@/lib/utils";

const ICONS = {
  envelope: EnvelopeSimple,
  github: GithubLogo,
  linkedin: LinkedinLogo,
  x: XLogo,
} as const;

export function SocialLinks({
  socials,
  className,
  size = 28,
}: {
  socials: readonly Social[];
  className?: string;
  size?: number;
}) {
  return (
    <ul className={cn("flex items-center gap-4", className)}>
      {socials.map((s) => {
        const Icon = ICONS[s.icon];
        return (
          <li key={s.label}>
            <a
              href={s.href}
              target="_blank"
              rel="noreferrer"
              title={s.label}
              aria-label={s.label}
              className="block text-highlight transition-colors duration-200 hover:text-accent"
            >
              <Icon size={size} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
