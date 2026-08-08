export const THEME_STORAGE_KEY = "poortfolio-theme";

export type ThemeName = "night" | "day";

/** Explicit stored choice wins; otherwise follow the system. */
export function resolveTheme(stored: string | null, systemPrefersDark: boolean): ThemeName {
  if (stored === "night" || stored === "day") return stored;
  return systemPrefersDark ? "night" : "day";
}

/** Runs before hydration in <head> so the first paint has the right theme (no FOUC). */
export const themeInitScript = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=(s==="night"||s==="day")?s:(d?"night":"day");document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","night");}})();`;
