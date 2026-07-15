import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";

/** Inline link styled like the original .anchor-text. */
function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-highlight underline-offset-2 transition-colors duration-200 hover:text-accent"
    >
      {children}
    </a>
  );
}

export function About() {
  return (
    <section id="about" className="flex scroll-mt-6 flex-col gap-6">
      <SectionHeading>About</SectionHeading>
      <Reveal className="flex flex-col gap-4 leading-relaxed">
        <p>
          It all started back in high school when I watched a show about the
          coolest places to work. Google&apos;s and Facebook&apos;s laid-back
          office setups—with slides, nap pods, and a chill vibe—had me hooked.
          That, and the fact that my only other elective was Hindi, led me to
          computer science, where I learned Java and started coding. Fast forward
          to today, I&apos;ve had the chance to build software at two
          startups—one{" "}
          <A href="https://quantive.com/resources/blog/cliffai-acquisition/">
            early stage
          </A>{" "}
          and the other more <A href="https://quantive.com/">established</A>.
        </p>
        <p>
          These days, I&apos;m focused on backend development but have always been
          curious about frontend. I&apos;m currently learning to become a
          full-stack developer so I can build systems that not only work like
          magic but also look great for users.
        </p>
        <p>
          When I&apos;m not coding, I&apos;m either battling it out in{" "}
          <A href="https://www.youtube.com/watch?v=a20Jp7OEZYo">Sekiro</A> or
          playing co-op horror games like{" "}
          <A href="https://www.youtube.com/watch?v=kbqwsWQxtpg">Lethal Company</A>{" "}
          with friends (because nothing bonds like shared terror, right?).
          I&apos;m also a big fan of cooking — it&apos;s a passion of mine that I
          love to dive into whenever I can. And when I&apos;m not in the kitchen,
          I&apos;m probably deep into manga and anime — currently hooked on One
          Piece and Berserk.
        </p>
      </Reveal>
    </section>
  );
}
