# House Layout v2 — from Rohan's excalidraw (2026-07-18)

Source: `~/Downloads/poortfolio-layout.excalidraw` (parsed from element JSON; px→m scale
derived from bedroom = 278×252px ≡ 8×6m → ~34.7px/m x, ~42px/m z. Sketch proportions are
approximate; exact rects get locked per-plan with Rohan.)

## Ground floor (front row, south = camera side)

| Room | Sketch pos | Size (approx) | Notes |
|---|---|---|---|
| bedroom | west | 8×6 | window on WEST exterior wall (middle); door to common area (middle of shared wall, swing drawn into bedroom) |
| common area | middle | 8×6 | replaces the current "workspace" room slot x 8–16; contains the STAIRS (NE corner, against north wall, beside music-nook wall) going UP; basement access near the stairs (arrow "basement" — the museum's secret entrance, i.e. the rug/trapdoor concept); door south-ish to music nook wall (y lower-middle), door NORTH to workstation |
| music nook | east | 8×6 | LOCKED room, unchanged: turntable against north wall, sofa south; NEW: window on SOUTH wall behind sofa (spec §6 day-mode window — sketch confirms placement) |

## Ground floor (back row, north)

| Room | Pos | Size | Notes |
|---|---|---|---|
| workstation | directly north of common area | 8×6 | DESK against its north wall (center-west); EVA shrine SW corner (near door wall); reached via door from common area (door at x ~2.4–4.3 of the shared wall, west-of-center). Camera: own area (dollhouse can't see behind the front row) — door = portal, camera reframes, like ground↔roof today. |

## Entrance

- **genkan**: shallow strip (~1.9m deep) attached to the SOUTH of the common area, full room
  width. Entry flow: street (Plan 7) → front door (faces camera) → genkan (shoe rack, step-up,
  doormat, umbrella stand, entry lamp) → common area. Replaces the earlier west-annex proposal
  — sketch supersedes it.

## Roof

- **terrace**: ~8×6 area (same slot as today's roof).
- **stair room**: small enclosed stairhead (~3.6×1.5) in the terrace's NE corner where the
  stairs arrive, with a door (swing drawn) out to the terrace. Replaces today's open stair
  arrival.

## Basement (new floor, below ground)

- **museum with secret entrance** (west, ~8.5×5): the Museum of Scope Hell. Secret entrance =
  from the common area near the stairs (rug/trapdoor per the easter-egg registry).
- **gaming den room** (east, ~7.6×5): couch + HUGE monitor/TV, arcade cabinet, beanbag,
  pool table, mini fridge w/ drink cans (proposed), lava lamp (proposed), console shelf w/
  controller rack + headset stand (proposed), and the FIGURINE + game-CD WALL SHELF —
  pressing specific CDs in ORDER opens the shelf as a secret door to the museum (Rohan,
  2026-07-18). Hint concept (proposed): the arcade cabinet's high-score initials spell the
  CD order. Optional toy: clickable pool balls scatter + re-rack.
- Flow: stairs continue DOWN from the common area → den (open access); museum is ONLY
  reachable through the den's CD-shelf secret door. (Supersedes the earlier rug/trapdoor
  museum entrance concept.) Camera: den + museum each own areas; shelf-door = gated portal
  (zustand flag set by the CD sequence).
- Shelf interaction (Rohan-confirmed 2026-07-18): REUSES the station-focus system — [E] at
  the shelf → camera glides close (station camera pose) → CDs are clickable meshes.
  Feel spec: correct press = CD nudges in + soft click + faint glow, stays pressed;
  wrong press = all pop out + small shelf shake (sequence resets); full combo = camera
  auto-returns to follow view, low rumble, shelf swings open w/ dust + museum light
  spilling from the doorway. ESC bails out of focus anytime (presses persist? no —
  reset on exit keeps it clean).

## Structural implications for the codebase

1. Areas grow from {ground, roof} to {ground-front, workstation, roof(terrace), stair-room?,
   basement-museum, basement-den, genkan?}. Small rooms (genkan, stair room) may share an area
   with their parent if the camera can frame both; back/underground rooms MUST be own areas.
2. The current workspace room (x 8–16) becomes the COMMON AREA. Its current contents need a
   migration decision (see open questions) — battlestation/desk/chair/EVA at minimum move to
   the new workstation room.
3. Doors replace open doorway gaps for: bedroom↔common, common↔workstation, common↔music,
   stair room↔terrace. (Current divider gaps are open arches; sketch draws real doors with
   swings — decide door vs arch per pair with Rohan.)
4. layout.ts needs the new rooms/areas/portals; all collider invariant tests extend.

## Open questions (Rohan)

1. Migration split: what moves to the workstation room vs stays in the common area?
   (Sketch places desk + EVA in workstation. Unplaced: corkboard, polaroids, neon "shipped",
   coffee corner, bookshelf, floating katana shelf. Plausible: stations/corkboard/polaroids
   follow the desk [it IS the work content]; coffee + bookshelf + katana stay common.)
2. Gaming den contents + whether it's part of the museum secret or reached openly.
3. Real doors (animated? just openings with frames?) vs current open arches.
