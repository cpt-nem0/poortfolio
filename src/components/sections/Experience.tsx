import { site } from "@/content/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { SkillList } from "@/components/ui/SkillTag";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";

export function Experience() {
  return (
    <section id="experience" className="flex scroll-mt-6 flex-col gap-6">
      <SectionHeading>Experience</SectionHeading>
      <RevealGroup as="div" className="flex flex-col gap-4" gap={0.06}>
        {site.experience.map((job) => (
          <RevealItem key={job.company} as="article">
            <div className="group grid gap-2 rounded-md p-0 transition-all duration-200 sm:grid-cols-4 lg:p-4 lg:hover:bg-[rgba(139,157,187,0.1)] lg:hover:shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
              <p className="text-xs uppercase tracking-wide text-text opacity-70">
                {job.period}
              </p>
              <div className="flex flex-col gap-3 sm:col-span-3">
                <ArrowLink href={job.href} display>
                  {job.role} · {job.company}
                </ArrowLink>
                <p className="leading-relaxed text-text">{job.summary}</p>
                <SkillList items={job.stack} />
              </div>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
