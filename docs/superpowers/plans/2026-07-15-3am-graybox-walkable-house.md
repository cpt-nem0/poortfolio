# /3am Gray-Box Walkable House — Implementation Plan (Plan 1 of the /3am series)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A lazy-loaded `/3am` route where the visitor walks a placeholder character through a gray-box version of the house (bedroom → workspace → music nook, ladder to rooftop), with follow camera, collision, room detection, HUD, an entry link on the normal site, and a first-pass HD-2D post-processing stack — validating the *feel* before any art.

**Architecture:** All /3am code lives in `src/threeam/` (pure logic in `world/`, React/three in `scene/`, UI in `hud/`, state in `state/`). Pure logic modules (layout, collision, room/portal detection) are framework-free and unit-tested with vitest. The 3D scene is react-three-fiber mounted via `next/dynamic({ ssr: false })` inside a client component so the `/` route's bundle is untouched. Player position is a mutable singleton (game-loop data); the zustand store holds only discrete facts (area, room, active portal).

**Tech Stack:** Next.js 16 App Router, react-three-fiber 9 + three 0.185 + drei 10 (installed), zustand (add), @react-three/postprocessing (add), vitest (add, dev), pnpm.

**Spec:** `docs/superpowers/specs/2026-07-15-adhd-brain-house-design.md` (§3 rooms, §9 tech, §11 build order step 1). Later plans cover: art pipeline + music nook (Plan 2), remaining rooms' art/interactions (Plan 3), lighting/lamps/cat (Plan 4), ADHD layer + audio (Plan 5), entry cinematic + rooftop skyline (Plan 6), eclipse + museum + polish (Plan 7).

## Global Constraints

- Route is exactly `/3am`; entry button copy is exactly `it's 3am in here →`.
- `/` route must not grow: no three/r3f imports reachable from `/`'s module graph; `/3am` page itself stays a lightweight shell that lazy-loads the scene.
- `next/dynamic({ ssr: false })` is only legal inside a client component in this Next version — the scene loader must be `"use client"`.
- All temp files go to the session scratchpad, never `/tmp`.
- Package manager is `pnpm`. Run commands from `/Users/rohanyadav/Development/poortfolio`.
- World units are meters. Player radius 0.35, walk speed 3.5 m/s.
- Commit after every task (messages given per task).
- `<scratchpad>` in commands means the session scratchpad directory from the system prompt — never `/tmp`.
- Deliberate deferrals from spec §3 (later plans, not omissions): click-to-walk + touch controls (needs pathfinding; Plan 3), front-door street sliver (Plan 3), entry cinematic (Plan 6). Keyboard-only movement is acceptable for this milestone.

---

### Task 1: Test harness + dependencies

