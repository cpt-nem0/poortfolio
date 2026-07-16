/** Pure helpers for the music system — no fetch, no three.js. */

export function chooseTrack<T>(items: T[], rand: () => number): T | null {
  if (items.length === 0) return null;
  return items[Math.min(items.length - 1, Math.floor(rand() * items.length))];
}

const ALLOWED_HOSTS = [".itunes.apple.com", ".mzstatic.com"];

/** Open-proxy guard: only https URLs on Apple preview hosts may be streamed. */
export function isAllowedStreamUrl(u: string): boolean {
  try {
    const url = new URL(u);
    if (url.protocol !== "https:") return false;
    const host = url.hostname;
    return ALLOWED_HOSTS.some((s) => host === s.slice(1) || host.endsWith(s));
  } catch {
    return false;
  }
}

export function toStreamProxyUrl(previewUrl: string): string {
  return "/api/3am/music/stream?u=" + encodeURIComponent(previewUrl);
}
