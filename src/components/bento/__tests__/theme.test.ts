import { describe, expect, it } from "vitest";
import { resolveTheme, THEME_STORAGE_KEY, themeInitScript } from "../theme";

describe("resolveTheme", () => {
  it("honors a stored explicit choice over system preference", () => {
    expect(resolveTheme("day", true)).toBe("day");
    expect(resolveTheme("night", false)).toBe("night");
  });
  it("falls back to system preference when nothing stored", () => {
    expect(resolveTheme(null, true)).toBe("night");
    expect(resolveTheme(null, false)).toBe("day");
  });
  it("treats garbage storage as unset", () => {
    expect(resolveTheme("banana", false)).toBe("day");
    expect(resolveTheme("", true)).toBe("night");
  });
  it("init script references the same storage key and sets data-theme", () => {
    expect(themeInitScript).toContain(THEME_STORAGE_KEY);
    expect(themeInitScript).toContain("data-theme");
  });
});
