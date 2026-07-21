"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { usePixelTexture } from "../usePixelTexture";
import { Cat } from "./Cat";

const WALL_H = 2.8; // must match House.tsx
export const BEDROOM = { x: 0, z: 0, w: 8, d: 6 };

/* ── furniture colliders (Task 3, layout.ts `// bedroom` section, verbatim)
   — every mesh in the furniture section below derives its position from
   these rect constants; the plan mandates no re-hardcoding a collider's
   numbers into a mesh position. ── */
// SUPER-KING pass: bed enlarged again (w 2.0→2.2, d 2.25→2.5), still
// centered on the north wall (x 2.9-5.1, room-x-center 4.0 — unchanged).
// The dragonslayer lean-zone rect is GONE — the sword is parked for the
// future gaming den (owner's call, 2026-07-19); behelit trigger + sword
// relocation land with the eclipse/den plans. The manga dresser is still
// REMOVED FOR NOW (P4 recenter, unrelated to this pass) — its old rect (x
// 2.8-4.4) overlapped the centered bed's x-span; it returns in a later
// step.
const BED_RECT = { x: 2.9, z: 0.33, w: 2.2, d: 2.5 };
const PLANT_RECT = { x: 0.45, z: 5.1, w: 0.4, d: 0.4 };
// window table + west window — REMOVED (P4 engawa wave, owner's final
// design sketch): the whole west-wall night-window unit (frame, glass,
// moon, stars, curtain, rod), the faux moon floor patch, and the window
// table are superseded by a walkable ground-level engawa (glass sliding
// door). See the ── engawa ── section below for what replaces them, and
// layout.ts's ENGAWA_* rects for the collision side.
// sconce X — the dragonslayer lean-zone rect that used to anchor the sconce
// is gone (sword parked for the den); the sconce now hangs centered above
// the bed's headboard, so it derives from BED_RECT's own centerline instead
// (never hand-guessed, same rule as every other mesh in this section).
const SCONCE_X = BED_RECT.x + BED_RECT.w / 2; // 4.0

// ── FURNISHING WAVE (owner's final bedroom design sketch, 2026-07-19) ──
// the single nightstand ({6.45,0.95,0.55,0.5}) is REMOVED and replaced by a
// flanking twin pair (see layout.ts's `// bedroom` section, verbatim source
// of truth); eight more pieces land in this pass (sofa, sunset-lamp stool,
// cat bed, bed-front bench, clothes hanger, perfume stand, second plant,
// plus the poster wall + mirror which have no colliders). Every rect below
// is copied verbatim from layout.ts — p4-furnish-report.md has the full
// pairwise-clearance arithmetic (checked programmatically, zero overlaps).
const NIGHTSTAND_W_RECT = { x: 2.25, z: 0.4, w: 0.55, d: 0.5 };
const NIGHTSTAND_E_RECT = { x: 5.25, z: 0.4, w: 0.55, d: 0.5 };
const SOFA_RECT = { x: 0.6, z: 0.4, w: 0.95, d: 0.95 };
const STOOL_RECT = { x: 5.85, z: 0.42, w: 0.4, d: 0.4 };
const CATBED_RECT = { x: 7.05, z: 0.45, w: 0.55, d: 0.55 };
const BENCH_RECT = { x: 3.5, z: 2.95, w: 1.2, d: 0.4 };
const HANGER_RECT = { x: 3.3, z: 5.35, w: 2.2, d: 0.5 };
// shoe storage cubby — NEW (wardrobe corner upgrade, 2026-07-19), collider
// verbatim from layout.ts. Sits east of the rack (see layout.ts's comment
// for the 12cm/13cm TDD'd clearances to the rack and the perfume stand).
const SHOE_RECT = { x: 5.62, z: 5.35, w: 0.8, d: 0.45 };
const PERFUME_RECT = { x: 6.55, z: 5.3, w: 1.0, d: 0.5 };
const PLANT2_RECT = { x: 0.95, z: 5.15, w: 0.35, d: 0.35 };

const NIGHTSTAND_W_CENTER = {
  x: NIGHTSTAND_W_RECT.x + NIGHTSTAND_W_RECT.w / 2,
  z: NIGHTSTAND_W_RECT.z + NIGHTSTAND_W_RECT.d / 2,
};
const NIGHTSTAND_E_CENTER = {
  x: NIGHTSTAND_E_RECT.x + NIGHTSTAND_E_RECT.w / 2,
  z: NIGHTSTAND_E_RECT.z + NIGHTSTAND_E_RECT.d / 2,
};
const SOFA_CENTER = { x: SOFA_RECT.x + SOFA_RECT.w / 2, z: SOFA_RECT.z + SOFA_RECT.d / 2 };
const STOOL_CENTER = { x: STOOL_RECT.x + STOOL_RECT.w / 2, z: STOOL_RECT.z + STOOL_RECT.d / 2 };
const CATBED_CENTER = { x: CATBED_RECT.x + CATBED_RECT.w / 2, z: CATBED_RECT.z + CATBED_RECT.d / 2 };
const BENCH_CENTER = { x: BENCH_RECT.x + BENCH_RECT.w / 2, z: BENCH_RECT.z + BENCH_RECT.d / 2 };
const HANGER_CENTER = { x: HANGER_RECT.x + HANGER_RECT.w / 2, z: HANGER_RECT.z + HANGER_RECT.d / 2 };
const SHOE_CENTER = { x: SHOE_RECT.x + SHOE_RECT.w / 2, z: SHOE_RECT.z + SHOE_RECT.d / 2 };
// shoe cubby — low 2-shelf open unit (floor board + one mid shelf, open
// front/top), wardrobe corner upgrade. Every span below derives from
// SHOE_RECT (never hand-guessed).
const SHOE_H = 0.46; // overall cubby height (low — reads as a shoe bench, not a wardrobe)
const SHOE_MID_Y = 0.22; // mid-shelf height, splitting the cubby into 2 open tiers
const SHOE_PANEL_T = 0.03; // side/back panel + shelf-board thickness
// A-FRAME RACK REDO (owner reference photo, 2026-07-19) — every span below
// derives from HANGER_RECT (never hand-guessed), see p4-furnish-report.md
// "A-frame rack redo" for the full arithmetic.
const HANGER_RAIL_Y = 1.7; // top rail height, per the reference photo
const HANGER_LEG_D = HANGER_RECT.d / 2 - 0.03; // 0.22 — each leg's floor-contact z-offset (half-depth minus a small margin so the splayed feet stay inside the collider)
const HANGER_SIDE_X = HANGER_RECT.w / 2 - 0.12; // 0.98 — each A-frame's x-position (peak + legs), inset from the half-width so the rail's finial nubs (below) still land inside the rect
const HANGER_LEG_ANGLE = Math.atan2(HANGER_LEG_D, HANGER_RAIL_Y); // lean off vertical, derived from the floor splay vs rail height — not a chosen angle
const HANGER_LEG_LEN = Math.hypot(HANGER_RAIL_Y, HANGER_LEG_D); // leg length, floor contact to rail peak
const HANGER_SHELF_Y = 0.25; // shelf height, per the reference photo
// the legs converge linearly from HANGER_LEG_D (floor) to 0 (rail peak) as y
// rises — this is the leg's own z-offset at shelf height, so the shelf reads
// as resting snugly between them rather than floating at an arbitrary depth.
const HANGER_SHELF_LEG_Z = HANGER_LEG_D * (1 - HANGER_SHELF_Y / HANGER_RAIL_Y);
const HANGER_SHELF_W = HANGER_SIDE_X * 2 - 0.06; // nearly spans the two frames
const HANGER_SHELF_D = HANGER_SHELF_LEG_Z * 2 - 0.02;
const PERFUME_CENTER = { x: PERFUME_RECT.x + PERFUME_RECT.w / 2, z: PERFUME_RECT.z + PERFUME_RECT.d / 2 };
const PLANT2_CENTER = { x: PLANT2_RECT.x + PLANT2_RECT.w / 2, z: PLANT2_RECT.z + PLANT2_RECT.d / 2 };

const PLANT_CENTER = { x: PLANT_RECT.x + PLANT_RECT.w / 2, z: PLANT_RECT.z + PLANT_RECT.d / 2 };

// bed — real Sketchfab GLB (see BedModel's attribution comment below for
// the full derivation) replaces the hand-built frame/headboard/mattress/
// pillows/duvet. BED_MODEL_SCALE/POS/ROTATION_Y and the lamp's local
// nesting position are all derived there from the mesh's own vertex
// cloud — nothing here is hand-guessed.
// SUPER-KING pass: rotation.y stays 0 (unchanged — the bed still faces
// headboard-north, only BED_RECT's size changed, not its orientation).
// Scale is re-derived below because the rect's length axis (d, the
// local-Z/head→foot fit target) grew from 2.25 to 2.5.
const BED_MODEL_ROTATION_Y = 0;
// BED_MODEL_SCALE re-fits the bed body's own length (local Z range, the
// same 538.23 scene units every prior pass measured — intrinsic to the
// GLB, unaffected by any rect change) to the new BED_RECT.d minus the same
// 4cm margin: (2.5 - 0.04) / 538.23 = 2.46 / 538.23 = 0.0045705368
// (ratio to the P4-recenter scale: ×1.1131221719, = 2.46/2.21 exactly,
// since both scales share the same /538.23 denominator). At that scale the
// bed-only WIDTH (local X range, 457.230 units, intrinsic to the GLB,
// unaffected by rect/scale edits) comes out to 2.0898m — BED_RECT.w is now
// 2.2m, so the bed body sits 5.51cm INSIDE the collider on each side
// (comfortably contained, same ±4cm-class tolerance as every prior pass).
const BED_MODEL_SCALE = 0.00457053675937796109469929212418;
// headboard face lands BED_RECT.z + 2cm (clearance off the wall plane,
// same convention as every other wall-adjacent piece in this room); bed
// (excluding the model's own lamp/table cluster, itself already cut from
// the GLB — see BedModel's comment) is centered on the collider's x-span.
// Re-derived (not re-probed) algebraically, reusing the same back-derived
// Zmin/Xc facts every prior pass has (Zmin = -295.569372 units, local
// head→foot axis; Xc = 39.629765 units, local width-axis centroid — both
// intrinsic to the GLB, so they carry over unchanged across a scale/rect
// edit): with the new scale s = BED_MODEL_SCALE,
//   Tz = (BED_RECT.z + 0.02) - s * Zmin = 0.35 - s*(-295.569372) = 1.700911
//   Tx = (BED_RECT.x + BED_RECT.w/2) - s * Xc = 4.0 - s*39.629765 = 3.818871
// See the p4-superking report for the full arithmetic table, including the
// sanity check that reapplying this same formula with the OLD scale/rect
// reproduces the OLD published BED_MODEL_POS to 4 decimal places.
const BED_MODEL_POS: [number, number, number] = [3.81887070230198985563792430745, 0, 1.70091067967225907140070230198];
// BED_LAMP_LOCAL_POS / the nested hero pointLight are GONE (lamp-cut pass):
// the lamp/table cluster that this offset pointed into no longer exists in
// the GLB (triangle-level cut, see BedModel's comment below), so an
// unparented light there would violate the no-invisible-lights rule. The
// wall sconce (below, relocated over the headboard in the SUPER-KING pass)
// is now the room's only warm light on this wall — bumped one step to
// compensate (see its own comment).

// cat (Task 9, re-seated P4, re-seated again for the P4 recenter, the
// SUPER-KING pass, and now the FURNISHING WAVE) — STALE ABOVE: every prior
// derivation (foot-corner vertex cluster, Tz/Zmin/Xc arithmetic) described
// curling on the GLB bed's own top surface. The owner's ask this wave is
// "move the cat to her cat bed" (CATBED_RECT, NE corner) — she no longer
// sits on the bed at all, so none of that GLB-surface math applies anymore
// (kept above only as history for the bed's own foot-surface height, which
// other future props could still want). The new perch is this file's own
// constructed geometry (CATBED_PAD_H below), not a probed mesh, so the
// derivation is direct: CAT_Y is exactly the inner pad's top surface
// (CATBED_PAD_H, world y since the pad sits on the floor at y=0), and
// CAT_X/CAT_Z sit at the pad's center (CATBED_CENTER) — a round bed has no
// "foot corner" to inset from, so the cat curls dead-center on the pad
// (rotationY left at the component's own default, same curl look as
// before).
const CAT_X = CATBED_CENTER.x;
const CAT_Z = CATBED_CENTER.z;

// nightstands — cabinet pair (FURNISHING WAVE replaced the single east-side
// nightstand with a flanking twin; both share the exact same body/top/
// drawer construction and each gets its own small lamp on top — see the
// twin-nightstand JSX below). Heights still stack off the shared top
// surface constant (NS_TOP_Y), never a hand-guessed y.
const NS_BODY_H = 0.46;
const NS_TOP_T = 0.03;
const NS_TOP_Y = NS_BODY_H + NS_TOP_T; // top surface, world y = 0.49

// cat bed (FURNISHING WAVE) — round pet bed: a torus cushion ring (donut,
// lying flat) with a flat inner pad nested inside it. Ring tube radius sets
// the ring's own height off the floor (its bottom touches y=0, so the
// torus's local-Y center sits exactly one tube-radius up); pad height is
// independent (it's a separate flat cylinder, not derived from the ring).
// Both radii sized to fit inside CATBED_RECT's half-extent (0.275m) with
// margin: ring outer edge = CATBED_RING_R + CATBED_RING_TUBE = 0.26m < 0.275.
const CATBED_RING_R = 0.19; // torus path radius (ring's own center-line)
const CATBED_RING_TUBE = 0.07; // torus tube radius
const CATBED_PAD_R = 0.16;
const CATBED_PAD_H = 0.05; // inner pad height — this IS the cat's on-surface Y
const CAT_Y = CATBED_PAD_H;

