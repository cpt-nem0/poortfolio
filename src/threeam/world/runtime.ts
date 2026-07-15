import { SPAWN } from "./layout";

/**
 * Mutable per-frame game state. Lives outside React/zustand on purpose:
 * the player moves every frame and must not trigger React renders.
 */
export const playerPosition = { x: SPAWN.x, z: SPAWN.z };
