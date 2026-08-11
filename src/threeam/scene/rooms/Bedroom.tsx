"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { usePixelTexture } from "../usePixelTexture";
import { Cat } from "./Cat";
import { BroadleafPlant, PottedTree, TallPalm, FicusLyrata, Bonsai } from "../models/Plants";

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
// PLANT PASS (this pass, owner ask: place the newly-prepared plant GLBs
// around the house) — the two hand-built corner plants (pot cylinder +
// leaf-blade/sphere-cluster meshes) below are REPLACED by real GLB models
// (BroadleafPlant + PottedTree, scene/models/Plants.tsx). Rects sized to
// each model's own real footprint (0.94x0.84 / 0.66x0.66, per Plants.tsx),
// nudged 12cm further south than the old hand-built rects (z 5.1/5.15 ->
// 5.0, same x) so the bigger broadleaf clears the {1.6,4.6} "between the
// hanger and the plants" walkway probe with real margin (was 1.2cm at the
// old z — too thin — now 4.6cm). See layout.ts's own PLANT PASS comment
// for the verbatim copy + the rest of the clearance arithmetic.
const BEDROOM_BROADLEAF_RECT = { x: 0.43, z: 5.0, w: 0.94, d: 0.84 };
const BEDROOM_POTTEDTREE_RECT = { x: 1.55, z: 5.0, w: 0.66, d: 0.66 };
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

// rug — derived from the bed so it never has to be hand-guessed: centered
// on BED_RECT's centerline, north edge tucked 0.15m under the bed's foot,
// south edge clear of the wardrobe/plants zone.
const RUG_W = 2.4;
const RUG_D = 1.7;
const RUG_TUCK = 0.15;
const RUG_X = BED_RECT.x + BED_RECT.w / 2; // 4.0, bed's own centerline
const RUG_Z = BED_RECT.z + BED_RECT.d - RUG_TUCK + RUG_D / 2; // 3.53 — north edge 2.68 (0.15 under the bed foot), south edge 4.38

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
// CATBED ENLARGE PASS (this pass, owner ask: "make the cat's bed bigger" —
// she was just recolored to an orange tabby, but she and her bed still read
// too small from the dollhouse camera). 1.6x the old diameter (0.55→0.88,
// exactly the 1.5-1.7x brief). Grown off the corner CLOSEST to the walls,
// not center-out: the NE corner (old x-max 7.60, old z-min 0.45) keeps its
// EXACT old wall margins (0.3m off the east interior wall at x=7.9, 0.45m
// off the north exterior wall — both unchanged, both already the
// established near-wall margin other bedroom pieces use), and the extra
// 0.33m of width/depth is added toward the open south-west instead — a
// deliberate small nudge of the bed's CENTER (old 7.325,0.725 → new
// 7.16,0.89), not a random reposition. New x-min (6.72) still clears the
// sunset-lamp stool (x-max 6.25) by 0.47m, comfortably no overlap (checked
// in furniture.test.ts's pairwise-overlap sweep) — see p4-catbed-report.md
// for the full clearance table (stool, nightstands, shelves, mirror, walls).
const CATBED_RECT = { x: 6.72, z: 0.45, w: 0.88, d: 0.88 };
// bed-front bench — REMOVED (owner ask: "that sitting thing at the bottom
// of the bed" gone). Its collider ({3.5,2.95,1.2,0.4}) is gone from
// layout.ts's furniture list too. SPAWN ({4,4.3}) was chosen for this
// piece's clearance, but stays put — it's still clear of every remaining
// bedroom rect (see the SPAWN comment in layout.ts), no test forced a move.
const HANGER_RECT = { x: 3.3, z: 5.35, w: 2.2, d: 0.5 };
// shoe storage cubby — NEW (wardrobe corner upgrade, 2026-07-19), collider
// verbatim from layout.ts. Sits east of the rack (see layout.ts's comment
// for the 12cm/13cm TDD'd clearances to the rack and the perfume stand).
const SHOE_RECT = { x: 5.62, z: 5.35, w: 0.8, d: 0.45 };
const PERFUME_RECT = { x: 6.55, z: 5.3, w: 1.0, d: 0.5 };

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
const HANGER_CENTER = { x: HANGER_RECT.x + HANGER_RECT.w / 2, z: HANGER_RECT.z + HANGER_RECT.d / 2 };
const SHOE_CENTER = { x: SHOE_RECT.x + SHOE_RECT.w / 2, z: SHOE_RECT.z + SHOE_RECT.d / 2 };
// shoe cubby — REMOVED (PIPE WARDROBE REBUILD, owner reference photo,
// 2026-08-02): the reference photo has no shoe storage at this spot, so the
// old 2-shelf shoe cubby build is gone (owner's judgment call — see the
// report). SHOE_RECT's COLLIDER is KEPT unchanged; the new wooden-shelf
// third of the wardrobe unit below still derives every span from it, same
// "never re-hardcode a collider's numbers" rule as everywhere else here.
//
// PIPE WARDROBE REBUILD (owner reference photo, 2026-08-02) — replaces the
// old A-frame wooden rack + shoe cubby entirely with a modern industrial
// black-pipe wardrobe: an open hanging rail (HANGER_RECT), wooden open
// shelves (SHOE_RECT), and a black chest of drawers spanning both. Every
// span below derives from HANGER_RECT/SHOE_RECT (never hand-guessed) — see
// p4-wardrobe-pipe-report.md for the full arithmetic.
const WARD_RAIL_Y = 1.7; // hanging-rail height — kept from the prior A-frame pass, still reads right for a rail
const WARD_UPRIGHT_X = HANGER_RECT.w / 2 - 0.12; // 0.98 — rail-side pipe upright x-offset from HANGER_CENTER (same inset formula the old A-frame's HANGER_SIDE_X used)
const WARD_PIPE_R = 0.022; // uniform black-pipe radius — rail, uprights, and shelf brackets all share this
const WARD_FLANGE_R = 0.05; // floor-mount flange plate radius (pipe-fitting look)
const WARD_ELBOW_R = 0.032; // elbow/joint fitting radius, proud of the pipe radius so it reads as a fitting, not a bare bend

// drawer chest — spans the FULL combined width (the union of HANGER_RECT and
// SHOE_RECT; they share the same z-origin, HANGER_RECT.z === SHOE_RECT.z ===
// 5.35, so the union is a clean rectangle), sitting on the floor beneath
// both the rail and the shelves. Depth uses the SHALLOWER of the two rects'
// depths so the cabinet stays inside BOTH colliders' z-bounds
// (SHOE_RECT.d=0.45 < HANGER_RECT.d=0.5). The 12cm gap between the two
// rects (HANGER_RECT's x-max 5.5 to SHOE_RECT's x-min 5.62) is narrower than
// 2x the player radius (0.35m), so it was already unwalkable before this
// pass — the cabinet visually bridging it needs no new collider.
const WARD_X0 = HANGER_RECT.x; // 3.3, west edge
const WARD_X1 = SHOE_RECT.x + SHOE_RECT.w; // 6.42, east edge
const WARD_XC = (WARD_X0 + WARD_X1) / 2;
const WARD_W = WARD_X1 - WARD_X0;
const WARD_D = SHOE_RECT.d; // 0.45 — shallower of the two rect depths
const WARD_ZC = HANGER_RECT.z + WARD_D / 2;
const WARD_DRAWER_H = 0.55; // low wide chest — waist-high, well under the rail/shelves
const WARD_DRAWER_TOP_T = 0.03;
const WARD_DRAWER_TOP_Y = WARD_DRAWER_H + WARD_DRAWER_TOP_T; // top surface, world y = 0.58

// wooden shelves (SHOE_RECT) — 3 short planks at different heights, riding
// the same black-pipe-frame language as the rail. Span between the drawer
// chest's own top surface (+ clearance) and just under the rail's own
// height, in 3 even steps.
const WARD_SHELF_SPAN_Y0 = WARD_DRAWER_TOP_Y + 0.05; // lowest shelf, just clear of the drawer top
const WARD_SHELF_SPAN_Y1 = WARD_RAIL_Y - 0.1; // top shelf, just under the rail height
const WARD_SHELF_YS = [0, 1, 2].map(
  (i) => WARD_SHELF_SPAN_Y0 + (i / 2) * (WARD_SHELF_SPAN_Y1 - WARD_SHELF_SPAN_Y0)
); // [0.63, 1.115, 1.6]
const WARD_SHELF_T = 0.03; // plank thickness
const WARD_SHELF_UPRIGHT_X = SHOE_RECT.w / 2 - 0.05; // 0.35 — shelf-side pipe upright x-offset from SHOE_CENTER
const WARD_SHELF_W = WARD_SHELF_UPRIGHT_X * 2 - 0.06; // 0.64 — nearly spans the two shelf uprights
const WARD_SHELF_D = SHOE_RECT.d - 0.08; // 0.37 — plank depth, inset from the frame
const PERFUME_CENTER = { x: PERFUME_RECT.x + PERFUME_RECT.w / 2, z: PERFUME_RECT.z + PERFUME_RECT.d / 2 };
// VANITY DRESSING PASS (this pass, owner ask: "the perfume table near the
// mirror... put a small plant on it, a small lamp, and an organiser which
// has the cosmetics, a tray which can have maybe keys and stuff") — the
// table's own body/top-slab heights (previously hand-typed literals 0.72 /
// 0.735 / 0.03 in the JSX below) are named here so every new tabletop item's
// Y stacks off PERFUME_TOP_Y instead of a hand-guessed number, same
// convention as NS_TOP_Y/WARD_DRAWER_TOP_Y/SOUTH_LAMP_SHADE_Y elsewhere in
// this file.
const PERFUME_BODY_H = 0.72;
const PERFUME_TOP_T = 0.03;
const PERFUME_TOP_Y = PERFUME_BODY_H + PERFUME_TOP_T; // 0.75 — table's own top surface, world y
const BEDROOM_POTTEDTREE_CENTER = {
  x: BEDROOM_POTTEDTREE_RECT.x + BEDROOM_POTTEDTREE_RECT.w / 2,
  z: BEDROOM_POTTEDTREE_RECT.z + BEDROOM_POTTEDTREE_RECT.d / 2,
};

const BEDROOM_BROADLEAF_CENTER = {
  x: BEDROOM_BROADLEAF_RECT.x + BEDROOM_BROADLEAF_RECT.w / 2,
  z: BEDROOM_BROADLEAF_RECT.z + BEDROOM_BROADLEAF_RECT.d / 2,
};

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
// SUPER-KING pass, the FURNISHING WAVE, and now the OPEN-SOUTH pass) —
// STALE ABOVE: every prior derivation (foot-corner vertex cluster,
// Tz/Zmin/Xc arithmetic) described curling on the GLB bed's own top
// surface. The owner's ask that wave was "move the cat to her cat bed"
// (CATBED_RECT, NE corner) — she no longer sits on the bed at all, so none
// of that GLB-surface math applies anymore (kept above only as history for
// the bed's own foot-surface height, which other future props could still
// want). The new perch is this file's own constructed geometry
// (CATBED_PAD_H below), not a probed mesh, so the derivation is direct:
// CAT_Y is exactly the inner pad's top surface (CATBED_PAD_H, world y since
// the pad sits on the floor at y=0), and CAT_X/CAT_Z sit at the pad's
// center (CATBED_CENTER) — a round bed has no "foot corner" to inset from,
// so the cat curls dead-center on the pad (rotationY left at the
// component's own default, same curl look as before).
// OPEN-SOUTH PASS / CATBED FIX PASS: re-checked against the new geometry
// below — CATBED_RECT and CATBED_RING_R are UNCHANGED; CATBED_PAD_R shrinks
// (CATBED FIX PASS, see that const's own comment) but its CENTER doesn't
// move, so CAT_X/CAT_Y/CAT_Z — derived from CATBED_CENTER and CATBED_PAD_H,
// neither of which changed — stay exactly what this same formula already
// produced. Re-derived, not re-guessed: nothing to update.
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

// cat bed (FURNISHING WAVE; radii re-tuned by CATBED FIX PASS, see below)
// — round pet bed: a cushion ring with a flat inner pad nested inside it.
// CATBED_RING_TUBE still sets the ring's own (full-height) thickness off
// the floor; pad height is independent (it's a separate flat cylinder, not
// derived from the ring). Pad HEIGHT is untouched throughout every pass
// (only ever a diameter/radius brief, never a taller-cushion one).
// CATBED_RING_R / CATBED_RING_TUBE — CATBED FIX PASS re-tunes both (was
// 0.304 / 0.112). Root cause #2 of the fan/starburst screenshot: a
// full-height rim segment's inner edge sits at RING_R − TUBE, which at the
// old values (0.304 − 0.112 = 0.192) was SMALLER than the pad radius
// (0.256) — the pad was nested UNDER the ring's inner lip instead of
// inside it, so the cushion barely read. First attempt at the fix shrank
// the pad instead (to 0.17) — verified in-browser (screenshot diff) that
// this actually made things WORSE: CAT_SCALE's own comment above states
// the pad should be big enough to give her "room to stretch out in", and a
// 0.17 pad is smaller than her own scaled body footprint (main loaf box
// 0.28×0.2 at CAT_SCALE 1.3 ≈ 0.36×0.26), so she covered the entire pad and
// the cushion still didn't read. Correct fix: widen the RING's inner
// radius instead, so the pad can stay big (0.256, unchanged from the
// ENLARGE pass) and still clear the rim. TUBE narrows 0.112→0.067 (a
// slimmer wall, still a real rim) and RING_R grows 0.304→0.343 to
// compensate — inner edge = 0.343−0.067 = 0.276 (0.02m/~8% clear of
// CATBED_PAD_R), outer edge = 0.343+0.067 = 0.41, still inside the
// CATBED_RECT half-extent (0.44m) with a ~7% margin (same margin class the
// ENLARGE pass established, 0.416/0.44 ≈ 5.5%).
const CATBED_RING_R = 0.343;
const CATBED_RING_TUBE = 0.067;
const CATBED_PAD_R = 0.256; // back to the ENLARGE pass's value — see the RING_R/TUBE comment above for why shrinking the pad was the wrong fix
const CATBED_PAD_H = 0.05; // inner pad height — this IS the cat's on-surface Y (unchanged)
const CAT_Y = CATBED_PAD_H;
// OPEN-SOUTH PASS (owner ask: "BIG ROUND bed with its SOUTH side with no
// height, or open, so the whole cat is visible" — the dollhouse camera
// looks NORTH from the south, per layout.ts's "z grows south (toward the
// camera)" convention, so the ring's SOUTH arc — local +z, angle a=0 in
// this file's own sin/cos ring convention, e.g. RAILING_PLANTS above — sits
// directly between the camera and the cat). The single smooth torus is
// replaced by a ring of discrete box segments (chunky-pixel style, matching
// this file's other ring builds) whose HEIGHT is a function of each
// segment's own angle — a smoothstep falloff, not a hand-picked per-segment
// value: full rim height (CATBED_RIM_FULL_H, same as the old torus's own
// outer diameter 2×tube) everywhere outside a due-south opening arc, easing
// down to a low front LIP (CATBED_RIM_MIN_H) at due-south itself.
//
// CATBED FIX PASS (this pass — the OPEN-SOUTH build above rendered as a
// flat red pie-slice fan/starburst, not a bed; owner screenshot). Root
// causes, both fixed here:
//  1. The opening was 150° total (±75°) — over half the ring's
//     circumference was low, and every low segment was still
//     CATBED_RIM_FULL_H (0.224m) DEEP radially (the box's Z dimension was
//     hard-coded to the full-height depth regardless of its own height) —
//     so a near-zero-height segment became a flat plank reaching all the
//     way in from the ring path to near the pad's center. A field of these
//     side-by-side IS the fan: each low segment is a thin radial spoke, and
//     the dark seams between them are the fan's "pleats". Fix: the opening
//     shrinks to a much narrower ±35° (70° total, inside the 60–80° brief),
//     and every segment's radial DEPTH now tracks its own HEIGHT
//     (`depth = h`, a square cross-section at every angle, same as the old
//     torus's own circular cross-section reads at full height) — a low
//     segment is now a small chunky curb, not a wide flat plank, so low
//     segments no longer reach in anywhere near the cat.
//  2. CATBED_RIM_MIN_H was ~0 (2mm) — no lip at all, which is also part of
//     why it read as a starburst instead of a bed (a bed needs SOME front
//     edge). Fixed lip: CATBED_RIM_MIN_H = 40% of CATBED_RIM_FULL_H
//     (≈0.09m). Checked against the cat's own geometry (Cat.tsx, read-only
//     — mounted in the wrapping group at CAT_Y + local-y·CAT_SCALE): the
//     main body loaf tops out at local y 0.09 (world y 0.05+0.09·1.3=0.167)
//     and the cream chest patch spans local y 0.02–0.08 (world y
//     0.05+0.026=0.076 to 0.05+0.104=0.154) — both comfortably above a
//     0.09m lip built from the floor (world y 0, same base as the pad).
//     Only the tucked paw (world y 0.05–0.089, i.e. resting on the pad
//     surface) is near the lip's height, but with depth now tied to height
//     the lip's inner edge sits at RING_R − h/2 ≈ 0.259 (vs. the old
//     buried-plank's 0.192), well clear of the paw's own position near the
//     pad center — and the camera's steep dollhouse angle (~48° above
//     horizontal, FollowCamera's y:10.5/z:9.5 area offset) gives ample
//     clearance over any distance the lip sits back from the cat. Segment
//     count bumped 28→36 so the taper across the (now much narrower) open
//     arc reads as a smooth curve, not a coarse stairstep.
const CATBED_RIM_SEGMENTS = 36; // segment count around the ring — bumped from 28 (CATBED FIX PASS) so the narrower ±35° taper still reads smooth, not stairstepped
const CATBED_RIM_FULL_H = CATBED_RING_TUBE * 2; // full rim height = the old torus's own outer diameter, unchanged
const CATBED_RIM_MIN_H = CATBED_RIM_FULL_H * 0.4; // CATBED FIX PASS: a real low lip (≈0.09m), not ~flat — see the pass comment above for the cat-clearance check
const CATBED_RIM_OPEN_HALF_ANGLE = (35 * Math.PI) / 180; // CATBED FIX PASS: 35° each side of due-south = 70° total opening arc (was 150° — the fan's main cause)
const CATBED_RIM_SEG_W =
  ((2 * Math.PI * CATBED_RING_R) / CATBED_RIM_SEGMENTS) * 1.15; // tangential width per segment — arc length at the ring's path radius, +15% so neighboring chunks overlap slightly (no gaps in the ring)
