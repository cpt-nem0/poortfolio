"use client";

import { Suspense, useEffect, useRef } from "react";
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
// step. Nightstand is unchanged (verified still clear of the bigger bed —
// see layout.ts's `// bedroom` section, the verbatim source of truth, and
// furniture.test.ts's exhaustive pairwise clearance check).
const BED_RECT = { x: 2.9, z: 0.33, w: 2.2, d: 2.5 };
const NIGHTSTAND_RECT = { x: 6.45, z: 0.95, w: 0.55, d: 0.5 };
const PLANT_RECT = { x: 0.45, z: 5.1, w: 0.4, d: 0.4 };
const WINDOW_TABLE_RECT = { x: 0.35, z: 2.7, w: 0.5, d: 1.1 }; // under the west window
// sconce X — the dragonslayer lean-zone rect that used to anchor the sconce
// is gone (sword parked for the den); the sconce now hangs centered above
// the bed's headboard, so it derives from BED_RECT's own centerline instead
// (never hand-guessed, same rule as every other mesh in this section).
const SCONCE_X = BED_RECT.x + BED_RECT.w / 2; // 4.0

const NIGHTSTAND_CENTER = {
  x: NIGHTSTAND_RECT.x + NIGHTSTAND_RECT.w / 2,
  z: NIGHTSTAND_RECT.z + NIGHTSTAND_RECT.d / 2,
};
const PLANT_CENTER = { x: PLANT_RECT.x + PLANT_RECT.w / 2, z: PLANT_RECT.z + PLANT_RECT.d / 2 };
const WINDOW_TABLE_CENTER = {
  x: WINDOW_TABLE_RECT.x + WINDOW_TABLE_RECT.w / 2,
  z: WINDOW_TABLE_RECT.z + WINDOW_TABLE_RECT.d / 2,
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

// cat (Task 9, re-seated P4, re-seated again for the P4 recenter, and
// again for the SUPER-KING pass) — curls at the GLB bed's foot corner, ON
// its measured top surface (foot-area vertex cluster, ~90th-percentile
// height — see BedModel's comment). World-space (no longer nested in a
// bed-local group, since that group carries the model's own rotation).
// Re-derived using the same formulas, just fed the new scale/pos: foot
// edge world Z = Tz + s*(Zmin + local_Z_range) = 1.700911 +
// 0.00457054*(-295.569372+538.23) = 2.81 (a clean number — coincidental,
// not rounded, same as the P4-recenter pass's 2.56); Z inset stays 0.26m
// off that edge: 2.81-0.26=2.55. X offset stays off the width centerline
// (still 4.0 — BED_RECT's center didn't move, only its size grew), same
// +0.10 offset: 4.0+0.10=4.10, unchanged from the P4-recenter pass. Y
// (on-surface height) scales linearly with the model, same rule as every
// prior pass: 0.3755 * (s_new/s_old) = 0.3755 * 1.1131221719 = 0.4180
// (ratio = 2.46/2.21 exactly, the two BED_RECT.d-minus-margin figures,
// since both scales share the /538.23 denominator).
const CAT_X = 4.1;
const CAT_Y = 0.418;
const CAT_Z = 2.55;

// nightstand — cabinet kept (its hand-built lamp was removed when the GLB
// bed's own lamp took over as hero fixture; that GLB lamp is now ALSO gone,
// lamp-cut pass — the wall sconce (relocated over the headboard, SUPER-KING
// pass) is the room's only warm light on this wall, see its own comment).
// Heights still stack off the nightstand's
// actual top surface (NS_TOP_Y), never a hand-guessed y.
const NS_BODY_H = 0.46;
const NS_TOP_T = 0.03;
const NS_TOP_Y = NS_BODY_H + NS_TOP_T; // top surface, world y = 0.49

// window table (P4) — slim wooden console table under the west window,
// footprint {0.35,2.7,0.5,1.1}. Top surface lands at TABLE_TOP_Y = 0.85,
// comfortably below the window sill (1.0, WIN_SILL_Y below) so nothing
// clips the frame. Four thin legs, no drawers — a deliberately CLEAR top,
// left empty for a bonsai model to land on in a later step.
const TABLE_TOP_T = 0.03;
const TABLE_TOP_Y = 0.85; // top surface height (below WIN_SILL_Y = 1.0)
const TABLE_LEG_H = TABLE_TOP_Y - TABLE_TOP_T; // legs run floor → underside of the slab
const TABLE_LEG_T = 0.04; // square leg thickness
const TABLE_LEG_INSET = 0.05; // legs inset this much from each footprint edge

// west window (Task 7) — surface-mounted unit on the west wall's interior
// face (x = R.x + 0.011, same plane as the wallW mesh). Sill (y=1.0) sits
// 0.15m above the window table's top (TABLE_TOP_Y=0.85, P4 rearrange —
// the bed moved off this wall entirely, so the table is now the only
// piece sharing the window's wall/z-band; the old bed-headboard-clearance
// note no longer applies).
const WIN_Z0 = 2.55;
const WIN_Z1 = 3.95;
const WIN_W = WIN_Z1 - WIN_Z0; // 1.4
const WIN_ZC = (WIN_Z0 + WIN_Z1) / 2; // 3.25
const WIN_SILL_Y = 1.0;
const WIN_TOP_Y = 2.3;
const WIN_H = WIN_TOP_Y - WIN_SILL_Y; // 1.3
const WIN_YC = (WIN_SILL_Y + WIN_TOP_Y) / 2; // 1.65

// stack, +x outward from the wall plane (x = R.x + 0.011) — each layer
// ≥6mm clear of the previous (wall → frame → glass → curtain).
const WIN_FRAME_RAIL_T = 0.06; // jamb/rail thickness
const WIN_FRAME_NEAR_X = 0.02; // 9mm off the wall (0.02 - 0.011)
const WIN_FRAME_DEPTH = 0.05;
const WIN_FRAME_FAR_X = WIN_FRAME_NEAR_X + WIN_FRAME_DEPTH; // 0.07
const WIN_FRAME_CX = WIN_FRAME_NEAR_X + WIN_FRAME_DEPTH / 2; // 0.045
const WIN_GLASS_X = WIN_FRAME_FAR_X + 0.01; // 0.08 — 10mm off the frame's far face
const WIN_CURTAIN_X = WIN_GLASS_X + 0.012; // 0.092 — 12mm off the glass
const WIN_ROD_X = WIN_CURTAIN_X + 0.003; // same "curtain" layer as the fabric, just proud of it

// glass opening (inset inside the jambs/rails)
const WIN_GLASS_Z0 = WIN_Z0 + WIN_FRAME_RAIL_T;
const WIN_GLASS_Z1 = WIN_Z1 - WIN_FRAME_RAIL_T;
const WIN_GLASS_W = WIN_GLASS_Z1 - WIN_GLASS_Z0; // 1.28
const WIN_GLASS_Y0 = WIN_SILL_Y + WIN_FRAME_RAIL_T;
const WIN_GLASS_Y1 = WIN_TOP_Y - WIN_FRAME_RAIL_T;
const WIN_GLASS_H = WIN_GLASS_Y1 - WIN_GLASS_Y0; // 1.18

// curtain — covers ~40% of the window width, hung from the west (Z0) side;
// top/bottom pulled in 2cm from the rail/sill so it can't clip the frame.
const WIN_CURTAIN_W = WIN_W * 0.4; // 0.56
const WIN_CURTAIN_TOP = WIN_TOP_Y - 0.02; // 2.28
const WIN_CURTAIN_BOT = WIN_SILL_Y + 0.02; // 1.02
const WIN_CURTAIN_H = WIN_CURTAIN_TOP - WIN_CURTAIN_BOT; // 1.26
const WIN_CURTAIN_YC = (WIN_CURTAIN_TOP + WIN_CURTAIN_BOT) / 2; // 1.65
const WIN_CURTAIN_ZC = WIN_Z0 + WIN_CURTAIN_W / 2;

// faux moon floor patch — stays clear of the rug (mesh below, P4-recentered
// to 3.3,3.6, half-extents 1.2×0.85 → rug's x-range starts at 2.1). Patch's
// x max (1.3) sits 0.8m short of that, so no z-fight risk at y=0.04 (more
// margin than before the rearrange, since the rug moved further east).
const MOON_PATCH_X = 0.65;
const MOON_PATCH_W = 1.3;
const MOON_PATCH_D = 1.7;

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

/**
 * The bedroom — painted surfaces + temp style toggles (task 5 of the
 * bedroom plan). Renders INSIDE the gray-box shell: textured surfaces sit a
 * few cm off House geometry; colliders live in layout.ts. Follows
 * Workspace.tsx's surface section verbatim as the pattern (floor, north
 * wall, divider faces, south stub band, baseboards, shadow traverse), with
 * two differences: the divider this room shares is on its EAST side (x=8,
 * facing west into the room) instead of straddling both sides like
 * Workspace, and this room also owns a full exterior wall (west, x=0) that
 * Workspace never had to paint — the window (task 7) mounts ON that face,
 * so it's left fully painted here, no cutout.
 */
export function Bedroom() {
  const R = BEDROOM;
  const rootRef = useRef<THREE.Group>(null);
  const moonPatchRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    rootRef.current?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, []);

  // faux moon patch (Task 7) must not receive shadows (brief: "receiveShadow
  // false" — a fake light pool getting a real shadow cast across it reads as
  // a bug). The traverse effect above runs first (declared earlier) and
  // blanket-sets every descendant mesh to receiveShadow=true, so re-assert
  // false here, after it, same single-mount-only pattern.
  useEffect(() => {
    if (moonPatchRef.current) moonPatchRef.current.receiveShadow = false;
  }, []);

  const floor = usePixelTexture(FLOOR_TEX, R.w, R.d);
  const wallN = usePixelTexture(WALL_TEX, R.w, WALL_H);
  const wallW = usePixelTexture(WALL_TEX, R.d, WALL_H); // west exterior wall, full span (window mounts ON this face later)
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
  // curtain — tiled once per meter, same convention as floor/wall.
  const curtainTex = usePixelTexture("/3am/tex/curtain-weave.png", WIN_CURTAIN_W, WIN_CURTAIN_H);
  // window table (P4) — same cabinet-wood family, repeat scaled down again
  // for its slimmer footprint.
  const tableWood = usePixelTexture("/3am/tex/cabinet-wood.png", 1, 1);

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

      {/* west wall (inner face of the perimeter wall at x=0) — full span,
          no door: window unit (task 7) mounts on this face, so it's left
          fully painted here. +x normal (rotY=π/2) faces into the room. */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[R.x + 0.011, WALL_H / 2, R.z + R.d / 2]}>
        <planeGeometry args={[R.d, WALL_H]} />
        <meshStandardMaterial map={wallW} />
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

      {/* baseboards (north, west, both divider segments) */}
      <mesh position={[R.x + R.w / 2, 0.09, R.z + 0.045]}>
        <boxGeometry args={[R.w, 0.18, 0.07]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>
      <mesh position={[R.x + 0.045, 0.09, R.z + R.d / 2]}>
        <boxGeometry args={[0.07, 0.18, R.d]} />
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

      {/* ── west window (Task 7) — surface-mounted night-window unit on the
          wall's interior face (x = R.x + 0.011). +x outward stack: wall →
          frame → jamb far face → glass → curtain, each ≥6mm clear (see
          task-7 report table). Sits directly above the bed headboard
          (top 0.86) with a 14cm clear gap to the sill (1.0) — same wall
          face, same z-band, non-overlapping by construction. The glass is
          an emissive SURFACE only (moon ≤0.8 intensity, tiny star dots,
          Bloom threshold 0.6) — zero new lights, no-invisible-lights rule
          stays intact. ── */}
      {/* frame — dark wood border box set: two jambs + top rail + inner
          sill trim, all WIN_FRAME_DEPTH deep, centered on WIN_FRAME_CX */}
      <mesh position={[R.x + WIN_FRAME_CX, WIN_YC, R.z + WIN_Z0 + WIN_FRAME_RAIL_T / 2]}>
        <boxGeometry args={[WIN_FRAME_DEPTH, WIN_H, WIN_FRAME_RAIL_T]} />
        <meshStandardMaterial color="#3a2a1e" />
      </mesh>
      <mesh position={[R.x + WIN_FRAME_CX, WIN_YC, R.z + WIN_Z1 - WIN_FRAME_RAIL_T / 2]}>
        <boxGeometry args={[WIN_FRAME_DEPTH, WIN_H, WIN_FRAME_RAIL_T]} />
        <meshStandardMaterial color="#3a2a1e" />
      </mesh>
      <mesh position={[R.x + WIN_FRAME_CX, WIN_TOP_Y - WIN_FRAME_RAIL_T / 2, R.z + WIN_ZC]}>
        <boxGeometry args={[WIN_FRAME_DEPTH, WIN_FRAME_RAIL_T, WIN_W]} />
        <meshStandardMaterial color="#3a2a1e" />
      </mesh>
      <mesh position={[R.x + WIN_FRAME_CX, WIN_SILL_Y + WIN_FRAME_RAIL_T / 2, R.z + WIN_ZC]}>
        <boxGeometry args={[WIN_FRAME_DEPTH, WIN_FRAME_RAIL_T, WIN_W]} />
        <meshStandardMaterial color="#3a2a1e" />
      </mesh>

      {/* protruding sill ledge — top surface flush at WIN_SILL_Y, sticks
          out past the frame's far face (0.07) for a real windowsill read */}
      <mesh position={[R.x + 0.06, WIN_SILL_Y - 0.015, R.z + WIN_ZC]}>
        <boxGeometry args={[0.1, 0.03, WIN_W + 0.1]} />
        <meshStandardMaterial color="#2e2116" />
      </mesh>

      {/* glass — night-sky base plane (flat unlit color, no texture) plus
          a tiny emissive moon disc and 3 star dots layered a sub-mm in
          front to dodge z-fighting (not a new stack layer — see report).
          moon emissiveIntensity 0.7 (≤0.8 ceiling); stars 0.55, radius
          0.008 — tiny enough that neither clips under Bloom (thresh 0.6). */}
      <mesh position={[R.x + WIN_GLASS_X, WIN_YC, R.z + WIN_ZC]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[WIN_GLASS_W, WIN_GLASS_H]} />
        <meshBasicMaterial color="#101830" />
      </mesh>
      <mesh
        position={[R.x + WIN_GLASS_X + 0.002, 1.95, R.z + 3.65]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <circleGeometry args={[0.11, 20]} />
        <meshStandardMaterial color="#dfe6ff" emissive="#dfe6ff" emissiveIntensity={0.7} />
      </mesh>
      {[
        { y: 1.85, z: 2.75 },
        { y: 2.1, z: 2.9 },
        { y: 1.75, z: 3.35 },
      ].map(({ y, z }) => (
        <mesh
          key={`star-${y}-${z}`}
          position={[R.x + WIN_GLASS_X + 0.002, y, R.z + z]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <circleGeometry args={[0.008, 8]} />
          <meshStandardMaterial color="#f0f4ff" emissive="#f0f4ff" emissiveIntensity={0.55} />
        </mesh>
      ))}

      {/* curtain rod — thin bar above the frame top, slight overhang past
          the jambs each side */}
      <mesh
        position={[R.x + WIN_ROD_X, WIN_TOP_Y + 0.06, R.z + WIN_ZC]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.012, 0.012, WIN_W + 0.2, 8]} />
        <meshStandardMaterial color="#2e2a4d" />
      </mesh>

      {/* curtain — curtain-weave texture, hung from the rod covering ~40%
          of the window from the west side. Small added z-rotation on top
          of the wall-facing y-rotation so it reads as hanging fabric, not
          a flat board. transparent:false per brief — a solid drape, not a
          cutout like the rug. */}
      <mesh
        position={[R.x + WIN_CURTAIN_X, WIN_CURTAIN_YC, R.z + WIN_CURTAIN_ZC]}
        rotation={[0, Math.PI / 2, 0.05]}
      >
        <planeGeometry args={[WIN_CURTAIN_W, WIN_CURTAIN_H]} />
        <meshStandardMaterial map={curtainTex} transparent={false} side={2} />
      </mesh>

      {/* ── window table (P4) — collider {0.35,2.7,0.5,1.1}, under the west
          window. Slim four-legged console: cabinet-wood top slab + thin
          square legs, deliberately CLEAR top (no clutter) — a bonsai model
          lands here in a later step. Top surface (TABLE_TOP_Y=0.85) sits
          0.15m below the sill (1.0), same "stay under the sill" rule as
          the bed headboard. ── */}
      <group position={[WINDOW_TABLE_CENTER.x, 0, WINDOW_TABLE_CENTER.z]}>
        {/* top slab */}
        <mesh position={[0, TABLE_TOP_Y - TABLE_TOP_T / 2, 0]}>
          <boxGeometry args={[WINDOW_TABLE_RECT.w, TABLE_TOP_T, WINDOW_TABLE_RECT.d]} />
          <meshStandardMaterial map={tableWood} />
        </mesh>
        {/* four thin legs, inset from each footprint corner */}
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz]) => (
          <mesh
            key={`table-leg-${sx}-${sz}`}
            position={[
              (sx * (WINDOW_TABLE_RECT.w - TABLE_LEG_INSET * 2)) / 2,
              TABLE_LEG_H / 2,
              (sz * (WINDOW_TABLE_RECT.d - TABLE_LEG_INSET * 2)) / 2,
            ]}
          >
            <boxGeometry args={[TABLE_LEG_T, TABLE_LEG_H, TABLE_LEG_T]} />
            <meshStandardMaterial color="#3a2a1e" />
          </mesh>
        ))}
      </group>

      {/* faux moon floor patch — barely-visible cool overlay sloping from
          the window into the room. Zero lights added (fake light pool
          only); stays clear of the rug in x (see MOON_PATCH_W comment
          above), so no z-fight risk at y=0.04. receiveShadow re-forced
          false in the effect above (mount traverse otherwise flips every
          descendant mesh back to true). Delete this one mesh if it reads
          wrong at the gate. */}
      <mesh
        ref={moonPatchRef}
        name="moon-floor-patch"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[R.x + MOON_PATCH_X, 0.04, R.z + WIN_ZC]}
        receiveShadow={false}
      >
        <planeGeometry args={[MOON_PATCH_W, MOON_PATCH_D]} />
        <meshBasicMaterial color="#26304d" transparent opacity={0.18} />
      </mesh>

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

      {/* sleeping cat (Task 9, re-seated P4, re-seated again SUPER-KING) —
          sits on the GLB bed's foot-area top surface (world-space, no
          longer nested in a bed-local group — that group carries the
          model's own rotation, which would reorient the cat's body too).
          See the CAT_X/Y/Z consts above for the foot-inset/surface-height
          derivation. */}
      <Cat x={CAT_X} y={CAT_Y} z={CAT_Z} />

      {/* ── nightstand — collider {6.45,0.95,0.55,0.5} (unchanged by the
          SUPER-KING pass — the bigger/centered bed's far x edge (5.1)
          still leaves a 1.35m gap before this rect's x min, verified in
          the p4-superking report). Two-tone cabinet (dark body / warm top
          slab) with one recessed drawer + knob. Its hand-built lamp was
          REMOVED when the GLB bed's own lamp took over as hero light —
          that GLB lamp is now ALSO gone (lamp-cut pass, see BedModel's
          comment), so this cabinet currently sits unlit; the sconce
          (relocated over the headboard, see its own comment) is the
          room's one warm fixture on this wall. Kept the cabinet itself
          regardless — it never overlapped the bed or its (now-cut)
          lamp/table cluster. ── */}
      <group position={[NIGHTSTAND_CENTER.x, 0, NIGHTSTAND_CENTER.z]}>
        {/* body */}
        <mesh position={[0, NS_BODY_H / 2, 0]}>
          <boxGeometry
            args={[NIGHTSTAND_RECT.w - 0.04, NS_BODY_H, NIGHTSTAND_RECT.d - 0.04]}
          />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        {/* top slab — lighter walnut tone, slight overhang. Top face lands
            exactly at NS_TOP_Y (= NS_BODY_H + NS_TOP_T). */}
        <mesh position={[0, NS_BODY_H + NS_TOP_T / 2, 0]}>
          <boxGeometry args={[NIGHTSTAND_RECT.w, NS_TOP_T, NIGHTSTAND_RECT.d]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {/* drawer front — recessed panel + knob, east (room-facing) face */}
        <mesh position={[NIGHTSTAND_RECT.w / 2 - 0.03, NS_BODY_H * 0.54, 0]}>
          <boxGeometry args={[0.02, 0.19, 0.32]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[NIGHTSTAND_RECT.w / 2 - 0.008, NS_BODY_H * 0.54, 0]}>
          <sphereGeometry args={[0.014, 8, 6]} />
          <meshStandardMaterial color="#c9a06a" />
        </mesh>
      </group>

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
          strength changed, not its reach. The window-table/bonsai corner
          (WINDOW_TABLE_RECT, under the west window) may get its own small
          lamp in a later pass — flagged here rather than solved now, since
          a second fixture wasn't this task's ask. One fixture-attached
          source, House/StairsApproach's brass-half-dome sconce as the
          pattern (same mount box + emissive cone, pointLight nested INSIDE
          this group so it's rotation-safe by construction even though this
          group happens to carry no rotation — matches the fixture-nesting
          rule regardless), warm, no castShadow. The room's SE corner
          (~6.6,4.9, where the sword used to stand) stays unlit here on
          purpose — a bonsai stand was slated to land there in a follow-up
          plan; a separate bonsai also lands on the window table
          (WINDOW_TABLE_RECT), so there may be two bonsai mentions in this
          file going forward — flagged for Rohan's call on which stands. ── */}
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
          follow-up pass. Previously checked against the bed, nightstand,
          and window table in the P4-recenter report, and of the moon patch
          (see MOON_PATCH_X comment above) — those clearances are
          unaffected by this pass. ── */}
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
    </group>
  );
}
