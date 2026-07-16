"use client";

import { useState } from "react";
import { MUSIC } from "@/threeam/content/music";
import { audioEngine } from "@/threeam/audio/engine";
import { useAudioStore } from "@/threeam/state/audio";
import { usePixelTexture } from "../usePixelTexture";

/** 2 rows × 3 cols of Rohan's real albums on the north wall above the cabinet. */
const COLS_X = [17.6, 18.7, 19.8];
const ROWS_Y = [2.1, 1.35];
const WALL_Z = 0.035; // in front of the plaster plane at z≈0.01
const ART = 0.62;
const FRAME = 0.72;

let lastAlbumClick = 0;

function AlbumFrame({ index }: { index: number }) {
  const entry = MUSIC[index];
  const tex = usePixelTexture(entry.art);
  const [hover, setHover] = useState(false);
  const playingKey = useAudioStore((s) =>
    s.nowPlaying?.kind === "preview" ? s.nowPlaying.albumKey : undefined
  );
  const isPlaying = playingKey === entry.key;

  const x = COLS_X[index % 3];
  const y = ROWS_Y[Math.floor(index / 3)];

  async function play() {
    const clickId = ++lastAlbumClick;
    try {
      const res = await fetch(`/api/3am/music/${entry.key}`);
      if (!res.ok) throw new Error(String(res.status));
      const t = (await res.json()) as {
        artist: string; title: string; previewProxyUrl: string; storeUrl?: string;
      };
      if (clickId !== lastAlbumClick) return; // a newer album click superseded this one
      await audioEngine.playPreview(
        { artist: t.artist, title: t.title, albumKey: entry.key, storeUrl: t.storeUrl },
        t.previewProxyUrl
      );
    } catch {
      if (clickId === lastAlbumClick) useAudioStore.getState().setError("record skipped… try again");
    }
  }

  return (
    <group
      position={[x, y, WALL_Z]}
      scale={hover ? 1.06 : 1}
      onClick={(e) => {
        e.stopPropagation();
        void play();
      }}
      onPointerOver={() => {
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "auto";
      }}
    >
      <mesh position={[0, 0, -0.012]}>
        <boxGeometry args={[FRAME, FRAME, 0.024]} />
        <meshStandardMaterial
          color={isPlaying ? "#ffb35c" : "#4a3a2e"}
          emissive={isPlaying ? "#ffb35c" : hover ? "#f2ecd8" : "#000000"}
          emissiveIntensity={isPlaying ? 0.7 : hover ? 0.15 : 0}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[ART, ART]} />
        <meshStandardMaterial map={tex} />
      </mesh>
    </group>
  );
}

export function AlbumWall() {
  return (
    <group>
      {MUSIC.map((m, i) => (
        <AlbumFrame key={m.key} index={i} />
      ))}
    </group>
  );
}