// smoothstep ease (C1-continuous, not a hard step) from the low lip at
// due-south (d=0) up to full height at the opening's own edge
// (d=CATBED_RIM_OPEN_HALF_ANGLE); returns 1 (full height) beyond that.
function catbedRimFalloff(angularDistFromSouth: number): number {
  if (angularDistFromSouth >= CATBED_RIM_OPEN_HALF_ANGLE) return 1;
  const t = angularDistFromSouth / CATBED_RIM_OPEN_HALF_ANGLE;
  return t * t * (3 - 2 * t);
}
// one entry per segment: its angle (for position/rotation, same sin/cos
// ring convention as RAILING_PLANTS above) and its derived height. Angular
// distance from due-south wraps signed angle into (-π, π] first so the
// falloff is symmetric on both sides of south, not just increasing angle.
const CATBED_RIM_SEGS: { a: number; h: number }[] = Array.from(
  { length: CATBED_RIM_SEGMENTS },
  (_, i) => {
    const a = (i / CATBED_RIM_SEGMENTS) * Math.PI * 2;
    const signed = a > Math.PI ? a - Math.PI * 2 : a; // wrap to (-π, π], 0 = due south
    const dist = Math.abs(signed);
    const h = CATBED_RIM_MIN_H + catbedRimFalloff(dist) * (CATBED_RIM_FULL_H - CATBED_RIM_MIN_H);
    return { a, h };
  }
);
// CAT_SCALE (CATBED ENLARGE PASS) — a modest 1.3x bump on the cat herself
// (NOT the full 1.6x bed factor — the brief's ask is a bigger, cozier bed
// she has room to stretch out in, not a cat scaled to fill it edge-to-edge
// like before; a full bed-scale match would read as a dog bed). Applied via
// a wrapping <group> in the JSX below (Cat.tsx has no scale prop and is
// off-limits this pass) — the group is positioned at CAT_X/Y/Z and scaled,
// with Cat itself mounted at its own local origin so the scale doesn't also
// multiply the world position.
const CAT_SCALE = 1.3;
// CAT_EXTRA_ROTATION_Y (OPEN-SOUTH PASS) — discovered in-browser (sampling
// the cream-patch meshes' own world positions via the scene graph) that
// Cat.tsx's default rotationY (0.35 rad, unpassed/unchanged, Cat.tsx is
// off-limits this pass) points her chest/muzzle/paw cluster toward world
// angle ≈+87.4°+0.35rad≈107.5° in this file's own sin/cos ring convention
// (a=0 due south, +90° due east) — i.e. mostly EAST, not south, so the
// south-opened rim above didn't line up with the exact features the brief
// calls out ("the cream chest/muzzle... NOT occluded"). Cat.tsx exposes
// rotationY as an overridable prop specifically for callers like this one;
// this file already owns her whole placement (CAT_X/Y/Z, CAT_SCALE), so the
// fix is an ADDITIONAL spin on the SAME wrapping <group> (Y-axis rotations
// compose by simple addition regardless of nesting order, and the group's
// scale is uniform so it doesn't interact with rotation) — not an edit to
// Cat.tsx or its default. Derived, not hand-picked: aims the chest patch's
// own local position (copied verbatim from Cat.tsx, read-only reference)
// at CAT_FRONT_TARGET_ANGLE, a few degrees east of dead-south (not exactly
// 0° — a perfectly frontal pose reads stiffer, and it keeps the chest
// comfortably inside CATBED_RIM_OPEN_HALF_ANGLE with margin either way).
const CAT_CHEST_LOCAL = { x: 0.11, z: 0.005 }; // Cat.tsx's own chest-patch mesh position (local, pre-rotation)
const CAT_CHEST_LOCAL_ANGLE = Math.atan2(CAT_CHEST_LOCAL.x, CAT_CHEST_LOCAL.z); // ≈87.4°
const CAT_INTERNAL_ROTATION_Y = 0.35; // Cat.tsx's own default rotationY (component default — cited here only to compute the total, never overridden)
const CAT_FRONT_TARGET_ANGLE = (10 * Math.PI) / 180; // chest patch's target world angle — 10° east of due south
const CAT_EXTRA_ROTATION_Y = CAT_FRONT_TARGET_ANGLE - CAT_CHEST_LOCAL_ANGLE - CAT_INTERNAL_ROTATION_Y;

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
// DRESS2 PASS (this pass, owner ask: "the 0.9m gap is hard to line up" —
// widen the walkable pass-through to ~1.3m): door opening widens z 2.5-4.3
// → z 2.4-4.4 (symmetric around the same center, ENGAWA_DOOR_ZC stays 3.4);
// the fixed glass pane's own width (DOOR_PANEL_W below) shrinks from half
// the opening to a fixed 0.7m instead — see layout.ts's DRESS2 PASS comment
// (ENGAWA_DOOR_GLASS_W) for the full arithmetic, copied verbatim here.
const ENGAWA_WALL_T_HALF = 0.1; // half the interior-divider wall thickness (layout.ts's WALL_T/2)
const ENGAWA_DOOR_Z0 = 2.4; // walk-through gap — matches layout.ts's ENGAWA_DOOR_LO exactly (DRESS2 pass)
const ENGAWA_DOOR_Z1 = 4.4; // matches layout.ts's ENGAWA_DOOR_HI (DRESS2 pass)
const ENGAWA_DOOR_ZC = (ENGAWA_DOOR_Z0 + ENGAWA_DOOR_Z1) / 2; // 3.4 (unchanged — widened symmetrically)
const ENGAWA_DOOR_W = ENGAWA_DOOR_Z1 - ENGAWA_DOOR_Z0; // 2.0 (was 1.8)

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
// DRESS2 PASS: DOOR_PANEL_W is now its own constant (0.7, matching
// layout.ts's ENGAWA_DOOR_GLASS_W verbatim), NOT ENGAWA_DOOR_W/2 — the
// asymmetric split sends all the widened opening's extra width to the
// walkable half instead of splitting it 50/50 with the glass. Net walkable
// gap: ENGAWA_DOOR_W - DOOR_PANEL_W = 2.0 - 0.7 = 1.3m (z 3.1-4.4), up from
// 0.9m (z 3.4-4.3) pre-DRESS2.
const DOOR_PANEL_W = 0.7;
// GLASS SIZE FIX (this pass, owner ask: the glass mesh read visibly smaller
// than its own frame, leaving a gap between the glazing and the frame
// trim): the glass QUAD now fills the full height of the opening (top rail
// DOOR_PANEL_Y1 to sill DOOR_PANEL_Y0, unchanged/un-reduced) and the full
// width of its z-span (DOOR_PANEL_W) minus only a thin 2.5cm total reveal
// (DOOR_GLASS_W_REVEAL, split evenly so the frame/mullion trim — unchanged,
// still spans the full DOOR_PANEL_W envelope — reads as a deliberate thin
// border around the glazing instead of an accidental gap). Collider
// (ENGAWA_DOOR_GLASS_RECT) and the walkable gap are UNCHANGED — this only
// resizes the visual glass mesh.
const DOOR_GLASS_W_REVEAL = 0.025;

// glass panels — TWO, same width, stacked over the SAME z-band (the fixed
// pane's: z 2.4-3.1, matching layout.ts's ENGAWA_DOOR_GLASS_RECT exactly),
// reading as "one panel slid open in front of the other," leaving z
// 3.1-4.4 (1.3m, DRESS2 pass) clear as the walk gap. Static this wave (an
// actual slide animation is a future nicety — see the JSX below). Fixed
// pane sits 10mm off the frame's far face (same offset the old window used
// for its glass); the open pane is slid 3cm further outward — comfortably
// past the ≥6mm-offset rule.
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
//      the relocated south-end rail) — all visual-only, NO new colliders,
//      history only: the placeholder is GONE, SUPERSEDED by the ZEN GARDEN
//      PASS's real display stand + accent rock (which DO get colliders —
//      see the ZEN_* consts and layout.ts's ENGAWA_ZEN_STAND_RECT/
//      ENGAWA_ZEN_ROCK_RECT). Railing plants themselves are untouched.
//   [historical, pre-zen-garden-pass] the reserved spot (x -1.6..-1.2, z
//      5.6-5.9) sat close enough to the south-end rail (z-min 5.94) that
//      most of it fell inside the rail's own 0.35 player-radius zone
//      anyway, so a player was never going to stand dead-center on the
//      PLACEHOLDER — a dedicated collider would've been redundant back
//      then. Not true of the real built stand, which is bigger and sits
//      further from the rail — hence its own collider now.
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

// paper lanterns (×3, DRESS2 pass — was ×2) — hang from the eave rail,
// one at each END + one in the MIDDLE (owner's explicit ask: "ends +
// middle, evenly balanced" reads cleaner than 4 along the rail). Z
// positions match the hanging rail's own three support-arm positions
// exactly (see the `[0.7, 3.0, 5.3].map(...)` arm mesh below) so each
// lantern visually hangs right where the rail is actually anchored to the
// wall, not at an arbitrary point along the span.
//
// PERF (this pass, critical): the engawa sits in the bedroom render-band,
// on-screen at the workspace-centre 3-room overlap — the 60fps-critical
// spot the scene is actively cutting lights in elsewhere. So even though
// the lantern COUNT grew 2→3, the REAL pointLight count does NOT — it's
// capped at 2 (`real: true` below), same as before. The middle and
// south-end lanterns keep the two real lights the FULL-LENGTH PASS already
// had (repositioned from z 3.8/5.4 to the new z 3.0/5.3 arm positions —
// still "near the door" — door center is now z=3.4, DRESS2 pass — and
// "far south end"). The north-end lantern is EMISSIVE-ONLY: no nested
// pointLight, no castShadow either way. Every lantern's paper-body
// emissiveIntensity is bumped a touch (0.45→0.62) so even the two
// light-less bodies still read as visibly lit, not just dark paper shapes.
const ENGAWA_LANTERNS: { x: number; y: number; z: number; real: boolean }[] = [
  { x: -1.0, y: 2.0, z: 0.7, real: false }, // north end (rail's north arm) — emissive glow only, no real light (perf cap)
  { x: -1.0, y: 2.0, z: 3.0, real: true }, // middle (rail's middle arm) — real light, spills through the open doorway (door center z=3.4)
  { x: -1.0, y: 2.0, z: 5.3, real: true }, // south end (rail's south arm) — real light, covers the far south end/bonsai corner
];
const ENGAWA_LANTERN_R = 0.15;
const ENGAWA_LANTERN_H = 0.32;
const ENGAWA_LANTERN_EMISSIVE = 0.62; // was 0.45 — bumped so emissive-only lanterns still read as lit (Bloom luminanceThreshold is 0.6, Effects.tsx, so this also picks up a soft halo)
// cord: from the hanging rail down to the lantern's own top cap —
// derived, not hand-guessed. Same y for every lantern, so one shared length.
const ENGAWA_LANTERN_CORD_LEN = ENGAWA_HANGRAIL_Y - (ENGAWA_LANTERNS[0].y + ENGAWA_LANTERN_H / 2);

// draping vines along the hanging rail (DRESS2 pass) — reuses Workspace's
// bookshelf organic-vine idiom (VineStrand, duplicated locally below since
// Workspace.tsx is owned by another edit this pass and isn't touched to
// export it): curved catenary-ish droop, thin segmented stem, small leaf
// pairs at alternating joints, varied strand lengths — not stiff stacked
// boxes. Two strands per cluster, trailing DOWN off the rail between the
// three lanterns above (z positions sit in the two gaps: north-end↔middle,
// middle↔south-end). No collider (overhead, same convention as the
// eave/lanterns); castShadow comes from Bedroom's own root traverse
// (rootRef's useEffect), same as everything else in this file.
const ENGAWA_VINES: { z: number; segA: number; segB: number; phase: number }[] = [
  { z: 1.65, segA: 9, segB: 6, phase: 0 }, // between the north-end and middle lanterns
  { z: 2.35, segA: 6, segB: 8, phase: 2 }, // second cluster, same gap, offset so it doesn't read as a clone
  { z: 4.15, segA: 10, segB: 5, phase: 1 }, // between the middle and south-end lanterns
];

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

// ── PLANT PASS (this pass, owner ask: place the newly-prepared plant GLBs
// — TallPalm/FicusLyrata, scene/models/Plants.tsx — around the house) —
// two real floor plants on the engawa, distinct from the small hand-built
// RAILING_PLANTS above. Rects copied verbatim from layout.ts's own
// ENGAWA_TALLPALM_RECT/ENGAWA_FICUS_RECT (source of truth stays there,
// same convention as every other engawa collider in this file) — see that
// file's PLANT PASS comment for the full placement/clearance arithmetic,
// including why TALLPALM's collider is pot-sized (0.6x0.6) rather than its
// full 1.25x1.11m frond-spread footprint (nothing on this deck clears
// every existing walkway probe at the full size; the visual model still
// renders at native scale, same "collider smaller than the leaves"
// convention every other plant in the house already uses).
const ENGAWA_TALLPALM_RECT = { x: -1.85, z: 0.09, w: 0.6, d: 0.6 };
const ENGAWA_FICUS_RECT = { x: -0.6, z: 1.55, w: 0.45, d: 0.55 };
const ENGAWA_TALLPALM_CENTER = {
  x: ENGAWA_TALLPALM_RECT.x + ENGAWA_TALLPALM_RECT.w / 2,
  z: ENGAWA_TALLPALM_RECT.z + ENGAWA_TALLPALM_RECT.d / 2,
};
const ENGAWA_FICUS_CENTER = {
  x: ENGAWA_FICUS_RECT.x + ENGAWA_FICUS_RECT.w / 2,
  z: ENGAWA_FICUS_RECT.z + ENGAWA_FICUS_RECT.d / 2,
};

// ── zen garden corner (ZEN GARDEN PASS, this pass — owner ask: "big
// bonsai on a zen corner… the table for bonsai should be fancy… the whole
// section should be zen stone path, small grass kinda thing"). SUPERSEDES
// the old bonsai-pedestal placeholder (BONSAI_PEDESTAL_*, gone) and
// layout.ts's RESERVE comment (item 5, "still NOT built" — it is now).
// Colliders: only the display stand (kadai) and the ONE big accent rock
// get furniture rects (layout.ts's ENGAWA_ZEN_STAND_RECT/
// ENGAWA_ZEN_ROCK_RECT, copied verbatim below, same convention as every
// other collider in this file) — the raked-gravel bed, curb, stepping
// stones, moss, small rocks, and grass tufts are all walk-over floor
// dressing with no footprint, same "no collider" convention the railing
// plants already use on this deck.
//
// Layout: the corner sits south of the sliding door (z>4.4), north of the
// south rail (z-min 5.94), spanning nearly the deck's full width (x
// -2.5..-0.5, clear of both the west rail and the wall).
const ZEN_BED_RECT = { x: -2.5, z: 4.5, w: 2.0, d: 1.3 }; // outer curb footprint
const ZEN_CURB_T = 0.05; // curb thickness, all 4 sides
const ZEN_CURB_LIP = 0.02; // curb pokes this far above the DECK's own floor (y=0.02) — reads as a raised edge
// RECESS CEILING (found during browser verification, not guessed): House.tsx
// renders a base FloorSlab for every room's rect at world y=0 (color
// #3f3560, the generic "unbuilt floor" fallback under every room's own
// decorative floor) — House.tsx is off-limits for this task, so the
// recess has a hard floor at y=0, not y=-∞. A gravel surface AT or BELOW
// y=0 gets fully hidden behind that slab (confirmed empirically via
// raycaster: the slab wins the depth test in front of a y=-0.035 gravel
// plane). So ZEN_GRAVEL_RECESS is capped well under the deck's own 0.02
// offset — 0.015 lands the gravel surface at y=0.005, still a clearly
// visible step down from the deck (15mm) while staying 5mm clear of
// House's y=0 slab.
const ZEN_GRAVEL_RECESS = 0.015; // gravel surface sits this far BELOW deck level (0.02) — the "inset" ask, capped by the y=0 floor above
const ZEN_CURB_H = ZEN_GRAVEL_RECESS + ZEN_CURB_LIP; // curb spans from the recessed gravel floor up past deck level
const ZEN_GRAVEL_RECT = {
  x: ZEN_BED_RECT.x + ZEN_CURB_T,
  z: ZEN_BED_RECT.z + ZEN_CURB_T,
  w: ZEN_BED_RECT.w - ZEN_CURB_T * 2,
  d: ZEN_BED_RECT.d - ZEN_CURB_T * 2,
}; // x -2.45..-0.55, z 4.55..5.75 — inset within the curb
const ZEN_GRAVEL_Y = 0.02 - ZEN_GRAVEL_RECESS; // 0.005 — gravel's own top surface, world y (deck level minus the recess)
// tile scale: ~1 tile per 1.2m so the rake-line texture reads at
// pixelation granularity 3 (per the brief) instead of stretched/smeared —
// repeat is the gravel footprint divided by that target tile size.
const ZEN_GRAVEL_REPEAT_X = ZEN_GRAVEL_RECT.w / 1.2; // 1.583
const ZEN_GRAVEL_REPEAT_Z = ZEN_GRAVEL_RECT.d / 1.2; // 1.0

