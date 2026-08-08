import { SPAWN } from "./layout";

/**
 * Mutable per-frame game state. Lives outside React/zustand on purpose:
 * the player moves every frame and must not trigger React renders.
 */
export const playerPosition = { x: SPAWN.x, z: SPAWN.z };

/**
 * Discrete ground-floor x-band the player currently occupies: 0 = bedroom
 * (+engawa, x<8), 1 = workspace (8<=x<16), 2 = music (x>=16). This is the
 * SINGLE SOURCE OF TRUTH for "which room is current" — Scene's RoomCull
 * (room CONTENT: Bedroom/Workspace/MusicNook) and House's per-room
 * structural shell (floors, skeleton walls, the stairs) both read the same
 * `roomBand.current` each frame, so they can never disagree about which
 * room is active. Only one place writes it: Scene's RoomBandUpdater, once
 * per frame, via `nextRoomBand`. Lives outside React/zustand for the same
 * reason `playerPosition` does — advanced every frame, must not trigger
 * renders.
 */
export type RoomBand = 0 | 1 | 2;

/** x-band boundaries. bedroom+engawa is ONE unit (engawa -2.9..0, bedroom
 * 0..8) and always renders together — Bedroom.tsx already contains both,
 * and House treats the engawa's own divider wall as part of band 0. */
export const BEDROOM_WORKSPACE_BOUNDARY = 8;
export const WORKSPACE_MUSIC_BOUNDARY = 16;

/** Standing exactly on a boundary (or jittering across it) can't flicker
 * two rooms in and out: the player must cross this far past a boundary
 * before the active band actually swaps. */
export const BAND_HYSTERESIS = 0.4;

/** Which band `x` is in, ignoring hysteresis — only used to seed the
 * initial active band (no prior state to hold onto yet). */
function initialRoomBand(x: number): RoomBand {
  if (x < BEDROOM_WORKSPACE_BOUNDARY) return 0;
  if (x < WORKSPACE_MUSIC_BOUNDARY) return 1;
  return 2;
}

/**
 * Discrete-room state machine: given the currently active band and the
 * player's x, decides whether to swap to a neighbour. A boundary only
 * triggers a swap once the player is `BAND_HYSTERESIS` past it, so the swap
 * at x=8 / x=16 can't flicker.
 */
export function nextRoomBand(current: RoomBand, x: number): RoomBand {
  switch (current) {
    case 0:
      return x > BEDROOM_WORKSPACE_BOUNDARY + BAND_HYSTERESIS ? 1 : 0;
    case 1:
      if (x < BEDROOM_WORKSPACE_BOUNDARY - BAND_HYSTERESIS) return 0;
      if (x > WORKSPACE_MUSIC_BOUNDARY + BAND_HYSTERESIS) return 2;
      return 1;
    case 2:
      return x < WORKSPACE_MUSIC_BOUNDARY - BAND_HYSTERESIS ? 1 : 2;
  }
}

/** The one active band. Mutated in place (like `playerPosition`) so every
 * reader — Scene's RoomCull instances and House's StructureBand instances —
 * sees the same value within a frame without React state/prop drilling. */
export const roomBand: { current: RoomBand } = {
  current: initialRoomBand(playerPosition.x),
};

/** How close (in x) the player must be to a doorway boundary before the
 * room on the far side starts rendering, so it can fade/pop in ahead of
 * arrival instead of hard-cutting at the threshold.
 *
 * 4.5 is the OWNER-CHOSEN value (2026-08, re-confirmed at the pre-merge
 * review). Commit 9ff35eb originally widened 3.5 → 4.5 because a tighter
 * margin dropped a room while its doorway was still on screen — the owner
 * caught the resulting void himself. A later rewrite silently narrowed it to
 * 4.0 to preserve a "never more than 2 bands" invariant; that reintroduced a
 * dark edge at spawn (x=4 sits exactly on the 4.0 boundary), made worse
 * because this branch also band-gates House's floors/walls, so the far side
 * degrades to raw background rather than an unlit room.
 *
 * The tradeoff, explicitly accepted: the two near-door zones — |x-8|<4.5
 * (x∈(3.5,12.5)) and |x-16|<4.5 (x∈(11.5,20.5)) — now OVERLAP on x∈(11.5,
 * 12.5), so all 3 ground rooms render in that ~1m strip at the workspace
 * centre. That used to cost ~49fps, but the render-resolution cap plus the
 * workspace light trim (9→5) left enough headroom that it no longer matters.
 * If perf ever regresses there, narrow this back to 4.0 rather than
 * re-architecting — and expect the spawn dark edge to return with it. */
export const DOOR_MARGIN = 4.5;

/** Which bands render this frame: the current band (from `roomBand`,
 * hysteresis-gated — see `nextRoomBand`) ALWAYS, plus an adjacent band
 * whenever the player's raw x is within `DOOR_MARGIN` of the boundary that
 * borders it. A plain 3-slot boolean array, mutated in place like
 * `playerPosition`/`roomBand` — no per-frame allocation, and both Scene's
 * RoomCull and House's StructureBand read the exact same array so content
 * and structural shell can never disagree about which rooms are visible.
 * Usually 1-2 slots are true; at DOOR_MARGIN 4.5 all 3 are true in the ~1m
 * strip x∈(11.5,12.5) where both near-door zones overlap — an accepted
 * tradeoff, see the DOOR_MARGIN doc above. */
export const visibleBands: [boolean, boolean, boolean] = [false, false, false];

/** Recomputes `visibleBands` for this frame. Call once per frame, after
 * `roomBand.current` has been advanced (Scene's RoomBandUpdater does both,
 * in order). Cheap: 3 assignments + 2 boundary checks, no allocation. */
export function updateVisibleBands(current: RoomBand, x: number): void {
  visibleBands[0] = current === 0;
  visibleBands[1] = current === 1;
  visibleBands[2] = current === 2;
  if (Math.abs(x - BEDROOM_WORKSPACE_BOUNDARY) < DOOR_MARGIN) {
    visibleBands[0] = true;
    visibleBands[1] = true;
  }
  if (Math.abs(x - WORKSPACE_MUSIC_BOUNDARY) < DOOR_MARGIN) {
    visibleBands[1] = true;
    visibleBands[2] = true;
  }
}

/** Whether `band` should render this frame. Reads the shared `visibleBands`
 * array — see its doc for why current + adjacent-near-door is safe. */
export function isBandVisible(band: RoomBand): boolean {
  return visibleBands[band];
}

// Seed visibleBands for the initial band before the first frame runs, so
// nothing reads all-false on mount.
updateVisibleBands(roomBand.current, playerPosition.x);

// dev-only handle so browser automation can inspect live band state — same
// convention as Player.tsx's window.__3am (playerPosition/store/renderer).
// Reads the SAME live references (not snapshots), so polling
// window.__3amBands.visibleBands reflects the current frame's state.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as Record<string, unknown>).__3amBands = {
    roomBand,
    visibleBands,
    isBandVisible,
  };
}
