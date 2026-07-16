import { describe, it, expect } from "vitest";
import { chooseTrack, isAllowedStreamUrl, toStreamProxyUrl } from "@/threeam/audio/logic";

describe("chooseTrack", () => {
  it("picks deterministically from rand", () => {
    const items = ["a", "b", "c", "d"];
    expect(chooseTrack(items, () => 0)).toBe("a");
    expect(chooseTrack(items, () => 0.99)).toBe("d");
    expect(chooseTrack(items, () => 0.5)).toBe("c");
  });
  it("returns null on empty", () => {
    expect(chooseTrack([], () => 0.5)).toBeNull();
  });
});

describe("isAllowedStreamUrl", () => {
  it("allows Apple preview hosts over https", () => {
    expect(isAllowedStreamUrl("https://audio-ssl.itunes.apple.com/x/y.m4a")).toBe(true);
    expect(isAllowedStreamUrl("https://a1.mzstatic.com/us/r1000/preview.m4a")).toBe(true);
    expect(isAllowedStreamUrl("https://itunes.apple.com/anything")).toBe(true);
  });
  it("rejects other hosts, http, lookalikes, and garbage", () => {
    expect(isAllowedStreamUrl("https://evil.com/x.m4a")).toBe(false);
    expect(isAllowedStreamUrl("http://audio-ssl.itunes.apple.com/x.m4a")).toBe(false);
    expect(isAllowedStreamUrl("https://mzstatic.com.evil.com/x.m4a")).toBe(false);
    expect(isAllowedStreamUrl("not a url")).toBe(false);
  });
});

describe("toStreamProxyUrl", () => {
  it("encodes the target", () => {
    expect(toStreamProxyUrl("https://a.mzstatic.com/p.m4a?x=1&y=2")).toBe(
      "/api/3am/music/stream?u=" + encodeURIComponent("https://a.mzstatic.com/p.m4a?x=1&y=2")
    );
  });
});
