import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { site } from "@/content/site";
import { Nav } from "./Nav";
import { SocialLinks } from "@/components/ui/SocialLinks";

/**
 * The sticky left rail (the original <header>). Leads with name + role +
 * tagline (article tip #5: strong first impression), a quantified stats strip
 * instead of skill bars (tip #6), the nav, and always-visible contact (tip #8).
 */
export function Sidebar() {
  return (
    <header className="flex flex-col gap-6 lg:sticky lg:top-0 lg:max-h-screen lg:justify-between lg:py-24">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl leading-none text-highlight sm:text-5xl">
            {site.name}
          </h1>
          <h2 className="text-lg font-normal text-highlight">
            {site.role}
          </h2>
          <p className="max-w-xs text-text">{site.tagline}</p>
        </div>

        <a
          href={site.resumeHref}
          target="_blank"
          rel="noreferrer"
          className="group/link inline-flex w-fit items-center gap-2 text-sm text-highlight transition-colors duration-200 hover:text-accent"
        >
          View Full Résumé
          <ArrowUpRight
            weight="bold"
            className="transition-transform duration-200 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5"
          />
        </a>

        <Link
          href="/3am"
          className="group/brain inline-flex w-fit items-center gap-2 text-sm text-highlight transition-colors duration-200 hover:text-accent"
        >
          it&apos;s 3am in here
          <span
            aria-hidden
            className="transition-transform duration-200 group-hover/brain:translate-x-1"
          >
            →
          </span>
        </Link>

        <Nav />
      </div>

      <div className="flex flex-col gap-4">
        <a
          href={`mailto:${site.email}`}
          className="w-fit text-sm text-text transition-colors duration-200 hover:text-accent"
        >
          {site.email}
        </a>
        <SocialLinks socials={site.socials} />
      </div>
    </header>
  );
}
