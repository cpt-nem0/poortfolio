import Link from "next/link";
import { DOOR_TEASER } from "@/content/bento";

export function DoorTile() {
  return (
    <Link href="/" className="bento-tile group relative overflow-hidden rounded-lg border border-[#26262e] bg-[#120d14]/90 p-4 transition-colors hover:border-[#ff5c7a66] md:row-span-2">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8fa3]">after hours</h2>
      <p className="mt-4 font-sans text-2xl font-extrabold leading-tight text-[#ff5c7a] [text-shadow:0_0_12px_rgba(255,92,122,.6)] transition-transform duration-300 group-hover:translate-x-1">
        it&apos;s 3am<br />in here →
      </p>
      <p className="mt-3 font-mono text-[11px] leading-relaxed text-[#6d6d80]">
        {DOOR_TEASER.map((l) => (<span key={l}>{l}<br /></span>))}
      </p>
      <span aria-hidden className="absolute bottom-3 right-3 block h-[52px] w-[76px] bg-[#16121d] [clip-path:polygon(0_40%,50%_0,100%_40%,100%_100%,0_100%)]">
        <span className="bento-window absolute bottom-2 right-3 block h-4 w-3.5 bg-[#ffb35c] shadow-[0_0_16px_5px_rgba(255,179,92,.55)]" style={{ animation: "bento-window 5s infinite" }} />
      </span>
    </Link>
  );
}