**Files:**
- Modify: `package.json` (via pnpm add + one script)
- Create: `vitest.config.ts`
- Test: `src/threeam/world/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: `pnpm test` runs vitest; `@/` alias resolves in tests; `zustand` and `@react-three/postprocessing` available to later tasks.

- [ ] **Step 1: Install dependencies**

```bash
pnpm add zustand @react-three/postprocessing && pnpm add -D vitest
```

Expected: both commands succeed; `package.json` gains the three deps.

- [ ] **Step 2: Create vitest config with the `@` alias**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 3: Add the test script**

In `package.json` `"scripts"`, add:

```json
"test": "vitest run"
```

- [ ] **Step 4: Write a smoke test**

Create `src/threeam/world/__tests__/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("vitest harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run tests, verify pass**

Run: `pnpm test`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/threeam/world/__tests__/smoke.test.ts
git commit -m "chore(3am): add vitest harness, zustand, postprocessing deps"
```

---

### Task 2: House layout data

**Files:**
- Create: `src/threeam/world/layout.ts`
- Test: `src/threeam/world/__tests__/layout.test.ts`

**Interfaces:**
- Produces (used by Tasks 3, 4, 7, 8, 10):
  - Types `Rect { x; z; w; d }`, `RoomId`, `AreaId`, `Portal`, `Area`.
  - `HOUSE: { areas: Record<AreaId, Area>; portals: Portal[] }`
  - `SPAWN: { area: AreaId; x: number; z: number }`

- [ ] **Step 1: Write the failing test**

Create `src/threeam/world/__tests__/layout.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { HOUSE, SPAWN } from "@/threeam/world/layout";

describe("house layout", () => {
  it("has ground and roof areas", () => {
    expect(HOUSE.areas.ground).toBeDefined();
    expect(HOUSE.areas.roof).toBeDefined();
  });

  it("ground floor contains bedroom, workspace, music rooms", () => {
    const ids = HOUSE.areas.ground.rooms.map((r) => r.id);
    expect(ids).toEqual(["bedroom", "workspace", "music"]);
  });

  it("rooms tile the ground bounds without overlap on x", () => {
    const [bed, work, music] = HOUSE.areas.ground.rooms.map((r) => r.rect);
    expect(bed.x + bed.w).toBe(work.x);
    expect(work.x + work.w).toBe(music.x);
    expect(music.x + music.w).toBe(
      HOUSE.areas.ground.bounds.x + HOUSE.areas.ground.bounds.w
    );
  });

  it("has a ladder portal up and down between ground and roof", () => {
    const up = HOUSE.portals.find((p) => p.id === "ladder-up");
    const down = HOUSE.portals.find((p) => p.id === "ladder-down");
    expect(up?.area).toBe("ground");
    expect(up?.toArea).toBe("roof");
    expect(down?.area).toBe("roof");
    expect(down?.toArea).toBe("ground");
  });

  it("spawn is inside ground bounds", () => {
    const b = HOUSE.areas.ground.bounds;
    expect(SPAWN.area).toBe("ground");
    expect(SPAWN.x).toBeGreaterThan(b.x);
    expect(SPAWN.x).toBeLessThan(b.x + b.w);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `@/threeam/world/layout`.

- [ ] **Step 3: Write the layout module**

Create `src/threeam/world/layout.ts`:

```ts
/**
 * Static floor plan for the /3am house. Pure data — no three.js, no React.
 * Units are meters. Origin at the house's north-west corner; x grows east
 * (bedroom → music nook), z grows south (toward the camera).
 */

export type Rect = { x: number; z: number; w: number; d: number };
export type RoomId = "bedroom" | "workspace" | "music" | "rooftop";
export type AreaId = "ground" | "roof";

export type Portal = {
  id: string;
  area: AreaId;
  /** Standing inside this rect arms the portal (HUD shows `label`). */
  trigger: Rect;
  toArea: AreaId;
  toPosition: { x: number; z: number };
  label: string;
};

export type Area = {
  id: AreaId;
  /** Outer walkable bounds; everything outside is blocked. */
  bounds: Rect;
  /** Blocked rectangles inside the bounds (interior walls; furniture later). */
  walls: Rect[];
  rooms: { id: RoomId; rect: Rect }[];
};

const WALL_T = 0.2; // interior wall thickness
const DOOR_LO = 2.4; // doorway gap on z: [DOOR_LO, DOOR_HI]
const DOOR_HI = 3.6;

/** Interior dividing wall at `x` with a doorway gap, spanning depth `d`. */
function dividerWithDoor(x: number, d: number): Rect[] {
  return [
    { x: x - WALL_T / 2, z: 0, w: WALL_T, d: DOOR_LO },
    { x: x - WALL_T / 2, z: DOOR_HI, w: WALL_T, d: d - DOOR_HI },
  ];
}

const GROUND: Area = {
  id: "ground",
  bounds: { x: 0, z: 0, w: 22, d: 6 },
  walls: [...dividerWithDoor(8, 6), ...dividerWithDoor(16, 6)],
  rooms: [
    { id: "bedroom", rect: { x: 0, z: 0, w: 8, d: 6 } },
    { id: "workspace", rect: { x: 8, z: 0, w: 8, d: 6 } },
    { id: "music", rect: { x: 16, z: 0, w: 6, d: 6 } },
  ],
};

const ROOF: Area = {
  id: "roof",
  bounds: { x: 8, z: 0, w: 8, d: 6 },
  walls: [],
  rooms: [{ id: "rooftop", rect: { x: 8, z: 0, w: 8, d: 6 } }],
};

export const HOUSE: { areas: Record<AreaId, Area>; portals: Portal[] } = {
  areas: { ground: GROUND, roof: ROOF },
  portals: [
    {
      id: "ladder-up",
      area: "ground",
      trigger: { x: 14.6, z: 0.2, w: 1.2, d: 1.0 },
      toArea: "roof",
      toPosition: { x: 12, z: 2 },
      label: "climb the ladder",
    },
    {
      id: "ladder-down",
      area: "roof",
      trigger: { x: 14.6, z: 0.2, w: 1.2, d: 1.0 },
      toArea: "ground",
      toPosition: { x: 14, z: 2 },
      label: "climb down",
    },
  ],
};

export const SPAWN = { area: "ground" as AreaId, x: 4, z: 3 };
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm test`
Expected: all layout tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/threeam/world/layout.ts src/threeam/world/__tests__/layout.test.ts
git commit -m "feat(3am): house floor plan data (ground + roof, rooms, ladder portals)"
```

---

### Task 3: Collision

**Files:**
- Create: `src/threeam/world/collision.ts`
- Test: `src/threeam/world/__tests__/collision.test.ts`

**Interfaces:**
- Consumes: `Area`, `Rect` from `layout.ts`.
- Produces (used by Task 8):
  - `PLAYER_RADIUS: number` (0.35)
  - `isBlocked(area: Area, x: number, z: number, r?: number): boolean`
  - `resolveMovement(area: Area, pos: {x,z}, delta: {x,z}, r?: number): {x: number; z: number}` — axis-separated so the player slides along walls.

- [ ] **Step 1: Write the failing test**

Create `src/threeam/world/__tests__/collision.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { HOUSE } from "@/threeam/world/layout";
import {
  isBlocked,
  resolveMovement,
  PLAYER_RADIUS,
} from "@/threeam/world/collision";

const ground = HOUSE.areas.ground;

describe("isBlocked", () => {
  it("open floor is walkable", () => {
    expect(isBlocked(ground, 4, 3)).toBe(false);
  });

  it("outside bounds is blocked", () => {
    expect(isBlocked(ground, -1, 3)).toBe(true);
    expect(isBlocked(ground, 4, 7)).toBe(true);
  });

  it("near the outer edge (within radius) is blocked", () => {
    expect(isBlocked(ground, 0.1, 3)).toBe(true);
  });

  it("interior wall is blocked, its doorway is walkable", () => {
    expect(isBlocked(ground, 8, 1)).toBe(true); // wall segment
    expect(isBlocked(ground, 8, 3)).toBe(false); // doorway gap
  });
});

describe("resolveMovement", () => {
  it("moves freely on open floor", () => {
    const p = resolveMovement(ground, { x: 4, z: 3 }, { x: 0.5, z: 0 });
    expect(p.x).toBeCloseTo(4.5);
    expect(p.z).toBeCloseTo(3);
  });

  it("blocks x through a wall but slides on z", () => {
    // just west of the x=8 divider, inside the wall band (z=1)
    const p = resolveMovement(ground, { x: 7.4, z: 1 }, { x: 0.5, z: 0.3 });
    expect(p.x).toBeCloseTo(7.4); // x move rejected
    expect(p.z).toBeCloseTo(1.3); // z move allowed
  });

  it("passes through the doorway", () => {
    const p = resolveMovement(ground, { x: 7.4, z: 3 }, { x: 0.5, z: 0 });
    expect(p.x).toBeCloseTo(7.9);
  });

  it("never returns a blocked position", () => {
    const p = resolveMovement(ground, { x: 4, z: 3 }, { x: -10, z: -10 });
    expect(isBlocked(ground, p.x, p.z, PLAYER_RADIUS)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `@/threeam/world/collision`.

- [ ] **Step 3: Write the collision module**

Create `src/threeam/world/collision.ts`:

```ts
import type { Area, Rect } from "./layout";

export const PLAYER_RADIUS = 0.35;

function circleIntersectsRect(px: number, pz: number, r: number, rect: Rect) {
  const cx = Math.max(rect.x, Math.min(px, rect.x + rect.w));
  const cz = Math.max(rect.z, Math.min(pz, rect.z + rect.d));
  const dx = px - cx;
  const dz = pz - cz;
  return dx * dx + dz * dz < r * r;
}

/** True if a circle of radius `r` at (x, z) overlaps a wall or leaves bounds. */
export function isBlocked(
  area: Area,
  x: number,
  z: number,
  r: number = PLAYER_RADIUS
): boolean {
  const b = area.bounds;
  if (x - r < b.x || x + r > b.x + b.w) return true;
  if (z - r < b.z || z + r > b.z + b.d) return true;
  return area.walls.some((w) => circleIntersectsRect(x, z, r, w));
}

/**
 * Apply `delta` axis-by-axis so a blocked axis is dropped while the other
 * still applies (wall sliding). Always returns an unblocked position.
 */
export function resolveMovement(
  area: Area,
  pos: { x: number; z: number },
  delta: { x: number; z: number },
  r: number = PLAYER_RADIUS
): { x: number; z: number } {
  let { x, z } = pos;
  if (!isBlocked(area, x + delta.x, z, r)) x += delta.x;
  if (!isBlocked(area, x, z + delta.z, r)) z += delta.z;
  return { x, z };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm test`
Expected: all collision tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/threeam/world/collision.ts src/threeam/world/__tests__/collision.test.ts
git commit -m "feat(3am): circle-vs-rect collision with wall sliding"
```

---

### Task 4: Room + portal detection

**Files:**
- Create: `src/threeam/world/detect.ts`
- Test: `src/threeam/world/__tests__/detect.test.ts`

**Interfaces:**
- Consumes: `Area`, `Portal`, `RoomId`, `AreaId`, `Rect` from `layout.ts`.
- Produces (used by Task 8):
  - `roomAt(area: Area, x: number, z: number): RoomId | null`
  - `portalAt(portals: Portal[], areaId: AreaId, x: number, z: number): Portal | null`

- [ ] **Step 1: Write the failing test**

Create `src/threeam/world/__tests__/detect.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { HOUSE } from "@/threeam/world/layout";
import { roomAt, portalAt } from "@/threeam/world/detect";

const ground = HOUSE.areas.ground;

describe("roomAt", () => {
  it("maps positions to rooms", () => {
    expect(roomAt(ground, 4, 3)).toBe("bedroom");
    expect(roomAt(ground, 12, 3)).toBe("workspace");
    expect(roomAt(ground, 18, 3)).toBe("music");
  });

  it("returns null outside all rooms", () => {
    expect(roomAt(ground, -5, 3)).toBeNull();
  });
});

describe("portalAt", () => {
  it("finds the ladder when standing on its trigger", () => {
    const p = portalAt(HOUSE.portals, "ground", 15.2, 0.7);
    expect(p?.id).toBe("ladder-up");
  });

  it("ignores portals of other areas", () => {
    expect(portalAt(HOUSE.portals, "roof", 15.2, 0.7)?.id).toBe("ladder-down");
  });

  it("returns null away from triggers", () => {
    expect(portalAt(HOUSE.portals, "ground", 4, 3)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `@/threeam/world/detect`.

- [ ] **Step 3: Write the detection module**

Create `src/threeam/world/detect.ts`:

```ts
import type { Area, AreaId, Portal, Rect, RoomId } from "./layout";

function inRect(x: number, z: number, r: Rect) {
  return x >= r.x && x <= r.x + r.w && z >= r.z && z <= r.z + r.d;
}

export function roomAt(area: Area, x: number, z: number): RoomId | null {
  const hit = area.rooms.find((r) => inRect(x, z, r.rect));
  return hit ? hit.id : null;
}

export function portalAt(
  portals: Portal[],
  areaId: AreaId,
  x: number,
  z: number
): Portal | null {
  return (
    portals.find((p) => p.area === areaId && inRect(x, z, p.trigger)) ?? null
  );
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm test`
Expected: all detect tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/threeam/world/detect.ts src/threeam/world/__tests__/detect.test.ts
git commit -m "feat(3am): room and portal detection"
```

---

### Task 5: State store + player position singleton

**Files:**
- Create: `src/threeam/state/store.ts`
- Create: `src/threeam/world/runtime.ts`
- Test: `src/threeam/state/__tests__/store.test.ts`

**Interfaces:**
- Consumes: `AreaId`, `RoomId`, `Portal`, `SPAWN` from `layout.ts`.
- Produces (used by Tasks 8, 9, 10, 11):
  - `useThreeAm` zustand store: `{ area: AreaId; room: RoomId | null; activePortal: Portal | null; setRoom(r); setActivePortal(p); travel(portal) }` — `travel` sets `area` to `portal.toArea`, teleports `playerPosition`, clears `activePortal`.
  - `playerPosition: { x: number; z: number }` mutable singleton in `runtime.ts`, initialized from `SPAWN` (game-loop data, deliberately outside React state).

- [ ] **Step 1: Write the failing test**

Create `src/threeam/state/__tests__/store.test.ts` (note: vitest config only includes `src/**/__tests__/**` — create the directory):

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useThreeAm } from "@/threeam/state/store";
import { playerPosition } from "@/threeam/world/runtime";
import { HOUSE, SPAWN } from "@/threeam/world/layout";

beforeEach(() => {
  useThreeAm.setState({ area: SPAWN.area, room: null, activePortal: null });
  playerPosition.x = SPAWN.x;
  playerPosition.z = SPAWN.z;
});

describe("useThreeAm store", () => {
  it("starts at spawn area with no room", () => {
    expect(useThreeAm.getState().area).toBe("ground");
    expect(useThreeAm.getState().room).toBeNull();
  });

  it("setRoom / setActivePortal update state", () => {
    useThreeAm.getState().setRoom("music");
    const ladder = HOUSE.portals[0];
    useThreeAm.getState().setActivePortal(ladder);
    expect(useThreeAm.getState().room).toBe("music");
    expect(useThreeAm.getState().activePortal?.id).toBe("ladder-up");
  });

  it("travel switches area, teleports the player, clears the portal", () => {
    const up = HOUSE.portals.find((p) => p.id === "ladder-up")!;
    useThreeAm.getState().setActivePortal(up);
    useThreeAm.getState().travel(up);
    const s = useThreeAm.getState();
    expect(s.area).toBe("roof");
    expect(s.activePortal).toBeNull();
    expect(playerPosition.x).toBe(up.toPosition.x);
    expect(playerPosition.z).toBe(up.toPosition.z);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve store/runtime modules.

- [ ] **Step 3: Write runtime singleton and store**

Create `src/threeam/world/runtime.ts`:

```ts
import { SPAWN } from "./layout";

/**
 * Mutable per-frame game state. Lives outside React/zustand on purpose:
 * the player moves every frame and must not trigger React renders.
 */
export const playerPosition = { x: SPAWN.x, z: SPAWN.z };
```

Create `src/threeam/state/store.ts`:

```ts
import { create } from "zustand";
import type { AreaId, Portal, RoomId } from "@/threeam/world/layout";
import { SPAWN } from "@/threeam/world/layout";
import { playerPosition } from "@/threeam/world/runtime";

type ThreeAmState = {
  area: AreaId;
  room: RoomId | null;
  activePortal: Portal | null;
  setRoom: (room: RoomId | null) => void;
  setActivePortal: (portal: Portal | null) => void;
  /** Use a portal: switch area, teleport the player, clear the prompt. */
  travel: (portal: Portal) => void;
};

export const useThreeAm = create<ThreeAmState>((set) => ({
  area: SPAWN.area,
  room: null,
  activePortal: null,
  setRoom: (room) => set({ room }),
  setActivePortal: (activePortal) => set({ activePortal }),
  travel: (portal) => {
    playerPosition.x = portal.toPosition.x;
    playerPosition.z = portal.toPosition.z;
    set({ area: portal.toArea, activePortal: null });
  },
}));
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm test`
Expected: all store tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/threeam/state src/threeam/world/runtime.ts
git commit -m "feat(3am): zustand store (area/room/portal/travel) + player position singleton"
```

---

### Task 6: `/3am` route shell with lazy 3D mount

**Files:**
- Create: `src/app/3am/page.tsx`
- Create: `src/threeam/ThreeAmApp.tsx`
- Create: `src/threeam/scene/Scene.tsx` (minimal Canvas for now)

**Interfaces:**
- Consumes: nothing from earlier tasks yet.
- Produces: `/3am` renders a full-viewport client experience; `Scene` is the r3f mount point Tasks 7–10 and 13 extend. `ThreeAmApp` renders `<Scene />` plus (from Task 11) `<Hud />`.

- [ ] **Step 1: Create the scene (minimal Canvas)**

Create `src/threeam/scene/Scene.tsx`:

```tsx
"use client";

import { Canvas } from "@react-three/fiber";

/** The 3D world. Extended by House/Player/FollowCamera/Effects tasks. */
export default function Scene() {
  return (
    <Canvas
      camera={{ fov: 35, position: [11, 9, 11] }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#0a0916"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 10, 4]} intensity={1.2} />
      {/* placeholder cube proves the canvas renders; removed in Task 7 */}
      <mesh position={[11, 0.5, 3]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffb35c" />
      </mesh>
    </Canvas>
  );
}
```

- [ ] **Step 2: Create the client shell with lazy mount**

Create `src/threeam/ThreeAmApp.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";

const Scene = dynamic(() => import("./scene/Scene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-[#0a0916] font-mono text-sm text-[#9d8fd8]">
      booting brain… losing train of thought… found it
    </div>
  ),
});

export function ThreeAmApp() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0916]">
      <Scene />
    </div>
  );
}
```

- [ ] **Step 3: Create the route**

Create `src/app/3am/page.tsx`:

```tsx
import type { Metadata } from "next";
import { ThreeAmApp } from "@/threeam/ThreeAmApp";

export const metadata: Metadata = {
  title: "3am — Rohan Yadav",
  description: "it's 3am inside Rohan's head. mind the mess.",
};

export default function ThreeAmPage() {
  return <ThreeAmApp />;
}
```

- [ ] **Step 4: Verify in the browser**

```bash
pnpm dev
```

(run in background; wait for "Ready"). Then:

```bash
npx -y agent-browser open "http://localhost:3000/3am" && npx -y agent-browser screenshot <scratchpad>/task6.png
```

Expected: dark page, orange cube lit by the lights. Also open `http://localhost:3000/` and confirm the normal portfolio still renders unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/app/3am src/threeam/ThreeAmApp.tsx src/threeam/scene/Scene.tsx
git commit -m "feat(3am): /3am route with lazy-loaded r3f canvas"
```

---

### Task 7: Gray-box house geometry

**Files:**
- Create: `src/threeam/scene/House.tsx`
- Modify: `src/threeam/scene/Scene.tsx` (replace placeholder cube with `<House />`)

**Interfaces:**
- Consumes: `HOUSE`, `Area`, `Rect` from `layout.ts`; `useThreeAm` (renders the *current* area only).
- Produces: `<House />` — floor, perimeter walls, interior walls, room-tint patches, portal markers, all derived from layout data (no hardcoded geometry positions).

- [ ] **Step 1: Write the House component**

Create `src/threeam/scene/House.tsx`:

```tsx
"use client";

import { useThreeAm } from "@/threeam/state/store";
import { HOUSE } from "@/threeam/world/layout";
import type { Rect } from "@/threeam/world/layout";

const WALL_H = 2.5;
const ROOM_TINTS: Record<string, string> = {
  bedroom: "#4a3f70",
  workspace: "#3f4a70",
  music: "#5a3f70",
  rooftop: "#2e3a55",
};

/** A box extruded up from a floor-plan rect. */
function WallBox({ rect, color = "#6b5f8f" }: { rect: Rect; color?: string }) {
  return (
    <mesh
      position={[rect.x + rect.w / 2, WALL_H / 2, rect.z + rect.d / 2]}
    >
      <boxGeometry args={[rect.w, WALL_H, rect.d]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export function House() {
  const area = useThreeAm((s) => s.area);
  const a = HOUSE.areas[area];
  const b = a.bounds;
  const T = 0.2; // perimeter wall thickness (drawn just outside bounds)

  const perimeter: Rect[] = [
    { x: b.x - T, z: b.z - T, w: b.w + 2 * T, d: T }, // north
    { x: b.x - T, z: b.z + b.d, w: b.w + 2 * T, d: T }, // south
    { x: b.x - T, z: b.z, w: T, d: b.d }, // west
    { x: b.x + b.w, z: b.z, w: T, d: b.d }, // east
  ];

  return (
    <group>
      {/* floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[b.x + b.w / 2, 0, b.z + b.d / 2]}
      >
        <planeGeometry args={[b.w, b.d]} />
        <meshStandardMaterial color="#3f3560" />
      </mesh>

      {/* room tint patches: visually confirms room detection boundaries */}
      {a.rooms.map((r) => (
        <mesh
          key={r.id}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[r.rect.x + r.rect.w / 2, 0.01, r.rect.z + r.rect.d / 2]}
        >
          <planeGeometry args={[r.rect.w - 0.4, r.rect.d - 0.4]} />
          <meshStandardMaterial color={ROOM_TINTS[r.id]} />
        </mesh>
      ))}

      {perimeter.map((rect, i) => (
        <WallBox key={`p${i}`} rect={rect} />
      ))}
      {a.walls.map((rect, i) => (
        <WallBox key={`w${i}`} rect={rect} color="#7d6fa8" />
      ))}

      {/* portal markers */}
      {HOUSE.portals
        .filter((p) => p.area === area)
        .map((p) => (
          <mesh
            key={p.id}
            position={[
              p.trigger.x + p.trigger.w / 2,
              0.05,
              p.trigger.z + p.trigger.d / 2,
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[p.trigger.w, p.trigger.d]} />
            <meshStandardMaterial
              color="#7cffb2"
              emissive="#7cffb2"
              emissiveIntensity={0.8}
            />
          </mesh>
        ))}
    </group>
  );
}
```

- [ ] **Step 2: Mount it in the scene**

In `src/threeam/scene/Scene.tsx`: add `import { House } from "./House";`, replace the placeholder `<mesh>…</mesh>` cube with `<House />`.

- [ ] **Step 3: Verify in the browser**

Reload `http://localhost:3000/3am`, screenshot as in Task 6.
Expected: three tinted floor sections separated by walls with doorway gaps, glowing green ladder pad near the workspace back wall. No console errors (`npx -y agent-browser errors`).

- [ ] **Step 4: Commit**

```bash
git add src/threeam/scene/House.tsx src/threeam/scene/Scene.tsx
git commit -m "feat(3am): gray-box house geometry rendered from layout data"
```

---

### Task 8: Keyboard input + walkable player

**Files:**
- Create: `src/threeam/input/useKeyboard.ts`
- Create: `src/threeam/scene/Player.tsx`
- Modify: `src/threeam/scene/Scene.tsx` (add `<Player />`)

**Interfaces:**
- Consumes: `resolveMovement`, `roomAt`, `portalAt`, `HOUSE`, `playerPosition`, `useThreeAm`.
- Produces:
  - `useKeyboard(): { getMove(): { x: number; z: number }; consumeInteract(): boolean }` — normalized WASD/arrow vector; `consumeInteract` is edge-triggered for the E key (used in Task 10).
  - `<Player />` — moves `playerPosition` each frame with collision, renders a capsule-ish placeholder at it, pushes `room`/`activePortal` changes into the store.

- [ ] **Step 1: Write the input hook**

Create `src/threeam/input/useKeyboard.ts`:

```tsx
"use client";

import { useEffect, useRef } from "react";

const KEY_TO_AXIS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function useKeyboard() {
  const pressed = useRef(new Set<string>());
  const interactQueued = useRef(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code in KEY_TO_AXIS) {
        pressed.current.add(e.code);
        e.preventDefault();
      }
      if (e.code === "KeyE" && !e.repeat) interactQueued.current = true;
    };
    const up = (e: KeyboardEvent) => pressed.current.delete(e.code);
    const blur = () => pressed.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return {
    /** Normalized move vector from currently held keys. */
    getMove() {
      let x = 0;
      let z = 0;
      for (const code of pressed.current) {
        const axis = KEY_TO_AXIS[code];
        if (axis) {
          x += axis[0];
          z += axis[1];
        }
      }
      const len = Math.hypot(x, z);
      return len > 0 ? { x: x / len, z: z / len } : { x: 0, z: 0 };
    },
    /** True once per E press. */
    consumeInteract() {
      const q = interactQueued.current;
      interactQueued.current = false;
      return q;
    },
  };
}
```

- [ ] **Step 2: Write the Player**

Create `src/threeam/scene/Player.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { useKeyboard } from "@/threeam/input/useKeyboard";
import { HOUSE } from "@/threeam/world/layout";
import { resolveMovement } from "@/threeam/world/collision";
import { roomAt, portalAt } from "@/threeam/world/detect";
import { playerPosition } from "@/threeam/world/runtime";
import { useThreeAm } from "@/threeam/state/store";

const SPEED = 3.5; // m/s

export function Player() {
  const meshRef = useRef<Mesh>(null);
  const keyboard = useKeyboard();

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05); // clamp tab-switch spikes
    const s = useThreeAm.getState();
    const area = HOUSE.areas[s.area];

    const move = keyboard.getMove();
    if (move.x !== 0 || move.z !== 0) {
      const next = resolveMovement(area, playerPosition, {
        x: move.x * SPEED * dt,
        z: move.z * SPEED * dt,
      });
      playerPosition.x = next.x;
      playerPosition.z = next.z;
    }

    // discrete facts → store (only on change; avoids render churn)
    const room = roomAt(area, playerPosition.x, playerPosition.z);
    if (room !== s.room) s.setRoom(room);
    const portal = portalAt(
      HOUSE.portals,
      s.area,
      playerPosition.x,
      playerPosition.z
    );
    if (portal?.id !== s.activePortal?.id) s.setActivePortal(portal);

    // interact is consumed in Task 10 (travel); consume harmlessly until then
    if (keyboard.consumeInteract() && portal) {
      s.travel(portal);
    }

    if (meshRef.current) {
      meshRef.current.position.set(playerPosition.x, 0.8, playerPosition.z);
    }
  });

  return (
    <mesh ref={meshRef}>
      <capsuleGeometry args={[0.35, 0.9, 4, 12]} />
      <meshStandardMaterial color="#ffb35c" />
    </mesh>
  );
}
```

- [ ] **Step 3: Expose a dev debug handle (deterministic verification)**

In `src/threeam/scene/Player.tsx`, add to the imports `import { useEffect } from "react";` and inside the component (before `useFrame`):

```tsx
  useEffect(() => {
    // dev-only handle so browser automation can teleport & inspect state
    (window as unknown as Record<string, unknown>).__3am = {
      playerPosition,
      store: useThreeAm,
    };
  }, []);
```

- [ ] **Step 4: Mount it**

In `src/threeam/scene/Scene.tsx`: add `import { Player } from "./Player";` and `<Player />` next to `<House />`.

- [ ] **Step 5: Verify in the browser**

Reload `/3am`, then drive the player east via a dispatched key-hold (synthetic KeyboardEvents fire our window listeners) and read back the position:

```bash
npx -y agent-browser open "http://localhost:3000/3am"
npx -y agent-browser eval "window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight'})); setTimeout(()=>window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowRight'})), 1200)"
npx -y agent-browser eval "JSON.stringify(window.__3am.playerPosition)"
npx -y agent-browser screenshot <scratchpad>/task8.png
```

Expected: second eval shows `x` well past the spawn `4` (≈7–8 after ~1.2s at 3.5 m/s, stopped at the divider wall unless aligned with the doorway); screenshot shows the capsule displaced east. Also verify wall sliding: hold ArrowUp against the north wall and confirm `z` clamps near `0.55` (wall + radius) instead of escaping.

- [ ] **Step 6: Commit**

```bash
git add src/threeam/input/useKeyboard.ts src/threeam/scene/Player.tsx src/threeam/scene/Scene.tsx
git commit -m "feat(3am): keyboard-driven player with collision, room + portal tracking"
```

---

### Task 9: Follow camera

**Files:**
- Create: `src/threeam/scene/FollowCamera.tsx`
- Modify: `src/threeam/scene/Scene.tsx` (add `<FollowCamera />`)

**Interfaces:**
- Consumes: `playerPosition`, `HOUSE`, `useThreeAm`.
- Produces: `<FollowCamera />` — lerps the default camera toward an offset above/behind the player, clamped so it never frames outside the area bounds.

- [ ] **Step 1: Write the camera rig**

Create `src/threeam/scene/FollowCamera.tsx`:

```tsx
"use client";

import { useFrame } from "@react-three/fiber";
import { playerPosition } from "@/threeam/world/runtime";
import { useThreeAm } from "@/threeam/state/store";
import { HOUSE } from "@/threeam/world/layout";

const OFFSET = { x: 0, y: 8.5, z: 8 };
const LERP = 4; // 1/s — higher is snappier

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export function FollowCamera() {
  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const b = HOUSE.areas[useThreeAm.getState().area].bounds;

    // keep the framed point inside the area so edges don't show void
    const tx = clamp(playerPosition.x, b.x + 3, b.x + b.w - 3);
    const tz = clamp(playerPosition.z, b.z + 1, b.z + b.d - 1);

    const t = 1 - Math.exp(-LERP * dt); // framerate-independent lerp
    camera.position.x += (tx + OFFSET.x - camera.position.x) * t;
    camera.position.y += (OFFSET.y - camera.position.y) * t;
    camera.position.z += (tz + OFFSET.z - camera.position.z) * t;
    camera.lookAt(tx, 0.8, tz);
  });
  return null;
}
```

- [ ] **Step 2: Mount it**

In `src/threeam/scene/Scene.tsx`: add `import { FollowCamera } from "./FollowCamera";` and `<FollowCamera />` inside the Canvas.

- [ ] **Step 3: Verify in the browser**

Reload `/3am`, hold ArrowRight ~3s, screenshot.
Expected: camera glides after the player smoothly (no snapping); at the far east wall the camera stops early instead of showing void beyond the house.

- [ ] **Step 4: Commit**

```bash
git add src/threeam/scene/FollowCamera.tsx src/threeam/scene/Scene.tsx
git commit -m "feat(3am): smoothed follow camera clamped to area bounds"
```

---

### Task 10: Ladder travel (ground ⇄ rooftop)

The `travel` wiring already exists (store Task 5, E-key consumption Task 8). This task verifies it end-to-end and makes area switches visually legible.

**Files:**
- Modify: `src/threeam/scene/House.tsx` (rooftop gets a distinct look: no north-wall occlusion problem, sky-dark floor)

**Interfaces:**
- Consumes: everything prior.
- Produces: confirmed area travel; rooftop area visually distinct (tint `#2e3a55` already in ROOM_TINTS).

- [ ] **Step 1: Verify travel end-to-end in the browser**

Reload `/3am`, teleport onto the ladder pad via the debug handle (Task 8), then press E through a real dispatched key event:

```bash
npx -y agent-browser open "http://localhost:3000/3am"
npx -y agent-browser eval "window.__3am.playerPosition.x = 15.2; window.__3am.playerPosition.z = 0.7"
npx -y agent-browser eval "window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}))"
npx -y agent-browser eval "window.__3am.store.getState().area"
npx -y agent-browser screenshot <scratchpad>/task10-roof.png
npx -y agent-browser eval "window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}))"
npx -y agent-browser eval "window.__3am.store.getState().area"
npx -y agent-browser screenshot <scratchpad>/task10-ground.png
```

Expected: first area eval prints `roof` and the screenshot shows the rooftop (single blue-tinted area, its own ladder pad, player at 12,2); second prints `ground` with the player back at 14,2. Then repeat once *without* teleporting — actually walking to the pad with held arrows — to confirm the trigger is reachable on foot and the HUD prompt appears (visual check).

- [ ] **Step 2: Fix anything the walkthrough surfaced**

If the player spawns inside a wall after travel, or the pad is unreachable, adjust `toPosition`/`trigger` in `src/threeam/world/layout.ts` — then re-run `pnpm test` (layout tests must still pass) and repeat Step 1.

- [ ] **Step 3: Commit**

```bash
git add -A src/threeam
git commit -m "feat(3am): verified ladder travel ground<->roof"
```

---

### Task 11: HUD (room label, portal prompt, exit, hints)

**Files:**
- Create: `src/threeam/hud/Hud.tsx`
- Modify: `src/threeam/ThreeAmApp.tsx` (render `<Hud />` over the scene)

**Interfaces:**
- Consumes: `useThreeAm` (`room`, `activePortal`).
- Produces: `<Hud />` — DOM overlay; the only UI chrome in the gray-box.

- [ ] **Step 1: Write the HUD**

Create `src/threeam/hud/Hud.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useThreeAm } from "@/threeam/state/store";

const ROOM_LABELS: Record<string, string> = {
  bedroom: "the bedroom",
  workspace: "the workspace",
  music: "the music nook",
  rooftop: "the rooftop",
};

export function Hud() {
  const room = useThreeAm((s) => s.room);
  const portal = useThreeAm((s) => s.activePortal);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 font-mono text-sm">
      {room && (
        <div className="absolute left-5 top-4 rounded bg-black/50 px-3 py-1.5 text-[#cfc6ee]">
          {ROOM_LABELS[room]}
        </div>
      )}

      <Link
        href="/"
        className="pointer-events-auto absolute right-5 top-4 rounded bg-black/50 px-3 py-1.5 text-[#cfc6ee] transition-colors hover:text-[#ffb35c]"
      >
        ← back to normal
      </Link>

      {portal && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded bg-black/60 px-4 py-2 text-[#7cffb2]">
          [E] {portal.label}
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-[#7d729e]">
        WASD / arrows to walk · E to interact
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount it over the scene**

In `src/threeam/ThreeAmApp.tsx`: add `import { Hud } from "./hud/Hud";` and render `<Hud />` as a sibling after `<Scene />` inside the wrapper div.

- [ ] **Step 3: Verify in the browser**

Reload `/3am`.
Expected: "the bedroom" label top-left at spawn; label changes to "the workspace" after walking through the doorway; "[E] climb the ladder" appears only on the pad; "← back to normal" navigates to `/`.

- [ ] **Step 4: Commit**

```bash
git add src/threeam/hud/Hud.tsx src/threeam/ThreeAmApp.tsx
git commit -m "feat(3am): HUD with room label, portal prompt, exit link"
```

---

### Task 12: Entry link on the normal site

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: an "it's 3am in here →" link on `/` routing to `/3am`. (The CRT-glitch cinematic replaces this plain link in Plan 6.)

- [ ] **Step 1: Add the link**

In `src/components/layout/Sidebar.tsx`, add `import Link from "next/link";` at the top, and insert directly after the résumé `<a>…</a>` block (before `<Nav />`):

```tsx
        <Link
          href="/3am"
          className="group/brain inline-flex w-fit items-center gap-2 text-sm text-highlight transition-colors duration-200 hover:text-accent"
        >
          it&apos;s 3am in here
          <span
            aria-hidden
            className="transition-transform duration-200 group-hover/brain:translate-x-1"
          >
            →
          </span>
        </Link>
```

- [ ] **Step 2: Verify in the browser**

Open `http://localhost:3000/`.
Expected: link renders under the résumé link, hover slides the arrow, click lands on `/3am`. Layout of the sidebar otherwise unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: 3am entry link in sidebar"
```

---

### Task 13: HD-2D post-processing first pass

**Files:**
- Create: `src/threeam/scene/Effects.tsx`
- Modify: `src/threeam/scene/Scene.tsx` (add `<Effects />`)

**Interfaces:**
- Consumes: `@react-three/postprocessing` (installed in Task 1).
- Produces: `<Effects />` — pixelation + bloom + vignette tuned mild; the knob values later plans re-tune per room.

- [ ] **Step 1: Write the effects stack**

Create `src/threeam/scene/Effects.tsx`:

```tsx
"use client";

import {
  Bloom,
  EffectComposer,
  Pixelation,
  Vignette,
} from "@react-three/postprocessing";

/** Soft HD-2D look: mild pixel grid, glow on emissives, framed edges. */
export function Effects() {
  return (
    <EffectComposer>
      <Pixelation granularity={3.5} />
      <Bloom intensity={0.5} luminanceThreshold={0.6} mipmapBlur />
      <Vignette eskil={false} offset={0.15} darkness={0.75} />
    </EffectComposer>
  );
}
```

- [ ] **Step 2: Mount it**

In `src/threeam/scene/Scene.tsx`: add `import { Effects } from "./Effects";` and `<Effects />` as the last child inside the Canvas.

- [ ] **Step 3: Verify look + performance in the browser**

Reload `/3am`, walk around, screenshot.
Expected: subtle pixel grid over the render, ladder pad blooms green, edges vignetted. Check smoothness: in the browser console via
`npx -y agent-browser eval "let f=0,s=performance.now();requestAnimationFrame(function c(){f++;performance.now()-s<1000?requestAnimationFrame(c):console.log('fps',f)})"` then `npx -y agent-browser logs`.
Expected: ~60fps (>50 acceptable for gray-box). If below, raise `granularity` to 4–5 and re-check.

- [ ] **Step 4: Commit**

```bash
git add src/threeam/scene/Effects.tsx src/threeam/scene/Scene.tsx
git commit -m "feat(3am): pixelation+bloom+vignette post-processing first pass"
```

---

### Task 14: Verification sweep

**Files:** none new.

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: all tests pass (layout, collision, detect, store, smoke).

- [ ] **Step 2: Types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: zero errors. Fix anything surfaced, re-run.

- [ ] **Step 3: Production build (proves `/` stays lean)**

Run: `pnpm build`
Expected: build succeeds; in the route summary, `/`'s first-load JS is unchanged from before this plan (compare against `git stash`-free baseline knowledge: `/` must not list the three.js chunk; `/3am` will).

- [ ] **Step 4: Manual walkthrough checklist (dev server + browser)**

- [ ] Load `/` → portfolio unchanged, "it's 3am in here →" present.
- [ ] Click it → loading line → gray-box house.
- [ ] Walk bedroom → workspace → music nook; room label updates at each doorway; walls block; doorways pass.
- [ ] Ladder pad → prompt → E → rooftop; E again → back down.
- [ ] Camera follows smoothly, never shows void past the house edges.
- [ ] "← back to normal" returns to `/`.
- [ ] No console errors (`npx -y agent-browser errors`).

- [ ] **Step 5: Commit any fixes and close out**

```bash
git add -A && git commit -m "chore(3am): gray-box milestone verification fixes"
```

Then report the milestone to Rohan with screenshots — the gray-box is the checkpoint where the *feel* (movement speed, camera distance, room scale) gets his sign-off before Plan 2 (art pipeline + music nook) is written.
