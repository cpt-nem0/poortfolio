import { FOOTER_WHISPER } from "@/content/bento";
import { SkyBackground } from "./SkyBackground";
import { EasterEggs } from "./eggs";
import { IdentityTile } from "./tiles/IdentityTile";
import { DoorTile } from "./tiles/DoorTile";
import { VerseTile } from "./tiles/VerseTile";
import { PlateTile } from "./tiles/PlateTile";
import { ClickbaitTile } from "./tiles/ClickbaitTile";
import { JobsTile } from "./tiles/JobsTile";
import { MeanwhileTile } from "./tiles/MeanwhileTile";
import { MoreTile } from "./tiles/MoreTile";

export function BentoGrid() {
  return (
    <div className="relative min-h-dvh max-md:overflow-x-clip md:flex md:h-dvh md:flex-col">
      <SkyBackground />
      <EasterEggs />
      <main className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-3.5 px-4 pb-6 pt-16 md:min-h-0 md:flex-1 md:auto-rows-[minmax(150px,1fr)] md:grid-cols-3 md:overflow-y-auto lg:px-8 2xl:max-w-[1680px]">
        <IdentityTile />
        <DoorTile />
        <VerseTile />
        <PlateTile />
        <ClickbaitTile />
        <JobsTile />
        <MeanwhileTile />
        <MoreTile />
      </main>
      <footer className="shrink-0 pb-6 text-center font-mono text-[10px] text-[var(--dim)]">
        © rohan · <a href="https://github.com/cpt-nem0/poortfolio" target="_blank" rel="noreferrer" className="hover:text-[var(--amber)]">source</a> · <span className="opacity-60">{FOOTER_WHISPER}</span>
      </footer>
    </div>
  );
}
