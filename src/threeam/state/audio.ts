import { create } from "zustand";

export type NowPlaying = {
  kind: "ambient" | "preview";
  artist: string;
  title: string;
  albumKey?: string;
  storeUrl?: string;
} | null;

type AudioState = {
  unlocked: boolean;
  muted: boolean;
  /** True while the whole AudioContext is suspended via the HUD pause button. */
  paused: boolean;
  nowPlaying: NowPlaying;
  error: string | null;
  setUnlocked: (unlocked: boolean) => void;
  setMuted: (muted: boolean) => void;
  setPaused: (paused: boolean) => void;
  setNowPlaying: (nowPlaying: NowPlaying) => void;
  setError: (error: string | null) => void;
};

export const useAudioStore = create<AudioState>((set) => ({
  unlocked: false,
  muted: false,
  paused: false,
  nowPlaying: null,
  error: null,
  setUnlocked: (unlocked) => set({ unlocked }),
  setMuted: (muted) => set({ muted }),
  setPaused: (paused) => set({ paused }),
  setNowPlaying: (nowPlaying) => set({ nowPlaying }),
  setError: (error) => set({ error }),
}));
