"use client";

import { useEffect } from "react";

type ModelCredit = {
  name: string;
  sourceUrl: string;
  author: string;
  authorUrl: string;
  license: string;
  licenseUrl: string;
};

const MODEL_CREDITS: ModelCredit[] = [
  {
    name: "Neon Genesis Evangelion Unit-01",
    sourceUrl:
      "https://sketchfab.com/3d-models/neon-genesis-evangelion-unit-01-5bc7a4fd7ee64fcb8ba2bb3f4832e343",
    author: "XxAugustoxX",
    authorUrl: "https://sketchfab.com/garaujoaugusto",
    license: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    name: "Katana",
    sourceUrl: "https://sketchfab.com/3d-models/katana-b061754e94ce434cbe1396b3bb6d8abc",
    author: "aneeqayounas",
    authorUrl: "https://sketchfab.com/aneeqayounas",
    license: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    name: "Canarian Cafe - Coffee Machine",
    sourceUrl:
      "https://sketchfab.com/3d-models/canarian-cafe-coffee-machine-17042d9af8c5461e98876064fd80385d",
    author: "Lanzaman",
    authorUrl: "https://sketchfab.com/lanzaboy",
    license: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    name: "Pixar Lamp",
    sourceUrl: "https://sketchfab.com/3d-models/pixar-lamp-f97d17ac89a14ff68c3e488c69340b44",
    author: "yacinebel",
    authorUrl: "https://sketchfab.com/yacinebel",
    license: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    name: "Gaming Chair - Grey Cushioned",
    sourceUrl:
      "https://sketchfab.com/3d-models/gaming-chair-grey-cushioned-c39430b3f91b43f7937174a9c27998f1",
    author: "kanesk06",
    authorUrl: "https://sketchfab.com/kanesk06",
    license: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    name: "Ficus Lyrata - Plants",
    sourceUrl:
      "https://sketchfab.com/3d-models/ficus-lyrata-plants-161df9b2f7124549a2cfa4c33104046e",
    author: "LadyCris",
    authorUrl: "https://sketchfab.com/ladycris",
    license: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    name: "Indoor Plants Pack",
    sourceUrl:
      "https://sketchfab.com/3d-models/indoor-plants-pack-fc04bd613c154e20800f242bf1233e1e",
    author: "Domenico.Pentangelo",
    authorUrl: "https://sketchfab.com/Domenico.Pentangelo",
    license: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    name: "Ficus Bonsai",
    sourceUrl: "https://sketchfab.com/3d-models/ficus-bonsai-f420ea9edb914e1b9b7adebbacecc7d8",
    author: "Zgon",
    authorUrl: "https://sketchfab.com/Z-gon",
    license: "Sketchfab Standard",
    licenseUrl: "https://sketchfab.com/licenses",
  },
  {
    name: "Bed with Lamp",
    sourceUrl: "https://sketchfab.com/3d-models/bed-with-lamp-b9b6f7dce9df4d719acc37b5e05a3ea3",
    author: "GreenG",
    authorUrl: "https://sketchfab.com/AngelNebesniy",
    license: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
];

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[#f2ecd8] transition-colors hover:text-[#ffb35c] hover:underline"
    >
      {children}
    </a>
  );
}

export function CreditsPanel({ onClose }: { onClose: () => void }) {
  // Capture-phase so this ESC handler runs before ThreeAmApp's window-level
  // keydown listener (which exits the active station) — stopPropagation()
  // here keeps ESC scoped to "close this panel" without affecting the
  // station-exit flow when the panel isn't open.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [onClose]);

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4 font-mono"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded border border-[#453a63] bg-[#0a0916]/95 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#453a63] px-5 py-4">
          <h2 className="text-sm tracking-wide text-[#ffd9a0]">credits</h2>
          <button
            type="button"
            onClick={(e) => {
              onClose();
              e.currentTarget.blur();
            }}
            aria-label="close credits"
            className="rounded px-2 py-1 text-[#cfc6ee] outline-none transition-colors hover:text-[#ffb35c] focus:outline-none"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <section className="flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-wide text-[#7d729e]">3d models</h3>
            <ul className="flex flex-col gap-2 text-xs leading-relaxed text-[#9d8fd8]">
              {MODEL_CREDITS.map((m) => (
                <li key={m.name}>
                  <ExternalLink href={m.sourceUrl}>{m.name}</ExternalLink> by{" "}
                  <ExternalLink href={m.authorUrl}>{m.author}</ExternalLink> —{" "}
                  <ExternalLink href={m.licenseUrl}>{m.license}</ExternalLink>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-[#7d729e]">
              Some of these models were modified for this scene — re-rigged, cut down,
              split into separate pieces, and/or geometry-optimized (mesh simplification,
              texture downscaling) — beyond simple resizing or placement.
            </p>
          </section>

          <section className="mt-5 flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-wide text-[#7d729e]">music</h3>
            <ul className="flex flex-col gap-2 text-xs leading-relaxed text-[#9d8fd8]">
              <li>
                Ambient jazz track — sourced from{" "}
                <ExternalLink href="https://pixabay.com">Pixabay</ExternalLink> (Pixabay Content
                License, no attribution required — credited anyway)
              </li>
              <li>
                &ldquo;School of Magic (inspired by Harry Potter)&rdquo; by Luis Humanoide, from{" "}
                <ExternalLink href="https://pixabay.com">Pixabay</ExternalLink> (Pixabay Content
                License, no attribution required — credited anyway)
              </li>
              <li>
                All music previews stream from Apple&apos;s iTunes preview API at runtime and are
                never stored in this repository.
              </li>
            </ul>
          </section>

          <p className="mt-5 text-xs leading-relaxed text-[#7d729e]">
            everything else — hand-built pixel art, generated in this repo.
          </p>
        </div>
      </div>
    </div>
  );
}
