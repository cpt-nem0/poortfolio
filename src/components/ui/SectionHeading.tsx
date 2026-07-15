/**
 * Sticky, blurred section label shown on mobile only — mirrors the original
 * `.sticky-header`. On desktop the left-rail nav takes over, so this hides.
 */
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 -mx-6 mb-2 bg-void/60 px-6 py-4 backdrop-blur-sm lg:hidden">
      <h2 className="text-base font-normal uppercase tracking-wide text-highlight">
        {children}
      </h2>
    </div>
  );
}
