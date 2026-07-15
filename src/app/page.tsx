import { Sidebar } from "@/components/layout/Sidebar";
import { About } from "@/components/sections/About";
import { Experience } from "@/components/sections/Experience";
import { Projects } from "@/components/sections/Projects";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTop } from "@/components/layout/ScrollToTop";

/**
 * Two-column layout: a sticky left rail (identity + nav + contact) and a
 * scrolling right column of content. Add a section by dropping a component
 * into <main> and a matching entry into `site.nav`.
 */
export default function Home() {
  return (
    <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-16 px-6 py-16 sm:px-10 lg:grid-cols-2 lg:gap-x-8 lg:px-16 lg:py-0">
      <Sidebar />
      <main className="flex flex-col gap-24 lg:py-24">
        <About />
        <Experience />
        <Projects />
        <Footer />
      </main>
      <ScrollToTop />
    </div>
  );
}