// ── engawa (P4 engawa rework, renamed from "balcony" — this is a
// ground-level Japanese veranda overlooking the future outside area, not
// an elevated balcony). Collision lives in layout.ts (GROUND bounds now
// -2.9; the ENGAWA_* wall/rail/door-glass rects there are the verbatim
// source of truth for every number below — see that file's engawa comment
// block for the full derivation). This file renders the visuals: the
// thick west wall's two painted faces, deck floor, wooden railing,
// sliding-door frame + two glass panels, and a reserved (comment-only)
// bonsai-pedestal note.
//
// REWORK (owner feedback: prior pass read "dark, boxed, paper-thin-walled"):
//   1. door widened z 2.7-4.1 → z 2.5-4.3 (1.8m), and the fixed glass pane
//      now has a real collider (layout.ts's ENGAWA_DOOR_GLASS_RECT) — it
//      used to be walk-through despite looking solid.
//   2. the west wall rebuilt as a real WALL_T=0.2 thick wall (box
//      x -0.1..0.1, layout.ts's ENGAWA_WALL_N/S) instead of a paper-thin
//      11mm-offset plane — this file now paints BOTH faces of that box
//      (bedroom-side sage, engawa-side a darker sage/plaster tint).
//   3. the deck extended west + deeper in z for a future seating nook:
//      {x:-1.5,z:2.3,w:1.5,d:2.2} → {x:-2.7,z:2.1,w:2.7,d:2.5}.
//   4. all three rails get a real but slender wood post-and-top-rail mesh
//      (west/north ~0.9m, south deliberately low ~0.5m so the dollhouse
//      camera still sees over it) — replaces the fully-invisible rails
//      from the prior pass, without going back to the "boxed in" slabs.
//
// FULL-LENGTH PASS (this pass, owner's ask: run the engawa the FULL length
// of the bedroom's west side, not just the seating-nook stub from item 3
// above): deck z-band grows from 2.1-4.6 (2.5m stub) to 0-6 (the full west
// wall's own z-extent). West rail extends to match; the old "north"/"south"
// rails (which sat at the stub's own inner edges) become true north-end/
// south-end rails at the house's own z=0/z=6 edges — heights unchanged
// (west + north-end normal, south-end still deliberately low). The tea
// nook, railing plants, and bonsai pedestal all redistribute along the
// longer run (see their own consts below); the eave overhang extends
// automatically (it derives from DECK_RECT). See layout.ts's own
// FULL-LENGTH PASS comment for the collider-side rect arithmetic.
const ENGAWA_WALL_T_HALF = 0.1; // half the interior-divider wall thickness (layout.ts's WALL_T/2)
const ENGAWA_DOOR_Z0 = 2.5; // walk-through gap — matches layout.ts's ENGAWA_DOOR_LO exactly
const ENGAWA_DOOR_Z1 = 4.3; // matches layout.ts's ENGAWA_DOOR_HI
const ENGAWA_DOOR_ZC = (ENGAWA_DOOR_Z0 + ENGAWA_DOOR_Z1) / 2; // 3.4
const ENGAWA_DOOR_W = ENGAWA_DOOR_Z1 - ENGAWA_DOOR_Z0; // 1.8

// deck floor footprint, inside the rails — FULL-LENGTH PASS (this pass,
// owner's ask: run the engawa the FULL length of the bedroom's west side):
// grows from the seating-nook stub {x:-2.7,z:2.1,w:2.7,d:2.5} to the full
// house-west-side span {x:-2.7,z:0,w:2.7,d:6} — z0/d now match
// layout.ts's ENGAWA_DECK_Z0/Z1 (0/6) exactly, the house's own north/south
// edges (bounds already covered this, see layout.ts's bounds comment).
const DECK_RECT = { x: -2.7, z: 0, w: 2.7, d: 6 };
// railing rects — layout.ts's ENGAWA_RAIL_W/N/S are the sole source of
// truth for collision; copied verbatim here so the railing meshes below
// (RailFence) sit exactly on their colliders, same convention as every
// other collider in this file (e.g. BED_RECT/NIGHTSTAND_W_RECT).
// FULL-LENGTH PASS: west rail now spans the full z 0-6; the old "north"/
// "south" rails (which sat at the STUB deck's own inner edges, z 2.1/4.6)
// become true NORTH-END/SOUTH-END rails at the house's own z=0/z=6 edges.
const RAIL_W_RECT = { x: -2.7 - 0.06, z: 0, w: 0.06, d: 6 }; // computed x, not -2.76 literal — see layout.ts's ENGAWA_RAIL_W comment
const RAIL_N_RECT = { x: -2.7, z: 0, w: 2.7, d: 0.06 }; // true north end
const RAIL_S_RECT = { x: -2.7, z: 5.94, w: 2.7, d: 0.06 }; // true south end
const RAIL_NORMAL_H = 0.9; // west + north-end — no camera-occlusion concern
const RAIL_LOW_H = 0.5; // south-end — faces the dollhouse camera, kept low so the player reads over it

// sliding-door frame — dark wood, +x outward stack off the wall's
// bedroom-side face (now x = R.x + ENGAWA_WALL_T_HALF, not the old
// x = R.x + 0.011 thin-plane convention), same layering idiom as the old
// window used: wall → frame → glass, each ≥6mm clear of the previous.
const DOOR_FRAME_DEPTH = 0.05;
const DOOR_FRAME_NEAR_X = ENGAWA_WALL_T_HALF + 0.02; // 9mm off the wall's bedroom face
const DOOR_FRAME_CX = DOOR_FRAME_NEAR_X + DOOR_FRAME_DEPTH / 2;
const DOOR_FRAME_FAR_X = DOOR_FRAME_NEAR_X + DOOR_FRAME_DEPTH;
const DOOR_JAMB_T = 0.08; // jamb thickness along z
const DOOR_PANEL_Y0 = 0.04; // panel bottom, just clear of the floor
const DOOR_PANEL_Y1 = 2.4; // panel top — a header band fills the rest up to WALL_H
const DOOR_PANEL_H = DOOR_PANEL_Y1 - DOOR_PANEL_Y0;
const DOOR_PANEL_W = ENGAWA_DOOR_W / 2; // 0.9 — each panel covers half the (now-wider) opening

// glass panels — TWO, same width, stacked over the SAME z-band (the fixed
// pane's: z 2.5-3.4, matching layout.ts's ENGAWA_DOOR_GLASS_RECT exactly),
// reading as "one panel slid open in front of the other," leaving z
// 3.4-4.3 (0.9m) clear as the walk gap. Static this wave (an actual slide
// animation is a future nicety — see the JSX below). Fixed pane sits 10mm
// off the frame's far face (same offset the old window used for its
// glass); the open pane is slid 3cm further outward — comfortably past
// the ≥6mm-offset rule.
const DOOR_GLASS_FIXED_X = DOOR_FRAME_FAR_X + 0.01;
const DOOR_GLASS_OPEN_X = DOOR_GLASS_FIXED_X + 0.03; // slid 3cm outward

// ── DRESSING WAVE (P4 engawa dressing, this pass — owner's ask: the deck
// read "structurally sound but still pitch black and empty" after the P4
// engawa rework above; light it, give it life). Five pieces, none of them
// touch the structural rects above (wall/door/deck/rail all stay exactly
// as the rework left them):
//   1. eave overhang — a wooden beam/roofline off the wall's engawa face,
//      reads "covered veranda."
//   2. paper lantern(s) — hangs from the eave near the door, warm pointLight
//      NESTED inside it (this room's only new light source this pass; the
//      scene's 2-shadow-caster budget, both in MusicNook, is untouched —
//      no castShadow here). FULL-LENGTH PASS adds a SECOND lantern toward
//      the deck's new far south end (same nested-light treatment, still no
//      castShadow) so the much-longer deck doesn't go dark out there.
//   3. folding chair + glass tea table — originally the stub deck's north
//      half (z 2.1-3.4, clear of the walk gap); FULL-LENGTH PASS
//      repositioned it into the longer deck's north third (z ~0.4-1.6),
//      giving it real breathing room off the west rail (was a snug
//      rail-hugging corner before — see the FULL-LENGTH PASS comment on
//      TEA_TABLE_RECT/CHAIR_RECT below). Colliders: layout.ts's
//      ENGAWA_TEA_TABLE_RECT/ENGAWA_CHAIR_RECT (TEA_TABLE_RECT/CHAIR_RECT
//      below copy them verbatim, same convention as every other collider in
//      this file — see layout.ts's DRESSING WAVE comment for the clearance
//      arithmetic, and furniture.test.ts's "tea nook" tests for the
//      RED→GREEN proof).
//   4. railing plants (FULL-LENGTH PASS: grew from 3 to 5, spread along the
//      longer west/north-end rails) + a bonsai-pedestal PLACEHOLDER plant
//      (FULL-LENGTH PASS moved south, z 4.35→5.75, to stay tucked against
//      the relocated south-end rail) — all visual-only, NO new colliders.
//      Unlike this room's two corner floor plants (which are freestanding
//      and do collide), these tuck flush against a rail or the reserved
//      pedestal spot — the reserved spot (x -1.6..-1.2, z 5.6-5.9) already
//      sits close enough to the south-end rail (z-min 5.94) that most of it
//      falls inside the rail's own 0.35 player-radius zone anyway (see
//      furniture.test.ts's "path to the bonsai pedestal" test), so a player
//      was never going to stand dead-center on it — a dedicated collider
//      would be redundant. The real bonsai GLB is CC-BY-pending; this
//      placeholder swaps out then.
//   5. moonlight shaft — static god-rays through the doorway, night-only
//      atmosphere, SURFACES not lights (no new light source, no-invisible-
//      light rule holds — the "source" is the open night sky beyond the
//      deck). DYNAMIC moon→sun-with-time-of-day belongs to Plan 5's
//      day/night system; this is a placeholder for that. Unchanged this
//      pass — it still lands through the door, whose position didn't move.
// engawa hanging rail — the lanterns hang from an OPEN thin rail (NOT a
// covering eave/roof; see the FIX note at the rail mesh below — a roof over
// a top-down-viewed deck rendered as a black lid over the whole engawa).
// The rail sits at the lantern line (x -1.0) at this height; lantern cords
// reach up to it.
const ENGAWA_HANGRAIL_Y = 2.62;

// paper lanterns (×2, FULL-LENGTH PASS adds a second) — hang from the eave.
// The first stays at its original spot near the door (x -1.0, well clear
// of the walk gap's x=0 threshold and inside the eave's own x -2.4..-0.1
// coverage), spilling warm light both across the deck and back through the
// open doorway onto the room floor. The second lands toward the deck's new
// far south end (z 5.4, near the relocated bonsai pedestal) so the
// much-longer deck doesn't go dark at that end — same nested-warm-light
// treatment, no castShadow (the scene's 2-shadow-caster budget, both in
// MusicNook, stays untouched).
const ENGAWA_LANTERNS: { x: number; y: number; z: number }[] = [
  { x: -1.0, y: 2.0, z: 3.8 }, // original — near the door
  { x: -1.0, y: 2.0, z: 5.4 }, // NEW — far south end, lights the extended deck + bonsai corner
];
const ENGAWA_LANTERN_R = 0.15;
const ENGAWA_LANTERN_H = 0.32;
// cord: from the hanging rail down to the lantern's own top cap —
// derived, not hand-guessed. Same y for every lantern, so one shared length.
const ENGAWA_LANTERN_CORD_LEN = ENGAWA_HANGRAIL_Y - (ENGAWA_LANTERNS[0].y + ENGAWA_LANTERN_H / 2);

// tea nook — collider rects copied VERBATIM from layout.ts's
// ENGAWA_TEA_TABLE_RECT/ENGAWA_CHAIR_RECT (source of truth stays there,
// same convention as every other collider in this file). FULL-LENGTH PASS
// repositioned the nook from the old stub deck's north half (z 2.1-3.4,
// hugging both the west and north rails with no walk-through gap behind
// the chair) into the longer deck's north third — see layout.ts's own
// ENGAWA_TEA_TABLE_RECT/ENGAWA_CHAIR_RECT comment for the clearance
// arithmetic (chair-to-west-rail gap grows from 37.5cm to 77.5cm, past the
// 2×0.35 player-radius squeeze threshold, so the nook now has real
// breathing room off the rail).
const TEA_TABLE_RECT = { x: -1.525, z: 0.775, w: 0.45, d: 0.45 }; // center -1.3,1.0
const CHAIR_RECT = { x: -1.925, z: 0.875, w: 0.35, d: 0.35 }; // center -1.75,1.05
const TEA_TABLE_CENTER = { x: TEA_TABLE_RECT.x + TEA_TABLE_RECT.w / 2, z: TEA_TABLE_RECT.z + TEA_TABLE_RECT.d / 2 };
const CHAIR_CENTER = { x: CHAIR_RECT.x + CHAIR_RECT.w / 2, z: CHAIR_RECT.z + CHAIR_RECT.d / 2 };
// chair angled toward the table/view — direction derived from the two
// centers, not a chosen angle.
const CHAIR_FACE_ANGLE = Math.atan2(
  TEA_TABLE_CENTER.x - CHAIR_CENTER.x,
  TEA_TABLE_CENTER.z - CHAIR_CENTER.z
);

// railing plants (visual only, no collider) — against the west/north
// rails, distinct pots + species from this room's own corner plants
// (slate-blue "#55677a" and terracotta "#a04b3a") and from each other.
// FULL-LENGTH PASS: grew from 3 to 5 and SPREAD along the now much-longer
// west/north-end rails so the far ends don't read bare — the old "north
// rail" plant (which sat at the stub deck's own inner edge, z≈2.25, near
// the door) had no rail left there once the north rail moved to the true
// z=0 edge, so it's relocated onto the WEST rail near the door instead
// (still "near the door/lantern," just a different rail); a NEW plant
// takes its old corner-adjacent role at the true NW corner, a second NEW
// plant sits on the west rail near the far south end (by the relocated
// bonsai pedestal), and the pre-existing "south of the nook" plant keeps
// its position (now reads as "west rail, mid-deck" since the nook itself
// moved north).
const RAILING_PLANTS: {
  x: number;
  z: number;
  potColor: string;
  leafColor: string;
  kind: "blade" | "bush" | "spike";
}[] = [
  { x: -2.55, z: 0.25, potColor: "#6b7f6b", leafColor: "#2e6e54", kind: "spike" }, // NW corner (west + true north-end rail junction)
  { x: -1.1, z: 0.2, potColor: "#4a5a3f", leafColor: "#6bb37a", kind: "blade" }, // NEW — north-end rail, near the tea nook
  { x: -2.55, z: 3.0, potColor: "#3f4a52", leafColor: "#5a9c6e", kind: "bush" }, // west rail, level with the door/lantern (moved off the old stub-era north rail)
  { x: -2.55, z: 4.6, potColor: "#8a7355", leafColor: "#3f8f5a", kind: "blade" }, // west rail, mid-deck
  { x: -2.55, z: 5.5, potColor: "#6b5a4a", leafColor: "#3a6b4f", kind: "spike" }, // NEW — west rail, near the south end/bonsai corner
];

// bonsai pedestal — the reserved spot (x -1.6..-1.2, z 5.6-5.9, layout.ts's
// RESERVE comment) gets a wooden stand + a SIMPLE placeholder potted plant
// (mini trunk + foliage clusters, standing in for a proper bonsai). No new
// collider — see the DRESSING WAVE comment above for why. FULL-LENGTH PASS
// moved this south from z=4.35 to z=5.75 (same 19cm gap to the south-end
// rail's own z-min, which itself moved from 4.54 to 5.94) so the spot
// stays tucked against the deck's true south end.
const BONSAI_PEDESTAL_X = -1.4;
const BONSAI_PEDESTAL_Z = 5.75;
const BONSAI_PEDESTAL_H = 0.35;

