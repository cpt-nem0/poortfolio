/** Rounded orange pill for a tech/skill — matches the original .skill-tag. */
export function SkillTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-accent-bg px-2.5 py-1 text-xs text-accent">
      {children}
    </span>
  );
}

export function SkillList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-x-1.5 gap-y-2 p-1">
      {items.map((item) => (
        <li key={item}>
          <SkillTag>{item}</SkillTag>
        </li>
      ))}
    </ul>
  );
}