// deck floor is cut into 4 pieces around ZEN_BED_RECT instead of one
// continuous plane — the original single deck-floor quad spans the WHOLE
// DECK_RECT footprint at y=0.02, which sits ABOVE the recessed gravel
// (y=-0.035) and even the curb top (y=0.02, exactly flush) — an opaque
// plane covering the entire deck would paint straight over the sunken
// garden, hiding it completely. These 4 strips tile around ZEN_BED_RECT's
// outer footprint like a picture-frame mat, leaving its exact rectangle
// uncovered (areas sum to DECK_RECT.w*DECK_RECT.d exactly: 12.15+0.54+
// 0.26+0.65+2.6(garden)=16.2=2.7*6, verified below each rect).
const ZEN_DECK_NORTH = { x: DECK_RECT.x, z: DECK_RECT.z, w: DECK_RECT.w, d: ZEN_BED_RECT.z - DECK_RECT.z }; // z 0-4.5, area 12.15
const ZEN_DECK_SOUTH = {
  x: DECK_RECT.x,
  z: ZEN_BED_RECT.z + ZEN_BED_RECT.d,
  w: DECK_RECT.w,
  d: DECK_RECT.z + DECK_RECT.d - (ZEN_BED_RECT.z + ZEN_BED_RECT.d),
}; // z 5.8-6, area 0.54
const ZEN_DECK_WEST = {
  x: DECK_RECT.x,
  z: ZEN_BED_RECT.z,
  w: ZEN_BED_RECT.x - DECK_RECT.x,
  d: ZEN_BED_RECT.d,
}; // x -2.7..-2.5, z 4.5-5.8, area 0.26
const ZEN_DECK_EAST = {
  x: ZEN_BED_RECT.x + ZEN_BED_RECT.w,
  z: ZEN_BED_RECT.z,
  w: DECK_RECT.x + DECK_RECT.w - (ZEN_BED_RECT.x + ZEN_BED_RECT.w),
  d: ZEN_BED_RECT.d,
}; // x -0.5..0, z 4.5-5.8, area 0.65

// display stand (kadai) — collider ENGAWA_ZEN_STAND_RECT, layout.ts.
// South-center of the gravel bed; the stepping-stone path leads up to it.
const ZEN_STAND_RECT = { x: -1.9, z: 5.15, w: 0.5, d: 0.4 };
const ZEN_STAND_CENTER = {
  x: ZEN_STAND_RECT.x + ZEN_STAND_RECT.w / 2,
  z: ZEN_STAND_RECT.z + ZEN_STAND_RECT.d / 2,
}; // -1.65, 5.35
const ZEN_STAND_H = 0.55; // tabletop surface height — mid-range of the brief's 0.5-0.6m ask
// BIG bonsai (GLB, scene/models/Plants.tsx) display scale — see the render
// site below for the full derivation. Native model height 0.642m; this
// scale reads as a big display specimen (~0.83m tall) without dwarfing the
// stand it's centered on.
const BONSAI_SCALE = 1.3;

// big accent rock — collider ENGAWA_ZEN_ROCK_RECT, layout.ts. Just
// south-east of the stand, deliberately NOT hugging the west rail (a
// pre-existing regression probe at x=-2.3 spans the deck's full length, so
// the rock stays east of it with margin). z-range (5.62..5.86) sits
// entirely south of the stand's own (5.15..5.55, a 0.07m gap) even though
// the x-ranges overlap, so the two rects never intersect.
const ZEN_ROCK_RECT = { x: -1.67, z: 5.62, w: 0.24, d: 0.24 };
const ZEN_ROCK_CENTER = { x: ZEN_ROCK_RECT.x + ZEN_ROCK_RECT.w / 2, z: ZEN_ROCK_RECT.z + ZEN_ROCK_RECT.d / 2 }; // -1.55, 5.74

// stepping-stone path (visual only) — meanders from the walkway's east
// side up to the stand, all inside ZEN_GRAVEL_RECT (x -2.45..-0.55, z
// 4.55..5.75).
const ZEN_STONES: { x: number; z: number; w: number; d: number; rot: number }[] = [
  { x: -0.75, z: 4.7, w: 0.28, d: 0.22, rot: 0.3 },
  { x: -1.15, z: 4.95, w: 0.32, d: 0.24, rot: -0.15 },
  { x: -1.5, z: 5.15, w: 0.26, d: 0.3, rot: 0.5 },
  { x: -1.85, z: 5.3, w: 0.3, d: 0.22, rot: -0.35 },
];
const ZEN_STONE_H = 0.03; // slab thickness — top sits at ZEN_GRAVEL_Y + this, proud of the gravel

// moss patches (visual only) — small flat disks tucked near stones/curb.
const ZEN_MOSS: { x: number; z: number; r: number }[] = [
  { x: -0.6, z: 4.6, r: 0.18 },
  { x: -1.3, z: 4.6, r: 0.15 },
  { x: -2.3, z: 5.65, r: 0.2 },
  { x: -0.65, z: 5.65, r: 0.16 },
];

// grass tufts (visual only) — thin upright blades, RAILING_PLANTS' own
// "blade" idiom reused without the pot, planted straight into the gravel.
const ZEN_GRASS: { x: number; z: number }[] = [
  { x: -0.65, z: 5.0 },
  { x: -1.05, z: 4.65 },
  { x: -2.15, z: 4.75 },
  { x: -0.6, z: 5.5 },
];

// accent rocks (visual only, except ZEN_ROCK_RECT above, the big one)
const ZEN_ROCKS_SMALL: { x: number; z: number; r: number; color: string }[] = [
  { x: -2.25, z: 4.65, r: 0.13, color: "#6b6b6b" },
  { x: -0.65, z: 4.65, r: 0.1, color: "#7a7a7a" },
];

// the BIG bonsai on the kadai stand is now a real GLB model (Bonsai,
// scene/models/Plants.tsx) — the old hand-built trunk/branches/foliage-pad
// consts (ZEN_FOLIAGE_GREENS/ZEN_POT_*/ZEN_TRUNK_SEGMENTS/ZEN_BRANCHES) and
// the FoliagePad helper are gone; see Plants.tsx's Bonsai doc-comment for
// the model's attribution/optimization/placement writeup, and the render
// site below (ZEN_STAND_CENTER/ZEN_STAND_H) for how it sits on the stand.

// moonlight spill: DEFERRED to Plan 5 (lighting/post-processing). Faking it
// with translucent floor planes never read right (vertical shafts looked like
// a plank; flat patches were invisible/wrong) — it needs real volumetric /
// bloom post-processing. Removed for now; the render site carries the note.

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