// moonlight shaft — 3 static translucent quads, night-only atmosphere,
// slanting from the upper door opening (outside, y≈2.2) down onto the
// bedroom floor just inside (landing x 0.4-2.0, z 2.8-4.2, per the brief).
// Each shaft is a thin box whose LONG axis (local Y) is rotated about Z to
// point from its outside/high start to its inside/low end — same
// diagonal-streak idiom this file's mirror highlight already uses
// (MIRROR_GLASS_X's rotation={[0,0,0.55]} streak below), just derived via
// atan2/hypot instead of a hand-picked angle. z stays fixed per shaft (its
// own "width" dimension spans across z), so 3 shafts at different z fan
// across the doorway/landing zone. STATIC this wave — DYNAMIC moon→sun-
// with-time-of-day belongs to Plan 5's day/night system; swap this for a
// driven version there.
const MOON_SHAFTS: { xs: number; ys: number; xe: number; ye: number; z: number; zWidth: number; opacity: number }[] = [
  { xs: -0.3, ys: 2.2, xe: 0.6, ye: 0, z: 3.0, zWidth: 0.5, opacity: 0.16 },
  { xs: -0.2, ys: 2.2, xe: 1.2, ye: 0, z: 3.5, zWidth: 0.55, opacity: 0.14 },
  { xs: -0.1, ys: 2.2, xe: 1.8, ye: 0, z: 4.0, zWidth: 0.6, opacity: 0.12 },
];

// manga dresser (Task 8) — REMOVED FOR NOW (P4 recenter): its rect (x
// 2.8-4.4) overlapped the centered/enlarged bed's x-span (3.0-5.0), and
// centering the bed on the north wall was the owner's explicit ask, so the
// dresser had to go. All of its consts (DR_*, MANGA_COLORS) and its JSX
// group (body/drawers/manga stack/figurines/cactus) are deleted along with
// it. It returns elsewhere in a later step — this is a "for now" removal,
// not a cut feature.

// dragonslayer — REMOVED (Task 8's lean-zone rect + sword meshes + its
// floor contact shadow are gone). Parked for now — it's destined for the
// future gaming den; behelit trigger + sword relocation land with the
// eclipse/den plans. Its wall sconce (below) is KEPT and relocated — see
// the sconce's own comment.

/* ── style LOCKED at the gate (Rohan, 2026-07-19): sage walls + parallel-oak
   floor. Toggle machinery stripped per precedent (e545fd1/6347c04). ── */
const WALL_TEX = "/3am/tex/wall-sage.png";
const FLOOR_TEX = "/3am/tex/floor-oak.png";

// ── poster wall (FURNISHING WAVE) — "many posters with different
// alignments" over the headboard, x 2.3-5.7 / y 1.5-2.5, weaving around the
// sconce (SCONCE_X=4.0, its cone reaches x≈3.89-4.11) with a buffer on both
// sides: the closest poster edges sit at x=3.775 (west cluster) and x=4.275
// (east cluster), each ≥0.16m clear of the cone. z is a flat 0.03 (2cm off
// the wall's own face at R.z+0.01 — 2cm > the 6mm-offset floor), same for
// every poster since none of them overlap the sconce's x-band in the first
// place. Six posters (asymmetric salon-wall count, in the 6-7 range), four
// unique textures, two reused (sunset/mountain each appear twice at
// different sizes/positions so the reuse doesn't read as a copy-paste
// pair). No collider — flat wall dressing, same as every poster elsewhere
// in the house. */
const POSTER_Z = 0.03;
type PosterKey = "sunset" | "mountain" | "space" | "wavearc";
const POSTERS: { key: PosterKey; cx: number; cy: number; w: number; h: number; rotZ: number }[] = [
  { key: "sunset", cx: 2.55, cy: 2.0, w: 0.5, h: 0.55, rotZ: -0.04 },
  { key: "mountain", cx: 3.05, cy: 2.3, w: 0.4, h: 0.45, rotZ: 0.03 },
  { key: "space", cx: 3.55, cy: 1.85, w: 0.45, h: 0.5, rotZ: -0.02 },
  { key: "wavearc", cx: 4.5, cy: 2.05, w: 0.45, h: 0.6, rotZ: 0.04 },
  { key: "sunset", cx: 4.95, cy: 2.35, w: 0.35, h: 0.4, rotZ: -0.03 },
  { key: "mountain", cx: 5.4, cy: 1.9, w: 0.5, h: 0.5, rotZ: 0.02 },
];

// ── mirror (FURNISHING WAVE) — east divider's bedroom face (wallSegS,
// x=BEDROOM.x+BEDROOM.w-0.11=7.89, the same plane that mesh renders on),
// south of the door gap. Layered offset stack, same "wall → frame → glass"
// convention as the engawa's sliding door (DOOR_FRAME_NEAR_X etc. above),
// mirrored toward -x since this wall's visible face normal points -x
// (rotY=-π/2 maps local +z to world -x): frame sits 2cm proud of the wall
// (≥6mm), glass sits 1cm further proud of the frame's near face (≥6mm,
// same 10mm the sliding door's fixed pane used off its own frame).
const MIRROR_W = 0.6;
const MIRROR_H = 1.6;
const MIRROR_WALL_X = BEDROOM.x + BEDROOM.w - 0.11; // 7.89, wallSegS's own plane
const MIRROR_FRAME_DEPTH = 0.04;
const MIRROR_FRAME_X = MIRROR_WALL_X - 0.02 - MIRROR_FRAME_DEPTH / 2; // 7.85
const MIRROR_GLASS_X = MIRROR_WALL_X - 0.02 - MIRROR_FRAME_DEPTH - 0.01; // 7.82

/** Bed model: "Bed with lamp" by GreenG
 *  (https://sketchfab.com/AngelNebesniy) via Sketchfab — CC-BY-4.0
 *  (http://creativecommons.org/licenses/by/4.0/), source:
 *  https://sketchfab.com/3d-models/bed-with-lamp-b9b6f7dce9df4d719acc37b5e05a3ea3.
 *  Attribution lives in the GLB's asset.extras too. Replaces the hand-built
 *  frame/headboard/mattress/pillows/duvet. LAMP-CUT PASS (this pass): the
 *  model's own lamp/table cluster is triangle-level CUT from the GLB (see
 *  the dedicated comment block below) — it is no longer the room's hero
 *  fixture. The wall sconce is now the room's only warm light on this wall
 *  (bumped one step, see its own comment). STALE as of the SUPER-KING pass
 *  below: the sconce it refers to no longer hangs over the (now-removed)
 *  dragonslayer — it's relocated over the headboard.
 *
 *  GLB drill: healthy file (no skin, no animations; 1 mesh/1 material/3
 *  textures). The Sketchfab corrective node chain (root rotation × fbx-node
 *  scale 0.01 × object-node scale ~19.932) composes to a pure uniform scale
 *  of 0.19932 with the rotation canceling to identity (verified by 4×4
 *  matrix multiply, not assumed) — same "mesh-local axes are the final
 *  axes" case as Workspace's coffee machine/gaming chair. Optimized in
 *  place: weld → simplify (--ratio 0.1 --error 0.01) → prune → resize
 *  512×512 → quantize (safe, no skin) = 4.60MB → 812KB (82% smaller);
 *  validate: 0 errors/warnings, and the quantize compensation node was
 *  checked to reproduce the pre-quantize scene bbox (sub-mm drift only).
 *  Native linear texture filtering kept (no filter override below).
 *
 *  Orientation/footprint (raw accessor probe, no browser — owner eyeballs
 *  the result): splitting the 39,992-vert cloud at local X = -952 isolates
 *  two clusters — a 34,523-vert "bed" body and a 5,469-vert "lamp" cluster
 *  that reads as an integrated headboard-side table+lamp (it runs
 *  alongside roughly the headboard-half of the bed's length and extends
 *  past the bed's own footprint to one side, rather than sitting neatly on
 *  top of it). The bed cluster's tall band sits at local min-Z spanning the
 *  full local-X width — that's the headboard, so local +Z is this model's
 *  own head→foot axis (mirrors this file's old "+x toward the foot"
 *  convention) and local X is the side-to-side width axis. A
 *  rotation.y=π/2 wrapper group maps local +Z → world +X (foot) and local
 *  -X (the lamp's side) → world +Z, which is why the lamp lands away from
 *  the kept nightstand (north end) rather than beside it — an asymmetric
 *  two-nightstand-ish layout, flagged in the report for Rohan's call.
 *
 *  BED_MODEL_SCALE fits the bed body's own length (local Z range, 538.23
 *  scene units pre-extra-scale, intrinsic to the GLB) to BED_RECT.d minus
 *  a 4cm margin. STALE (pre-P4-recenter) numbers: at BED_RECT.d=2.1 this
 *  was 2.06/538.23=0.0038274, bed-only width 1.75m (2.6cm over BED_RECT.w
 *  on each side), headboard top 0.694m.
 *
 *  BED_LAMP_LOCAL_POS and its nested pointLight are GONE (lamp-cut pass,
 *  see the dedicated comment block below) — the shade they pointed into no
 *  longer exists in the GLB.
 *
 *  P4 UPDATE (bed rearranged onto the north wall, east of the dresser):
 *  wrapper rotation.y changed π/2 → 0 (see BED_MODEL_ROTATION_Y's
 *  comment); BED_MODEL_POS re-derived for that mapping. Two facts flipped:
 *  "headboard top vs. window sill" clearance no longer applied (bed left
 *  the window's wall); lamp/table cluster overflow ran WEST toward the
 *  dresser (~0.84m, didn't clear it — flagged for Rohan's call).
 *
 *  P4 RECENTER (bed centered on the north wall, x 3.0-5.0,
 *  and enlarged to w:2.0/d:2.25; manga dresser removed for now): scale
 *  re-fit to the new BED_RECT.d: (2.25-0.04)/538.23 = 2.21/538.23 =
 *  0.0041060513 (ratio to the P4-rearrange scale: ×1.0728063). Bed-only
 *  width at the new scale is 1.8774m against BED_RECT.w=2.0m — now 6.13cm
 *  INSIDE the collider on each side (flipped from over to under, still
 *  well within tolerance, no re-tuning needed). BED_MODEL_POS re-derived
 *  algebraically from the SAME Zmin/Xc facts the P4-rearrange task
 *  back-derived (Zmin=-295.569372, Xc=39.629765 — both intrinsic to the
 *  GLB, unaffected by rect/scale edits), just re-solved with the new
 *  scale and rect — no fresh GLB probing needed (see BED_MODEL_POS's own
 *  comment for the formula and the sanity check that it reproduces the
 *  old published position when fed the old scale/rect). BED_LAMP_LOCAL_POS
 *  used to scale by the same 1.0728063 ratio — STALE, see the lamp-cut pass
 *  below (the constant and its fixture no longer exist).
 *
 *  The lamp/table cluster's overflow direction was WEST (rotation didn't
 *  change, and the lamp cluster's local-X position relative to the bed's
 *  own width centroid, which determined the direction, was intrinsic
 *  geometry) — STALE as of the lamp-cut pass below; the cluster (and its
 *  overflow) no longer exists.
 *
 *  LAMP-CUT PASS (owner's ask: remove the lamp/table cluster from the bed
 *  GLB — it's a single fused mesh, so this is a triangle-level cut, not a
 *  node deletion). Cut plane: raw-local X = -192 (a 3-unit margin west of
 *  the bed body's own western face, which sits at raw-local X ≈ -189 —
 *  Xc=39.629765 above being the bed-body-derived centroid CONFIRMS this
 *  face position, re-verified this pass: whole-mesh mean-X over all
 *  vertices is -5.46 (pulled hard negative by the cluster's mass), while
 *  the bed-body-only mean-X is +41.0 — close to the published 39.629765,
 *  not the whole-mesh figure, so BED_MODEL_SCALE/POS's Zmin/Xc facts were
 *  already bed-body-derived and did NOT need re-deriving; unchanged by the
 *  cut, since cutting drops only cluster triangles and never moves a kept
 *  vertex). Rule actually applied: drop a triangle if ANY of its 3
 *  vertices has raw-local X < -192 — escalated from the naive "drop only if
 *  all 3 vertices are past the plane" rule, which left a 21-triangle
 *  floor-level connector strip (y ∈ [0, 0.8] raw units, i.e. ~3mm tall at
 *  scale — a thin floor decal/trim, not a wall) bridging bed-side vertices
 *  (x ≈ -114) to cluster-side vertices out to x ≈ -239; neither the all-3
 *  rule nor the brief's centroid-tightening fallback fully closed it
 *  (centroids stayed bed-side, pulled by the two bed-side verts on each
 *  bridge triangle), so per-vertex dropping was used instead. Result:
 *  6954→5949 triangles (-1005, -14.5%), 9655→8285 vertices (-1370, -14.2%),
 *  811,600→778,168 bytes (-33,432, -4.1%; most of the file is textures,
 *  untouched). Post-cut bbox: X -191.21..268.50 (was -402.17..268.50 — the
 *  +268.50 east face, entirely bed body, is untouched, confirming no
 *  over-cut), Y -0.01..180.65 (was -0.01..201.58 — the missing ~21 units
 *  is the lamp shade's own height, gone with it), Z unchanged
 *  (-295.58..242.22, confirming the bed body's own head→foot extent is
 *  fully intact). Hole risk: LOW — the only triangles spanning the cut
 *  plane were the 21-triangle floor strip above (now fully removed by the
 *  per-vertex rule), and the bed body's western face reads as an
 *  already-capped solid surface with no triangle needing to cross the cut
 *  plane to close it; no patch geometry was added. Owner should still
 *  eyeball the west side of the bed in-scene for the final call.
 *
 *  SUPER-KING PASS (this pass — owner's ask: make the bed SUPER KING size;
 *  dragonslayer removed, parked for the future gaming den): BED_RECT grown
 *  again, w:2.0→2.2 / d:2.25→2.5, x-center unchanged at 4.0 (x 2.9-5.1).
 *  Scale re-fit to the new BED_RECT.d: (2.5-0.04)/538.23 = 2.46/538.23 =
 *  0.0045705368 (ratio to the P4-recenter scale: ×1.1131221719 = 2.46/2.21
 *  exactly, since both scales share the /538.23 denominator). Bed-only
 *  width at the new scale is 2.0898m against BED_RECT.w=2.2m — 5.51cm
 *  INSIDE the collider on each side (still comfortably contained, same
 *  ±4cm-class tolerance as every prior pass). BED_MODEL_POS re-derived
 *  algebraically from the SAME Zmin/Xc facts every prior pass has used
 *  (Zmin=-295.569372, Xc=39.629765 — both intrinsic to the GLB, unaffected
 *  by rect/scale edits), just re-solved with the new scale and rect — no
 *  fresh GLB probing needed (see BED_MODEL_POS's own comment for the
 *  formula). The dragonslayer lean-zone, its sword meshes, and its floor
 *  contact shadow are all REMOVED — parked for the future gaming den (see
 *  the dedicated comment block at the sword's old JSX spot). Its wall
 *  sconce is KEPT and relocated to SCONCE_X = 4.0 (centered above the
 *  bed's headboard) — same y/intensity/distance/decay, only x moved (see
 *  the sconce's own comment). See the p4-superking report for the full
 *  arithmetic table. */
