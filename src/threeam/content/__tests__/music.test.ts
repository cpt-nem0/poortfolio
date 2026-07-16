import { describe, it, expect } from "vitest";
import { MUSIC } from "@/threeam/content/music";

describe("music content", () => {
  it("has exactly the 6 planned entries with fixed keys", () => {
    expect(MUSIC.map((m) => m.key)).toEqual(["am", "fwn", "currents", "okc", "iris", "chfl"]);
  });

  it("every itunesId is a real positive id and unique", () => {
    const ids = MUSIC.map((m) => m.itunesId);
    for (const id of ids) expect(id).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("singles and albums are typed correctly", () => {
    expect(MUSIC.find((m) => m.key === "iris")?.kind).toBe("single");
    expect(MUSIC.find((m) => m.key === "am")?.kind).toBe("album");
  });

  it("art paths follow the /3am/albums convention", () => {
    for (const m of MUSIC) expect(m.art).toBe(`/3am/albums/${m.key}.png`);
  });
});
