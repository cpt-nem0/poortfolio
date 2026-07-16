import { describe, it, expect, beforeEach } from "vitest";
import { useAudioStore } from "@/threeam/state/audio";

beforeEach(() => {
  useAudioStore.setState({ unlocked: false, muted: false, nowPlaying: null, error: null });
});

describe("audio store", () => {
  it("starts locked, unmuted, silent", () => {
    const s = useAudioStore.getState();
    expect(s.unlocked).toBe(false);
    expect(s.muted).toBe(false);
    expect(s.nowPlaying).toBeNull();
  });

  it("tracks now playing", () => {
    useAudioStore.getState().setNowPlaying({
      kind: "preview", artist: "Radiohead", title: "Let Down", albumKey: "okc",
    });
    expect(useAudioStore.getState().nowPlaying?.title).toBe("Let Down");
  });

  it("setError and setMuted update state", () => {
    useAudioStore.getState().setError("record skipped");
    useAudioStore.getState().setMuted(true);
    expect(useAudioStore.getState().error).toBe("record skipped");
    expect(useAudioStore.getState().muted).toBe(true);
  });
});
