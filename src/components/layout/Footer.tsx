import { site } from "@/content/site";
import { SocialLinks } from "@/components/ui/SocialLinks";

/**
 * Footer contact block. Tip #8: keep contact reachable in the footer too, not
 * just the header — so a visitor who scrolls to the end never has to hunt.
 */
export function Footer() {
  return (
    <footer className="mt-16 flex flex-col gap-4 border-t border-[rgba(139,157,187,0.15)] pt-8">
      <p className="text-sm text-text">
        Like what you see? Reach me at{" "}
        <a
          href={`mailto:${site.email}`}
          className="text-highlight transition-colors duration-200 hover:text-accent"
        >
          {site.email}
        </a>
        .
      </p>
      <SocialLinks socials={site.socials} size={24} />
    </footer>
  );
}
