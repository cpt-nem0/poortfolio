import { describe, expect, it } from "vitest";
import { MEANWHILE_LOG, DOOR_TEASER, MORE_PROJECT_BLURBS, HERO_QUOTES } from "../bento";
import { site } from "../site";

describe("bento content", () => {
  it("door teaser is exactly 3 short lines", () => {
    expect(DOOR_TEASER).toHaveLength(3);
    for (const l of DOOR_TEASER) expect(l.length).toBeLessThan(40);
  });
  it("every flat-list blurb key is a real site.ts project title", () => {
    const titles = site.projects.map((p) => p.title);
    for (const key of Object.keys(MORE_PROJECT_BLURBS)) expect(titles).toContain(key);
  });
  it("meanwhile log pools are populated", () => {
    expect(MEANWHILE_LOG.play.length).toBeGreaterThanOrEqual(5);
    expect(MEANWHILE_LOG.read.length).toBeGreaterThanOrEqual(5);
    expect(MEANWHILE_LOG.cook.length).toBeGreaterThanOrEqual(5);
    expect(MEANWHILE_LOG.loop.length).toBeGreaterThanOrEqual(10);
  });
  it("meanwhile log lines lowercase-start, except the RAID INCOMING shout", () => {
    for (const lines of Object.values(MEANWHILE_LOG)) {
      for (const l of lines) {
        if (l === "valheim — RAID INCOMING!!!") continue;
        expect(l[0]).toBe(l[0].toLowerCase());
      }
    }
  });
  it("meanwhile read pool name-drops berserk", () => {
    expect(MEANWHILE_LOG.read.some((l) => l.startsWith("berserk"))).toBe(true);
  });
  it("every hero quote has non-empty text and source", () => {
    expect(HERO_QUOTES.length).toBeGreaterThan(0);
    for (const q of HERO_QUOTES) {
      expect(q.text.length).toBeGreaterThan(0);
      expect(q.source.length).toBeGreaterThan(0);
    }
  });
});