function BedModel() {
  const { scene } = useGLTF("/3am/models/bed-with-lamp.glb");
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial && !mat.userData.bedTuned) {
          mat.userData.bedTuned = true; // traverse can re-run (HMR/remount)
          mat.metalness = Math.min(mat.metalness, 0.2);
          mat.roughness = Math.max(mat.roughness, 0.6);
          // one shared material for the whole prop ships emissiveFactor
          // [1,1,1] (full strength) baked for the lamp shade's emissive
          // texture region — clamp below the Bloom threshold (0.6), same
          // dome-lamp convention as Workspace's coffee machine, so the
          // shade reads as lit without clipping (the bed-fabric region's
          // emissive map is already near-black, so the clamp is a no-op
          // there — no need to ADD a glow, this file already ships one).
          if (mat.emissiveIntensity > 0.55) mat.emissiveIntensity = 0.55;
        }
      }
    });
  }, [scene]);
  return <primitive object={scene} scale={BED_MODEL_SCALE} />;
}
useGLTF.preload("/3am/models/bed-with-lamp.glb");

/** Chunky wood post-and-top-rail fence (item 4, P4 engawa rework),
 *  rendered flush on top of a railing collider (layout.ts's
 *  ENGAWA_RAIL_W/N/S — the RAIL_*_RECT consts above copy those verbatim).
 *  `axis` is the direction the rail's LONG side runs ("x" for the
 *  north/south rails, "z" for the west rail); `from`/`to` are the world
 *  extent along that axis; `fixed` is the world coordinate along the
 *  perpendicular (short) axis the whole fence sits at — i.e. the
 *  collider's own centerline. Posts every ~0.5m (evenly redistributed
 *  across the run, so the spacing is never a partial leftover step);
 *  `height` sets both post height and top-rail height (the south rail's
 *  deliberately-low camera exception passes RAIL_LOW_H here, everything
 *  else RAIL_NORMAL_H). No castShadow prop needed — Bedroom's root
 *  traverse (rootRef's useEffect) sets it on every mesh under the room. */
