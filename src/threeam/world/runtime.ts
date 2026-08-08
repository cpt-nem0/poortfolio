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
 * At the workspace centre, x∈(11.5,12.5) sits within DOOR_MARGIN of BOTH
 * doorways (x8 and x16) at once. Rather than reintroducing the 4.0 dark-edge
 * regression to keep that zone out of margin, `selectNeighbourBand` below
 * caps how many of those in-margin doorways actually render a neighbour: at
 * most one, the nearer one, with switch hysteresis so it doesn't flicker
 * between the two as the player crosses the strip. See that function's doc
 * for the cap logic. */
export const DOOR_MARGIN = 4.5;

/** Hysteresis for `selectNeighbourBand`'s neighbour CHOICE, distinct from
 * `BAND_HYSTERESIS` (which gates the CURRENT band crossing a boundary).
 * Only matters from band 1 (workspace), the one band with two candidate
 * doorways at once: once a neighbour is selected, the other candidate must
 * become closer by MORE than this before it takes over, so standing near
 * the workspace centre can't flicker the rendered neighbour back and forth
 * every frame. Same numeric value as BAND_HYSTERESIS by coincidence, not by
 * shared meaning — keep them separate constants. */
export const NEIGHBOUR_SWITCH_HYSTERESIS = 0.4;

/** Which neighbour band (if any) is currently rendered alongside the
 * current band, and which `current` value that choice was made for. The
 * `forCurrent` field is how `selectNeighbourBand` detects a current-band
 * change and resets the choice (see its doc). Mutated in place, like
 * `roomBand` — single writer: `updateVisibleBands`. */
export type NeighbourSelection = { band: RoomBand | null; forCurrent: RoomBand };

export const neighbourSelection: NeighbourSelection = {
  band: null,
  forCurrent: roomBand.current,
};

/**
 * Pure decision function (extracted for unit testing): given the current
 * band, the player's raw x, and the previous frame's neighbour selection,
 * returns which single neighbour band (if any) should render alongside
 * `current` this frame.
 *
 * Only band 1 (workspace) ever has two in-margin candidate doorways at
 * once (see the DOOR_MARGIN doc) — bands 0 and 2 each border only one
 * doorway, so they fall straight into the zero/one-candidate cases below
 * regardless of prior selection, same as before this cap existed.
 *
 * - Zero in-margin doorways → no neighbour.
 * - Exactly one in-margin doorway → that neighbour, unconditionally (no
 *   hysteresis needed — there's no choice to flicker between).
 * - Two in-margin doorways (band 1 only):
 *   - If `current` differs from `prev.forCurrent` (the active band just
 *     changed), there's no prior choice to hold onto — pick whichever
 *     doorway is nearer.
 *   - Otherwise, keep the previously selected neighbour UNLESS the other
 *     candidate's doorway is now closer by more than
 *     `NEIGHBOUR_SWITCH_HYSTERESIS`.
 */
export function selectNeighbourBand(
  current: RoomBand,
  x: number,
  prev: NeighbourSelection
): NeighbourSelection {
  const candidates: Array<[RoomBand, number]> = [];
  if (current === 0 || current === 1) {
    const d = Math.abs(x - BEDROOM_WORKSPACE_BOUNDARY);
    if (d < DOOR_MARGIN) candidates.push([current === 0 ? 1 : 0, d]);
  }
  if (current === 1 || current === 2) {
    const d = Math.abs(x - WORKSPACE_MUSIC_BOUNDARY);
    if (d < DOOR_MARGIN) candidates.push([current === 1 ? 2 : 1, d]);
  }

  if (candidates.length === 0) {
    return { band: null, forCurrent: current };
  }
  if (candidates.length === 1) {
    return { band: candidates[0][0], forCurrent: current };
  }

  // Two candidates: only reachable from band 1.
  const prevCand =
    prev.forCurrent === current && prev.band !== null
      ? candidates.find(([b]) => b === prev.band)
      : undefined;

  if (!prevCand) {
    const nearest = candidates[0][1] <= candidates[1][1] ? candidates[0] : candidates[1];
    return { band: nearest[0], forCurrent: current };
  }

  const other = candidates.find(([b]) => b !== prevCand[0])!;
  if (other[1] < prevCand[1] - NEIGHBOUR_SWITCH_HYSTERESIS) {
    return { band: other[0], forCurrent: current };
  }
  return { band: prevCand[0], forCurrent: current };
}

/** Which bands render this frame: the current band (from `roomBand`,
 * hysteresis-gated — see `nextRoomBand`) ALWAYS, plus at most ONE adjacent
 * band, chosen by `selectNeighbourBand`. A plain 3-slot boolean array,
 * mutated in place like `playerPosition`/`roomBand` — no per-frame
 * allocation, and both Scene's RoomCull and House's StructureBand read the
 * exact same array so content and structural shell can never disagree about
 * which rooms are visible. Never more than 2 slots are true. */
export const visibleBands: [boolean, boolean, boolean] = [false, false, false];

/** Recomputes `neighbourSelection` and `visibleBands` for this frame. Call
 * once per frame, after `roomBand.current` has been advanced (Scene's
 * RoomBandUpdater does both, in order). */
export function updateVisibleBands(current: RoomBand, x: number): void {
  const next = selectNeighbourBand(current, x, neighbourSelection);
  neighbourSelection.band = next.band;
  neighbourSelection.forCurrent = next.forCurrent;

  visibleBands[0] = current === 0;
  visibleBands[1] = current === 1;
  visibleBands[2] = current === 2;
  if (neighbourSelection.band !== null) {
    visibleBands[neighbourSelection.band] = true;
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
