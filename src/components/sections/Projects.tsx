import Image from "next/image";
import { site } from "@/content/site";
import type { Project } from "@/content/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { SkillList } from "@/components/ui/SkillTag";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";

function ProjectCard({ project }: { project: Project }) {
  return (
    <RevealItem as="article">
      <div className="group grid gap-4 rounded-md transition-all duration-200 sm:grid-cols-4 lg:p-4 lg:hover:bg-[rgba(139,157,187,0.1)] lg:hover:shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
        <div className="order-2 aspect-video w-full max-w-50 overflow-hidden rounded border-2 border-[rgba(139,157,187,0.2)] sm:order-0">
          <Image
            src={project.image}
            alt={`Screenshot of ${project.title}`}
            width={400}
            height={225}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-col gap-3 sm:col-span-3">
          <ArrowLink href={project.href} display>
            {project.title}
          </ArrowLink>
          <p className="leading-relaxed text-text">{project.description}</p>
          <SkillList items={project.stack} />
        </div>
      </div>
    </RevealItem>
  );
}

export function Projects() {
  return (
    <section id="projects" className="flex scroll-mt-6 flex-col gap-6">
      <SectionHeading>Projects</SectionHeading>
      <RevealGroup as="div" className="flex flex-col gap-4" gap={0.05}>
        {site.projects.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </RevealGroup>
    </section>
  );
}