function RailFence({
  axis,
  from,
  to,
  fixed,
  height,
}: {
  axis: "x" | "z";
  from: number;
  to: number;
  fixed: number;
  height: number;
}) {
  const length = to - from;
  const spacing = 0.5;
  const count = Math.max(2, Math.round(length / spacing) + 1);
  const normal = height >= RAIL_NORMAL_H;
  const postSize = normal ? 0.045 : 0.035;
  const railT = normal ? 0.05 : 0.035;
  const posts = Array.from({ length: count }, (_, i) => from + (i / (count - 1)) * length);
  return (
    <group>
      {posts.map((t, i) => (
        <mesh key={i} position={axis === "x" ? [t, height / 2, fixed] : [fixed, height / 2, t]}>
          <boxGeometry args={[postSize, height, postSize]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
      ))}
      {/* top rail beam — spans the full run, sits on the posts */}
      <mesh
        position={
          axis === "x" ? [(from + to) / 2, height, fixed] : [fixed, height, (from + to) / 2]
        }
      >
        <boxGeometry
          args={
            axis === "x"
              ? [length + postSize, railT, railT]
              : [railT, railT, length + postSize]
          }
        />
        <meshStandardMaterial color="#8a5a3b" />
      </mesh>
    </group>
  );
}

/**
 * The bedroom — painted surfaces + temp style toggles (task 5 of the
 * bedroom plan). Renders INSIDE the gray-box shell: textured surfaces sit a
 * few cm off House geometry; colliders live in layout.ts. Follows
 * Workspace.tsx's surface section verbatim as the pattern (floor, north
 * wall, divider faces, south stub band, baseboards, shadow traverse), with
 * two differences: the divider this room shares is on its EAST side (x=8,
 * facing west into the room) instead of straddling both sides like
 * Workspace, and this room also owns a full exterior wall (west, x=0) —
 * P4 engawa rework: that wall is a real WALL_T=0.2 thick wall (not a thin
 * plane) with a cutout (z 2.5-4.3), the walk-through gap for the engawa's
 * sliding glass door. Each of the wall's two z-segments (north-of-gap,
 * south-of-gap) gets FOUR meshes, not two: interior (bedroom-side, sage)
 * + exterior (engawa-side, darker sage) faces, each proud of the box's
 * own face by the usual ≥6mm offset — same doorway-segment pattern the
 * east divider already uses, just doubled up for both faces of a real box
 * instead of one face of a thin plane.
 */
export function Bedroom() {
  const R = BEDROOM;
  const rootRef = useRef<THREE.Group>(null);
  // aim point for the sunset stool lamp's wash across the poster cluster —
  // same nested-target pattern as MusicNook's sunsetTarget / Workspace's
  // evaTargetAcross*.
  const [stoolLampTarget] = useState(() => new THREE.Object3D());

  useEffect(() => {
    rootRef.current?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, []);

  const floor = usePixelTexture(FLOOR_TEX, R.w, R.d);
  const wallN = usePixelTexture(WALL_TEX, R.w, WALL_H);
  // west wall — split around the widened engawa door gap (z 2.5-4.3), same
  // two-segment pattern as the east divider's wallSegN/wallSegS. Each
  // segment's texture map is reused on BOTH faces of the thick wall box
  // (bedroom-side untinted, engawa-side darker-tinted via material color)
  // rather than loading four separate textures.
  const wallWN = usePixelTexture(WALL_TEX, ENGAWA_DOOR_Z0, WALL_H); // north of the gap, z 0-2.5
  const wallWS = usePixelTexture(WALL_TEX, R.d - ENGAWA_DOOR_Z1, WALL_H); // south of the gap, z 4.3-6
  const wallSegN = usePixelTexture(WALL_TEX, 2.2, WALL_H); // east divider, north-of-door segment
  const wallSegS = usePixelTexture(WALL_TEX, 2.2, WALL_H); // east divider, south-of-door segment
  const wallStub = usePixelTexture(WALL_TEX, R.w, 0.2, 0, 0.5);
  // NOTE: linen-quilt.png (duvet texture) is now unreferenced — the bed
  // swap replaced the hand-built duvet with the GLB bed. Left the PNG +
  // its scripts/pixelart/gen-variants.mjs JOBS entry in place (HANDOFF §6:
  // deleting one without the other lets the generator silently resurrect
  // it) since it may return on a throw blanket.
  // rug — single alpha-cutout image (oval shape baked into the PNG), same
  // repeat(1,1) + transparent convention as MusicNook's rugKilim.
  const rugTex = usePixelTexture("/3am/tex/rug-bedroom.png", 1, 1);
  // deck floor — same floor-oak family as the room, own repeat for its
  // smaller footprint.
  const deckFloor = usePixelTexture(FLOOR_TEX, DECK_RECT.w, DECK_RECT.d);
  // poster wall (FURNISHING WAVE) — four textures, same 1x1 whole-image
  // convention as MusicNook's posterGig/posterWave/posterMoons.
  const posterSunset = usePixelTexture("/3am/tex/poster-sunset-bars.png", 1, 1);
  const posterMountain = usePixelTexture("/3am/tex/poster-mountain-ridge.png", 1, 1);
  const posterSpace = usePixelTexture("/3am/tex/poster-space-planet.png", 1, 1);
  const posterWaveArc = usePixelTexture("/3am/tex/poster-wave-arc.png", 1, 1);

  return (
    <group ref={rootRef}>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[R.x + R.w / 2, 0.02, R.z + R.d / 2]}>
        <planeGeometry args={[R.w, R.d]} />
        <meshStandardMaterial map={floor} />
      </mesh>

      {/* north wall (inner face of the perimeter wall at z=0) */}
      <mesh position={[R.x + R.w / 2, WALL_H / 2, R.z + 0.01]}>
        <planeGeometry args={[R.w, WALL_H]} />
        <meshStandardMaterial map={wallN} />
      </mesh>

      {/* poster wall (FURNISHING WAVE) — see the POSTERS const above for
          the placement table + sconce-clearance arithmetic. Flat planes on
          the north wall, no collider (same convention as every poster
          elsewhere in the house). */}
      {POSTERS.map((p, i) => {
        const tex = {
          sunset: posterSunset,
          mountain: posterMountain,
          space: posterSpace,
          wavearc: posterWaveArc,
        }[p.key];
        return (
          <mesh
            key={`poster-${i}`}
            position={[R.x + p.cx, p.cy, R.z + POSTER_Z]}
            rotation={[0, 0, p.rotZ]}
          >
            <planeGeometry args={[p.w, p.h]} />
            <meshStandardMaterial map={tex} />
          </mesh>
        );
      })}

      {/* west wall — real WALL_T=0.2 thick wall (layout.ts's ENGAWA_WALL_N/S,
          box x -0.1..0.1), split into two segments flanking the sliding-door
          gap (z 2.5-4.3). Each segment gets a face on BOTH sides of the box:
          bedroom-side (interior, sage, +x normal, proud of the box's east
          face at x=+0.1) and engawa-side (exterior, darker sage, -x normal,
          proud of the box's west face at x=-0.1) — item 2's "reads solid
          from both sides" ask. Same texture map reused on both faces of a
          segment, engawa side just tinted darker via material color. */}
      {/* — bedroom-side (interior) faces — */}
      <mesh
        rotation={[0, Math.PI / 2, 0]}
        position={[R.x + ENGAWA_WALL_T_HALF + 0.011, WALL_H / 2, R.z + ENGAWA_DOOR_Z0 / 2]}
      >
        <planeGeometry args={[ENGAWA_DOOR_Z0, WALL_H]} />
        <meshStandardMaterial map={wallWN} />
      </mesh>
      <mesh
        rotation={[0, Math.PI / 2, 0]}
        position={[
          R.x + ENGAWA_WALL_T_HALF + 0.011,
          WALL_H / 2,
          R.z + ENGAWA_DOOR_Z1 + (R.d - ENGAWA_DOOR_Z1) / 2,
        ]}
      >
        <planeGeometry args={[R.d - ENGAWA_DOOR_Z1, WALL_H]} />
        <meshStandardMaterial map={wallWS} />
      </mesh>
      {/* — engawa-side (exterior) faces — darker sage/plaster tint, same
          maps, mirrored -x normal (rotY=-π/2, same convention the east
          divider's own bedroom-facing side uses on ITS wall). */}
      <mesh
        rotation={[0, -Math.PI / 2, 0]}
        position={[R.x - ENGAWA_WALL_T_HALF - 0.011, WALL_H / 2, R.z + ENGAWA_DOOR_Z0 / 2]}
      >
        <planeGeometry args={[ENGAWA_DOOR_Z0, WALL_H]} />
        <meshStandardMaterial map={wallWN} color="#7c8a72" />
      </mesh>
      <mesh
        rotation={[0, -Math.PI / 2, 0]}
        position={[
          R.x - ENGAWA_WALL_T_HALF - 0.011,
          WALL_H / 2,
          R.z + ENGAWA_DOOR_Z1 + (R.d - ENGAWA_DOOR_Z1) / 2,
        ]}
      >
        <planeGeometry args={[R.d - ENGAWA_DOOR_Z1, WALL_H]} />
        <meshStandardMaterial map={wallWS} color="#7c8a72" />
      </mesh>

      {/* east divider face (shared wall with Workspace at x=8), two
          segments flanking the door gap (z 2.2–3.8). Bedroom-facing side
          sits at x≈7.89, -x normal (rotY=-π/2) faces west into this room —
          mirrors Workspace's own west-divider face on its side of x=8. */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[R.x + R.w - 0.11, WALL_H / 2, 1.1]}>
        <planeGeometry args={[2.2, WALL_H]} />
        <meshStandardMaterial map={wallSegN} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[R.x + R.w - 0.11, WALL_H / 2, 4.9]}>
        <planeGeometry args={[2.2, WALL_H]} />
        <meshStandardMaterial map={wallSegS} />
      </mesh>

      {/* south stub band (dollhouse cutaway — House.tsx renders the south
          perimeter wall as a low stub so the camera never gets occluded) */}
      <mesh rotation={[0, Math.PI, 0]} position={[R.x + R.w / 2, 0.275, R.z + R.d - 0.015]}>
        <planeGeometry args={[R.w, 0.55]} />
        <meshStandardMaterial map={wallStub} />
      </mesh>

      {/* baseboards (north, west — split around the engawa door gap, both
          divider segments). West baseboard sits proud of the thick wall's
          bedroom-side face (x = R.x + ENGAWA_WALL_T_HALF + 0.045, was
          R.x + 0.045 back when the wall was a thin plane at x=0). */}
      <mesh position={[R.x + R.w / 2, 0.09, R.z + 0.045]}>
        <boxGeometry args={[R.w, 0.18, 0.07]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>
      <mesh position={[R.x + ENGAWA_WALL_T_HALF + 0.045, 0.09, R.z + ENGAWA_DOOR_Z0 / 2]}>
        <boxGeometry args={[0.07, 0.18, ENGAWA_DOOR_Z0]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>
      <mesh
        position={[
          R.x + ENGAWA_WALL_T_HALF + 0.045,
          0.09,
          R.z + ENGAWA_DOOR_Z1 + (R.d - ENGAWA_DOOR_Z1) / 2,
        ]}
      >
        <boxGeometry args={[0.07, 0.18, R.d - ENGAWA_DOOR_Z1]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>
      <mesh position={[R.x + R.w - 0.145, 0.09, 1.1]}>
        <boxGeometry args={[0.07, 0.18, 2.2]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>
      <mesh position={[R.x + R.w - 0.145, 0.09, 4.9]}>
        <boxGeometry args={[0.07, 0.18, 2.2]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>

      {/* ── engawa (P4 engawa rework) — deck floor, wooden railing, and the
          sliding-door assembly around the widened walk-through gap (z
          2.5-4.3). Collision lives in layout.ts (the ENGAWA_* rects — this
          file's DECK_RECT/RAIL_*_RECT consts above are verbatim copies for
          rendering, source of truth stays there). The void beyond the west
          rail has no geometry — it reads via the scene background, per the
          owner's ask (no sky geometry this wave). ── */}

      {/* deck floor — floor-oak, flush with the room floor (y=0.02) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[R.x + DECK_RECT.x + DECK_RECT.w / 2, 0.02, R.z + DECK_RECT.z + DECK_RECT.d / 2]}
      >
        <planeGeometry args={[DECK_RECT.w, DECK_RECT.d]} />
        <meshStandardMaterial map={deckFloor} />
      </mesh>

      {/* wooden railing — west + north + south, chunky posts (~0.5m
          spacing) + a top rail, flush on their layout.ts colliders
          (RAIL_*_RECT above). REWORK (item 4): the prior pass made all
          three rails fully invisible so the deck wouldn't read as boxed in
          by "giant dark slabs" — this pass gives them a real but SLENDER
          post-and-rail silhouette instead (not a solid panel), which keeps
          the open sightline without going back to zero railing. West and
          north stand normal height (RAIL_NORMAL_H, ~0.9m); south — the
          edge facing the dollhouse camera — is deliberately kept LOW
          (RAIL_LOW_H, ~0.5m, thin) so the player is still visible over it. */}
      <RailFence
        axis="z"
        from={R.z + RAIL_W_RECT.z}
        to={R.z + RAIL_W_RECT.z + RAIL_W_RECT.d}
        fixed={R.x + RAIL_W_RECT.x + RAIL_W_RECT.w / 2}
        height={RAIL_NORMAL_H}
      />
      <RailFence
        axis="x"
        from={R.x + RAIL_N_RECT.x}
        to={R.x + RAIL_N_RECT.x + RAIL_N_RECT.w}
        fixed={R.z + RAIL_N_RECT.z + RAIL_N_RECT.d / 2}
        height={RAIL_NORMAL_H}
      />
      <RailFence
        axis="x"
        from={R.x + RAIL_S_RECT.x}
        to={R.x + RAIL_S_RECT.x + RAIL_S_RECT.w}
        fixed={R.z + RAIL_S_RECT.z + RAIL_S_RECT.d / 2}
        height={RAIL_LOW_H}
      />

      {/* sliding-door frame — dark wood jambs + header around the widened
          z 2.5-4.3 opening. Jambs sit just inside the SOLID wall bands
          (z<2.5 / z>4.3) so they never intrude on the walk gap itself. */}
      <mesh
        position={[R.x + DOOR_FRAME_CX, DOOR_PANEL_Y1 / 2, R.z + ENGAWA_DOOR_Z0 - DOOR_JAMB_T / 2]}
      >
        <boxGeometry args={[DOOR_FRAME_DEPTH, DOOR_PANEL_Y1, DOOR_JAMB_T]} />
        <meshStandardMaterial color="#3a2a1e" />
      </mesh>
      <mesh
        position={[R.x + DOOR_FRAME_CX, DOOR_PANEL_Y1 / 2, R.z + ENGAWA_DOOR_Z1 + DOOR_JAMB_T / 2]}
      >
        <boxGeometry args={[DOOR_FRAME_DEPTH, DOOR_PANEL_Y1, DOOR_JAMB_T]} />
        <meshStandardMaterial color="#3a2a1e" />
      </mesh>
      {/* header — closes the wall above the door up to WALL_H */}
      <mesh
        position={[
          R.x + DOOR_FRAME_CX,
          DOOR_PANEL_Y1 + (WALL_H - DOOR_PANEL_Y1) / 2,
          R.z + ENGAWA_DOOR_ZC,
        ]}
      >
        <boxGeometry
          args={[DOOR_FRAME_DEPTH, WALL_H - DOOR_PANEL_Y1, ENGAWA_DOOR_W + DOOR_JAMB_T * 2]}
        />
        <meshStandardMaterial color="#3a2a1e" />
      </mesh>
      {/* low threshold trim — visual only, flush with the floor */}
      <mesh position={[R.x + 0.06, 0.015, R.z + ENGAWA_DOOR_ZC]}>
        <boxGeometry args={[0.1, 0.03, ENGAWA_DOOR_W]} />
        <meshStandardMaterial color="#2e2116" />
      </mesh>

      {/* two glass panels — turntable-lid convention (thin transparent
          pane + dark frame strips). Both cover the SAME z-band (the fixed
          pane's, z 2.5-3.4 — matching layout.ts's ENGAWA_DOOR_GLASS_RECT
          collider exactly, so this fixed pane is now genuinely solid, not
          just painted-on); the "open" pane is just slid 3cm further
          outward, so together they read as a door slid open, leaving z
          3.4-4.3 (0.9m) clear as the walk gap. Static this wave — an
          actual slide animation is a future nicety. */}
      {[
        { x: DOOR_GLASS_FIXED_X, handle: false },
        { x: DOOR_GLASS_OPEN_X, handle: true },
      ].map(({ x, handle }, i) => {
        const z0 = ENGAWA_DOOR_Z0;
        const zc = z0 + DOOR_PANEL_W / 2;
        return (
          <group key={`glass-panel-${i}`} position={[R.x + x, 0, R.z]}>
            <mesh position={[0, DOOR_PANEL_Y0 + DOOR_PANEL_H / 2, zc]}>
              <boxGeometry args={[0.012, DOOR_PANEL_H, DOOR_PANEL_W]} />
              <meshStandardMaterial color="#a8c8d8" transparent opacity={0.25} />
            </mesh>
            {/* frame border: top, bottom, two sides */}
            <mesh position={[0, DOOR_PANEL_Y1, zc]}>
              <boxGeometry args={[0.02, 0.03, DOOR_PANEL_W + 0.03]} />
              <meshStandardMaterial color="#22222c" />
            </mesh>
            <mesh position={[0, DOOR_PANEL_Y0, zc]}>
              <boxGeometry args={[0.02, 0.03, DOOR_PANEL_W + 0.03]} />
              <meshStandardMaterial color="#22222c" />
            </mesh>
            <mesh position={[0, DOOR_PANEL_Y0 + DOOR_PANEL_H / 2, z0]}>
              <boxGeometry args={[0.02, DOOR_PANEL_H + 0.03, 0.03]} />
              <meshStandardMaterial color="#22222c" />
            </mesh>
            <mesh position={[0, DOOR_PANEL_Y0 + DOOR_PANEL_H / 2, z0 + DOOR_PANEL_W]}>
              <boxGeometry args={[0.02, DOOR_PANEL_H + 0.03, 0.03]} />
              <meshStandardMaterial color="#22222c" />
            </mesh>
            {/* pull handle on the open leaf's leading (south) edge */}
            {handle && (
              <mesh position={[0.02, DOOR_PANEL_Y0 + DOOR_PANEL_H * 0.5, z0 + DOOR_PANEL_W - 0.06]}>
                <boxGeometry args={[0.02, 0.3, 0.025]} />
                <meshStandardMaterial color="#15151b" />
              </mesh>
            )}
          </group>
        );
      })}

      {/* ── eave overhang — wooden beam off the wall's engawa face, spanning
          the deck's own full-length z-range (FULL-LENGTH PASS: z 0-6, was
          the 2.5m stub), reading as "covered veranda." Evenly-spaced knee-
          brace support brackets, angle/length/count all derived
          (ENGAWA_BRACKET_*), not hand-guessed — count grew from 2 to 4 to
          match the tripled span. No collider — well above head height,
          same "overhead, no XZ footprint" convention as the sconce/posters. ── */}
      {/* FIX (2026-07-22): the eave was a solid 2.3×6m slab at y≈2.6 — a roof
          over the deck, which the TOP-DOWN dollhouse camera rendered as a
          black lid hiding the whole engawa. A covering roof fundamentally
          can't work on a top-down-viewed deck. Replaced with an OPEN hanging
          frame the lanterns still hang from: one thin longitudinal rail at
          the lantern line (x -1.0) + a few support arms back to the wall. The
          camera sees straight through it to the deck below. */}
      <mesh position={[R.x - 1.0, ENGAWA_HANGRAIL_Y, R.z + 3.0]}>
        <boxGeometry args={[0.07, 0.07, 5.4]} />
        <meshStandardMaterial color="#3a2a1e" />
      </mesh>
      {[0.7, 3.0, 5.3].map((z, i) => (
        <mesh key={`engawa-arm-${i}`} position={[R.x - 0.55, ENGAWA_HANGRAIL_Y, R.z + z]}>
          <boxGeometry args={[0.9, 0.06, 0.06]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
      ))}

      {/* ── paper lanterns (×2, FULL-LENGTH PASS adds the second) — hang
          from the eave. Each is warm off-white paper, slight emissive glow
          + a warm pointLight NESTED inside its own group (rotation-safe by
          construction), NO castShadow — the scene's 2-shadow-caster budget
          (both in MusicNook) stays untouched. The first (near the door,
          x -1.0/z 3.8) is the deck's original fixture light and spills back
          through the open door threshold into the room. The second
          (x -1.0/z 5.4) lights the newly-extended south end of the deck,
          near the relocated bonsai pedestal, so the much-longer run doesn't
          go dark out there. ── */}
      {ENGAWA_LANTERNS.map((l, i) => (
        <group key={`engawa-lantern-${i}`} position={[R.x + l.x, l.y, R.z + l.z]}>
          {/* cord, eave underside to lantern top cap */}
          <mesh position={[0, ENGAWA_LANTERN_H / 2 + ENGAWA_LANTERN_CORD_LEN / 2, 0]}>
            <cylinderGeometry args={[0.006, 0.006, ENGAWA_LANTERN_CORD_LEN, 5]} />
            <meshStandardMaterial color="#2e2116" />
          </mesh>
          {/* top + bottom caps */}
          <mesh position={[0, ENGAWA_LANTERN_H / 2, 0]}>
            <cylinderGeometry args={[0.05, ENGAWA_LANTERN_R * 0.85, 0.03, 10]} />
            <meshStandardMaterial color="#3a2a1e" />
          </mesh>
          <mesh position={[0, -ENGAWA_LANTERN_H / 2, 0]}>
            <cylinderGeometry args={[ENGAWA_LANTERN_R * 0.85, 0.05, 0.03, 10]} />
            <meshStandardMaterial color="#3a2a1e" />
          </mesh>
          {/* paper body — warm off-white, slight emissive so it glows even
              before the nested light's own falloff is factored in */}
          <mesh>
            <cylinderGeometry args={[ENGAWA_LANTERN_R, ENGAWA_LANTERN_R, ENGAWA_LANTERN_H, 12, 1, true]} />
            <meshStandardMaterial color="#f5ecd8" emissive="#f5ecd8" emissiveIntensity={0.45} side={2} />
          </mesh>
          {/* the fixture's own light — NESTED (rotation-safe by
              construction, matches every other fixture-light in this file) */}
          <pointLight color="#ffd9a0" intensity={5} distance={5} decay={2} />
        </group>
      ))}

      {/* ── tea nook — collider TEA_TABLE_RECT/CHAIR_RECT, copied verbatim
          from layout.ts's ENGAWA_TEA_TABLE_RECT/ENGAWA_CHAIR_RECT (see the
          DRESSING WAVE comment above for the clearance arithmetic). Low
          glass-top tea table (4 thin legs + a transparent round top + a
          tiny teacup, each layer ≥6mm proud of the last: leg tops at
          y=0.28, glass bottom at y≈0.2925 — 12.5mm clear; glass top at
          y≈0.3075, teacup bottom at y=0.32 — 12.5mm clear) and a wooden
          folding chair angled toward it (CHAIR_FACE_ANGLE, derived from
          the two centers via atan2, not a chosen angle). ── */}
      <group position={[R.x + TEA_TABLE_CENTER.x, 0, R.z + TEA_TABLE_CENTER.z]}>
        {[
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ].map(([sx, sz], i) => (
          <mesh
            key={i}
            position={[sx * (TEA_TABLE_RECT.w / 2 - 0.04), 0.14, sz * (TEA_TABLE_RECT.d / 2 - 0.04)]}
          >
            <cylinderGeometry args={[0.012, 0.012, 0.28, 6]} />
            <meshStandardMaterial color="#6b4128" />
          </mesh>
        ))}
        {/* glass top — thin transparent disc, 12.5mm proud of the leg tops */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[TEA_TABLE_RECT.w / 2 - 0.03, TEA_TABLE_RECT.w / 2 - 0.03, 0.015, 16]} />
          <meshStandardMaterial color="#a8c8d8" transparent opacity={0.3} />
        </mesh>
        {/* tiny teacup, 12.5mm proud of the glass top */}
        <mesh position={[0.08, 0.335, -0.05]}>
          <cylinderGeometry args={[0.025, 0.02, 0.03, 8]} />
          <meshStandardMaterial color="#f2ecd8" />
        </mesh>
      </group>
      <group position={[R.x + CHAIR_CENTER.x, 0, R.z + CHAIR_CENTER.z]} rotation={[0, CHAIR_FACE_ANGLE, 0]}>
        {/* seat */}
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[CHAIR_RECT.w - 0.06, 0.03, CHAIR_RECT.d - 0.06]} />
          <meshStandardMaterial color="#8a5a3b" />
        </mesh>
        {/* backrest — angled slat, local -z (matches the sofa's own
            "backrest at local -z, away from the open front" convention) */}
        <mesh position={[0, 0.62, -(CHAIR_RECT.d / 2 - 0.04)]} rotation={[-0.15, 0, 0]}>
          <boxGeometry args={[CHAIR_RECT.w - 0.08, 0.34, 0.025]} />
          <meshStandardMaterial color="#8a5a3b" />
        </mesh>
        {/* X-braced folding legs, front and back pairs */}
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * (CHAIR_RECT.w / 2 - 0.03), 0.21, 0]} rotation={[0.5, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.46, 6]} />
              <meshStandardMaterial color="#4a3a2e" />
            </mesh>
            <mesh position={[side * (CHAIR_RECT.w / 2 - 0.03), 0.21, 0]} rotation={[-0.5, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.46, 6]} />
              <meshStandardMaterial color="#4a3a2e" />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── railing plants (2-3, visual only, NO collider — small pots
          tucked against a rail, see the DRESSING WAVE comment above for
          why). Varied pots + species silhouettes (RAILING_PLANTS above),
          distinct from this room's own corner plants. ── */}
      {RAILING_PLANTS.map((p, i) => (
        <group key={`rail-plant-${i}`} position={[R.x + p.x, 0, R.z + p.z]}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.11, 0.08, 0.2, 8]} />
            <meshStandardMaterial color={p.potColor} />
          </mesh>
          {p.kind === "blade" &&
            [0, 1, 2].map((k) => {
              const a = (k / 3) * Math.PI * 2 + 0.5;
              const h = 0.28 + (k % 2) * 0.1;
              return (
                <mesh
                  key={k}
                  position={[Math.sin(a) * 0.025, 0.2 + h / 2, Math.cos(a) * 0.025]}
                  rotation={[0, a, 0.1]}
                >
                  <boxGeometry args={[0.045, h, 0.016]} />
                  <meshStandardMaterial color={p.leafColor} />
                </mesh>
              );
            })}
          {p.kind === "bush" &&
            [0, 1, 2, 3].map((k) => {
              const a = (k / 4) * Math.PI * 2;
              const s = 0.05 + (k % 2) * 0.015;
              return (
                <mesh key={k} position={[Math.sin(a) * 0.045, 0.2 + s, Math.cos(a) * 0.045]}>
                  <sphereGeometry args={[s, 7, 6]} />
                  <meshStandardMaterial color={p.leafColor} />
                </mesh>
              );
            })}
          {p.kind === "spike" &&
            [0, 1, 2, 3, 4].map((k) => {
              const a = (k / 5) * Math.PI * 2;
              return (
                <mesh
                  key={k}
                  position={[Math.sin(a) * 0.03, 0.28, Math.cos(a) * 0.03]}
                  rotation={[Math.PI * 0.12, a, 0]}
                >
                  <coneGeometry args={[0.02, 0.22, 5]} />
                  <meshStandardMaterial color={p.leafColor} />
                </mesh>
              );
            })}
        </group>
      ))}

      {/* ── bonsai pedestal — reserved spot (layout.ts's RESERVE comment,
          x -1.6..-1.2, z 4.2-4.5), wooden stand + a SIMPLE placeholder
          potted plant (mini trunk + foliage clusters). NO collider — see
          the DRESSING WAVE comment above for why (the spot already sits
          inside the south rail's own player-radius zone). bonsai GLB
          lands here — CC-BY pending; this placeholder swaps out. ── */}
      <group position={[R.x + BONSAI_PEDESTAL_X, 0, R.z + BONSAI_PEDESTAL_Z]}>
        <mesh position={[0, BONSAI_PEDESTAL_H / 2, 0]}>
          <cylinderGeometry args={[0.11, 0.13, BONSAI_PEDESTAL_H, 10]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        <mesh position={[0, BONSAI_PEDESTAL_H + 0.01, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.02, 10]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {/* small pot, flush on the cap (same flush-stack convention the
            nightstand's body/top slab uses) */}
        <mesh position={[0, BONSAI_PEDESTAL_H + 0.06, 0]}>
          <cylinderGeometry args={[0.09, 0.07, 0.08, 8]} />
          <meshStandardMaterial color="#7a5a3f" />
        </mesh>
        {/* trunk, flush on the pot */}
        <mesh position={[0, BONSAI_PEDESTAL_H + 0.17, 0]} rotation={[0, 0, 0.12]}>
          <cylinderGeometry args={[0.012, 0.018, 0.14, 6]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        {/* foliage clusters, stand-in for a real bonsai canopy */}
        {[0, 1, 2].map((k) => {
          const a = (k / 3) * Math.PI * 2;
          const s = 0.05 + (k % 2) * 0.012;
          return (
            <mesh key={k} position={[Math.sin(a) * 0.04, BONSAI_PEDESTAL_H + 0.26, Math.cos(a) * 0.04]}>
              <sphereGeometry args={[s, 7, 6]} />
              <meshStandardMaterial color="#3f8f5a" />
            </mesh>
          );
        })}
      </group>

      {/* ── moonlight shaft — see MOON_SHAFTS above for the geometry
          derivation + the static/DYNAMIC-later note. Each is a thin box
          (meshBasicMaterial — unlit, reads as a pure translucent SURFACE,
          not a light source, so the no-invisible-light rule holds) whose
          long axis is rotated about Z to point from its outside/high start
          toward its inside/low end — same diagonal-streak idiom this
          file's mirror highlight already uses, just derived via atan2/
          hypot instead of a hand-picked angle. Additive-ish blending, low
          opacity, depthWrite off so the 3 overlapping shafts don't
          z-fight. STATIC this wave; DYNAMIC moon→sun-with-time-of-day
          belongs to Plan 5's day/night system — swap this for a driven
          version there. ── */}
      {MOON_SHAFTS.map((s, i) => {
        const dx = s.xe - s.xs;
        const dy = s.ye - s.ys;
        const length = Math.hypot(dx, dy);
        const angle = Math.atan2(-dx, dy); // rotation.z for a box whose local +Y is its long axis
        return (
          <mesh
            key={`moon-shaft-${i}`}
            position={[R.x + (s.xs + s.xe) / 2, (s.ys + s.ye) / 2, R.z + s.z]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[0.02, length, s.zWidth]} />
            <meshBasicMaterial
              color="#aebbe0"
              transparent
              opacity={s.opacity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={2}
            />
          </mesh>
        );
      })}

      {/* ── bed — collider {2.9,0.33,2.2,2.5} (SUPER-KING pass: centered on
          the north wall, x 2.9-5.1 around the room's x-center 4.0 —
          unchanged — enlarged from {2.0,2.25} to {2.2,2.5}). Real Sketchfab
          GLB (see BedModel's attribution comment) replaces the hand-built
          frame/headboard/mattress/pillows/duvet. rotation.y=0 maps the
          model's local +Z (head→foot) to world +Z directly and local X
          (width axis, unrotated) to world X directly — the only
          Y-rotation that keeps the head→foot axis correctly ordered
          north→south (see BED_MODEL_ROTATION_Y's comment for why π/2's
          alternative, θ=π, was rejected). BED_MODEL_POS puts the
          headboard face on the wall plane (BED_RECT.z + 2cm clearance)
          and centers the bed-only footprint on the collider's x-span —
          re-derived algebraically from the same published Zmin/Xc
          constants every prior pass has used, not re-probed (see
          BED_MODEL_POS's comment). LAMP-CUT PASS: the GLB's own lamp/table
          cluster is triangle-level cut from the model (see BedModel's
          comment) — no fixture, no light nested here anymore, so nothing
          to keep rotation-safe on that front. Own Suspense so the fetch
          never blocks the room's first paint. ── */}
      <group position={BED_MODEL_POS} rotation={[0, BED_MODEL_ROTATION_Y, 0]}>
        <Suspense fallback={null}>
          <BedModel />
        </Suspense>
      </group>

      {/* sleeping cat (Task 9, re-seated P4/SUPER-KING, MOVED this wave) —
          she no longer sleeps on the bed: FURNISHING WAVE gives her a round
          cat bed in the NE corner (CATBED_RECT), and she now curls on its
          own inner pad, world-space at (CAT_X, CAT_Y, CAT_Z) — see the
          consts above (by CATBED_PAD_H) for the derivation, which is now
          just this file's own constructed geometry, not GLB probing.
          Behaviors (breathing, ear twitch, pettable hearts) are untouched;
          only the seat moved. */}
      <Cat x={CAT_X} y={CAT_Y} z={CAT_Z} />

      {/* ── cat's bed — collider {7.05,0.45,0.55,0.55}, FURNISHING WAVE.
          Round pet bed: a torus cushion ring (donut, lying flat on the
          floor) with a flat inner pad nested inside — the cat sits on the
          pad's own top surface (CATBED_PAD_H, see the consts above). No
          light — reads by the room's ambient + the nearby sconce/lamps. ── */}
      <group position={[CATBED_CENTER.x, 0, CATBED_CENTER.z]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, CATBED_RING_TUBE, 0]}>
          <torusGeometry args={[CATBED_RING_R, CATBED_RING_TUBE, 10, 20]} />
          <meshStandardMaterial color="#a04b3a" />
        </mesh>
        <mesh position={[0, CATBED_PAD_H / 2, 0]}>
          <cylinderGeometry args={[CATBED_PAD_R, CATBED_PAD_R, CATBED_PAD_H, 16]} />
          <meshStandardMaterial color="#e6d8b8" />
        </mesh>
      </group>

      {/* ── twin nightstands — colliders {2.25,0.4,0.55,0.5} (west) and
          {5.25,0.4,0.55,0.5} (east), FURNISHING WAVE. Replaces the old
          single east-flank nightstand (was {6.45,0.95,0.55,0.5} — see
          furniture.test.ts's "old single nightstand rect is gone" check).
          Each cabinet is identical: two-tone body/top slab (same
          construction as the old single nightstand) but with TWO stacked
          drawer fronts instead of one (brief: "small two-drawer
          cabinets"), front face on the +z (south, room-facing) side rather
          than the old +x — these sit near the headboard, not against a
          side wall, so "front" now means "facing into the room." Each is
          topped by its own small warm lamp: same base/pole/open-cone-shade
          construction as MusicNook's coffee-table lamp, pointLight nested
          INSIDE the fixture group (rotation-safe by construction),
          intensity 3.5 / distance 3 / decay 2, NO castShadow — these
          complement the headboard sconce rather than replace it, so the
          sconce stays at its own bumped intensity (5) unless the head zone
          reads over-bright in browser (owner's eyeball call, flagged in
          the report). ── */}
      {[
        { rect: NIGHTSTAND_W_RECT, center: NIGHTSTAND_W_CENTER },
        { rect: NIGHTSTAND_E_RECT, center: NIGHTSTAND_E_CENTER },
      ].map(({ rect, center }, i) => (
        <group key={`nightstand-${i}`} position={[center.x, 0, center.z]}>
          {/* body */}
          <mesh position={[0, NS_BODY_H / 2, 0]}>
            <boxGeometry args={[rect.w - 0.04, NS_BODY_H, rect.d - 0.04]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
          {/* top slab — lighter walnut tone, slight overhang. Top face
              lands exactly at NS_TOP_Y (= NS_BODY_H + NS_TOP_T). */}
          <mesh position={[0, NS_BODY_H + NS_TOP_T / 2, 0]}>
            <boxGeometry args={[rect.w, NS_TOP_T, rect.d]} />
            <meshStandardMaterial color="#6b4128" />
          </mesh>
          {/* two drawer fronts — recessed panels + knobs, south (+z,
              room-facing) face */}
          {[0.28, 0.68].map((frac, di) => (
            <group key={di}>
              <mesh position={[0, NS_BODY_H * frac, rect.d / 2 - 0.03]}>
                <boxGeometry args={[rect.w - 0.14, 0.15, 0.02]} />
                <meshStandardMaterial color="#2e2a4d" />
              </mesh>
              <mesh position={[0, NS_BODY_H * frac, rect.d / 2 - 0.008]}>
                <sphereGeometry args={[0.014, 8, 6]} />
                <meshStandardMaterial color="#c9a06a" />
              </mesh>
            </group>
          ))}
          {/* small warm lamp — base/pole/open-cone shade, same family as
              MusicNook's coffee-table lamp */}
          <mesh position={[0, NS_TOP_Y + 0.02, 0]}>
            <cylinderGeometry args={[0.055, 0.065, 0.03, 8]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, NS_TOP_Y + 0.11, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.16, 6]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, NS_TOP_Y + 0.22, 0]}>
            <cylinderGeometry args={[0.06, 0.085, 0.11, 8, 1, true]} />
            <meshStandardMaterial color="#ffb35c" emissive="#ffb35c" emissiveIntensity={0.85} side={2} />
          </mesh>
          <pointLight position={[0, NS_TOP_Y + 0.28, 0]} color="#ffd9a0" intensity={3.5} distance={3} decay={2} />
        </group>
      ))}

      {/* ── manga dresser — REMOVED FOR NOW (P4 recenter, unrelated to the
          SUPER-KING pass). Its old collider {2.8,0.3,1.6,0.55} overlapped
          the centered/enlarged bed's x-span, and centering the bed on the
          north wall was the explicit ask, so the dresser (body, drawers,
          manga stack, figurines, cactus) is deleted here. It returns
          elsewhere in a later step. ── */}

      {/* ── dragonslayer — REMOVED (parked for now). The sword's lean-zone
          rect, its meshes (pommel/grip/wraps/crossguard/blade/edge
          highlight), and its floor contact shadow are all gone — it's
          destined for the future gaming den; behelit trigger + sword
          relocation land with the eclipse/den plans. ── */}

      {/* ── wall sconce — relocated (SUPER-KING pass) from over the
          now-gone dragonslayer lean-zone to centered above the bed's
          headboard (SCONCE_X = BED_RECT.x + BED_RECT.w/2 = 4.0, same y=2.4
          and R.z+0.02 z-plane as before — only x moved). A sconce over the
          bed head is the natural composition now that the sword is gone.
          LAMP-CUT PASS lighting rebalance (still true): the GLB bed's own
          lamp (the room's other warm source on this wall) is cut from the
          model entirely (see BedModel's comment) — this sconce is the
          room's ONLY warm light left on the north wall, so intensity stays
          bumped at 5 (still under the ≤6 ceiling this fixture class caps
          at). Distance (3.6) and decay (2) untouched — only the falloff
          strength changed, not its reach. The engawa's reserved (comment-
          only, not-yet-built) bonsai-pedestal spot on the deck's south
          side may get its own small lamp in a later dressing pass —
          flagged here rather than solved now, since a second fixture
          wasn't this task's ask either (the engawa rework's own lighting
          note: NO new lights this wave, it reads by scene ambient + door
          glow). One fixture-attached source, House/StairsApproach's
          brass-half-dome sconce as the pattern (same mount box + emissive
          cone, pointLight nested INSIDE this group so it's rotation-safe
          by construction even though this group happens to carry no
          rotation — matches the fixture-nesting rule regardless), warm,
          no castShadow. The room's SE corner (~6.6,4.9, where the sword
          used to stand) stays unlit here on purpose — a bonsai stand was
          slated to land there in a follow-up plan; the engawa's reserved
          spot is a SECOND bonsai spot, so there may be two bonsai mentions
          in this file going forward — flagged for Rohan's call on which
          stands. ── */}
      <group position={[SCONCE_X, 2.4, R.z + 0.02]}>
        <mesh position={[0, -0.09, -0.02]}>
          <boxGeometry args={[0.1, 0.05, 0.06]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.11, 0.14, 8, 1, true]} />
          <meshStandardMaterial color="#ffcf8f" emissive="#ffcf8f" emissiveIntensity={0.8} side={2} />
        </mesh>
        <pointLight color="#ffcf8f" intensity={5} distance={3.6} decay={2} />
      </group>

      {/* ── rug (no collider — visual only, walkable) — rug-bedroom is a
          single alpha-cutout oval image, same repeat(1,1) + transparent
          convention as MusicNook's kilim rug. Position untouched by the
          SUPER-KING pass (not in this task's scope, no collider so no test
          catches it): half-extents 1.2×0.85 give x-range 2.1–4.5, z-range
          2.75–4.45. STALE flag: the bed's far z edge grew 2.58→2.83 this
          pass, which now runs 0.08m PAST the rug's z-min (2.75) — a visual
          overlap (rug corner under the bed skirt), not a collision bug (no
          collider on the rug). Not moved here since it's outside this
          task's ask and the owner wanted no-browser verification; flagged
          for the owner to eyeball and, if needed, nudge the rug south in a
          follow-up pass. Previously checked against the bed and nightstand
          in the P4-recenter report (the window table and its moon patch,
          also checked there, are gone as of the P4 engawa wave) — those
          clearances are unaffected by this pass. ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.3, 0.035, 3.6]}>
        <planeGeometry args={[2.4, 1.7]} />
        <meshStandardMaterial map={rugTex} transparent />
      </mesh>

      {/* ── corner plant — collider {0.45,5.1,0.4,0.4}. MusicNook's
          potted-plant idiom (pot cylinder + leaf blades), pot color
          "#55677a" (slate blue-gray) — distinct from every other pot in the
          house (snake plant / cactus / staircase use terracotta "#a04b3a";
          pothos + shelf vine pots use tan "#c9b088"). ── */}
      <group position={[PLANT_CENTER.x, 0, PLANT_CENTER.z]}>
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.14, 0.1, 0.26, 8]} />
          <meshStandardMaterial color="#55677a" />
        </mesh>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 + 0.4;
          const h = 0.34 + (i % 2) * 0.14;
          const r = 0.03 + (i % 2) * 0.02;
          return (
            <mesh
              key={i}
              position={[Math.sin(a) * r, 0.26 + h / 2, Math.cos(a) * r]}
              rotation={[((i % 2) - 0.5) * 0.15, a, 0.12]}
            >
              <boxGeometry args={[0.06, h, 0.02]} />
              <meshStandardMaterial color={i % 2 ? "#3f8f5a" : "#2e6e54"} />
            </mesh>
          );
        })}
      </group>

      {/* ── second plant — collider {0.95,5.15,0.35,0.35}, FURNISHING WAVE.
          Beside the first (SW corner, 0.1m gap). Different pot (terracotta
          "#a04b3a" — used elsewhere in the house for pots too, but distinct
          from the FIRST plant's slate-blue "#55677a" right next to it,
          which is this pair's own contrast) AND a different species
          silhouette: a bushy round cluster of small spheres instead of the
          first plant's upright blade leaves. ── */}
      <group position={[PLANT2_CENTER.x, 0, PLANT2_CENTER.z]}>
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.12, 0.09, 0.22, 8]} />
          <meshStandardMaterial color="#a04b3a" />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          const r = 0.05 + (i % 2) * 0.02;
          const s = 0.06 + (i % 3) * 0.012;
          return (
            <mesh key={i} position={[Math.sin(a) * r, 0.24 + s, Math.cos(a) * r]}>
              <sphereGeometry args={[s, 7, 6]} />
              <meshStandardMaterial color={i % 2 ? "#3f8f5a" : "#2e6e54"} />
            </mesh>
          );
        })}
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.08, 7, 6]} />
          <meshStandardMaterial color="#3f8f5a" />
        </mesh>
      </group>

      {/* ── single-person sofa / armchair — collider {0.6,0.4,0.95,0.95},
          NW corner, FURNISHING WAVE. Faces southeast into the room
          (rotation.y=π/4 maps local +z, the chair's own "open" front, to
          world (+x,+z) — southeast). Compact footprint (unrotated ~0.62m
          square) keeps the 45°-rotated diagonal comfortably inside the
          0.95×0.95 collider. Terracotta/rust fabric ("#8a4a3a" family) —
          distinct hue from the music nook's indigo-purple two-seat sofa
          (Sofa.tsx, "#4d4a75" family) per the brief. ── */}
      <group position={[SOFA_CENTER.x, 0, SOFA_CENTER.z]} rotation={[0, Math.PI / 4, 0]}>
        {/* base */}
        <mesh position={[0, 0.13, 0]}>
          <boxGeometry args={[0.62, 0.26, 0.62]} />
          <meshStandardMaterial color="#8a4a3a" />
        </mesh>
        {/* backrest (local -z, faces away from the room) */}
        <mesh position={[0, 0.42, -0.25]} rotation={[-0.12, 0, 0]}>
          <boxGeometry args={[0.62, 0.42, 0.16]} />
          <meshStandardMaterial color="#7a3f31" />
        </mesh>
        {/* armrests */}
        <mesh position={[-0.31, 0.32, 0]}>
          <boxGeometry args={[0.16, 0.3, 0.62]} />
          <meshStandardMaterial color="#7a3f31" />
        </mesh>
        <mesh position={[0.31, 0.32, 0]}>
          <boxGeometry args={[0.16, 0.3, 0.62]} />
          <meshStandardMaterial color="#7a3f31" />
        </mesh>
        {/* seat cushion */}
        <mesh position={[0, 0.28, 0.03]}>
          <boxGeometry args={[0.48, 0.1, 0.5]} />
          <meshStandardMaterial color="#a2593f" />
        </mesh>
        {/* one accent pillow */}
        <mesh position={[-0.16, 0.38, -0.14]} rotation={[0, 0.3, 0.08]}>
          <boxGeometry args={[0.18, 0.16, 0.06]} />
          <meshStandardMaterial color="#e6d8b8" />
        </mesh>
        {/* short wooden feet */}
        {[
          [-0.26, -0.26], [-0.26, 0.26], [0.26, -0.26], [0.26, 0.26],
        ].map(([fx, fz], i) => (
          <mesh key={i} position={[fx, 0.04, fz]}>
            <cylinderGeometry args={[0.028, 0.024, 0.08, 6]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
        ))}
      </group>

      {/* ── sunset-lamp stool — collider {5.85,0.42,0.4,0.4}, FURNISHING
          WAVE. Small wooden stool (round top, 3 legs) topped by a compact
          sunset-can lamp — same visible-fixture family as MusicNook's
          console lamp and Workspace's EVA-shrine crossfire cans (base
          cylinder + emissive lens disc), spotLight NESTED in the can,
          aimed west at the poster cluster (target x4.2/y2.0/z0.15, per the
          brief). Warm orange-pink, tuned to wash the east posters (P4/P5/
          P6 above, x 4.275-5.65) without blowing them out under the
          scene's Bloom (threshold 0.6, Effects.tsx) — intensity kept
          modest (8, vs. the nook's single sunset lamp at 16) since this
          fixture sits much closer to its targets. NO castShadow. ── */}
      <group position={[STOOL_CENTER.x, 0, STOOL_CENTER.z]}>
        {/* stool top */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.03, 10]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {/* 3 legs */}
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 + 0.3;
          return (
            <mesh key={i} position={[Math.sin(a) * 0.12, 0.2, Math.cos(a) * 0.12]}>
              <cylinderGeometry args={[0.018, 0.018, 0.4, 6]} />
              <meshStandardMaterial color="#4a3a2e" />
            </mesh>
          );
        })}
        {/* sunset can — base + emissive lens, tipped to aim west/north
            toward the poster cluster */}
        <group position={[0, 0.44, 0]} rotation={[0, 0, -0.55]}>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.06, 8]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, 0.065, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 0.012, 8]} />
            <meshStandardMaterial color="#ff7a72" emissive="#ff6a55" emissiveIntensity={3.2} />
          </mesh>
        </group>
        <spotLight
          position={[0, 0.5, 0]}
          target={stoolLampTarget}
          angle={0.55}
          penumbra={0.6}
          intensity={8}
          distance={4}
          decay={1.6}
          color="#ff7a5c"
        />
      </group>
      <primitive object={stoolLampTarget} position={[4.2, 2.0, 0.15]} />

      {/* ── bed-front bench — collider {3.5,2.95,1.2,0.4}, FURNISHING
          WAVE. Upholstered bench at the bed's foot (0.12m clear of the
          bed's far z edge, 2.83 — see p4-furnish-report.md). Dusty
          blue-gray cushion ("#5f6a8c", the DUSK palette tone) on a dark
          wood frame — cool accent against the warm terracotta sofa/cat
          bed. SPAWN moved to {4,4.3} because of this piece — see
          layout.ts's SPAWN comment. ── */}
      <group position={[BENCH_CENTER.x, 0, BENCH_CENTER.z]}>
        <mesh position={[0, 0.32, 0]}>
          <boxGeometry args={[BENCH_RECT.w - 0.08, 0.06, BENCH_RECT.d - 0.08]} />
          <meshStandardMaterial color="#5f6a8c" />
        </mesh>
        <mesh position={[0, 0.27, 0]}>
          <boxGeometry args={[BENCH_RECT.w - 0.14, 0.04, BENCH_RECT.d - 0.14]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        {[
          [-BENCH_RECT.w / 2 + 0.08, -BENCH_RECT.d / 2 + 0.06],
          [-BENCH_RECT.w / 2 + 0.08, BENCH_RECT.d / 2 - 0.06],
          [BENCH_RECT.w / 2 - 0.08, -BENCH_RECT.d / 2 + 0.06],
          [BENCH_RECT.w / 2 - 0.08, BENCH_RECT.d / 2 - 0.06],
        ].map(([fx, fz], i) => (
          <mesh key={i} position={[fx, 0.125, fz]}>
            <boxGeometry args={[0.04, 0.25, 0.04]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
        ))}
      </group>

      {/* ── clothes hanger stand — collider {3.3,5.35,2.2,0.5},
          south-center. A-FRAME RACK REDO (owner reference photo,
          2026-07-19; recolored/re-hung in the wardrobe-corner upgrade, same
          day), replacing the old two-pole-and-rail build entirely. Two
          trapezoid side frames (each a pair of legs splayed wide at the
          floor, converging under the rail — the signature A silhouette),
          a single round top rail with finial nubs poking past each frame,
          7 curated garments hanging VERTICALLY (boutique-rail mix: 2
          structured jackets, 3 shirts, 2 T-shirts — see the garments array
          below), a bottom shelf with 3 folded denim/pants/shorts stacks,
          3 pairs of floor shoes, and a side peg with a sunhat. All spans
          derive from HANGER_* consts above (rect-derived) — see
          p4-furnish-report.md "A-frame rack redo" + "Balcony freed +
          wardrobe v2" for the full arithmetic.

          FUTURE: interact → outfit change; clothes/characters unlock via
          easter eggs (owner roadmap). ── */}
      <group position={[HANGER_CENTER.x, 0, HANGER_CENTER.z]}>
        {/* two A-frame sides */}
        {[-1, 1].map((side) => {
          const sx = side * HANGER_SIDE_X;
          return (
            <group key={side}>
              {/* back leg: floor at z=+D, leans to meet the rail at z=0 */}
              <mesh
                position={[sx, HANGER_RAIL_Y / 2, HANGER_LEG_D / 2]}
                rotation={[-HANGER_LEG_ANGLE, 0, 0]}
              >
                <cylinderGeometry args={[0.028, 0.034, HANGER_LEG_LEN, 6]} />
                <meshStandardMaterial color="#4a3a2e" />
              </mesh>
              {/* front leg: floor at z=-D, leans to meet the rail at z=0 */}
              <mesh
                position={[sx, HANGER_RAIL_Y / 2, -HANGER_LEG_D / 2]}
                rotation={[HANGER_LEG_ANGLE, 0, 0]}
              >
                <cylinderGeometry args={[0.028, 0.034, HANGER_LEG_LEN, 6]} />
                <meshStandardMaterial color="#4a3a2e" />
              </mesh>
              {/* rail finial nub — thin continuation past the frame, capped
                  with a small knob, per the reference photo ── */}
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                position={[sx + side * 0.04, HANGER_RAIL_Y, 0]}
              >
                <cylinderGeometry args={[0.02, 0.02, 0.08, 6]} />
                <meshStandardMaterial color="#4a3a2e" />
              </mesh>
              <mesh position={[sx + side * 0.08, HANGER_RAIL_Y, 0]}>
                <sphereGeometry args={[0.03, 8, 6]} />
                <meshStandardMaterial color="#3a2c22" />
              </mesh>
            </group>
          );
        })}
        {/* top rail spanning between the two peaks */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, HANGER_RAIL_Y, 0]}>
          <cylinderGeometry args={[0.026, 0.026, HANGER_SIDE_X * 2, 8]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>

        {/* 7 garments — boutique rail (wardrobe-corner upgrade, owner ask:
            "read EXPENSIVE, hang VERTICALLY"). Each garment is clearly
            taller than wide (drapey straight-down silhouette, not the old
            wave's horizontal-leaning slabs), evenly spaced at a tight,
            consistent 0.22m — a boutique rail, not a random hanger jumble.
            Mix, west→east: dark tailored jacket, white/sky-blue/sage
            shirts (slight taper toward the hem), a camel overcoat (the
            longest piece), then two shorter T-shirts (one graphic-block
            accent). Jackets get a lower roughness (0.35, vs. the shirts'/
            tees' matte 0.85-0.9) so they catch the lamp light — the
            brief's "subtle material touch." ── */}
        {[
          { dx: -0.66, kind: "jacket" as const, h: 0.6, w: 0.22, c: "#22222c", collar: "#3a3a45", seam: "#161619" }, // dark tailored jacket
          { dx: -0.44, kind: "shirt" as const, h: 0.5, w: 0.2, c: "#f5f0e6", taperC: "#ece3d4" }, // crisp white shirt
          { dx: -0.22, kind: "shirt" as const, h: 0.48, w: 0.19, c: "#9fc8e8", taperC: "#8fb8db" }, // sky-blue shirt
          { dx: 0, kind: "shirt" as const, h: 0.46, w: 0.19, c: "#a8b89a", taperC: "#98a88a" }, // sage shirt
          { dx: 0.22, kind: "jacket" as const, h: 0.64, w: 0.24, c: "#c9a877", collar: "#dcc090", seam: "#9c7f56" }, // camel overcoat, longest piece
          { dx: 0.44, kind: "tshirt" as const, h: 0.34, w: 0.2, c: "#e7e0cf", graphic: "#b3475f" }, // graphic-block tee
          { dx: 0.66, kind: "tshirt" as const, h: 0.32, w: 0.19, c: "#5f6a8c" }, // plain dusk-blue tee
        ].map((g, i) => {
          const topY = HANGER_RAIL_Y - 0.16; // garment top anchor, same convention as the prior wave
          return (
            <group key={i}>
              {/* hook + pale hanger bar */}
              <mesh position={[g.dx, HANGER_RAIL_Y - 0.06, 0]}>
                <torusGeometry args={[0.026, 0.006, 6, 8, Math.PI]} />
                <meshStandardMaterial color="#e7e0cf" />
              </mesh>
              <mesh position={[g.dx, HANGER_RAIL_Y - 0.12, 0]}>
                <boxGeometry args={[g.w * 0.9, 0.014, 0.014]} />
                <meshStandardMaterial color="#e7e0cf" />
              </mesh>

              {g.kind === "jacket" && (
                <>
                  {/* structured shoulder yoke */}
                  <mesh position={[g.dx, topY - g.h * 0.09, 0]}>
                    <boxGeometry args={[g.w, g.h * 0.18, 0.075]} />
                    <meshStandardMaterial color={g.c} roughness={0.35} metalness={0.05} />
                  </mesh>
                  {/* body — hangs straight down, clearly taller than wide */}
                  <mesh position={[g.dx, topY - g.h * 0.18 - (g.h * 0.82) / 2, 0]}>
                    <boxGeometry args={[g.w * 0.86, g.h * 0.82, 0.06]} />
                    <meshStandardMaterial color={g.c} roughness={0.35} metalness={0.05} />
                  </mesh>
                  {/* collar/lapel hint — an open notch pair at the yoke */}
                  <mesh position={[g.dx - g.w * 0.16, topY - g.h * 0.03, 0.045]} rotation={[0, 0, 0.5]}>
                    <boxGeometry args={[0.03, g.h * 0.16, 0.02]} />
                    <meshStandardMaterial color={g.collar} />
                  </mesh>
                  <mesh position={[g.dx + g.w * 0.16, topY - g.h * 0.03, 0.045]} rotation={[0, 0, -0.5]}>
                    <boxGeometry args={[0.03, g.h * 0.16, 0.02]} />
                    <meshStandardMaterial color={g.collar} />
                  </mesh>
                  {/* sleeve seams — thin vertical inset lines down each side */}
                  <mesh position={[g.dx - g.w * 0.4, topY - g.h * 0.18 - (g.h * 0.82) / 2, 0.033]}>
                    <boxGeometry args={[0.014, g.h * 0.78, 0.006]} />
                    <meshStandardMaterial color={g.seam} />
                  </mesh>
                  <mesh position={[g.dx + g.w * 0.4, topY - g.h * 0.18 - (g.h * 0.82) / 2, 0.033]}>
                    <boxGeometry args={[0.014, g.h * 0.78, 0.006]} />
                    <meshStandardMaterial color={g.seam} />
                  </mesh>
                </>
              )}

              {g.kind === "shirt" && (
                <>
                  {/* chest — full width */}
                  <mesh position={[g.dx, topY - g.h * 0.175, 0]}>
                    <boxGeometry args={[g.w, g.h * 0.35, 0.05]} />
                    <meshStandardMaterial color={g.c} roughness={0.85} />
                  </mesh>
                  {/* slight taper toward the hem, same-family tone */}
                  <mesh position={[g.dx, topY - g.h * 0.35 - (g.h * 0.65) / 2, 0]}>
                    <boxGeometry args={[g.w * 0.8, g.h * 0.65, 0.045]} />
                    <meshStandardMaterial color={g.taperC} roughness={0.85} />
                  </mesh>
                </>
              )}

              {g.kind === "tshirt" && (
                <>
                  {/* short single drop — shorter than the jackets/shirts */}
                  <mesh position={[g.dx, topY - g.h / 2, 0]}>
                    <boxGeometry args={[g.w, g.h, 0.045]} />
                    <meshStandardMaterial color={g.c} roughness={0.9} />
                  </mesh>
                  {g.graphic && (
                    <mesh position={[g.dx, topY - g.h * 0.42, 0.025]}>
                      <boxGeometry args={[g.w * 0.42, g.h * 0.3, 0.008]} />
                      <meshStandardMaterial color={g.graphic} />
                    </mesh>
                  )}
                </>
              )}
            </group>
          );
        })}

        {/* bottom shelf, spanning between the legs at HANGER_SHELF_Y */}
        <mesh position={[0, HANGER_SHELF_Y - 0.015, 0]}>
          <boxGeometry args={[HANGER_SHELF_W, 0.03, HANGER_SHELF_D]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>

        {/* folded clothing stacks — wardrobe-corner upgrade: the old
            box/basket/blanket trio is replaced by 3 neat folded-slab
            stacks (denim blues / charcoal pants / tan shorts). Each stack
            is 2-3 folded slabs; a thin darker band inset on each slab's
            front face reads as the fold line. ── */}
        {[
          {
            gx: -0.55, // denim stack (west) — blue tones
            slabs: [
              { h: 0.06, w: 0.26, d: 0.2, c: "#3f5a8c", band: "#324a75" },
              { h: 0.055, w: 0.24, d: 0.19, c: "#557bb0", band: "#44659a" },
              { h: 0.05, w: 0.22, d: 0.18, c: "#7a97c2", band: "#6483ad" },
            ],
          },
          {
            gx: 0.02, // pants stack (center) — charcoal tones
            slabs: [
              { h: 0.055, w: 0.24, d: 0.19, c: "#3a3a45", band: "#2c2c35" },
              { h: 0.05, w: 0.22, d: 0.18, c: "#55555f", band: "#44444e" },
            ],
          },
          {
            gx: 0.58, // shorts stack (east) — tan tones, shallower slabs
            slabs: [
              { h: 0.045, w: 0.22, d: 0.17, c: "#c9a877", band: "#b3925f" },
              { h: 0.04, w: 0.2, d: 0.16, c: "#d9c9a0", band: "#c4b088" },
              { h: 0.04, w: 0.19, d: 0.15, c: "#b98a52", band: "#a37743" },
            ],
          },
        ].map(({ gx, slabs }, si) => {
          let y = 0;
          return (
            <group key={si} position={[gx, HANGER_SHELF_Y, 0]}>
              {slabs.map((s, i) => {
                const cy = y + s.h / 2;
                y += s.h;
                return (
                  <group key={i}>
                    <mesh position={[0, cy, 0]}>
                      <boxGeometry args={[s.w, s.h, s.d]} />
                      <meshStandardMaterial color={s.c} roughness={0.9} />
                    </mesh>
                    {/* fold line — thin darker band across the front face */}
                    <mesh position={[0, cy, s.d / 2 + 0.002]}>
                      <boxGeometry args={[s.w * 0.94, s.h * 0.28, 0.004]} />
                      <meshStandardMaterial color={s.band} />
                    </mesh>
                  </group>
                );
              })}
            </group>
          );
        })}

        {/* floor shoes — three simple pairs beneath/beside the rack */}
        {[
          { dx: -0.9, c: "#6b4128" },
          { dx: -0.2, c: "#22222c" },
          { dx: 0.9, c: "#a04b3a" },
        ].map(({ dx, c }, i) => (
          <group key={i}>
            <mesh position={[dx - 0.05, 0.03, -0.18]}>
              <boxGeometry args={[0.1, 0.06, 0.2]} />
              <meshStandardMaterial color={c} />
            </mesh>
            <mesh position={[dx + 0.09, 0.03, -0.18]}>
              <boxGeometry args={[0.1, 0.06, 0.2]} />
              <meshStandardMaterial color={c} />
            </mesh>
          </group>
        ))}

        {/* side peg on the east frame with a sunhat hanging from it — peg
            tip + hat brim stay inside HANGER_SIDE_X + 0.11 (well under the
            rect's half-width + 4cm tolerance, 1.14) ── */}
        <mesh
          rotation={[0, 0, Math.PI / 2]}
          position={[HANGER_SIDE_X + 0.02, 1.32, -HANGER_LEG_D * 0.4]}
        >
          <cylinderGeometry args={[0.012, 0.012, 0.04, 6]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        <group position={[HANGER_SIDE_X + 0.05, 1.22, -HANGER_LEG_D * 0.4]}>
          <mesh>
            <cylinderGeometry args={[0.06, 0.06, 0.015, 10]} />
            <meshStandardMaterial color="#d9c9a0" />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.032, 0.04, 0.05, 10]} />
            <meshStandardMaterial color="#d9c9a0" />
          </mesh>
        </group>
      </group>

      {/* ── shoe storage — collider {5.62,5.35,0.8,0.45}, NEW
          (wardrobe-corner upgrade, 2026-07-19), beside the rack's east
          flank (12cm gap to the rack, 13cm to the perfume stand — TDD'd,
          see layout.ts's comment + furniture.test.ts). Low 2-shelf open
          cubby: dark side/back panels, floor board + one mid shelf + top
          slab, open front so the shoes read. 5 pairs across the two tiers
          (sneakers, boots, slides — varied colors, chunky pixel look).
          All spans derive from SHOE_RECT via the SHOE_* consts above. ── */}
      <group position={[SHOE_CENTER.x, 0, SHOE_CENTER.z]}>
        {/* side panels */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * (SHOE_RECT.w / 2 - SHOE_PANEL_T / 2), SHOE_H / 2, 0]}
          >
            <boxGeometry args={[SHOE_PANEL_T, SHOE_H, SHOE_RECT.d]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
        ))}
        {/* back panel (south face — the unit backs onto the south wall) */}
        <mesh position={[0, SHOE_H / 2, SHOE_RECT.d / 2 - SHOE_PANEL_T / 2]}>
          <boxGeometry args={[SHOE_RECT.w - SHOE_PANEL_T * 2, SHOE_H, SHOE_PANEL_T]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        {/* floor board, mid shelf, top slab */}
        {[SHOE_PANEL_T / 2, SHOE_MID_Y, SHOE_H - SHOE_PANEL_T / 2].map((sy, i) => (
          <mesh key={i} position={[0, sy, 0]}>
            <boxGeometry
              args={[SHOE_RECT.w - SHOE_PANEL_T * 2, SHOE_PANEL_T, SHOE_RECT.d - 0.02]}
            />
            <meshStandardMaterial color={i === 2 ? "#6b4128" : "#5a4632"} />
          </mesh>
        ))}
        {/* shoes — 5 chunky pixel pairs across the two tiers: sneakers
            (toe-cap accent), boots (taller shaft block), slides (low flat
            slab). Bottom tier sits on the floor board, top tier on the mid
            shelf. Toes face the room (-z, open front). */}
        {[
          // bottom tier
          { dx: -0.24, ty: SHOE_PANEL_T, kind: "sneaker" as const, c: "#e7e0cf", cap: "#b3475f" },
          { dx: 0.0, ty: SHOE_PANEL_T, kind: "boot" as const, c: "#6b4128" },
          { dx: 0.24, ty: SHOE_PANEL_T, kind: "slide" as const, c: "#57b6e8" },
          // top tier
          { dx: -0.18, ty: SHOE_MID_Y + SHOE_PANEL_T / 2, kind: "sneaker" as const, c: "#22222c", cap: "#e7e0cf" },
          { dx: 0.18, ty: SHOE_MID_Y + SHOE_PANEL_T / 2, kind: "boot" as const, c: "#3a3a45" },
        ].map(({ dx, ty, kind, c, cap }, i) => (
          <group key={i} position={[dx, ty, -0.03]}>
            {[-0.045, 0.045].map((sx) => (
              <group key={sx} position={[sx, 0, 0]}>
                {/* sole + body */}
                <mesh position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.07, 0.04, kind === "slide" ? 0.12 : 0.15]} />
                  <meshStandardMaterial color={c} />
                </mesh>
                {kind === "sneaker" && cap && (
                  <mesh position={[0, 0.02, -0.075]}>
                    <boxGeometry args={[0.07, 0.04, 0.03]} />
                    <meshStandardMaterial color={cap} />
                  </mesh>
                )}
                {kind === "boot" && (
                  <mesh position={[0, 0.075, 0.035]}>
                    <boxGeometry args={[0.06, 0.07, 0.07]} />
                    <meshStandardMaterial color={c} />
                  </mesh>
                )}
              </group>
            ))}
          </group>
        ))}
      </group>

      {/* ── perfume stand — collider {6.55,5.3,1.0,0.5}, SE corner,
          FURNISHING WAVE. Waist-high slim dresser with 6 tiny bottles on
          top (varied heights/colors) and one atomizer bulb. ── */}
      <group position={[PERFUME_CENTER.x, 0, PERFUME_CENTER.z]}>
        <mesh position={[0, 0.36, 0]}>
          <boxGeometry args={[PERFUME_RECT.w - 0.06, 0.72, PERFUME_RECT.d - 0.06]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        <mesh position={[0, 0.735, 0]}>
          <boxGeometry args={[PERFUME_RECT.w, 0.03, PERFUME_RECT.d]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {[
          { dx: -0.3, h: 0.1, c: "#57b6e8" },
          { dx: -0.15, h: 0.14, c: "#f2ecd8" },
          { dx: 0.0, h: 0.08, c: "#b3475f" },
          { dx: 0.16, h: 0.12, c: "#5b4b8a" },
          { dx: 0.3, h: 0.09, c: "#ffb35c" },
        ].map(({ dx, h, c }, i) => (
          <mesh key={i} position={[dx, 0.75 + h / 2, i % 2 === 0 ? -0.06 : 0.06]}>
            <cylinderGeometry args={[0.025, 0.03, h, 6]} />
            <meshStandardMaterial color={c} />
          </mesh>
        ))}
        {/* atomizer bulb — a bottle with a small sphere "bulb" on top */}
        <mesh position={[-0.02, 0.79, 0.12]}>
          <cylinderGeometry args={[0.028, 0.032, 0.1, 6]} />
          <meshStandardMaterial color="#a04b3a" />
        </mesh>
        <mesh position={[-0.02, 0.855, 0.12]}>
          <sphereGeometry args={[0.025, 8, 6]} />
          <meshStandardMaterial color="#e6d8b8" />
        </mesh>
      </group>

      {/* ── mirror — east divider's bedroom face, south of the door gap
          (wallSegS, x=7.89, z-center 4.9, z-span 3.8-6), FURNISHING WAVE.
          Dark frame + a flat pale-cool gradient plane standing in for a
          reflection (real reflections rejected for cost, per the brief) —
          a brighter diagonal streak plane fakes a highlight across it.
          Same "wall → frame → glass" layered-offset convention as the
          engawa's sliding door (each layer ≥6mm proud of the last, here
          stacking toward -x/west since this wall's face normal points
          -x). No collider — flush wall dressing. ── */}
      <mesh position={[MIRROR_FRAME_X, 1.5, 4.9]}>
        <boxGeometry args={[MIRROR_FRAME_DEPTH, MIRROR_H + 0.08, MIRROR_W + 0.08]} />
        <meshStandardMaterial color="#22222c" />
      </mesh>
      <mesh position={[MIRROR_GLASS_X, 1.5, 4.9]}>
        <boxGeometry args={[0.01, MIRROR_H, MIRROR_W]} />
        <meshStandardMaterial color="#c7d3dc" metalness={0.3} roughness={0.15} />
      </mesh>
      <mesh position={[MIRROR_GLASS_X - 0.006, 1.35, 4.85]} rotation={[0, 0, 0.55]}>
        <boxGeometry args={[0.006, 1.5, 0.12]} />
        <meshStandardMaterial color="#eef3f6" />
      </mesh>
    </group>
  );
}