// ── poster wall (P4 MOVIE-POSTER REHANG, this pass — owner ask: "bigger
// and better organized... movie posters and stuff") — REPLACES the old
// 6-poster scatter (4 abstract textures, no shared alignment, read as
// random) with a deliberate 5-poster gallery-wall gantt using the new 2:3
// movie-poster textures (poster-eclipse/mecha/samurai/noir-city/
// retro-space, all 64x96 — see p4-movie-posters-report.md). Every plane's
// w:h is kept at the texture's exact 2:3 ratio (no stretch).
//
// Two clusters flank the sconce (SCONCE_X=4.0, cone x≈3.89-4.11), same
// ≥0.16m-clear-of-the-cone rule the old wall used:
//   WEST cluster (a size-descending cascade, hero outward to two smaller
//   pieces) shares one BASELINE (bottom edge y=1.50, the same floor the old
//   wall used): poster-eclipse (the HERO, 0.72x1.08 — clearly the largest
//   thing on the wall) - poster-samurai (0.42x0.63) - poster-retro-space
//   (0.34x0.51), each gutter ~0.08-0.09m off the next piece's edge, west
//   edge of the hero landing almost flush with the bed's own west edge
//   (BED_RECT.x=2.9).
//   EAST cluster (a mid-size pair) shares its own baseline (bottom edge
//   y=1.71): poster-mecha (0.58x0.87, left edge at the sconce-clearance
//   line x=4.27) then poster-noir-city (0.50x0.75), gutter 0.08m off
//   mecha's right edge.
// The hero's TOP edge (y=2.58) and mecha's TOP edge (y=2.58) are the SAME
// line — a shared top line ties the two clusters together across the
// sconce gap, the "common alignment axis" the composition hangs off. Every
// top stays 0.22m clear of WALL_H (2.8); every bottom stays at/above 1.50m
// (the old wall's own floor, clear of the headboard). z stays the old flat
// 0.03 (2cm off the wall's own face) — none of these posters cross the
// sconce's x-band either. No frame/shadow mesh added: the frame border is
// already baked into each PNG (same 1px night900-border convention as
// MusicNook's posterGig/posterWave/posterMoons — confirmed via the
// gen-variants.mjs source), so a bare plane already reads as a framed
// print, not a decal. No collider — flat wall dressing, same convention as
// every poster elsewhere in the house. The old sunset/mountain/space/
// wavearc textures are dropped entirely (5 movie posters read as a
// coherent set; mixing in the old abstract ones would undercut "better
// organized") — their PNGs and generator entries are untouched, per scope. */
const POSTER_Z = 0.03;
type PosterKey = "eclipse" | "mecha" | "samurai" | "noirCity" | "retroSpace";
// POSTER HEIGHT FIX (this pass, owner-observed via the dollhouse camera:
// the cluster sat pressed against the ceiling, y-clipped by the top of the
// camera frame). Every cy below is shifted DOWN by a flat 0.30m from the
// original composition — a uniform shift preserves both baselines (west
// cluster 1.50→1.20, east cluster 1.71→1.41) and the shared top line
// (hero/mecha 2.58→2.28) exactly, so the internal alignment is untouched,
// just the whole group moved as a unit. Clearance check: the bed's GLB
// headboard tops out at ≈0.83m (LAMP-CUT PASS's own bbox note, Y max
// 180.65 raw units × BED_MODEL_SCALE ≈0.0046 ≈0.825m) and both clusters sit
// partly over the bed's own x-span — new bottoms (1.20/1.41) clear that by
// 0.37m/0.58m, comfortably more than before headroom was even a question.
// New top (2.28) is also now 0.52m clear of WALL_H (2.8), up from 0.22m —
// the actual ceiling-crowding fix. Re-verified in-browser per the task.
const POSTER_Y_SHIFT = 0.3;
const POSTERS: { key: PosterKey; cx: number; cy: number; w: number; h: number; rotZ: number }[] = [
  // west cascade — hero, then two descending-size accents, shared baseline y=1.20 (was 1.50)
  { key: "eclipse", cx: 3.28, cy: 2.04 - POSTER_Y_SHIFT, w: 0.72, h: 1.08, rotZ: -0.02 }, // HERO
  { key: "samurai", cx: 2.62, cy: 1.815 - POSTER_Y_SHIFT, w: 0.42, h: 0.63, rotZ: 0.025 },
  { key: "retroSpace", cx: 2.16, cy: 1.755 - POSTER_Y_SHIFT, w: 0.34, h: 0.51, rotZ: -0.015 },
  // east pair — shared baseline y=1.41 (was 1.71), tops shared with the hero's own top (y=2.28)
  { key: "mecha", cx: 4.56, cy: 2.145 - POSTER_Y_SHIFT, w: 0.58, h: 0.87, rotZ: 0.02 },
  { key: "noirCity", cx: 5.18, cy: 2.085 - POSTER_Y_SHIFT, w: 0.5, h: 0.75, rotZ: -0.025 },
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
const MIRROR_Y = 1.5; // unchanged
const MIRROR_Z = 4.9; // unchanged — wallSegS's own z-center
const MIRROR_WALL_X = BEDROOM.x + BEDROOM.w - 0.11; // 7.89, wallSegS's own plane

// MIRROR FIX (this pass, owner report: "stuck to wall and a white rod is
// sticking out of it") — two separate bugs, diagnosed from the OLD consts
// (MIRROR_FRAME_DEPTH=0.04, MIRROR_FRAME_X=7.85, MIRROR_GLASS_X=7.82) and
// the old highlight mesh (`position={[MIRROR_GLASS_X - 0.006, 1.35, 4.85]}
// rotation={[0, 0, 0.55]}`, boxGeometry args {[0.006, 1.5, 0.12]}):
//   1. "white rod sticking out": the highlight box was rotated about the Z
//      AXIS. Rotating a box about Z mixes its LOCAL X/Y extents, not Y/Z —
//      so the box's near-full-mirror-height Y-dimension (1.5m) partially
//      rotated INTO the depth (X) axis: bounding X-extent after rotation =
//      1.5*sin(0.55) + 0.006*cos(0.55) ≈ 0.789m, a 79cm spike poking
//      straight out along the wall's normal. That's the rod. Fixed by
//      rotating about the X AXIS instead (the glass's own face normal),
//      which mixes Y/Z (height/width) and keeps the streak flat against
//      the glass — see MIRROR_HIGHLIGHT_* below for the sizing arithmetic
//      that keeps its rotated bounding box strictly inside the glass rect.
//   2. "stuck to the wall": the old frame was a single 4cm slab with the
//      glass sitting IN FRONT of its own near face (glass x=7.82 <
//      frame's near face 7.85 - 0.02 = 7.83) — nothing read as a hollow
//      picture frame, so the whole unit looked printed on. Rebuilt below
//      as a real 4-piece mitred border (an open rectangle, not a slab)
//      standing proud of the wall by a real depth, with the glass
//      RECESSED behind the frame's own front edge, plus a soft shadow
//      decal on the wall so it reads as hanging.
const MIRROR_FRAME_BORDER = 0.06; // frame border width beyond the glass opening, each side
const MIRROR_FRAME_DEPTH = 0.05; // frame's own visible depth (was a 0.04 slab)
const MIRROR_STACK_WALL_TO_FRAME = 0.02; // wall face → frame's back face, ≥6mm
const MIRROR_FRAME_BACK_X = MIRROR_WALL_X - MIRROR_STACK_WALL_TO_FRAME; // 7.87
const MIRROR_FRAME_FRONT_X = MIRROR_FRAME_BACK_X - MIRROR_FRAME_DEPTH; // 7.82
const MIRROR_FRAME_CENTER_X = (MIRROR_FRAME_BACK_X + MIRROR_FRAME_FRONT_X) / 2; // 7.845
const MIRROR_GLASS_RECESS = 0.015; // glass sits behind the frame's own FRONT (mitred) edge by this much — the "recessed glass" look
const MIRROR_GLASS_X = MIRROR_FRAME_FRONT_X + MIRROR_GLASS_RECESS; // 7.835 — still 3.5cm proud of the frame's BACK face (≥6mm rule cleared easily)
const MIRROR_HIGHLIGHT_OFF = 0.006; // ≥6mm proud of the glass, same stack convention as every other layer in this file
const MIRROR_HIGHLIGHT_X = MIRROR_GLASS_X - MIRROR_HIGHLIGHT_OFF; // 7.829

// highlight streak sizing — rotates about the glass's own normal (X) by
// MIRROR_HIGHLIGHT_ANGLE, so its local Y (length) and Z (thickness)
// extents mix into a diagonal band that stays FLAT against the glass.
// Sized + centered on the glass's own center (MIRROR_Y, MIRROR_Z) so its
// rotated bounding box sits strictly inside the glass rect (y 0.7-2.3, z
// 4.6-5.2) — arithmetic:
//   cos(0.5)=0.87758, sin(0.5)=0.47943
//   bounding Y-extent = L*cos + W*sin = 0.8*0.87758 + 0.05*0.47943 = 0.7261m
//   bounding Z-extent = L*sin + W*cos = 0.8*0.47943 + 0.05*0.87758 = 0.4274m
// half-extents 0.363/0.214 vs. the glass's own half-extents (0.8, 0.3):
// 43.7cm clear top/bottom, 8.6cm clear each side — comfortably contained.
const MIRROR_HIGHLIGHT_LEN = 0.8;
const MIRROR_HIGHLIGHT_THICK = 0.05;
const MIRROR_HIGHLIGHT_ANGLE = 0.5;

// ── MIRROR VANITY BULBS (this pass, owner ask: "need some lighting around
// or on top of the mirror") — Hollywood-style vanity bulbs across the
// frame's TOP bar, chosen over a backlit halo or a picture light because a
// row of small glowing dots is exactly the kind of thing that survives this
// wall's own steep raking camera angle (this east divider is seen nearly
// edge-on from the default dollhouse view — fine surface detail like a soft
// halo wash would smear into nothing at that angle, but discrete point-glows
// still read as a clean row). Same "many bulbs, few real lights" convention
// as the east-shelf fairy string (EAST_FAIRY_*) and the engawa lanterns
// (ENGAWA_LANTERNS): every bulb is an emissive sphere seated on a small
// socket stub proud of the frame's own front face, but only 2 of the 7 carry
// a real pointLight (indices 1 and 5, symmetric off-center) — spreads the
// actual illumination across the top bar's own width instead of piling it
// all in the middle, so both top corners (not just the center) pick up a
// wash instead of reading flat. No castShadow (this room's existing
// shadow-caster budget is untouched).
const MIRROR_BULB_COUNT = 7;
const MIRROR_BULB_R = 0.02; // emissive glass bulb radius
const MIRROR_BULB_SOCKET_R = 0.014;
const MIRROR_BULB_SOCKET_LEN = 0.018;
const MIRROR_BULB_STACK = 0.008; // frame's front face -> socket's back face, >=6mm proud (house rule)
const MIRROR_BULB_Y = MIRROR_Y + MIRROR_H / 2 + MIRROR_FRAME_BORDER / 2; // centered on the top bar's own height (same cy the top frame-bar mesh uses)
const MIRROR_BULB_ROW_HALF = MIRROR_W / 2 + MIRROR_FRAME_BORDER - 0.05; // inset 5cm from the top bar's own ends (bar half-span is MIRROR_W/2+MIRROR_FRAME_BORDER)
const MIRROR_BULB_SOCKET_X = MIRROR_FRAME_FRONT_X - MIRROR_BULB_STACK - MIRROR_BULB_SOCKET_LEN / 2;
const MIRROR_BULB_X = MIRROR_FRAME_FRONT_X - MIRROR_BULB_STACK - MIRROR_BULB_SOCKET_LEN - MIRROR_BULB_R * 0.5; // bulb seated slightly into the socket's own outer face
const MIRROR_BULB_REAL = new Set([0, 6]); // 2 real lights of 7 bulbs — the two END bulbs, not adjacent-to-center ones, so their falloff cones don't stack into a single hot mid-point (see the BLOWOUT FIX note at the JSX render site)

// ── EAST WALL SHELVES + WARM LIGHT PASS (this pass, owner ask: "we need
// wall shelf and more light in the bedroom, the walls look really empty") —
// the east divider's north segment (wallSegN, x=MIRROR_WALL_X, z 0-2.2) was
// a bare wall (the mirror lives on the OTHER segment, wallSegS, z 3.8-6,
// clear of this one) — the single largest empty expanse in the room per the
// dollhouse-camera walkthrough. Three staggered floating shelves, same
// thin-slab-+-hidden-bracket idiom as Workspace's own floating shelf
// (position [11.0, 2.2, 0.21]) — here the wall's normal runs along world X
// instead of Z, so the slab's own local axes (no rotation needed) map
// depth→world X, length→world Z directly (box args ordered
// [depth, thickness, length] reproduces this without a rotation prop).
// Above head height, same convention as every other wall-mounted piece in
// this room (posters, mirror, sconce, Workspace's own floating shelf) — no
// collider.
const EAST_SHELF_WALL_X = MIRROR_WALL_X; // 7.89, same plane as the mirror's own wall segment
const EAST_SHELF_STACK = 0.02; // wall → slab back face, ≥6mm
const EAST_SHELF_DEPTH = 0.26;
const EAST_SHELF_THICK = 0.035;
const EAST_SHELF_X = EAST_SHELF_WALL_X - EAST_SHELF_STACK - EAST_SHELF_DEPTH / 2; // 7.74, slab center (projects -x, into the room)
// three tiers, staggered heights/lengths/z-centers — asymmetric but
// composed (the poster wall's own bar), all clear of the north corner
// (z=0) and the doorway gap's own start (z=2.2) with real margin.
const EAST_SHELVES: { y: number; len: number; zc: number }[] = [
  { y: 2.02, len: 1.5, zc: 0.85 }, // top — leaning books + a trailing plant + the fairy-light string
  { y: 1.52, len: 1.95, zc: 1.1 }, // mid — anchor: LED rope, leaning photo, candles, speaker
  { y: 1.02, len: 1.3, zc: 1.45 }, // bottom — upright books + a second trailing plant
];

// small west-wall accent shelf (optional per the brief, "if it helps
// balance") — north flank of the sliding-door gap (wallWN, z 0-2.4), clear
// of the sofa (z-max 1.35) and well short of the door jamb (z=2.4). Same
// no-rotation depth→X/length→Z construction, just projecting +x off the
// wall (into the room) instead of -x.
const WEST_SHELF_WALL_X = BEDROOM.x + ENGAWA_WALL_T_HALF + 0.011; // 0.111, wallWN's own bedroom-side plane
const WEST_SHELF_STACK = 0.02;
const WEST_SHELF_DEPTH = 0.22;
const WEST_SHELF_THICK = 0.03;
const WEST_SHELF_X = WEST_SHELF_WALL_X + WEST_SHELF_STACK + WEST_SHELF_DEPTH / 2;
const WEST_SHELF_Y = 1.65;
const WEST_SHELF_LEN = 0.6;
const WEST_SHELF_ZC = 1.95; // z 1.65-2.25 — clear of the sofa (0.3m gap) and the door jamb (0.15m gap)

// LED rope under the mid (anchor) east shelf — emissive strip + ONE nested
// warm pointLight (the "bulb," rotation-safe by construction), lighting the
// east wall + the shelf objects above the room's biggest dead zone. Real
// light #1 of this pass.
const EAST_LED_H = 0.015;
const EAST_LED_LEN = EAST_SHELVES[1].len - 0.1;
const EAST_LED_Y = -(EAST_SHELF_THICK + 0.006 + EAST_LED_H / 2); // ≥6mm proud of the slab's own underside

// fairy-light string along the top shelf's front edge — mostly glowing
// bulbs (emissive-only spheres), ONE real pointLight at the string's own
// low point (real light #2). Sags in a shallow parabola between the two
// ends, same "many bulbs, few real lights" cozy-string convention the
// brief calls for.
const EAST_FAIRY_COUNT = 9;
const EAST_FAIRY_SAG = 0.06;

// ── SW framed art (this pass, owner ask: "lets put up image on the bottom
// left corner near plants on the wall") — hangs on wallWS, the west wall
// segment SOUTH of the sliding-door gap (z 4.4-6), the same physical wall
// WEST_SHELF_WALL_X already derives its plane from (that shelf sits on the
// segment NORTH of the gap; this piece sits on the segment south of it —
// same x plane, different z span). Wall choice per the camera fact: the
// room's actual south wall is House.tsx's low camera-side cutaway stub
// (the "south stub band" mesh above, y 0-0.55, deliberately low so the
// dollhouse camera isn't occluded) — there's no real hangable face there.
// wallWS is the only wall that both (a) has real height and (b) sits next
// to the plants (BEDROOM_BROADLEAF_CENTER/BEDROOM_POTTEDTREE_CENTER, z
// 5.0-5.84, entirely inside wallWS's own z 4.4-6 span). It reads at a
// raking angle rather than face-on (the camera fact: only the north wall
// is face-on), a deliberate compromise flagged in the report — no other
// wall face at this corner reads better.
// Same mitred-frame + recessed-canvas idiom as the east-divider mirror
// (MIRROR_FRAME_* above), sized down for a single framed print — no glass/
// highlight layer (a matte print isn't reflective, unlike the mirror).
const SW_ART_WALL_X = WEST_SHELF_WALL_X; // 0.111, wallWS's own bedroom-side plane (same wall as WEST_SHELF, south segment)
const SW_ART_W = 0.6; // matches poster-mountain-ridge's own 40:32 (5:4) aspect exactly (0.6/0.48)
const SW_ART_H = 0.48;
const SW_ART_Y = 1.5; // hang height — same eye-level convention as the mirror (MIRROR_Y)
const SW_ART_Z = 5.4; // centered over the plants' own z-span (5.0-5.84); comfortably inside wallWS (4.4-6): 0.665m clear of the door jamb, 0.265m clear of the south corner
const SW_ART_FRAME_BORDER = 0.035;
const SW_ART_FRAME_DEPTH = 0.03;
const SW_ART_STACK_WALL_TO_FRAME = 0.02; // ≥6mm, same stack convention as every wall-mounted piece in this file
const SW_ART_FRAME_BACK_X = SW_ART_WALL_X + SW_ART_STACK_WALL_TO_FRAME; // 0.131 — stacks toward +x (into the room), same direction WEST_SHELF stacks off this same wall
const SW_ART_FRAME_CENTER_X = SW_ART_FRAME_BACK_X + SW_ART_FRAME_DEPTH / 2; // 0.146
const SW_ART_FRAME_FRONT_X = SW_ART_FRAME_BACK_X + SW_ART_FRAME_DEPTH; // 0.161
const SW_ART_CANVAS_STACK = 0.01; // ≥6mm proud of the frame's own front face
const SW_ART_CANVAS_X = SW_ART_FRAME_FRONT_X + SW_ART_CANVAS_STACK; // 0.171

// ── SOUTH FLOOR LAMP (this pass, owner ask: "lets add some lighting on
// the bedroom south areas" — the wardrobe/clothes-rack end and the floor
// in front of it read near-black; no real light sits south of z≈1.5
// anywhere in this room). Tripod-style floor lamp, same base/pole/open-
// cone-shade family as the nightstand lamps and MusicNook's own floor
// lamp (record-console pass). Sits in the open pocket WEST of the
// wardrobe rail and EAST of the potted tree (HANGER_RECT x-min 3.3,
// BEDROOM_POTTEDTREE_RECT x-max 2.21 — a 1.09m-wide gap), lighting both
// the wardrobe's west flank and the SW plants/art corner from one
// fixture. Collider derived first (rect below), every render position
// derived from it — same "never re-hardcode a collider's numbers" rule as
// the rest of this file.
const SOUTH_LAMP_RECT = { x: 2.55, z: 5.25, w: 0.35, d: 0.35 };
const SOUTH_LAMP_CENTER = {
  x: SOUTH_LAMP_RECT.x + SOUTH_LAMP_RECT.w / 2,
  z: SOUTH_LAMP_RECT.z + SOUTH_LAMP_RECT.d / 2,
}; // 2.725, 5.425
// clearance check (no test-worthy overlap, both gaps are on the x axis so
// z overlap never matters — intersects() needs BOTH axes to overlap):
//   vs potted tree (x-max 2.21): lamp x-min 2.55, 0.34m clear
//   vs clothes hanger (x-min 3.3): lamp x-max 2.90, 0.40m clear
const SOUTH_LAMP_BASE_R = 0.15;
const SOUTH_LAMP_BASE_H = 0.04;
const SOUTH_LAMP_POLE_R = 0.02;
const SOUTH_LAMP_POLE_H = 1.3;
const SOUTH_LAMP_SHADE_H = 0.28;
const SOUTH_LAMP_SHADE_Y = SOUTH_LAMP_BASE_H + SOUTH_LAMP_POLE_H + SOUTH_LAMP_SHADE_H / 2; // 1.48, shade center

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

/** One organic vine strand (DRESS2 pass — duplicated from Workspace.tsx's
 *  bookshelf vine idiom verbatim, since Workspace.tsx is owned by another
 *  edit this pass and isn't touched to export it). Short thin stem segments
 *  chained along a curved droop: the tilt starts near-horizontal (spilling
 *  off the rail) and eases quadratically toward hanging straight down — a
 *  catenary-ish bend instead of a rigid diagonal. Small leaf pairs sprout
 *  at alternating joints. `dir` is the horizontal spill direction in the
 *  parent's xz plane; `phase` offsets the leaf pattern so neighboring
 *  strands don't look cloned. Strand length = `segments` (vary it per
 *  strand for the "varied lengths" look). */
const ENGAWA_VINE_LEAF_GREENS = ["#3f8f5a", "#3c8a68", "#2e6e54"];
function VineStrand({
  dir,
  segments,
  segLen = 0.085,
  startTilt = 1.15,
  phase = 0,
}: {
  dir: [number, number];
  segments: number;
  segLen?: number;
  startTilt?: number;
  phase?: number;
}) {
  const yaw = -Math.atan2(dir[1], dir[0]);
  const joints: { x: number; y: number; tilt: number }[] = [];
  let px = 0;
  let py = 0;
  for (let i = 0; i < segments; i++) {
    const t = segments === 1 ? 1 : i / (segments - 1);
    const tilt = startTilt * (1 - t) * (1 - t); // quadratic ease → droop
    joints.push({
      x: px + (Math.sin(tilt) * segLen) / 2,
      y: py - (Math.cos(tilt) * segLen) / 2,
      tilt,
    });
    px += Math.sin(tilt) * segLen;
    py -= Math.cos(tilt) * segLen;
  }
  return (
    <group rotation={[0, yaw, 0]}>
      {joints.map((j, i) => {
        const leafSide = (i + phase) % 4 < 2 ? 1 : -1;
        return (
          <group key={i} position={[j.x, j.y, 0]} rotation={[0, 0, -j.tilt]}>
            {/* stem segment */}
            <mesh>
              <boxGeometry args={[0.02, segLen + 0.012, 0.016]} />
              <meshStandardMaterial color="#2e6e54" />
            </mesh>
            {/* leaf pair at alternating joints, sides swapping down the strand */}
            {(i + phase) % 2 === 0 && (
              <>
                <mesh position={[0.018, 0, leafSide * 0.03]} rotation={[leafSide * 0.55, 0, -0.4]}>
                  <boxGeometry args={[0.055, 0.075, 0.012]} />
                  <meshStandardMaterial color={ENGAWA_VINE_LEAF_GREENS[(i + phase) % 3]} />
                </mesh>
                <mesh position={[-0.012, -0.02, leafSide * -0.024]} rotation={[leafSide * -0.45, 0, 0.35]}>
                  <boxGeometry args={[0.045, 0.06, 0.012]} />
                  <meshStandardMaterial color={ENGAWA_VINE_LEAF_GREENS[(i + phase + 1) % 3]} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** One leaning/upright book spine for the new east-wall shelf cluster
 *  (SHELF + LIGHT PASS) — same construction as Workspace's own bookshelf
 *  Spine helper (duplicated locally, not imported: Workspace.tsx is owned
 *  by another edit this pass and isn't touched to export it). `z` is
 *  position along the shelf's length (matches this shelf's own length
 *  axis, world Z); `tilt` rotates about X so it leans into its neighbor
 *  along that same length axis. */
function ShelfBook({
  x = 0,
  y0,
  z,
  w,
  h,
  d,
  color,
  tilt = 0,
}: {
  x?: number;
  y0: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  tilt?: number;
}) {
  return (
    <mesh position={[x, y0 + h / 2, z]} rotation={[tilt, 0, 0]}>
      <boxGeometry args={[d, h, w]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/** Small candle for the new shelves (SHELF + LIGHT PASS) — wax body + a
 *  warm emissive flame tip, clamped well under the Bloom threshold (0.6
 *  luminance) since the flame is a tiny point. `lit` nests a real
 *  pointLight at the flame tip (rotation-safe by construction) — only used
 *  once, for the west-wall accent shelf's light; the east-wall shelf's
 *  candles are decorative-only (that wall already gets its own LED rope +
 *  fairy string as real light sources). */
function Candle({
  x = 0,
  y0,
  z,
  h = 0.08,
  r = 0.014,
  lit = false,
}: {
  x?: number;
  y0: number;
  z: number;
  h?: number;
  r?: number;
  lit?: boolean;
}) {
  return (
    <group position={[x, y0, z]}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r, r * 1.05, h, 8]} />
        <meshStandardMaterial color="#e6d8b8" />
      </mesh>
      <mesh position={[0, h + 0.012, 0]}>
        <coneGeometry args={[0.006, 0.02, 6]} />
        <meshStandardMaterial color="#ffcf8f" emissive="#ffcf8f" emissiveIntensity={1.1} />
      </mesh>
      {lit && <pointLight position={[0, h + 0.02, 0]} color="#ffd9a0" intensity={1} distance={1.6} decay={2} />}
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
 * plane) with a cutout (z 2.4-4.4, DRESS2 pass), the walk-through gap for the engawa's
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
  // west wall — split around the widened engawa door gap (z 2.4-4.4, DRESS2 pass), same
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
  // rug — the movie-ticket rug the owner asked for (W12), recreating a
  // reference he supplied: a red cinema stub with notched ends, a cream
  // tufted border, black linework and gold stars. Alpha-cutout PNG, so
  // alphaTest is needed on the material (same as rug-mushroom/rug-blob).
  // rug-flower, rug-blob, rug-moroccan and the rugOption* designs all stay
  // on disk unreferenced, per the standing "keep rejected variants" rule
  // (see the linen-quilt comment above for the same pattern).
  const rugTex = usePixelTexture("/3am/tex/rug-ticket.png", 1, 1);
  // deck floor — same floor-oak family as the room. Cut into 4 pieces
  // around the zen garden (ZEN_DECK_NORTH/SOUTH/WEST/EAST above) instead
  // of one continuous plane — see the const-block comment for why (the
  // single plane used to paint over the recessed gravel bed). Each piece
  // keeps its own repeat proportional to its own footprint, same
  // 1-repeat-unit-per-meter convention the room's own floor/wall segments
  // already use.
  const deckFloorN = usePixelTexture(FLOOR_TEX, ZEN_DECK_NORTH.w, ZEN_DECK_NORTH.d);
  const deckFloorS = usePixelTexture(FLOOR_TEX, ZEN_DECK_SOUTH.w, ZEN_DECK_SOUTH.d);
  const deckFloorW = usePixelTexture(FLOOR_TEX, ZEN_DECK_WEST.w, ZEN_DECK_WEST.d);
  const deckFloorE = usePixelTexture(FLOOR_TEX, ZEN_DECK_EAST.w, ZEN_DECK_EAST.d);
  // poster wall (P4 MOVIE-POSTER REHANG) — five textures, same 1x1
  // whole-image convention as MusicNook's posterGig/posterWave/posterMoons.
  const posterEclipse = usePixelTexture("/3am/tex/poster-eclipse.png", 1, 1);
  const posterMecha = usePixelTexture("/3am/tex/poster-mecha.png", 1, 1);
  const posterSamurai = usePixelTexture("/3am/tex/poster-samurai.png", 1, 1);
  const posterNoirCity = usePixelTexture("/3am/tex/poster-noir-city.png", 1, 1);
  const posterRetroSpace = usePixelTexture("/3am/tex/poster-retro-space.png", 1, 1);
  // SW framed art — muted mountain-ridge silhouette, an older abstract
  // texture (not one of the five north-wall movie posters, so it doesn't
  // compete/duplicate) whose cool purple-blue night palette suits the
  // plants corner without pulling focus from the poster-wall gallery.
  const posterMountainRidge = usePixelTexture("/3am/tex/poster-mountain-ridge.png", 1, 1);
  // zen garden corner — gravel bed tiled per ZEN_GRAVEL_REPEAT_X/Z (~1
  // tile/1.2m so the rake-line texture reads at pixelation granularity 3,
  // not stretched/smeared); stepping stones + moss are whole-image 1x1,
  // same convention as the posters above.
  const zenGravelTex = usePixelTexture("/3am/tex/zen-gravel.png", ZEN_GRAVEL_REPEAT_X, ZEN_GRAVEL_REPEAT_Z);
  const zenStoneTex = usePixelTexture("/3am/tex/stone-slab.png", 1, 1);
  const zenMossTex = usePixelTexture("/3am/tex/zen-moss.png", 1, 1);

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
          eclipse: posterEclipse,
          mecha: posterMecha,
          samurai: posterSamurai,
          noirCity: posterNoirCity,
          retroSpace: posterRetroSpace,
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
          gap (z 2.4-4.4, DRESS2 pass). Each segment gets a face on BOTH sides of the box:
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
          2.4-4.4, DRESS2 pass). Collision lives in layout.ts (the ENGAWA_* rects — this
          file's DECK_RECT/RAIL_*_RECT consts above are verbatim copies for
          rendering, source of truth stays there). The void beyond the west
          rail has no geometry — it reads via the scene background, per the
          owner's ask (no sky geometry this wave). ── */}

      {/* deck floor — floor-oak, flush with the room floor (y=0.02). 4
          pieces framing the zen garden's own footprint (see the
          ZEN_DECK_NORTH/SOUTH/WEST/EAST const-block comment) instead of
          one continuous plane, so the deck floor doesn't paint over the
          recessed gravel bed sitting below it. */}
      {[
        { r: ZEN_DECK_NORTH, tex: deckFloorN },
        { r: ZEN_DECK_SOUTH, tex: deckFloorS },
        { r: ZEN_DECK_WEST, tex: deckFloorW },
        { r: ZEN_DECK_EAST, tex: deckFloorE },
      ].map(({ r, tex }, i) => (
        <mesh
          key={`deck-floor-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[R.x + r.x + r.w / 2, 0.02, R.z + r.z + r.d / 2]}
        >
          <planeGeometry args={[r.w, r.d]} />
          <meshStandardMaterial map={tex} />
        </mesh>
      ))}

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
          z 2.4-4.4 opening (DRESS2 pass). Jambs sit just inside the SOLID
          wall bands (z<2.4 / z>4.4) so they never intrude on the walk gap
          itself. */}
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
          pane's, z 2.4-3.1 — matching layout.ts's ENGAWA_DOOR_GLASS_RECT
          collider exactly, so this fixed pane is now genuinely solid, not
          just painted-on); the "open" pane is just slid 3cm further
          outward, so together they read as a door slid open, leaving z
          3.1-4.4 (1.3m, DRESS2 pass — was 0.9m) clear as the walk gap.
          Static this wave — an actual slide animation is a future
          nicety. */}
      {[
        { x: DOOR_GLASS_FIXED_X, handle: false },
        { x: DOOR_GLASS_OPEN_X, handle: true },
      ].map(({ x, handle }, i) => {
        const z0 = ENGAWA_DOOR_Z0;
        const zc = z0 + DOOR_PANEL_W / 2;
        return (
          <group key={`glass-panel-${i}`} position={[R.x + x, 0, R.z]}>
            <mesh position={[0, DOOR_PANEL_Y0 + DOOR_PANEL_H / 2, zc]}>
              <boxGeometry args={[0.012, DOOR_PANEL_H, DOOR_PANEL_W - DOOR_GLASS_W_REVEAL]} />
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

      {/* ── paper lanterns (×3, DRESS2 pass — ends + middle of the rail, was
          ×2) — hang from the rail. Each is warm off-white paper with a
          bumped emissive glow (ENGAWA_LANTERN_EMISSIVE) so it reads as lit
          even without its own light; only 2 of the 3 (`real: true`) get a
          NESTED warm pointLight (rotation-safe by construction) — the
          engawa sits in the bedroom render-band, on-screen at the
          workspace-centre 3-room overlap (the 60fps-critical spot), so the
          real-light count stays capped at 2 even though the lantern count
          grew. NO castShadow on any of them — the scene's 2-shadow-caster
          budget (both in MusicNook) stays untouched. The middle lantern
          (x -1.0/z 3.0) spills back through the open door threshold into
          the room (door center is now z=3.4, DRESS2 pass); the south-end
          lantern (x -1.0/z 5.3) lights the far south end of the deck, near
          the relocated bonsai pedestal. The north-end lantern (z 0.7) is
          emissive-only. ── */}
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
          {/* paper body — warm off-white, bumped emissive (DRESS2 pass) so
              every lantern glows even without its own light's falloff */}
          <mesh>
            <cylinderGeometry args={[ENGAWA_LANTERN_R, ENGAWA_LANTERN_R, ENGAWA_LANTERN_H, 12, 1, true]} />
            <meshStandardMaterial
              color="#f5ecd8"
              emissive="#f5ecd8"
              emissiveIntensity={ENGAWA_LANTERN_EMISSIVE}
              side={2}
            />
          </mesh>
          {/* the fixture's own light — NESTED (rotation-safe by
              construction, matches every other fixture-light in this
              file), only on the 2 `real` lanterns (perf cap, see the
              comment above) */}
          {l.real && <pointLight color="#ffd9a0" intensity={5} distance={5} decay={2} />}
        </group>
      ))}

      {/* ── draping vines along the hanging rail (DRESS2 pass) — see the
          ENGAWA_VINES/VineStrand comments above. No collider (overhead);
          castShadow comes from Bedroom's own root traverse. ── */}
      {ENGAWA_VINES.map((v, i) => (
        <group key={`engawa-vine-${i}`} position={[R.x - 1.0, ENGAWA_HANGRAIL_Y - 0.03, R.z + v.z]}>
          {/* wrap knot — small leaf tuft where the vine grips the rail */}
          <mesh>
            <sphereGeometry args={[0.04, 8, 6]} />
            <meshStandardMaterial color="#2e6e54" />
          </mesh>
          <VineStrand dir={[0.2, 0.05]} segments={v.segA} phase={v.phase} />
          <VineStrand dir={[-0.25, -0.08]} segments={v.segB} segLen={0.075} phase={v.phase + 1} />
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

      {/* ── PLANT PASS — TallPalm (statement plant, deck's north tip near
          the tea nook) + FicusLyrata (balancing second plant, east side/
          different z-band). Real GLB models, see the ENGAWA_TALLPALM_RECT/
          ENGAWA_FICUS_RECT comment above for the placement + collider
          arithmetic. Own Suspense each so the fetch never blocks the
          room's first paint. ── */}
      <Suspense fallback={null}>
        <TallPalm
          position={[R.x + ENGAWA_TALLPALM_CENTER.x, 0, R.z + ENGAWA_TALLPALM_CENTER.z]}
          rotationY={0.4}
        />
      </Suspense>
      <Suspense fallback={null}>
        <FicusLyrata
          position={[R.x + ENGAWA_FICUS_CENTER.x, 0, R.z + ENGAWA_FICUS_CENTER.z]}
          rotationY={-0.3}
        />
      </Suspense>

      {/* ── zen garden corner (engawa south end) — see the ZEN_* consts
          above for the full layout/rect arithmetic. Recessed raked-gravel
          bed (curb-framed), a meandering stepping-stone path, moss + grass
          tufts, accent rocks (the biggest gets its own collider), a fancy
          lacquered display stand (kadai), and the big hand-built bonsai.
          NO new real lights — reads by the two existing lantern lights,
          per the engawa's own lighting budget note. ── */}
      {/* curb — 4 border bars framing the gravel bed (same 4-bar mitred-
          border technique the mirror frame above uses), top poking
          ZEN_CURB_LIP above deck level, bottom reaching down to the
          recessed gravel floor. */}
      {[
        [ZEN_BED_RECT.x + ZEN_BED_RECT.w / 2, ZEN_BED_RECT.z + ZEN_CURB_T / 2, ZEN_BED_RECT.w, ZEN_CURB_T], // north
        [
          ZEN_BED_RECT.x + ZEN_BED_RECT.w / 2,
          ZEN_BED_RECT.z + ZEN_BED_RECT.d - ZEN_CURB_T / 2,
          ZEN_BED_RECT.w,
          ZEN_CURB_T,
        ], // south
        [
          ZEN_BED_RECT.x + ZEN_CURB_T / 2,
          ZEN_BED_RECT.z + ZEN_BED_RECT.d / 2,
          ZEN_CURB_T,
          ZEN_BED_RECT.d - ZEN_CURB_T * 2,
        ], // west
        [
          ZEN_BED_RECT.x + ZEN_BED_RECT.w - ZEN_CURB_T / 2,
          ZEN_BED_RECT.z + ZEN_BED_RECT.d / 2,
          ZEN_CURB_T,
          ZEN_BED_RECT.d - ZEN_CURB_T * 2,
        ], // east
      ].map(([cx, cz, w, d], i) => (
        <mesh key={`zen-curb-${i}`} position={[R.x + cx, ZEN_GRAVEL_Y + ZEN_CURB_H / 2, R.z + cz]}>
          <boxGeometry args={[w, ZEN_CURB_H, d]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
      ))}

      {/* recessed gravel bed — inset within the curb (ZEN_GRAVEL_RECT),
          ZEN_GRAVEL_RECESS below deck level. This corner sits far from
          both lantern lights and gets only the scene's dim blue-tinted
          ambient (ambientLight color #8d9bd6, Scene.tsx) — under that cool
          light alone, the gravel texture's low-contrast beige rake pattern
          washed out to a near-flat purple-gray in testing, unreadable as
          "raked gravel." Fixed with a matching emissiveMap at a low
          intensity (0.22) — same texture drives both the lit color AND a
          small self-lit boost, so the wave pattern reads consistently
          regardless of the ambient tint, without adding a real light (the
          brief's "emissive only, clamped" allowance). Max per-channel
          emissive contribution ≈0.22*0.85(texture's own peak brightness)
          ≈0.19, comfortably under the Bloom pass's 0.6 luminance
          threshold (Effects.tsx) — reads brighter, not blown out. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[
          R.x + ZEN_GRAVEL_RECT.x + ZEN_GRAVEL_RECT.w / 2,
          ZEN_GRAVEL_Y,
          R.z + ZEN_GRAVEL_RECT.z + ZEN_GRAVEL_RECT.d / 2,
        ]}
      >
        <planeGeometry args={[ZEN_GRAVEL_RECT.w, ZEN_GRAVEL_RECT.d]} />
        <meshStandardMaterial map={zenGravelTex} emissiveMap={zenGravelTex} emissive="#ffffff" emissiveIntensity={0.22} />
      </mesh>

      {/* stepping-stone path */}
      {ZEN_STONES.map((s, i) => (
        <mesh
          key={`zen-stone-${i}`}
          position={[R.x + s.x, ZEN_GRAVEL_Y + ZEN_STONE_H / 2, R.z + s.z]}
          rotation={[0, s.rot, 0]}
        >
          <boxGeometry args={[s.w, ZEN_STONE_H, s.d]} />
          <meshStandardMaterial map={zenStoneTex} />
        </mesh>
      ))}

      {/* moss patches */}
      {ZEN_MOSS.map((m, i) => (
        <mesh
          key={`zen-moss-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[R.x + m.x, ZEN_GRAVEL_Y + 0.006, R.z + m.z]}
        >
          <circleGeometry args={[m.r, 10]} />
          <meshStandardMaterial map={zenMossTex} />
        </mesh>
      ))}

      {/* grass tufts — thin upright blades planted straight into the
          gravel, RAILING_PLANTS' own "blade" idiom reused without the pot. */}
      {ZEN_GRASS.map((g, i) => (
        <group key={`zen-grass-${i}`} position={[R.x + g.x, ZEN_GRAVEL_Y, R.z + g.z]}>
          {[0, 1, 2].map((k) => {
            const a = (k / 3) * Math.PI * 2 + i * 0.7;
            const h = 0.12 + (k % 2) * 0.05;
            return (
              <mesh key={k} position={[Math.sin(a) * 0.02, h / 2, Math.cos(a) * 0.02]} rotation={[0, a, 0.12]}>
                <boxGeometry args={[0.018, h, 0.008]} />
                <meshStandardMaterial color={k % 2 ? "#3f8f5a" : "#6bb37a"} />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* accent rocks — chunky faceted pixel rocks (low-detail
          icosahedra, flat-shaded). The two small ones are pure
          decoration; the big one (ZEN_ROCK_RECT, the anchor) is the only
          one with a collider. */}
      {ZEN_ROCKS_SMALL.map((rk, i) => (
        <mesh
          key={`zen-rock-sm-${i}`}
          position={[R.x + rk.x, ZEN_GRAVEL_Y + rk.r * 0.7, R.z + rk.z]}
          rotation={[0.3, i, 0.15]}
        >
          <icosahedronGeometry args={[rk.r, 0]} />
          <meshStandardMaterial color={rk.color} flatShading roughness={0.9} />
        </mesh>
      ))}
      <mesh
        position={[R.x + ZEN_ROCK_CENTER.x, ZEN_GRAVEL_Y + 0.12, R.z + ZEN_ROCK_CENTER.z]}
        rotation={[0.2, 0.6, -0.1]}
      >
        <icosahedronGeometry args={[0.17, 0]} />
        <meshStandardMaterial color="#54545a" flatShading roughness={0.9} />
      </mesh>

      {/* ── display stand (kadai) — collider ZEN_STAND_RECT. Dark
          lacquered wood, a stepped/chamfered tabletop overhang, 4
          tapering cabriole-hinted legs (2 stacked boxes each — a
          kicked-out lower segment + a straighter upper segment, not one
          straight box), a decorative apron rail between the legs, small
          feet. ── */}
      <group position={[R.x + ZEN_STAND_CENTER.x, 0, R.z + ZEN_STAND_CENTER.z]}>
        {(() => {
          const lacquer = "#1c130e";
          const lacquerLight = "#2a1d14";
          const legInset = ZEN_STAND_RECT.w / 2 - 0.06; // 0.19 — leg x-offset from center
          const legInsetZ = ZEN_STAND_RECT.d / 2 - 0.06; // 0.14 — leg z-offset from center
          return (
            <>
              {/* 4 legs, corner-positioned, each 2 stacked boxes */}
              {[-1, 1].map((sx) =>
                [-1, 1].map((sz) => (
                  <group key={`${sx}-${sz}`} position={[sx * legInset, 0, sz * legInsetZ]}>
                    <mesh position={[0, 0.015, 0]}>
                      <cylinderGeometry args={[0.02, 0.024, 0.03, 8]} />
                      <meshStandardMaterial color={lacquer} roughness={0.25} />
                    </mesh>
                    {/* lower leg — kicked outward, a cabriole hint */}
                    <mesh position={[sx * 0.02, 0.11, sz * 0.02]} rotation={[sz * 0.12, 0, -sx * 0.12]}>
                      <boxGeometry args={[0.03, 0.17, 0.03]} />
                      <meshStandardMaterial color={lacquer} roughness={0.25} />
                    </mesh>
                    {/* upper leg — straightens up, tapers narrower */}
                    <mesh position={[0, 0.31, 0]}>
                      <boxGeometry args={[0.022, 0.23, 0.022]} />
                      <meshStandardMaterial color={lacquer} roughness={0.25} />
                    </mesh>
                  </group>
                ))
              )}
              {/* apron / fret rail — 4 thin decorative bands just under
                  the tabletop, connecting each side's leg pair, with a
                  lighter trim line for a routed/fretwork accent. */}
              {(
                [
                  { axis: "x" as const, s: -1 },
                  { axis: "x" as const, s: 1 },
                  { axis: "z" as const, s: -1 },
                  { axis: "z" as const, s: 1 },
                ] as const
              ).map(({ axis, s }, i) => (
                <group key={i}>
                  <mesh position={axis === "x" ? [0, 0.44, s * legInsetZ] : [s * legInset, 0.44, 0]}>
                    <boxGeometry
                      args={
                        axis === "x"
                          ? [legInset * 2 - 0.02, 0.07, 0.018]
                          : [0.018, 0.07, legInsetZ * 2 - 0.02]
                      }
                    />
                    <meshStandardMaterial color={lacquer} roughness={0.25} />
                  </mesh>
                  <mesh
                    position={
                      axis === "x"
                        ? [0, 0.44, s * legInsetZ - s * 0.012]
                        : [s * legInset - s * 0.012, 0.44, 0]
                    }
                  >
                    <boxGeometry
                      args={
                        axis === "x"
                          ? [legInset * 2 - 0.06, 0.025, 0.006]
                          : [0.006, 0.025, legInsetZ * 2 - 0.06]
                      }
                    />
                    <meshStandardMaterial color={lacquerLight} roughness={0.3} />
                  </mesh>
                </group>
              ))}
              {/* tabletop — stepped/chamfered profile: a slightly wider,
                  thinner lip beneath a narrower main slab, reading as a
                  deliberate two-tier overhang. */}
              <mesh position={[0, ZEN_STAND_H - 0.025, 0]}>
                <boxGeometry args={[ZEN_STAND_RECT.w - 0.02, 0.015, ZEN_STAND_RECT.d - 0.02]} />
                <meshStandardMaterial color={lacquer} roughness={0.2} />
              </mesh>
              <mesh position={[0, ZEN_STAND_H - 0.0125, 0]}>
                <boxGeometry args={[ZEN_STAND_RECT.w - 0.08, 0.025, ZEN_STAND_RECT.d - 0.08]} />
                <meshStandardMaterial color={lacquer} metalness={0.15} roughness={0.18} />
              </mesh>
            </>
          );
        })()}
      </group>

      {/* ── the BIG bonsai — real GLB model (Bonsai, scene/models/Plants.tsx),
          replacing the old hand-built trunk/branches/foliage-pads wholesale.
          Centered on the kadai's own top surface: ZEN_STAND_CENTER (the
          stand's XZ center) at y=ZEN_STAND_H (the stand's own tabletop
          surface height, same anchor the old hand-built group used — the
          model's base already sits at local y≈0, so no extra y offset is
          needed to read "flat," not floating/sunk). BONSAI_SCALE=1.3 on the
          model's native 0.642m height/~0.55x0.48m footprint reads as a
          BIG display specimen (~0.83m tall) while still centered on the
          stand — its canopy deliberately overhangs the stand's edges at
          this scale, same "foliage has no collider, overhang is fine"
          convention the old hand-built crown and the engawa's draping
          vines both already use. ── */}
      <Suspense fallback={null}>
        <Bonsai
          position={[R.x + ZEN_STAND_CENTER.x, ZEN_STAND_H, R.z + ZEN_STAND_CENTER.z]}
          scale={BONSAI_SCALE}
        />
      </Suspense>

      {/* moonlight spill DEFERRED to the lighting/post-processing plan (Plan 5):
          a convincing "soft light coming out through the door" needs real
          post-processing (volumetric god-rays / light bloom), not faked
          translucent floor planes. Both attempts (vertical shafts, then flat
          patches) read wrong, so it's removed for now — revisit with the
          day/night + post-processing system. */}

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
          only the seat moved. CATBED ENLARGE PASS: wrapped in a scale group
          (CAT_SCALE, see the const's comment above) — Cat itself mounts at
          its own local origin (x/y/z=0) so the group's own position carries
          CAT_X/Y/Z unscaled. OPEN-SOUTH PASS adds a rotation to this SAME
          group (CAT_EXTRA_ROTATION_Y, see its comment above) so her
          chest/muzzle/paw cluster actually faces the rim's new open south
          arc instead of Cat.tsx's own default facing (east) — Cat.tsx
          itself is untouched, this is purely how Bedroom orients her. */}
      <group position={[CAT_X, CAT_Y, CAT_Z]} scale={CAT_SCALE} rotation={[0, CAT_EXTRA_ROTATION_Y, 0]}>
        <Cat x={0} y={0} z={0} />
      </group>

      {/* ── cat's bed — collider {6.72,0.45,0.88,0.88}, FURNISHING WAVE,
          enlarged CATBED ENLARGE PASS (was {7.05,0.45,0.55,0.55} — see the
          CATBED_RECT const's comment above for the clearance arithmetic).
          Round pet bed: OPEN-SOUTH PASS replaces the old continuous torus
          rim with a ring of chunky box segments (CATBED_RIM_SEGS above)
          whose height falls off toward due-south (the camera-facing side),
          down to a low front lip there so the cat curled on the inner pad
          reads fully unoccluded from the default dollhouse view — full
          height everywhere else, still a proper round padded cushion.
          CATBED FIX PASS: each segment's radial DEPTH now equals its own
          HEIGHT (`h`, was the constant CATBED_RIM_FULL_H for every segment
          regardless of height) — a square cross-section at every angle, so
          a low segment is a small chunky curb, not a wide flat plank lying
          on the floor (that fixed-depth mismatch was the fan/starburst
          bug — see the CATBED_RIM_MIN_H comment above for the full
          diagnosis). Pad radius shrunk this pass too (CATBED_PAD_R, see its
          own comment) so the cushion is visibly nested inside the ring
          rather than buried under its inner lip — the cat sits on its own
          top surface (CATBED_PAD_H, see the consts above). No light — reads
          by the room's ambient + the nearby sconce/lamps. ── */}
      <group position={[CATBED_CENTER.x, 0, CATBED_CENTER.z]}>
        {CATBED_RIM_SEGS.map(({ a, h }, i) => (
          <mesh
            key={i}
            position={[Math.sin(a) * CATBED_RING_R, h / 2, Math.cos(a) * CATBED_RING_R]}
            rotation={[0, a, 0]}
          >
            <boxGeometry args={[CATBED_RIM_SEG_W, h, h]} />
            <meshStandardMaterial color="#a04b3a" />
          </mesh>
        ))}
        {/* CATBED FIX PASS: pad recolored #e6d8b8→#8a94a0 (dusty blue-gray).
            Cat.tsx's own CAT_CREAM (#e8d9bc, chest/muzzle/paw) is nearly
            identical to the pad's old cream — same tone sitting on same
            tone reads as one blob, so "cream chest/muzzle visible" failed
            on color contrast even once the rim stopped occluding her. A
            cushion tone distinct from both the cat's cream AND the rim's
            rust now makes her actually read as a separate shape on the
            pad. Cat.tsx is off-limits this pass, so the fix is here. */}
        <mesh position={[0, CATBED_PAD_H / 2, 0]}>
          <cylinderGeometry args={[CATBED_PAD_R, CATBED_PAD_R, CATBED_PAD_H, 16]} />
          <meshStandardMaterial color="#8a94a0" />
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

      {/* ── rug — the movie-ticket rug (W12). Position/size derivation and
          the clearance checks against the bed, cat bed and plants live in
          the RUG_* comment block above. ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[RUG_X, 0.035, RUG_Z]}>
        <planeGeometry args={[RUG_W, RUG_D]} />
        <meshStandardMaterial map={rugTex} transparent alphaTest={0.5} />
      </mesh>

      {/* ── PLANT PASS — the two hand-built corner plants (pot cylinder +
          leaf-blade / sphere-cluster meshes) are REPLACED by real GLB
          models: BroadleafPlant (collider {0.43,5.0,0.94,0.84}) and
          PottedTree (collider {1.55,5.0,0.66,0.66}, beside the broadleaf,
          0.18m gap) — see BEDROOM_BROADLEAF_RECT/BEDROOM_POTTEDTREE_RECT
          above for the placement arithmetic (nudged 12cm south of the old
          hand-built rects so the bigger broadleaf clears the {1.6,4.6}
          walkway probe with real margin). Own Suspense each so the fetch
          never blocks the room's first paint. ── */}
      <Suspense fallback={null}>
        <BroadleafPlant
          position={[BEDROOM_BROADLEAF_CENTER.x, 0, BEDROOM_BROADLEAF_CENTER.z]}
          rotationY={0.5}
        />
      </Suspense>
      <Suspense fallback={null}>
        <PottedTree
          position={[BEDROOM_POTTEDTREE_CENTER.x, 0, BEDROOM_POTTEDTREE_CENTER.z]}
          rotationY={-0.6}
        />
      </Suspense>

      {/* ── SW framed art — wallWS (west wall, south of the door gap), over
          the plants corner. See the SW_ART_* const-block comment above for
          the wall-choice reasoning. Shadow decal + mitred frame + recessed
          canvas, same layered idiom as the mirror (MIRROR_* below), no
          collider (flush wall dressing, same convention as every poster/
          mirror/shelf in this room). ── */}
      <mesh position={[SW_ART_WALL_X + 0.005, SW_ART_Y - 0.02, SW_ART_Z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry
          args={[SW_ART_W + SW_ART_FRAME_BORDER * 2 + 0.05, SW_ART_H + SW_ART_FRAME_BORDER * 2 + 0.05]}
        />
        <meshStandardMaterial color="#0a0a0c" transparent opacity={0.18} />
      </mesh>
      {[
        // [cy, cz, w(local z-span), h(local y-span)]
        [SW_ART_Y + SW_ART_H / 2 + SW_ART_FRAME_BORDER / 2, SW_ART_Z, SW_ART_W + SW_ART_FRAME_BORDER * 2, SW_ART_FRAME_BORDER], // top
        [SW_ART_Y - SW_ART_H / 2 - SW_ART_FRAME_BORDER / 2, SW_ART_Z, SW_ART_W + SW_ART_FRAME_BORDER * 2, SW_ART_FRAME_BORDER], // bottom
        [SW_ART_Y, SW_ART_Z - SW_ART_W / 2 - SW_ART_FRAME_BORDER / 2, SW_ART_FRAME_BORDER, SW_ART_H], // north side (toward the door)
        [SW_ART_Y, SW_ART_Z + SW_ART_W / 2 + SW_ART_FRAME_BORDER / 2, SW_ART_FRAME_BORDER, SW_ART_H], // south side
      ].map(([cy, cz, w, h], i) => (
        <mesh key={`sw-art-frame-${i}`} position={[SW_ART_FRAME_CENTER_X, cy, cz]}>
          <boxGeometry args={[SW_ART_FRAME_DEPTH, h, w]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
      ))}
      <mesh position={[SW_ART_CANVAS_X, SW_ART_Y, SW_ART_Z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[SW_ART_W, SW_ART_H]} />
        <meshStandardMaterial map={posterMountainRidge} />
      </mesh>

      {/* ── south floor lamp — collider {2.55,5.25,0.35,0.35}. See the
          SOUTH_LAMP_* const-block comment above for the placement
          arithmetic. Tripod base / pole / open-cone shade, warm pointLight
          NESTED inside the shade group (rotation-safe by construction).
          This room has no literal ceiling pendant (every other bedroom
          light is wall/furniture-mounted or an engawa-deck lantern), so
          this is the pick for the room's shadow caster — the tallest
          freestanding fixture over open interior floor (owner override of
          the old "2 casters, both music nook" rule — discrete-room
          rendering means only this room's own caster is ever live while
          occupied). ── */}
      <group position={[SOUTH_LAMP_CENTER.x, 0, SOUTH_LAMP_CENTER.z]}>
        <mesh position={[0, SOUTH_LAMP_BASE_H / 2, 0]}>
          <cylinderGeometry args={[SOUTH_LAMP_BASE_R, SOUTH_LAMP_BASE_R + 0.02, SOUTH_LAMP_BASE_H, 10]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[0, SOUTH_LAMP_BASE_H + SOUTH_LAMP_POLE_H / 2, 0]}>
          <cylinderGeometry args={[SOUTH_LAMP_POLE_R, SOUTH_LAMP_POLE_R, SOUTH_LAMP_POLE_H, 8]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[0, SOUTH_LAMP_SHADE_Y, 0]}>
          <cylinderGeometry args={[0.14, 0.19, SOUTH_LAMP_SHADE_H, 10, 1, true]} />
          <meshStandardMaterial color="#ffb35c" emissive="#ffb35c" emissiveIntensity={0.85} side={2} />
        </mesh>
        <pointLight castShadow shadow-mapSize={[256, 256]} shadow-bias={-0.0015} shadow-radius={3} shadow-intensity={0.85} position={[0, SOUTH_LAMP_SHADE_Y, 0]} color="#ffd9a0" intensity={5} distance={4.5} decay={2} />
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
            toward the poster cluster. spotLight sits at the lens's own
            local position ([0,0.065,0], same as the lens mesh) so it's
            genuinely nested in the rotated can and emits from the lens,
            not a sibling floating at a fixed world height. */}
        <group position={[0, 0.44, 0]} rotation={[0, 0, -0.55]}>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.06, 8]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, 0.065, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 0.012, 8]} />
            <meshStandardMaterial color="#ff7a72" emissive="#ff6a55" emissiveIntensity={3.2} />
          </mesh>
          <spotLight
            position={[0, 0.065, 0]}
            target={stoolLampTarget}
            angle={0.55}
            penumbra={0.6}
            intensity={8}
            distance={4}
            decay={1.6}
            color="#ff7a5c"
          />
        </group>
      </group>
      <primitive object={stoolLampTarget} position={[4.2, 2.0, 0.15]} />

      {/* ── bed-front bench — REMOVED (owner ask: "that sitting thing at
          the bottom of the bed" gone). Its collider is gone too (see
          layout.ts's furniture list); SPAWN ({4,4.3}) stays put, still
          clear of every remaining bedroom rect. ── */}

      {/* ── wardrobe: open hanging rail — collider {3.3,5.35,2.2,0.5},
          south-center. PIPE WARDROBE REBUILD (owner reference photo,
          2026-08-02), replacing the old wooden A-frame rack entirely. Two
          straight black pipe uprights (floor flange + a top elbow where
          the rail lands) support a single round horizontal rail at
          WARD_RAIL_Y — an industrial pipe-fitting look (straight tubes +
          visible flange/elbow joints), not a lean-frame. 7 garments hang
          VERTICALLY off thin dark hangers, evenly spaced — mostly cream/
          white/grey/tan hoodies + tees with one dark piece, per the
          reference. The wooden shelves (SHOE_RECT, east) and the black
          chest of drawers (spans both rects, below) complete the unit —
          see their own comment blocks. All spans derive from HANGER_RECT
          via the WARD_* consts above (rect-derived, never re-hardcoded) —
          see p4-wardrobe-pipe-report.md for the full arithmetic.

          FUTURE: interact → outfit change; clothes/characters unlock via
          easter eggs (owner roadmap). ── */}
      <group position={[HANGER_CENTER.x, 0, HANGER_CENTER.z]}>
        {/* two straight pipe uprights, floor flange to the rail's own height */}
        {[-1, 1].map((side) => {
          const sx = side * WARD_UPRIGHT_X;
          return (
            <group key={side}>
              <mesh position={[sx, WARD_RAIL_Y / 2, 0]}>
                <cylinderGeometry args={[WARD_PIPE_R, WARD_PIPE_R, WARD_RAIL_Y, 10]} />
                <meshStandardMaterial color="#1c1c22" metalness={0.6} roughness={0.35} />
              </mesh>
              {/* floor-mount flange */}
              <mesh position={[sx, 0.008, 0]}>
                <cylinderGeometry args={[WARD_FLANGE_R, WARD_FLANGE_R, 0.016, 12]} />
                <meshStandardMaterial color="#111116" metalness={0.6} roughness={0.35} />
              </mesh>
              {/* elbow fitting where the rail lands */}
              <mesh position={[sx, WARD_RAIL_Y, 0]}>
                <sphereGeometry args={[WARD_ELBOW_R, 10, 8]} />
                <meshStandardMaterial color="#111116" metalness={0.6} roughness={0.35} />
              </mesh>
            </group>
          );
        })}
        {/* horizontal rail, spanning between the two uprights */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, WARD_RAIL_Y, 0]}>
          <cylinderGeometry args={[WARD_PIPE_R, WARD_PIPE_R, WARD_UPRIGHT_X * 2, 10]} />
          <meshStandardMaterial color="#1c1c22" metalness={0.6} roughness={0.35} />
        </mesh>

        {/* 7 garments — thin dark hangers, evenly spaced, hanging
            VERTICALLY (drapey, taller-than-wide silhouettes, longer than
            the old rack's shirts so they read as hoodies/tees). West→east:
            dark hoodie, cream hoodie, white tee, grey tee, tan hoodie,
            cream tee, grey hoodie — mostly cream/white/grey/tan with one
            dark piece, per the reference. "hoodie" garments get a small
            hood block above the shoulder line + a kangaroo-pocket accent;
            plain garments are a simple tapered drop (same chest/hem
            two-part stack the old rack's shirts used). ── */}
        {[
          { dx: -0.72, hoodie: true, h: 0.72, w: 0.24, c: "#2a2a30", accent: "#1c1c22" }, // dark hoodie
          { dx: -0.48, hoodie: true, h: 0.76, w: 0.25, c: "#e8e1d2", accent: "#d8cfba" }, // cream hoodie
          { dx: -0.24, hoodie: false, h: 0.6, w: 0.21, c: "#f2efe8", accent: "#e2ded4" }, // white tee
          { dx: 0, hoodie: false, h: 0.58, w: 0.2, c: "#a8a49a", accent: "#96928a" }, // grey tee
          { dx: 0.24, hoodie: true, h: 0.74, w: 0.25, c: "#c9b088", accent: "#b39c74" }, // tan hoodie
          { dx: 0.48, hoodie: false, h: 0.56, w: 0.2, c: "#e2dccb", accent: "#d2ccbb" }, // cream tee
          { dx: 0.72, hoodie: true, h: 0.7, w: 0.24, c: "#9a9a92", accent: "#87877e" }, // grey hoodie
        ].map((g, i) => {
          const topY = WARD_RAIL_Y - 0.06; // garment top anchor
          return (
            <group key={i}>
              {/* hook + thin dark hanger bar */}
              <mesh position={[g.dx, WARD_RAIL_Y - 0.03, 0]}>
                <torusGeometry args={[0.022, 0.005, 6, 8, Math.PI]} />
                <meshStandardMaterial color="#2a2a30" />
              </mesh>
              <mesh position={[g.dx, topY - 0.03, 0]}>
                <boxGeometry args={[g.w * 0.85, 0.012, 0.012]} />
                <meshStandardMaterial color="#2a2a30" />
              </mesh>
              {g.hoodie && (
                /* hood — small block poking above the shoulder line */
                <mesh position={[g.dx, topY + 0.03, 0.015]}>
                  <boxGeometry args={[g.w * 0.55, 0.1, 0.05]} />
                  <meshStandardMaterial color={g.c} roughness={0.85} />
                </mesh>
              )}
              {/* chest — full width */}
              <mesh position={[g.dx, topY - g.h * 0.175, 0]}>
                <boxGeometry args={[g.w, g.h * 0.35, 0.05]} />
                <meshStandardMaterial color={g.c} roughness={0.85} />
              </mesh>
              {/* hem, slight taper, same-family tone */}
              <mesh position={[g.dx, topY - g.h * 0.675, 0]}>
                <boxGeometry args={[g.w * 0.82, g.h * 0.65, 0.045]} />
                <meshStandardMaterial color={g.accent} roughness={0.85} />
              </mesh>
              {g.hoodie && (
                /* kangaroo pocket line */
                <mesh position={[g.dx, topY - g.h * 0.5, -0.03]}>
                  <boxGeometry args={[g.w * 0.5, 0.16, 0.01]} />
                  <meshStandardMaterial color={g.accent} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>

      {/* ── wardrobe: wooden open shelves — collider {5.62,5.35,0.8,0.45},
          east of the rail (the "right third" of the combined unit).
          PIPE WARDROBE REBUILD: 3 short oak planks at different heights
          (WARD_SHELF_YS above), riding the same black-pipe-frame language
          as the rail (2 straight uprights + a small bracket stub on each
          side at every shelf height). Light oak contrasts the black pipes,
          per the reference. A leaning framed picture + 2 figurine
          silhouettes + 2 small trailing potted plants (VineStrand, reused
          from the engawa's own rail-vine idiom above) dress the three
          tiers. Shoes are DROPPED here — the reference has no shoe storage
          at this spot (owner's judgment call, noted in the report). ── */}
      <group position={[SHOE_CENTER.x, 0, SHOE_CENTER.z]}>
        {/* two straight pipe uprights, matching the rail's black-pipe language */}
        {[-1, 1].map((side) => {
          const sx = side * WARD_SHELF_UPRIGHT_X;
          const topY = WARD_SHELF_SPAN_Y1 + 0.08;
          return (
            <group key={side}>
              <mesh position={[sx, topY / 2, 0]}>
                <cylinderGeometry args={[WARD_PIPE_R, WARD_PIPE_R, topY, 10]} />
                <meshStandardMaterial color="#1c1c22" metalness={0.6} roughness={0.35} />
              </mesh>
              <mesh position={[sx, 0.008, 0]}>
                <cylinderGeometry args={[WARD_FLANGE_R * 0.8, WARD_FLANGE_R * 0.8, 0.016, 12]} />
                <meshStandardMaterial color="#111116" metalness={0.6} roughness={0.35} />
              </mesh>
              <mesh position={[sx, topY, 0]}>
                <sphereGeometry args={[WARD_ELBOW_R * 0.85, 10, 8]} />
                <meshStandardMaterial color="#111116" metalness={0.6} roughness={0.35} />
              </mesh>
            </group>
          );
        })}
        {/* 3 shelves — plank + a small pipe bracket stub on each side, per tier */}
        {WARD_SHELF_YS.map((sy, i) => (
          <group key={i}>
            {[-1, 1].map((side) => (
              <mesh
                key={side}
                rotation={[0, 0, Math.PI / 2]}
                position={[side * (WARD_SHELF_UPRIGHT_X - 0.05), sy - 0.02, 0]}
              >
                <cylinderGeometry args={[WARD_PIPE_R * 0.7, WARD_PIPE_R * 0.7, 0.1, 8]} />
                <meshStandardMaterial color="#1c1c22" metalness={0.6} roughness={0.35} />
              </mesh>
            ))}
            <mesh position={[0, sy, 0]}>
              <boxGeometry args={[WARD_SHELF_W, WARD_SHELF_T, WARD_SHELF_D]} />
              <meshStandardMaterial color="#c9a877" roughness={0.75} />
            </mesh>
          </group>
        ))}

        {/* lowest shelf — leaning framed picture (back-left) + a figurine */}
        <group position={[-0.14, WARD_SHELF_YS[0] + WARD_SHELF_T / 2, 0.1]} rotation={[0.12, 0, 0]}>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.16, 0.16, 0.012]} />
            <meshStandardMaterial color="#2a2a30" />
          </mesh>
          <mesh position={[0, 0.08, 0.008]}>
            <boxGeometry args={[0.12, 0.12, 0.006]} />
            <meshStandardMaterial color="#8fb8db" />
          </mesh>
        </group>
        <group position={[0.16, WARD_SHELF_YS[0] + WARD_SHELF_T / 2, -0.08]}>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.05, 0.1, 0.035]} />
            <meshStandardMaterial color="#b3475f" />
          </mesh>
          <mesh position={[0, 0.115, 0]}>
            <sphereGeometry args={[0.028, 8, 6]} />
            <meshStandardMaterial color="#e7e0cf" />
          </mesh>
        </group>

        {/* mid shelf — small trailing potted plant + a second figurine */}
        <group position={[-0.15, WARD_SHELF_YS[1] + WARD_SHELF_T / 2, -0.02]}>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.055, 0.04, 0.09, 8]} />
            <meshStandardMaterial color="#5a4632" />
          </mesh>
          <group position={[0, 0.095, 0]}>
            <VineStrand dir={[-0.28, 0.1]} segments={5} segLen={0.06} startTilt={1.3} />
          </group>
        </group>
        <group position={[0.15, WARD_SHELF_YS[1] + WARD_SHELF_T / 2, 0.06]}>
          <mesh position={[0, 0.045, 0]}>
            <boxGeometry args={[0.045, 0.09, 0.03]} />
            <meshStandardMaterial color="#3a3a45" />
          </mesh>
          <mesh position={[0, 0.105, 0]}>
            <sphereGeometry args={[0.024, 8, 6]} />
            <meshStandardMaterial color="#e7e0cf" />
          </mesh>
        </group>

        {/* top shelf — a second small trailing plant */}
        <group position={[0, WARD_SHELF_YS[2] + WARD_SHELF_T / 2, -0.02]}>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.05, 0.037, 0.08, 8]} />
            <meshStandardMaterial color="#6b7f6b" />
          </mesh>
          <group position={[0, 0.08, 0]}>
            <VineStrand dir={[0.06, -0.3]} segments={4} segLen={0.055} startTilt={1.25} />
          </group>
        </group>
      </group>

      {/* ── wardrobe: black chest of drawers — spans the FULL combined
          width (WARD_X0..WARD_X1, the union of HANGER_RECT + SHOE_RECT),
          sitting on the floor beneath both the rail and the shelves. 6
          drawer fronts (2 columns x 3 rows), simple recessed grooves for
          handles, matte black. On top: a folded denim stack (west, under
          the rail) and a small white box (east, under the shelves), per
          the reference. No new collider needed — see the WARD_X0/X1
          comment above for why the 12cm rect gap was already unwalkable. ── */}
      <group position={[WARD_XC, 0, WARD_ZC]}>
        {/* body — darker than the fronts so the fronts read as proud panels
            even under this room's dim night lighting (no new light added) */}
        <mesh position={[0, WARD_DRAWER_H / 2, 0]}>
          <boxGeometry args={[WARD_W - 0.04, WARD_DRAWER_H, WARD_D - 0.04]} />
          <meshStandardMaterial color="#131317" roughness={0.6} />
        </mesh>
        {/* top slab — flush with the body's own footprint (NOT overhanging,
            unlike this room's north-wall furniture): this unit backs onto
            the SOUTH wall with its open/front side at -z, facing the same
            direction the dollhouse camera looks INTO (away from the south-
            positioned camera) — an overhanging front lip would shadow the
            drawer fronts below it from this angle, so the lip is dropped
            here specifically (kept on the north-wall nightstands, whose
            fronts face +z, toward the camera, where it can't occlude
            anything). */}
        <mesh position={[0, WARD_DRAWER_H + WARD_DRAWER_TOP_T / 2, 0]}>
          <boxGeometry args={[WARD_W - 0.04, WARD_DRAWER_TOP_T, WARD_D - 0.04]} />
          <meshStandardMaterial color="#232329" roughness={0.5} />
        </mesh>
        {/* front-edge trim reveal, ON the top surface — the drawer fronts
            below face -z (away from the south-positioned dollhouse camera,
            same structural blind spot every south-wall piece in this room
            has), so this thin lighter seam near the top's own front edge
            is the piece's one TOP-visible hint that there's drawer
            structure underneath, echoing the perfume stand/old shoe
            cubby's convention of putting the readable detail on a
            camera-facing surface. */}
        <mesh position={[0, WARD_DRAWER_TOP_Y + 0.001, -(WARD_D - 0.04) / 2 + 0.025]}>
          <boxGeometry args={[WARD_W - 0.1, 0.004, 0.012]} />
          <meshStandardMaterial color="#4a4a54" metalness={0.3} roughness={0.4} />
        </mesh>
        {/* 6 drawer fronts — 2 columns x 3 rows, recessed groove "handles".
            Proud of the body's own front face (-z, open/room side) by 2cm
            (not the usual ~8mm) so a visible sliver still clears the top
            slab's own front edge from the camera's shallow downward angle. */}
        {[-1, 1].map((col) =>
          [0.2, 0.5, 0.8].map((frac, row) => (
            <group key={`${col}-${row}`}>
              <mesh position={[col * (WARD_W / 4), WARD_DRAWER_H * frac, -(WARD_D - 0.04) / 2 - 0.02]}>
                <boxGeometry args={[WARD_W / 2 - 0.06, WARD_DRAWER_H * 0.26, 0.018]} />
                <meshStandardMaterial color="#2c2c33" roughness={0.45} metalness={0.15} />
              </mesh>
              <mesh
                position={[
                  col * (WARD_W / 4),
                  WARD_DRAWER_H * frac + WARD_DRAWER_H * 0.09,
                  -(WARD_D - 0.04) / 2 - 0.03,
                ]}
              >
                <boxGeometry args={[WARD_W / 2 - 0.14, 0.014, 0.01]} />
                <meshStandardMaterial color="#6a6a76" metalness={0.5} roughness={0.3} />
              </mesh>
            </group>
          ))
        )}

        {/* denim stack on top, west side (under the rail) — same folded-
            slab idiom the old rack's clothing stacks used */}
        <group position={[-WARD_W * 0.28, WARD_DRAWER_TOP_Y, 0]}>
          {(() => {
            let y = 0;
            return [
              { h: 0.06, w: 0.26, d: 0.2, c: "#3f5a8c", band: "#324a75" },
              { h: 0.055, w: 0.24, d: 0.19, c: "#557bb0", band: "#44659a" },
              { h: 0.05, w: 0.22, d: 0.18, c: "#7a97c2", band: "#6483ad" },
            ].map((s, i) => {
              const cy = y + s.h / 2;
              y += s.h;
              return (
                <group key={i}>
                  <mesh position={[0, cy, 0]}>
                    <boxGeometry args={[s.w, s.h, s.d]} />
                    <meshStandardMaterial color={s.c} roughness={0.9} />
                  </mesh>
                  <mesh position={[0, cy, s.d / 2 + 0.006]}>
                    <boxGeometry args={[s.w * 0.94, s.h * 0.28, 0.006]} />
                    <meshStandardMaterial color={s.band} />
                  </mesh>
                </group>
              );
            });
          })()}
        </group>

        {/* small white box/speaker, east side (under the shelves) */}
        <mesh position={[WARD_W * 0.32, WARD_DRAWER_TOP_Y + 0.05, 0]}>
          <boxGeometry args={[0.14, 0.1, 0.12]} />
          <meshStandardMaterial color="#eef0ec" roughness={0.5} />
        </mesh>
      </group>

      {/* ── perfume stand — collider {6.55,5.3,1.0,0.5}, SE corner,
          FURNISHING WAVE. Waist-high slim dresser.
          VANITY DRESSING PASS (this pass, owner ask: "the perfume table
          near the mirror... put a small plant on it, a small lamp, and an
          organiser which has the cosmetics, a tray which can have maybe
          keys and stuff") — the old flat row of 5 loose bottles + one
          atomizer is replaced by four composed groups, all stacked off
          PERFUME_TOP_Y (the table's own derived top surface, see the
          const-block comment above): a small potted plant (back-right,
          toward the wall/mirror), a small warm table lamp (back-left, its
          own nested pointLight — no castShadow, kept small/dim so this
          only adds ONE real light to the room's budget), a clear tiered
          cosmetics organiser (front-center, holding the table's own former
          loose-bottle palette plus a couple of compacts/brushes), and a
          shallow catch-all tray for keys/sunglasses/coins/a card
          (front-left, closest to the camera so nothing taller sits in
          front of it). Back items (negative dz, away from the south-
          positioned dollhouse camera) are the plant + lamp; front items
          (positive dz) are the low organiser/tray — checked pairwise, none
          of the four footprints overlap and all clear the top's own edges
          (x half 0.5 / z half 0.25) with margin. ── */}
      <group position={[PERFUME_CENTER.x, 0, PERFUME_CENTER.z]}>
        <mesh position={[0, PERFUME_BODY_H / 2, 0]}>
          <boxGeometry args={[PERFUME_RECT.w - 0.06, PERFUME_BODY_H, PERFUME_RECT.d - 0.06]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        <mesh position={[0, PERFUME_BODY_H + PERFUME_TOP_T / 2, 0]}>
          <boxGeometry args={[PERFUME_RECT.w, PERFUME_TOP_T, PERFUME_RECT.d]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>

        {/* small potted plant — back-right corner. Same hand-built
            pot+leaf-blade idiom as RAILING_PLANTS' "blade" kind above,
            shrunk to tabletop scale. Pot color #8a5a6b — not used as a pot
            anywhere else in this room (RAILING_PLANTS/shelf plants/zen
            garden all checked). */}
        <group position={[0.34, PERFUME_TOP_Y, -0.16]}>
          <mesh position={[0, 0.023, 0]}>
            <cylinderGeometry args={[0.032, 0.026, 0.045, 10]} />
            <meshStandardMaterial color="#8a5a6b" />
          </mesh>
          {[0, 1, 2].map((k) => {
            const a = (k / 3) * Math.PI * 2 + 0.4;
            const h = 0.055 + (k % 2) * 0.02;
            return (
              <mesh
                key={k}
                position={[Math.sin(a) * 0.014, 0.045 + h / 2, Math.cos(a) * 0.014]}
                rotation={[0, a, 0.12]}
              >
                <boxGeometry args={[0.018, h, 0.007]} />
                <meshStandardMaterial color="#4a9d6f" />
              </mesh>
            );
          })}
        </group>

        {/* small lamp — back-left corner. Base/pole/open-cone shade, same
            fixture family as the twin nightstand lamps above, scaled well
            down (compact accent, not a second room light). pointLight
            NESTED inside the shade (rotation-safe by construction), no
            castShadow, intensity/distance kept low — same clamp class as
            this room's other small accents (mirror bulbs 1.6/2.2, candle
            1/1.6) so it reads as a warm pool on the tabletop, not a
            blowout under the 0.6 Bloom threshold. */}
        <group position={[-0.32, PERFUME_TOP_Y, -0.13]}>
          <mesh position={[0, 0.012, 0]}>
            <cylinderGeometry args={[0.032, 0.04, 0.024, 8]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, 0.065, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.09, 6]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, 0.135, 0]}>
            <cylinderGeometry args={[0.032, 0.048, 0.06, 8, 1, true]} />
            <meshStandardMaterial color="#ffb35c" emissive="#ffb35c" emissiveIntensity={0.75} side={2} />
          </mesh>
          <pointLight position={[0, 0.135, 0]} color="#ffd9a0" intensity={1.4} distance={1.6} decay={2} />
        </group>

        {/* cosmetics organiser — clear acrylic-look 2-tier caddy,
            front-center. Bottom tier: 3 slim bottles (the table's own
            former loose-bottle palette) + 2 compacts. Top tier (on 4 thin
            posts): 2 brushes laid at a slight angle, dark tips. */}
        <group position={[0.04, PERFUME_TOP_Y, 0.02]}>
          <mesh position={[0, 0.008, 0]}>
            <boxGeometry args={[0.22, 0.016, 0.13]} />
            <meshStandardMaterial color="#cfe8f0" transparent opacity={0.35} roughness={0.15} />
          </mesh>
          {[
            [-0.09, -0.05],
            [0.09, -0.05],
            [-0.09, 0.05],
            [0.09, 0.05],
          ].map(([px, pz], i) => (
            <mesh key={i} position={[px, 0.05, pz]}>
              <cylinderGeometry args={[0.006, 0.006, 0.084, 6]} />
              <meshStandardMaterial color="#cfe8f0" transparent opacity={0.4} roughness={0.15} />
            </mesh>
          ))}
          <mesh position={[0, 0.096, 0]}>
            <boxGeometry args={[0.17, 0.012, 0.1]} />
            <meshStandardMaterial color="#cfe8f0" transparent opacity={0.35} roughness={0.15} />
          </mesh>
          {[
            { dx: -0.06, dz: -0.02, h: 0.07, c: "#57b6e8" },
            { dx: 0.01, dz: 0.03, h: 0.09, c: "#b3475f" },
            { dx: 0.07, dz: -0.01, h: 0.055, c: "#5b4b8a" },
          ].map(({ dx, dz, h, c }, i) => (
            <mesh key={i} position={[dx, 0.016 + h / 2, dz]}>
              <cylinderGeometry args={[0.02, 0.024, h, 6]} />
              <meshStandardMaterial color={c} />
            </mesh>
          ))}
          <mesh position={[-0.02, 0.025, 0.045]} rotation={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.018, 10]} />
            <meshStandardMaterial color="#ffb35c" />
          </mesh>
          <mesh position={[0.055, 0.0235, 0.045]} rotation={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.023, 0.023, 0.015, 10]} />
            <meshStandardMaterial color="#f2ecd8" />
          </mesh>
          {[
            { dx: -0.03, dz: 0.01, rot: 0.3, len: 0.09, tip: "#2a2a30" },
            { dx: 0.03, dz: -0.015, rot: -0.5, len: 0.075, tip: "#4a3a2e" },
          ].map(({ dx, dz, rot, len, tip }, i) => (
            <group key={i} position={[dx, 0.102, dz]} rotation={[0, 0, rot]}>
              <mesh position={[0, len / 2, 0]}>
                <cylinderGeometry args={[0.005, 0.005, len, 6]} />
                <meshStandardMaterial color="#3a3a45" />
              </mesh>
              <mesh position={[0, len + 0.008, 0]}>
                <sphereGeometry args={[0.011, 6, 5]} />
                <meshStandardMaterial color={tip} />
              </mesh>
            </group>
          ))}
        </group>

        {/* catch-all tray — shallow slab + low lip, front-left (closest to
            the camera so nothing taller sits in front of it). Keys/
            sunglasses/coins/a card scattered inside, not gridded. */}
        <group position={[-0.22, PERFUME_TOP_Y, 0.11]}>
          <mesh position={[0, 0.006, 0]}>
            <boxGeometry args={[0.2, 0.012, 0.13]} />
            <meshStandardMaterial color="#33343c" metalness={0.3} roughness={0.5} />
          </mesh>
          {[
            [0, -0.065, 0.2, 0.006],
            [0, 0.065, 0.2, 0.006],
            [-0.1, 0, 0.006, 0.13],
            [0.1, 0, 0.006, 0.13],
          ].map(([lx, lz, lw, ld], i) => (
            <mesh key={i} position={[lx, 0.015, lz]}>
              <boxGeometry args={[lw, 0.018, ld]} />
              <meshStandardMaterial color="#57575f" metalness={0.3} roughness={0.4} />
            </mesh>
          ))}
          {/* keys — a small ring + 2 angular key blades */}
          <mesh position={[-0.04, 0.014, 0.02]} rotation={[Math.PI / 2, 0, 0.4]}>
            <torusGeometry args={[0.014, 0.003, 6, 10]} />
            <meshStandardMaterial color="#b8b8be" metalness={0.6} roughness={0.3} />
          </mesh>
          {[
            { dx: -0.02, dz: 0.03, rot: 0.5, c: "#b8b8be" },
            { dx: -0.055, dz: 0.015, rot: -0.3, c: "#c9a06a" },
          ].map(({ dx, dz, rot, c }, i) => (
            <group key={i} position={[dx, 0.012, dz]} rotation={[0, rot, 0]}>
              <mesh>
                <boxGeometry args={[0.032, 0.006, 0.01]} />
                <meshStandardMaterial color={c} metalness={0.5} roughness={0.35} />
              </mesh>
              <mesh position={[0.019, 0, 0]}>
                <boxGeometry args={[0.006, 0.006, 0.014]} />
                <meshStandardMaterial color={c} metalness={0.5} roughness={0.35} />
              </mesh>
            </group>
          ))}
          {/* folded sunglasses */}
          <group position={[0.05, 0.012, -0.03]} rotation={[0, 0.6, 0]}>
            <mesh position={[-0.014, 0, 0]}>
              <boxGeometry args={[0.022, 0.004, 0.016]} />
              <meshStandardMaterial color="#1a1a1f" roughness={0.2} />
            </mesh>
            <mesh position={[0.014, 0, 0]}>
              <boxGeometry args={[0.022, 0.004, 0.016]} />
              <meshStandardMaterial color="#1a1a1f" roughness={0.2} />
            </mesh>
            <mesh position={[0, 0, 0.009]}>
              <boxGeometry args={[0.05, 0.003, 0.004]} />
              <meshStandardMaterial color="#2a2a30" />
            </mesh>
          </group>
          {/* coins */}
          <mesh position={[0.06, 0.013, 0.03]} rotation={[Math.PI / 2, 0.2, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.003, 10]} />
            <meshStandardMaterial color="#c9a06a" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0.068, 0.013, 0.02]} rotation={[Math.PI / 2, -0.3, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.003, 10]} />
            <meshStandardMaterial color="#b8b8be" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* small card */}
          <mesh position={[-0.03, 0.013, -0.03]} rotation={[0, 0.35, 0]}>
            <boxGeometry args={[0.045, 0.002, 0.03]} />
            <meshStandardMaterial color="#e7e0cf" />
          </mesh>
        </group>
      </group>

      {/* ── mirror — east divider's bedroom face, south of the door gap
          (wallSegS, x=7.89, z-center 4.9, z-span 3.8-6), FURNISHING WAVE.
          MIRROR FIX (this pass) — see the const-block comment above
          (MIRROR_FRAME_BORDER etc.) for the "stuck to wall"/"white rod"
          diagnosis + full arithmetic. Real 4-piece mitred frame standing
          proud of the wall with a soft shadow decal behind it, a recessed
          glass pane, and a highlight streak rotated about the glass's own
          normal so it stays flat against the glass instead of poking out
          of it. No collider — flush wall dressing. ── */}
      {/* shadow decal — soft dark plane on the wall itself, sized past the
          frame's own footprint, reading as a subtle cast shadow so the
          frame looks like it's actually mounted proud of the wall rather
          than printed on it. Sits behind the frame's own back face
          (7.885 > MIRROR_FRAME_BACK_X's 7.87), just clear of the wall
          plane (7.89) to avoid z-fighting. */}
      <mesh position={[MIRROR_WALL_X - 0.005, MIRROR_Y - 0.03, MIRROR_Z]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry
          args={[MIRROR_W + MIRROR_FRAME_BORDER * 2 + 0.06, MIRROR_H + MIRROR_FRAME_BORDER * 2 + 0.06]}
        />
        <meshStandardMaterial color="#0a0a0c" transparent opacity={0.18} />
      </mesh>

      {/* frame — 4 mitred border bars around the open MIRROR_W x MIRROR_H
          rectangle (a real hollow frame, not a slab), proud of the wall by
          MIRROR_FRAME_DEPTH. */}
      {[
        // [cy, cz, w(local z-span), h(local y-span)]
        [MIRROR_Y + MIRROR_H / 2 + MIRROR_FRAME_BORDER / 2, MIRROR_Z, MIRROR_W + MIRROR_FRAME_BORDER * 2, MIRROR_FRAME_BORDER], // top
        [MIRROR_Y - MIRROR_H / 2 - MIRROR_FRAME_BORDER / 2, MIRROR_Z, MIRROR_W + MIRROR_FRAME_BORDER * 2, MIRROR_FRAME_BORDER], // bottom
        [MIRROR_Y, MIRROR_Z - MIRROR_W / 2 - MIRROR_FRAME_BORDER / 2, MIRROR_FRAME_BORDER, MIRROR_H], // north side
        [MIRROR_Y, MIRROR_Z + MIRROR_W / 2 + MIRROR_FRAME_BORDER / 2, MIRROR_FRAME_BORDER, MIRROR_H], // south side
      ].map(([cy, cz, w, h], i) => (
        <mesh key={`mirror-frame-${i}`} position={[MIRROR_FRAME_CENTER_X, cy, cz]}>
          <boxGeometry args={[MIRROR_FRAME_DEPTH, h, w]} />
          <meshStandardMaterial color="#22222c" />
        </mesh>
      ))}

      {/* glass — recessed behind the frame's own front (mitred) edge, see
          MIRROR_GLASS_RECESS above */}
      <mesh position={[MIRROR_GLASS_X, MIRROR_Y, MIRROR_Z]}>
        <boxGeometry args={[0.01, MIRROR_H, MIRROR_W]} />
        <meshStandardMaterial color="#c7d3dc" metalness={0.3} roughness={0.15} />
      </mesh>

      {/* highlight streak — rotated about the glass's own normal (X), NOT
          Z (that was the "white rod" bug) — see the const-block comment
          for the arithmetic proving this stays inside the glass rect. */}
      <mesh position={[MIRROR_HIGHLIGHT_X, MIRROR_Y, MIRROR_Z]} rotation={[MIRROR_HIGHLIGHT_ANGLE, 0, 0]}>
        <boxGeometry args={[0.006, MIRROR_HIGHLIGHT_LEN, MIRROR_HIGHLIGHT_THICK]} />
        <meshStandardMaterial color="#eef3f6" transparent opacity={0.5} />
      </mesh>

      {/* ── vanity bulbs — row of 7 across the frame's top bar, proud of its
          front face on small sockets. Mostly emissive glass; only bulbs #1
          and #5 (of 0-6) carry a real pointLight — see the MIRROR_BULB_*
          const-block comment above for why those two indices and not the
          center. ── */}
      {Array.from({ length: MIRROR_BULB_COUNT }).map((_, bi) => {
        const t = bi / (MIRROR_BULB_COUNT - 1);
        const bz = MIRROR_Z - MIRROR_BULB_ROW_HALF + t * (2 * MIRROR_BULB_ROW_HALF);
        const real = MIRROR_BULB_REAL.has(bi);
        return (
          <group key={`mirror-bulb-${bi}`}>
            {/* socket stub, mounted on the frame's own front face */}
            <mesh position={[MIRROR_BULB_SOCKET_X, MIRROR_BULB_Y, bz]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[MIRROR_BULB_SOCKET_R, MIRROR_BULB_SOCKET_R, MIRROR_BULB_SOCKET_LEN, 8]} />
              <meshStandardMaterial color="#2a2a30" metalness={0.4} roughness={0.5} />
            </mesh>
            {/* emissive bulb — clamped intensity, well under the 0.6 Bloom
                threshold's blowout point (same clamp class as the fairy
                string's own 1.8) */}
            <mesh position={[MIRROR_BULB_X, MIRROR_BULB_Y, bz]}>
              <sphereGeometry args={[MIRROR_BULB_R, 8, 6]} />
              <meshStandardMaterial color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={1.35} />
            </mesh>
            {/* BLOWOUT FIX (in-browser check, this pass): the first pass put
                both real lights on adjacent-to-center bulbs at intensity 2.2/
                distance 2.6 — their falloff cones overlapped into a single
                hot patch that clipped white on the wall behind (measured:
                ~10% near-white pixels in a crop around the frame, well past
                every other fixture in this room at comparable crop scale).
                Moved the 2 real lights to the row's own END bulbs (0.62m
                apart instead of 0.41m, spreading the wash instead of piling
                it up) and dialled both intensity/distance down a step —
                re-measured after the fix at <2% near-white in the same crop
                box, in line with the room's other small fixtures. */}
            {real && (
              <pointLight
                position={[MIRROR_BULB_X, MIRROR_BULB_Y, bz]}
                color="#ffd9a0"
                intensity={1.6}
                distance={2.2}
                decay={2}
              />
            )}
          </group>
        );
      })}

      {/* ── east wall shelves — SHELF + LIGHT PASS (owner: "we need wall
          shelf and more light in the bedroom, the walls look really
          empty"). Three staggered floating shelves on the previously-bare
          wallSegN segment (see the EAST_SHELF consts above for the
          wall-plane/tier arithmetic). No collider — above head height,
          same convention as the mirror/posters/sconce on this same wall. ── */}
      {EAST_SHELVES.map((s, i) => (
        <group key={`east-shelf-${i}`} position={[EAST_SHELF_X, s.y, R.z + s.zc]}>
          {/* slab */}
          <mesh position={[0, -EAST_SHELF_THICK / 2, 0]}>
            <boxGeometry args={[EAST_SHELF_DEPTH, EAST_SHELF_THICK, s.len]} />
            <meshStandardMaterial color="#e9e5d8" />
          </mesh>
          {/* hidden brackets, tucked toward the wall (+x here — the wall
              sits at higher x than the slab center) */}
          {[-(s.len / 2 - 0.15), s.len / 2 - 0.15].map((bz) => (
            <mesh key={bz} position={[EAST_SHELF_DEPTH * 0.1, -0.08, bz]}>
              <boxGeometry args={[EAST_SHELF_DEPTH * 0.7, 0.11, 0.05]} />
              <meshStandardMaterial color="#20223a" />
            </mesh>
          ))}

          {i === 0 && (
            <>
              {/* leaning book cluster, north end */}
              <ShelfBook y0={0} z={-0.52} w={0.05} h={0.34} d={0.16} color="#5b4b8a" />
              <ShelfBook y0={0} z={-0.46} w={0.045} h={0.4} d={0.16} color="#c98a2e" tilt={0.12} />
              <ShelfBook y0={0} z={-0.39} w={0.05} h={0.28} d={0.15} color="#2e6e54" />
              <ShelfBook y0={0} z={-0.32} w={0.06} h={0.36} d={0.17} color="#b3475f" tilt={-0.08} />
              {/* tiny figurine beside the books */}
              <group position={[0, 0, -0.1]}>
                <mesh position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.03, 0.04, 0.03]} />
                  <meshStandardMaterial color="#c98a2e" />
                </mesh>
                <mesh position={[0, 0.065, 0]}>
                  <sphereGeometry args={[0.02, 6, 5]} />
                  <meshStandardMaterial color="#2e2a4d" />
                </mesh>
              </group>
              {/* trailing plant, draping off the shelf's front edge */}
              <group position={[-0.06, 0, 0.5]}>
                <mesh position={[0, 0.045, 0]}>
                  <cylinderGeometry args={[0.06, 0.048, 0.08, 10]} />
                  <meshStandardMaterial color="#6b7f6b" />
                </mesh>
                <mesh position={[0, 0.11, 0]}>
                  <sphereGeometry args={[0.05, 8, 6]} />
                  <meshStandardMaterial color="#3f8f5a" />
                </mesh>
                <group position={[-0.02, 0.08, 0.02]}>
                  <VineStrand dir={[-1, 0.15]} segments={8} phase={0} />
                </group>
                <group position={[-0.01, 0.08, -0.08]}>
                  <VineStrand dir={[-0.85, -0.3]} segments={6} segLen={0.075} phase={1} />
                </group>
              </group>
              {/* fairy-light string along the front edge — mostly glowing
                  bulbs, ONE real light at the string's own low point (real
                  light #2 of this pass) */}
              {Array.from({ length: EAST_FAIRY_COUNT }).map((_, bi) => {
                const t = bi / (EAST_FAIRY_COUNT - 1);
                const bz = -s.len / 2 + 0.08 + t * (s.len - 0.16);
                const sag = -EAST_FAIRY_SAG * (1 - (2 * t - 1) * (2 * t - 1));
                const isMid = bi === Math.floor(EAST_FAIRY_COUNT / 2);
                return (
                  <group key={bi} position={[-EAST_SHELF_DEPTH / 2 - 0.015, sag, bz]}>
                    <mesh>
                      <sphereGeometry args={[0.011, 6, 5]} />
                      <meshStandardMaterial color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={1.8} />
                    </mesh>
                    {isMid && <pointLight color="#ffd9a0" intensity={2.5} distance={2.8} decay={2} />}
                  </group>
                );
              })}
            </>
          )}

          {i === 1 && (
            <>
              {/* LED rope — emissive strip tucked under the slab, warm
                  light spills down the wall + across the shelf objects
                  above (real light #1 of this pass) */}
              <mesh position={[0.02, EAST_LED_Y, 0]}>
                <boxGeometry args={[0.03, EAST_LED_H, EAST_LED_LEN]} />
                <meshStandardMaterial color="#ffcf8f" emissive="#ffcf8f" emissiveIntensity={1.6} />
              </mesh>
              <pointLight position={[0.02, EAST_LED_Y, 0]} color="#ffd9a0" intensity={4} distance={4.2} decay={2} />

              {/* leaning framed photo — same 2-piece construction as the
                  wardrobe shelf's own leaning picture below */}
              <group position={[-0.04, 0, -0.75]} rotation={[0.12, 0, 0]}>
                <mesh position={[0, 0.08, 0]}>
                  <boxGeometry args={[0.16, 0.16, 0.012]} />
                  <meshStandardMaterial color="#2a2a30" />
                </mesh>
                <mesh position={[0, 0.08, 0.008]}>
                  <boxGeometry args={[0.12, 0.12, 0.006]} />
                  <meshStandardMaterial color="#c98a6a" />
                </mesh>
              </group>

              {/* candles */}
              <Candle x={-0.03} y0={0} z={-0.25} h={0.09} />
              <Candle x={0.01} y0={0} z={-0.15} h={0.065} r={0.011} />

              {/* small speaker */}
              <group position={[-0.02, 0, 0.7]}>
                <mesh position={[0, 0.05, 0]}>
                  <boxGeometry args={[0.1, 0.1, 0.08]} />
                  <meshStandardMaterial color="#eef0ec" roughness={0.5} />
                </mesh>
                <mesh position={[-0.041, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.032, 0.032, 0.006, 12]} />
                  <meshStandardMaterial color="#2a2a30" />
                </mesh>
              </group>

              {/* a couple of flat books, texture between the photo and the speaker */}
              <mesh position={[0, 0.018, 0.3]}>
                <boxGeometry args={[0.16, 0.036, 0.22]} />
                <meshStandardMaterial color="#2e6e54" />
              </mesh>
              <mesh position={[0.01, 0.054, 0.28]} rotation={[0, 0.15, 0]}>
                <boxGeometry args={[0.14, 0.032, 0.19]} />
                <meshStandardMaterial color="#b3475f" />
              </mesh>
            </>
          )}

          {i === 2 && (
            <>
              {/* upright book cluster */}
              <ShelfBook y0={0} z={-0.42} w={0.05} h={0.4} d={0.16} color="#c98a2e" tilt={0.1} />
              <ShelfBook y0={0} z={-0.34} w={0.045} h={0.46} d={0.16} color="#5b4b8a" tilt={-0.06} />
              <ShelfBook y0={0} z={-0.27} w={0.05} h={0.32} d={0.15} color="#b3475f" />
              {/* tiny candle */}
              <Candle x={0} y0={0} z={0} h={0.07} />
              {/* second trailing plant, deepest drape (lowest shelf) */}
              <group position={[-0.07, 0, 0.4]}>
                <mesh position={[0, 0.04, 0]}>
                  <cylinderGeometry args={[0.055, 0.044, 0.075, 10]} />
                  <meshStandardMaterial color="#8a7355" />
                </mesh>
                <mesh position={[0, 0.1, 0]}>
                  <sphereGeometry args={[0.045, 8, 6]} />
                  <meshStandardMaterial color="#2e6e54" />
                </mesh>
                <group position={[-0.02, 0.07, 0.02]}>
                  <VineStrand dir={[-1, 0.2]} segments={9} phase={2} />
                </group>
                <group position={[-0.01, 0.07, -0.06]}>
                  <VineStrand dir={[-0.8, -0.35]} segments={6} segLen={0.08} phase={0} />
                </group>
              </group>
            </>
          )}
        </group>
      ))}

      {/* ── west wall accent shelf — see WEST_SHELF_* consts above. Small
          single shelf beside the sliding door (north flank), a candle
          (its light is real light #3 of this pass, giving the west wall's
          own bare flank some warmth too) + a small trailing plant. No
          collider — same "above head height, wall-mounted" convention. ── */}
      <group position={[WEST_SHELF_X, WEST_SHELF_Y, R.z + WEST_SHELF_ZC]}>
        <mesh position={[0, -WEST_SHELF_THICK / 2, 0]}>
          <boxGeometry args={[WEST_SHELF_DEPTH, WEST_SHELF_THICK, WEST_SHELF_LEN]} />
          <meshStandardMaterial color="#e9e5d8" />
        </mesh>
        {/* hidden bracket, tucked toward the wall (-x here — the wall sits
            at lower x than the slab center) */}
        <mesh position={[-WEST_SHELF_DEPTH * 0.1, -0.07, 0]}>
          <boxGeometry args={[WEST_SHELF_DEPTH * 0.7, 0.09, 0.05]} />
          <meshStandardMaterial color="#20223a" />
        </mesh>
        <Candle x={0.03} y0={0} z={-0.14} h={0.08} lit />
        <group position={[0.05, 0, 0.12]}>
          <mesh position={[0, 0.035, 0]}>
            <cylinderGeometry args={[0.05, 0.04, 0.07, 10]} />
            <meshStandardMaterial color="#a04b3a" />
          </mesh>
          <mesh position={[0, 0.09, 0]}>
            <sphereGeometry args={[0.04, 8, 6]} />
            <meshStandardMaterial color="#3f8f5a" />
          </mesh>
          <group position={[0.02, 0.06, 0]}>
            <VineStrand dir={[1, 0.2]} segments={6} phase={1} />
          </group>
        </group>
      </group>
    </group>
  );
}
