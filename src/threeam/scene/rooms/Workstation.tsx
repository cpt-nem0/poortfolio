"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { usePixelTexture } from "../usePixelTexture";
import { useThreeAm } from "@/threeam/state/store";
import { WORKSTATION_ROOM } from "@/threeam/world/layout";
import { Spine, FlatBook, TinyPlant, Figurine, Hourglass, VineStrand } from "./CommonArea";

// LAYOUT V2 (Task 3, the migration): this room replaces the old workspace's
// "battlestation" identity — the motorized desk rig, EVA-01 shrine, corkboard,
// project polaroids, coffee corner, and neon sign all MOVED here verbatim
// (cut, not copied) from scene/rooms/CommonArea.tsx (renamed from
// Workspace.tsx in Task 4), which keeps the stairs dressing and plants (the
// bookshelf ALSO moved here — T8 finale items 10 then 13, see the group
// below; the polaroid wall is GONE — T8 finale item 15 replaced it with a
// project-building table; the neon sign moved corners — item 14).
// Every position below is re-derived from Task 1's layout.ts
// furniture rects (WORKSTATION_ROOM + the desk/chair/EVA/coffee-bar rects
// in GROUND.furniture) — see each group's own comment for the specific
// rect it derives from. Wall/floor textures reuse the exact same generated
// assets the old workspace used (this room IS that room's identity, just
// relocated) — no new generator work, per the plan's Global Constraints.
//
// OWNER FEEDBACK WAVE (T4 review, this pass): the katana display shelf
// (previously left behind on CommonArea's own north wall, per Task 4's
// "common area keeps: ... katana" list) also moved here — mounted above
// the desk instead. See KatanaModel + the katana display shelf group
// below for the full writeup.
const WALL_H = 2.8; // must match House.tsx

/* Battlestation desk — motorized height toggle (owner wave B). The desktop
   top surface height is the thing that animates; every item on the desk is
   authored at a local y relative to that surface (0 = surface), and the
   whole "riding" group's world y IS the animated top height. Legs live
   OUTSIDE the riding group (they're bolted to the floor) and telescope by
   scaling a second segment to bridge the fixed outer sleeve up to the
   underside of the desktop each frame — see the leg refs in Workstation(). */
const DESK_SIT_Y = 0.75; // top surface height, sitting
const DESK_STAND_Y = 1.15; // top surface height, standing
const DESK_TOP_THICK = 0.04;
const LEG_OUTER_H = 0.5; // fixed lower sleeve height
const DESK_LERP = 6; // 1/s — matches the FollowCamera/Turntable ease rate family
const ACCENTS = ["#b3475f", "#c98a2e", "#2e6e54", "#5b4b8a"]; // wine, mustard, teal, indigo — existing palette

/* ── posters (owner polish pass W4) — 4 new original 64×96 art prints
   (retro computer ad, circuit-schematic print, synthwave grid-sun, star
   chart; scripts/pixelart/gen-variants.mjs) hung on the north wall, the
   corkboard's own wall face (z=-6.05, same convention as the corkboard/
   katana shelf/neon sign below). Two clustered WEST of the corkboard, in
   the narrow gap between the neon sign (x-max 9.375) and the katana shelf
   (x-min 10.5); two EAST of it, between the corkboard's own east edge
   (14.75) and the east wall (16). Every poster shares ONE baseline — bottom
   edge y=1.175, the SAME bottom edge the corkboard itself sits on
   (1.75 - 1.15/2) — the "shared alignment lines" the ask calls for, tying
   the whole wall together. Native 2:3 texture ratio (0.42×0.63), no
   stretch. No collider (flat wall dressing, same convention as every
   poster elsewhere in the house); no light (painted art, not a fixture). */
const WS_POSTER_W = 0.42;
const WS_POSTER_H = 0.63; // 0.42 * (96/64), exact 2:3
const WS_POSTER_BASE_Y = 1.175;
const WS_POSTER_CY = WS_POSTER_BASE_Y + WS_POSTER_H / 2;
type WsPosterKey = "retroAd" | "circuit" | "synthwave" | "starChart";
const WS_POSTERS: { key: WsPosterKey; cx: number; rotZ: number }[] = [
  // west cluster — centers 9.685/10.185, 0.42 wide w/ a 0.08m gutter
  // between (9.895-9.975); 0.10m clear of the neon's edge, 0.105m clear of
  // the katana shelf's edge.
  { key: "retroAd", cx: 9.685, rotZ: -0.02 },
  { key: "circuit", cx: 10.185, rotZ: 0.018 },
  // east cluster — centers 15.04/15.54, same width/gutter; 0.25m clear of
  // the east wall's corner.
  { key: "synthwave", cx: 15.04, rotZ: 0.015 },
  { key: "starChart", cx: 15.54, rotZ: -0.02 },
];

/** Chunky lego-style brick — one box + N stud cylinders on top, bright
 *  house-palette colors. Reused for both the half-built lego house (W3
 *  worktable redesign) and a couple of loose scattered bricks beside it.
 *  `position` is the brick's own base (resting surface). */
function LegoBrick({
  position,
  color,
  studs = 2,
  rotY = 0,
}: {
  position: [number, number, number];
  color: string;
  studs?: 1 | 2;
  rotY?: number;
}) {
  const w = studs === 2 ? 0.1 : 0.06;
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.03, 0]} castShadow>
        <boxGeometry args={[w, 0.06, 0.06]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {Array.from({ length: studs }, (_, si) => (
        <mesh key={si} position={[(si - (studs - 1) / 2) * 0.045, 0.068, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.015, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}

/* corkboard pin positions (board-local), 3 fixed slots. The red string is
   DERIVED from these so its endpoints land exactly on the pin centers —
   never hand-tune the string separately. Board-local, so the migration
   (north wall of the old workspace → north wall of the workstation) needs
   no changes here — only the board GROUP's world position moved. Was
   originally derived from site.experience.length (one pin per job, back
   when the board pinned company cards); W9c dropped that coupling — the
   board's pinned items are generic now, but the 3-slot zig-zag layout
   they produced is reused as-is for the new items below. */
const PINS = (() => {
  // board mesh is boxGeometry [1.7, 1.15, 0.05] (see the corkboard station
  // below); slots keep a ~0.15+halfW margin inside the board edge, sized
  // off the old card footprint (0.42 wide) that originally occupied them.
  const boardHalfW = 1.7 / 2;
  const slotHalfW = 0.42 / 2;
  const margin = 0.15;
  const usableHalfW = boardHalfW - margin - slotHalfW;
  const n = 3;
  return Array.from({ length: n }, (_, i) => ({
    x: -usableHalfW + i * ((2 * usableHalfW) / (n - 1)),
    y: 0.3 - (i % 2) * 0.35,
  }));
})();
const PIN_R = 0.02;
const PIN_Z = 0.045; // note group z (0.035) + pin-local z (0.01)
const PIN_A = PINS[0];
const PIN_B = PINS[PINS.length - 1];
const STRING = {
  x: (PIN_A.x + PIN_B.x) / 2,
  y: (PIN_A.y + PIN_B.y) / 2,
  z: PIN_Z + PIN_R + 0.004, // just proud of the pin heads (4mm convention)
  len: Math.hypot(PIN_B.x - PIN_A.x, PIN_B.y - PIN_A.y),
  rot: Math.atan2(PIN_B.y - PIN_A.y, PIN_B.x - PIN_A.x),
};

/* corkboard generic pinned items (W9c polish pass, owner verbatim: "i dont
   want to show company cards there just show something normal i dont want
   the company name on the card, make some generic stuff to put on it").
   Replaces the 3 company wordmark cards 1:1 in the same PINS slots — a
   to-do checklist, a ticket stub, and a small scenic postcard, none
   carrying any legible proper noun (see gen-variants.mjs's todoChecklist/
   ticketStub/postcardScenic jobs). `h` is the plane's world height; `w`
   derives from each item's own generated texture's native aspect
   (texW/texH) so nothing stretches. Sizes/rotations vary, within the
   layout ask's ±0.02-0.08 rad range — the PIN/STRING math above is
   untouched by this pass. */
const WS_CORK_ITEMS = [
  { tex: "todo" as const, h: 0.22, texW: 44, texH: 56, rot: -0.05 },
  { tex: "ticket" as const, h: 0.1, texW: 76, texH: 30, rot: 0.075 },
  { tex: "postcard" as const, h: 0.165, texW: 64, texH: 44, rot: -0.03 },
];

/* corkboard "high designation" documents + one personal item (W9 polish
   pass) — a certificate tucked directly under the board's existing extra
   pin, just grazing the cliff.ai card's top corner (kept clear of its
   wordmark), and an offer-letter tucked under the quantive card's bottom
   edge, plus a small pinned photo of its own in the open gap above the
   atlys card. Sizes derive from each
   texture's own native aspect (56×72 for both documents, 44×52 for the
   photo — see gen-variants.mjs) so nothing stretches. Every item's z sits
   well past 6mm proud of the cork face (board mesh half-depth 0.025) and
   is spaced from its neighbors so nothing z-fights; every corner (below)
   was checked to stay inside the board's own 1.7×1.15 bounds. */
const WS_CORK_DOC_ASPECT = 56 / 72;
const WS_CORK_CERT_H = 0.3;
const WS_CORK_CERT_W = WS_CORK_CERT_H * WS_CORK_DOC_ASPECT;
const WS_CORK_CERT_Z = 0.038; // 13mm proud — above the cards (0.035), under the extra pin
const WS_CORK_OFFER_H = 0.26;
const WS_CORK_OFFER_W = WS_CORK_OFFER_H * WS_CORK_DOC_ASPECT;
const WS_CORK_OFFER_Z = 0.031; // 6mm proud — tucked just behind the cards
const WS_CORK_PHOTO_ASPECT = 44 / 52;
const WS_CORK_PHOTO_H = 0.17;
const WS_CORK_PHOTO_W = WS_CORK_PHOTO_H * WS_CORK_PHOTO_ASPECT;
const WS_CORK_PHOTO_Z = 0.042; // 17mm proud — topmost, own pin at +0.01 local

// The `Polaroid` component + the projects-station 3D polaroid wall it
// backed are GONE (T8 finale item 15 — the west wall's project corner is
// now a project-building table, see the group below). The public/3am/
// projects/* pixelated images stay on disk untouched — /boring and the
// projects station's own 2D content panel (StationPanel.tsx, which reads
// `site.projects` independently of this 3D room) both still use them.

/** EVA-01 model: "Neon Genesis Evangelion unit-01" by XxAugustoxX
 *  (https://sketchfab.com/garaujoaugusto) via Sketchfab — CC-BY-4.0
 *  (https://sketchfab.com/3d-models/neon-genesis-evangelion-unit-01-5bc7a4fd7ee64fcb8ba2bb3f4832e343).
 *  Attribution lives in the GLB's asset.extras too.
 *
 *  This Sketchfab FBX conversion ships a broken rig: 47 of 51 meshes have
 *  vertex data authored in a ~1700-unit space while the skeleton (and its
 *  inverse bind matrices) live in a ~11-unit space, so GPU skinning throws
 *  the body ~150x off-scale (each mesh is rigidly bound 100% to a single
 *  joint — WEIGHTS_0 is [1,0,0,0] everywhere — so this isn't subtle blend
 *  skinning gone wrong, it's a flat unit-space mismatch). No animations
 *  ship, so the fix is to drop skinning entirely and render the bind pose
 *  statically: plain Meshes reusing the same geometry/materials, using
 *  each SkinnedMesh's own local transform (not its joint matrices) — valid
 *  because the vertex data is already pre-baked into that big bind-pose
 *  space. The remaining 4 meshes are trim authored directly in the small
 *  skeleton space (relies on the joint matrix to reach correct scale);
 *  those go sub-pixel under this shortcut and are dropped.
 *
 *  Wave F round 2 (2026-07) swapped in a 2x-texture re-download of the same
 *  model (2048x2048 maps, up from 1024) — same 51-mesh structure, same
 *  broken rig (skinCount still 51/51; confirmed via a temp runtime probe,
 *  not by assuming the old file's quirks carried over). Do not remove this
 *  bake without re-verifying skin state against whatever GLB is current.
 *
 *  Bind space is ~1698 units tall; EVA_SCALE brings it to 1.8m standing on
 *  the plinth (bumped from 1.4m — Rohan wanted it much bigger).
 *  Wrapped in its own Suspense at the call site so the fetch never blocks
 *  the rest of the room's first paint.
 *
 *  Wave F fix round: this was the only shipped GLB that had skipped the
 *  optimization pass its siblings got (coffee-machine, pixar-lamp).
 *  gltf-transform weld+simplify+prune brought it 5.33MB → 3.90MB (27%)
 *  with the bake above re-verified byte-for-byte visually identical
 *  in-browser. KHR_mesh_quantization (the fourth step used on the other
 *  two models) was deliberately DROPPED here: gltf-transform's per-mesh
 *  quantization volume has no compensation path for skinned primitives
 *  (the compensating scale it normally bakes into a node's TRS doesn't
 *  apply to a SkinnedMesh, whose vertices are positioned by joint
 *  matrices, not the node's own transform) — it silently collapsed every
 *  mesh's POSITION data to a tiny normalized range with no way to recover
 *  the original bind-pose scale, which fed straight into this component's
 *  own bake (below) discarding EVERY mesh as sub-pixel "trim" (the exact
 *  height-threshold check meant to drop the 4 real trim meshes). Textures
 *  were left untouched throughout (only the coffee-machine/pixar-lamp GLBs
 *  were pure geometry with nothing to lose there; this one ships 3 real
 *  2048px JPEGs that quantize doesn't touch anyway).
 *
 *  Perf pass (2026-07, room-local jitter fix): the 47-mesh static bake
 *  above was 47 separate draw calls sharing only 16 materials. Left the
 *  GLB itself untouched (re-baking via a CLI `join` risks desyncing the
 *  per-mesh bounding-box trim check this component's runtime bake depends
 *  on) and instead merge the baked static Meshes by material AT RUNTIME,
 *  once per mount, right after the skin-strip loop below — see the
 *  `created`/`byMaterial` block. Cuts EVA's draw calls from 47 to ~16
 *  (one per material) with identical triangle count and pixel output. */
const EVA_SCALE = 0.001063;
function EvaModel() {
  const { scene } = useGLTF("/3am/models/eva-01.glb");
  useEffect(() => {
    const skinned: THREE.SkinnedMesh[] = [];
    scene.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned.push(o as THREE.SkinnedMesh);
    });
    const created: THREE.Mesh[] = [];
    for (const sm of skinned) {
      const geo = sm.geometry;
      // skeleton-space trim (tiny bind bbox) can't join the static bake —
      // it was authored ~150x smaller than the main body meshes; skip it
      // (sub-pixel at figure scale). Threshold sits in the clean gap
      // between the trim cluster (~1.7-2.7 units) and the smallest
      // legitimate body-space mesh (~9.9 units).
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const h = bb.max.y - bb.min.y;
      if (h < 8) {
        sm.parent?.remove(sm);
        continue;
      }
      const st = new THREE.Mesh(geo, sm.material);
      st.position.copy(sm.position);
      st.quaternion.copy(sm.quaternion);
      st.scale.copy(sm.scale);
      st.castShadow = true;
      st.receiveShadow = true;
      const parent = sm.parent;
      parent?.add(st);
      parent?.remove(sm);
      created.push(st);
    }

    // draw-call reduction (perf pass, 2026-07 — room-local jitter fix): the
    // bake above yields up to 47 static Meshes scattered across the
    // original skeleton's node hierarchy, sharing only 16 materials — every
    // one is its own draw call. Merge geometries that share a material into
    // a single Mesh, baking each source mesh's transform relative to THIS
    // component's `scene` root (not full world space) into the merged
    // vertices first, so the outer <primitive position/rotation/scale>
    // below still places the whole figure correctly. Only groups whose
    // geometries share an identical attribute set are merged — a mismatch
    // (e.g. a mesh missing UVs) would otherwise corrupt mergeGeometries'
    // output. Runs once per mount (created is empty on HMR re-runs, since
    // the skin-strip loop above only finds SkinnedMesh nodes once), never
    // per frame.
    if (created.length > 0) {
      scene.updateMatrixWorld(true);
      const sceneInverse = new THREE.Matrix4().copy(scene.matrixWorld).invert();
      const byMaterial = new Map<THREE.Material, THREE.Mesh[]>();
      for (const m of created) {
        const mat = m.material as THREE.Material;
        if (!byMaterial.has(mat)) byMaterial.set(mat, []);
        byMaterial.get(mat)!.push(m);
      }
      for (const [mat, meshes] of byMaterial) {
        if (meshes.length < 2) continue;
        const geoms: THREE.BufferGeometry[] = [];
        let attrsMatch = true;
        for (const m of meshes) {
          m.updateMatrixWorld(true);
          const localMatrix = sceneInverse.clone().multiply(m.matrixWorld);
          const g = m.geometry.clone();
          g.applyMatrix4(localMatrix);
          if (
            geoms.length > 0 &&
            Object.keys(g.attributes).sort().join(",") !==
              Object.keys(geoms[0].attributes).sort().join(",")
          ) {
            attrsMatch = false;
            break;
          }
          geoms.push(g);
        }
        if (!attrsMatch) continue;
        const merged = mergeGeometries(geoms, false);
        if (!merged) continue;
        for (const m of meshes) m.parent?.remove(m);
        const combined = new THREE.Mesh(merged, mat);
        combined.castShadow = true;
        combined.receiveShadow = true;
        scene.add(combined);
      }
    }
    // room convention + material sanity under the warm room lighting
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial && !mat.userData.evaTuned) {
          mat.userData.evaTuned = true; // traverse can re-run (HMR/remount)
          mat.metalness = Math.min(mat.metalness, 0.2);
          mat.roughness = Math.max(mat.roughness, 0.6);
          // this GLB ships a couple of emissive materials (glowing eyes,
          // an indicator light) authored at emissiveIntensity up to 10 —
          // sane for whatever exposure the source scene used, but wildly
          // hot combined with our own Bloom pass (threshold 0.6): it was
          // blowing those spots (and their bloom halo) to flat white and
          // washing out the surrounding purple/green armor color, which is
          // what actually read as "distorted" up close. Clamp to a glow
          // that still pops without flattening detail.
          if (mat.emissiveIntensity > 1.5) mat.emissiveIntensity = 1.5;
        }
      }
    });
  }, [scene]);
  return <primitive object={scene} position={[0, 0.008, 0]} rotation={[Math.PI / 2, 0, 0]} scale={EVA_SCALE} />;
}
useGLTF.preload("/3am/models/eva-01.glb");

/** Coffee machine model v3: "Canarian Cafe - Coffee Machine" by Lanzaman
 *  (https://sketchfab.com/lanzaboy) via Sketchfab — CC-BY-4.0
 *  (http://creativecommons.org/licenses/by/4.0/), source:
 *  https://sketchfab.com/3d-models/canarian-cafe-coffee-machine-17042d9af8c5461e98876064fd80385d.
 *  Attribution lives in the GLB's asset.extras too. Plain CC-BY this
 *  time — no NC restriction (the v2 it replaces was CC-BY-NC, which is
 *  why it's gone along with the owner disliking its look). Third machine
 *  on this counter: v1 vervoortward (plain), v2 DailyArt (rejected +
 *  NC-licensed), v3 this one — owner supplied, deliberately BIG (a
 *  commercial cafe machine claiming the counter's right half).
 *
 *  GLB drill: healthy file — no skins/animations (direct JSON-chunk
 *  parse), 1 mesh/1 material/4 textures. The two Sketchfab corrective
 *  node transforms (Rx−90°·S(0.286) → Rx+90°·S(0.01)) compose to a pure
 *  uniform scale (verified by 4×4 multiply — rotation cancels exactly),
 *  so mesh-local axes are the final axes. Facing: vertex density piles
 *  up hard at local +Z (the band histogram puts ~80% of vertices in the
 *  high-Z third — group heads / knobs / drip-tray detail), matching the
 *  standard Sketchfab front=+Z convention. Room north = −Z, so this one
 *  DOES need the 180° turn (unlike v2): COFFEE_YAW = π.
 *
 *  Shipped 3.34MB — geometry is tiny (13.5k verts); the weight was four
 *  4096×4096 textures (~90MB VRAM each!) on a countertop prop. Optimized
 *  in place: weld → simplify (--ratio 0.1 --error 0.01) → prune → resize
 *  to 512×512 → png recompress → quantize (safe, no skin) = 3.34MB →
 *  293KB (91% smaller). validate: 0 errors/warnings; the quantize
 *  dequant-chain was checked by hand to reproduce the original bbox.
 *  Native linear texture filtering kept (no filter override below).
 *
 *  Emissive: the material ships an emissiveTexture with emissiveFactor
 *  [1,1,1] — full-strength white-scaled emissive (indicator lights /
 *  display on the machine face). Against our Bloom (threshold 0.6) that
 *  risks the clipped-white-core failure the pixar lamp hit, so
 *  emissiveIntensity is clamped to 0.55 below — the dome-lamp family
 *  value, bright enough to read as powered-on, under the Bloom
 *  threshold.
 *
 *  Sizing (owner: "cover ~50% of the counter" — right half): at 50% of
 *  the 1.5m slab the machine's 0.699m native depth would scale to
 *  0.56m, overhanging the 0.42m slab — so per the brief it's scaled BY
 *  DEPTH instead and the width lands where it lands: SCALE = 0.40 /
 *  0.699315 → 0.538m wide (35.9% of the slab, 38.4% of the collider
 *  width), 0.339m tall, 0.40m deep (1cm clear of the slab's front/back
 *  edges). COFFEE_POS puts the feet (raw ymin is slightly below the
 *  model origin) flush on the 0.90 slab top and right-aligns the
 *  machine: x ∈ [0.162, 0.700] counter-local — right edge flush with
 *  the cabinet body's edge (slab overhangs to 0.75), everything left of
 *  x≈0.16 free for the dressing. Full arithmetic in the counter group
 *  below. */
const COFFEE_SCALE = 0.5719879193007371;
const COFFEE_POS: [number, number, number] = [0.43113425553242146, 0.9193584135298203, 0.03524972160847606];
const COFFEE_YAW = Math.PI;
function CoffeeMachineModel() {
  const { scene } = useGLTF("/3am/models/coffee-machine-v3.glb");
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial && !mat.userData.coffeeTuned) {
          mat.userData.coffeeTuned = true; // traverse can re-run (HMR/remount)
          mat.metalness = Math.min(mat.metalness, 0.2);
          mat.roughness = Math.max(mat.roughness, 0.6);
          // emissiveTexture × emissiveFactor [1,1,1] — clamp below the
          // Bloom threshold (0.6) so the machine's lit face can't clip
          // to flat white (see attribution comment above)
          if (mat.emissiveIntensity > 0.55) mat.emissiveIntensity = 0.55;
        }
      }
    });
  }, [scene]);
  return (
    <primitive
      object={scene}
      position={COFFEE_POS}
      rotation={[0, COFFEE_YAW, 0]}
      scale={COFFEE_SCALE}
    />
  );
}
useGLTF.preload("/3am/models/coffee-machine-v3.glb");

/** Pixar lamp model: "pixar lamp" by yacinebel
 *  (https://sketchfab.com/yacinebel) via Sketchfab — CC-BY-4.0
 *  (https://sketchfab.com/3d-models/pixar-lamp-f97d17ac89a14ff68c3e488c69340b44).
 *  Attribution lives in the GLB's asset.extras too. Healthy file (no rig,
 *  no animations); shipped 4.7MB of untextured geometry, optimized offline
 *  with gltf-transform (weld/simplify/prune + KHR_mesh_quantization) to
 *  2.0MB.
 *  Perf pass (2026-07, room-local jitter fix): same story as the coffee
 *  machine — that pass never actually simplified, so it still carried
 *  116,318 triangles. Re-ran weld → simplify (--ratio 0.1 --error 0.01) →
 *  prune → quantize: 1.99MB/116,318 tris → 606KB/22,218 tris (81% fewer
 *  triangles; simplify stopped short of the 10% target ratio because it hit
 *  the 1%-of-mesh-radius error bound first, on the fine ribbed shade
 *  geometry). Same 5 meshes/5 materials — verify by eye after this change.
 *  Replaces the wave-B hand-built articulated desk lamp. Lives INSIDE the
 *  desk's riding group so it glides with the motorized height toggle; the
 *  warm point light is nested in the same group at the model's head
 *  position (rotation-aware — moving/yawing the lamp can never strand its
 *  light). */
const PIXAR_LAMP_SCALE = 0.00327; // owner: "9 -> 9.5" size bump
function PixarLampModel() {
  const { scene } = useGLTF("/3am/models/pixar-lamp.glb");
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial && !mat.userData.pixarTuned) {
          mat.userData.pixarTuned = true; // traverse can re-run (HMR/remount)
          mat.metalness = Math.min(mat.metalness, 0.2);
          mat.roughness = Math.max(mat.roughness, 0.6);
          // the bulb material ships full-white emissive AND a near-white
          // (0.8 grey) base color; at close desk range the nested
          // pointLight's direct diffuse hit on that same bright surface
          // stacked with the emissive term pushed it past 1.0 into a hard
          // (255,255,255) clipped core no Bloom halo could recover a
          // silhouette from — clamp emissive well below the coffee-corner
          // dome lamp's 0.55 (that fixture's bulb is a warm-tinted, not
          // white, material, so it has more headroom before clipping)
          if (mat.emissiveIntensity > 0.14) mat.emissiveIntensity = 0.14;
        }
      }
    });
  }, [scene]);
  return <primitive object={scene} scale={PIXAR_LAMP_SCALE} />;
}
useGLTF.preload("/3am/models/pixar-lamp.glb");

/** Gaming chair model: "Gaming Chair - Grey Cushioned" by kanesk06
 *  (https://sketchfab.com/kanesk06) via Sketchfab — CC-BY-4.0
 *  (https://sketchfab.com/3d-models/gaming-chair-grey-cushioned-c39430b3f91b43f7937174a9c27998f1).
 *  Attribution lives in the GLB's asset.extras too. Replaces the wave-E
 *  hand-built black/gray chair.
 *
 *  Healthy file: no skin, no animations (confirmed via a manual GLB-chunk
 *  probe of json.skins/json.nodes before touching it — the "GLTF drill"
 *  step 1/2 for this one is a no-op beyond attribution). Rig/scale sanity:
 *  the mesh is already authored in real-world meters (bbox ~0.77w × 1.36h ×
 *  0.74d, feet at y≈0.0006 — no static bake, no lift needed), so
 *  CHAIR_SCALE is 1.
 *
 *  Orientation: the file ships two Sketchfab corrective node matrices
 *  (Z-up→Y-up and back) that exactly cancel to identity — verified
 *  numerically, not assumed — so the model's OWN local axes are its final
 *  axes. Probing the raw POSITION accessor by Y-band (see scratch script
 *  used during the wave) showed the backrest/headrest mass sits at local
 *  -Z and the open seat-front at local +Z, i.e. unrotated the chair faces
 *  away from north. Rohan's ask is "seat toward the desk" (desk sits north
 *  of the chair collider), so this needs a ~180° turn, not a 0° drop-in:
 *  CHAIR_YAW is π (backrest → south, open front → north, toward the desk)
 *  plus a small casual offset. This also happens to be why the low
 *  seat-front — not the tall 1.36m backrest — ends up nearest the desk's
 *  0.75m sitting-height top, so nothing clips it.
 *
 *  Optimization (6.6MB shipped → 891KB, target was ~1-2MB): weld → simplify
 *  (--ratio 0.1 --error 0.01) → prune → quantize, the same pipeline as the
 *  other props, no draco/meshopt. Unlike the coffee-machine/pixar-lamp GLBs
 *  (pure geometry) this one ships three real 1024px PNGs (base color 1.3MB,
 *  normal 1.2MB — photographic content saved as lossless PNG, the least
 *  efficient combination) that dominated the file even after geometry
 *  optimization landed at 2.81MB. Resized all three to 512px + recompressed
 *  PNG (still lossless, gltf-transform's `resize`+`png`) to close the gap:
 *  891KB final. The pixel-post-process hides the resolution drop; verify by
 *  eye per the usual convention. Prune also dropped 3 unreferenced
 *  TEXCOORD sets (1/2/3 — Sketchfab export cruft, no material slot used
 *  them) before the geometry table even got small. KHR_mesh_quantization
 *  is safe here (no skin to desync, unlike EVA). Native linear texture
 *  filtering kept (no filter override below). */
const CHAIR_SCALE = 1;
const CHAIR_YAW = Math.PI + 0.22; // 180° (face the desk) + a slight casual turn
function GamingChairModel() {
  const { scene } = useGLTF("/3am/models/gaming-chair.glb");
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial && !mat.userData.chairTuned) {
          mat.userData.chairTuned = true; // traverse can re-run (HMR/remount)
          mat.metalness = Math.min(mat.metalness, 0.2);
          mat.roughness = Math.max(mat.roughness, 0.6);
        }
      }
    });
  }, [scene]);
  return <primitive object={scene} rotation={[0, CHAIR_YAW, 0]} scale={CHAIR_SCALE} />;
}
useGLTF.preload("/3am/models/gaming-chair.glb");

/** Katana model: "Katana" by aneeqayounas
 *  (https://sketchfab.com/aneeqayounas) via Sketchfab — CC-BY-4.0
 *  (https://sketchfab.com/3d-models/katana-b061754e94ce434cbe1396b3bb6d8abc).
 *  Attribution lives in the GLB's asset.extras too. Replaces the wave-E
 *  hand-built blade + prong stand ("looks pink" — the emissive sheen).
 *  Healthy file (no rig, 2 meshes, 1 material), ships its OWN stand.
 *  Native size is ~5.9m long; KATANA_SCALE brings it to ~1.1m — the
 *  shelf's centerpiece, sized for legibility under the locked pixel
 *  filter (the identifiable cues at walking distance are the long
 *  silhouette, the teal edge glow baked into the emissive map, and the
 *  gold fittings). Textures keep their native linear filtering.
 *
 *  OWNER FEEDBACK WAVE (this pass): moved here verbatim from
 *  CommonArea.tsx (the old workspace's floating shelf) — owner ask: mount
 *  it above the desk instead of on the common area's own north wall. See
 *  the katana display shelf below (after the desk group) for the new
 *  placement. */
const KATANA_SCALE = 0.185;
function KatanaModel() {
  const { scene } = useGLTF("/3am/models/katana.glb");
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial && !mat.userData.katanaTuned) {
          mat.userData.katanaTuned = true; // traverse can re-run (HMR/remount)
          mat.metalness = Math.min(mat.metalness, 0.2);
          mat.roughness = Math.max(mat.roughness, 0.6);
          // same 2.2x color lift as the EVA: the albedo is authored for a
          // brighter scene; without it the silver blade reads near-black
          // under the room's dim warm light (the baked teal edge-glow in
          // the emissive map is left at its authored intensity — it's the
          // model's own look, not a sheen hack).
          mat.color.multiplyScalar(2.2);
        }
      }
    });
  }, [scene]);
  // +0.151 lifts the model's lowest point (the stand feet) up to exactly
  // the shelf slab's top surface (local y 0) — measured in-browser at this
  // scale. The slight yaw angles the blade across the shelf depth so the
  // walking camera sees more than a pure edge-on line.
  return (
    <primitive
      object={scene}
      position={[0, 0.151, 0]}
      rotation={[0, 0.15, 0]}
      scale={KATANA_SCALE}
    />
  );
}
useGLTF.preload("/3am/models/katana.glb");

/** Beanbag model: "Bean Bag" by J-Toastie (https://poly.pizza/m/nMZz79A5ru)
 *  via Poly Pizza — CC-BY-3.0
 *  (https://creativecommons.org/licenses/by/3.0/). Attribution lives in the
 *  GLB's asset.extras too. Replaces the W7-FIX-ROUND primitive redesign
 *  (two flattened spheres → one flattened sphere + a tuft cap) with a real
 *  low-poly asset — the owner asked for a model hunt after the primitive
 *  pass, wanting the shape to read unambiguously as upholstery rather than
 *  anything a procedural blob could still be mistaken for.
 *
 *  Style gate: 930 verts / 384 tris, ONE flat OPAQUE material (no textures,
 *  metalness 0 / roughness 1, no emissive) — a single low-poly faceted
 *  blob with one subtle seam-crease already baked into the geometry
 *  (visible as a fold on one flank), which happens to be exactly the "at
 *  most one subtle seam" shape the original ask specced. Matches this
 *  house's low-poly-prop convention (the GLB drill: healthy file, no
 *  skin/animations, single mesh/material).
 *
 *  Recolor: source `baseColorFactor` is a warm rust-orange — clashes with
 *  the ask's "deep navy or charcoal" — overridden at runtime to the same
 *  charcoal-navy (`#232a3d`) the primitive redesign used, so the swap is a
 *  pure geometry upgrade, not a color change too.
 *
 *  Sizing: native bbox is ~1.10m(x) × 0.71m(y) × 1.03m(z), roughly
 *  centered on its own local origin in x/z already (no re-centering
 *  needed). Non-uniform scale flattens it further to the ask's own spec —
 *  ~1.0m footprint, ~0.48m tall (owner sized up from 0.8/0.4 after seeing
 *  it live: "make it a bit bigger it looks perfect"): sx = 1.0/1.097257,
 *  sz = 1.0/1.033768, sy = 0.48/0.710726. BEANBAG_LIFT raises the model so
 *  its scaled lowest point (bbox.min.y × sy) sits at y=0 on the floor, not
 *  floating/clipping. */
const BEANBAG_SCALE: [number, number, number] = [0.911364, 0.675366, 0.967334];
const BEANBAG_LIFT = 0.050219; // -bbox.min.y (0.074355) * sy (0.675366)
function BeanbagModel() {
  const { scene } = useGLTF("/3am/models/beanbag.glb");
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = false; // no shadow casting (matches the original primitive redesign)
        obj.receiveShadow = true;
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial && !mat.userData.beanbagTuned) {
          mat.userData.beanbagTuned = true; // traverse can re-run (HMR/remount)
          mat.color.set("#232a3d"); // source ships rust-orange — recolor to deep charcoal-navy
          mat.metalness = 0;
          mat.roughness = 0.9;
        }
      }
    });
  }, [scene]);
  return <primitive object={scene} position={[0, BEANBAG_LIFT, 0]} scale={BEANBAG_SCALE} />;
}
useGLTF.preload("/3am/models/beanbag.glb");

/** Loose ceramic cup for the coffee-counter clutter — same cylinder+handle
 *  proportions as the mug-rack mugs (visual consistency: reads as "one of
 *  the same mugs, just left out"), optionally on a tiny saucer disc.
 *  `position` is the saucer/cup base (counter slab top). */
function LooseCup({
  position,
  color,
  rotY = 0,
  saucer = true,
}: {
  position: [number, number, number];
  color: string;
  rotY?: number;
  saucer?: boolean;
}) {
  const base = saucer ? 0.008 : 0;
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {saucer && (
        <mesh position={[0, 0.004, 0]}>
          <cylinderGeometry args={[0.046, 0.046, 0.008, 12]} />
          <meshStandardMaterial color="#f2ecd8" />
        </mesh>
      )}
      <mesh position={[0, base + 0.026, 0]}>
        <cylinderGeometry args={[0.026, 0.024, 0.052, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.03, base + 0.028, 0]}>
        <boxGeometry args={[0.012, 0.028, 0.01]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

/** Squat bean jar — coffee-counter clutter (a jar reads clearer than a
 *  flat paper bag under the pixel filter at this scale). `position` is
 *  the counter slab top. */
function BeanJar({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.032, 0]}>
        <cylinderGeometry args={[0.045, 0.042, 0.064, 10]} />
        <meshStandardMaterial color="#3d2b1a" />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.048, 0.048, 0.014, 10]} />
        <meshStandardMaterial color="#1a1a22" />
      </mesh>
      <mesh position={[0, 0.084, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.016, 8]} />
        <meshStandardMaterial color="#1a1a22" />
      </mesh>
    </group>
  );
}

/** Tiny desk-mascot plushie — coffee-counter dressing (owner: "maybe some
 *  figurine-type plushies"). Rounded blocky critter, no IP: a squashed
 *  sphere body (sits rather than stands), two round ear nubs, a lighter
 *  belly patch sitting proud of the body surface (7mm, clears the 4mm
 *  z-fighting floor). `position` is the counter slab top; `scale` sizes
 *  the whole critter for variety between the two instances. */
function CoffeePlushie({
  position,
  color,
  rotY = 0,
  scale = 1,
}: {
  position: [number, number, number];
  color: string;
  rotY?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      <mesh position={[0, 0.033, 0]} scale={[1, 0.82, 1]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[-0.02, 0.02].map((ex) => (
        <mesh key={ex} position={[ex, 0.062, 0]}>
          <sphereGeometry args={[0.011, 6, 5]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <mesh position={[0, 0.033, 0.047]}>
        <circleGeometry args={[0.018, 8]} />
        <meshStandardMaterial color="#f2ecd8" />
      </mesh>
    </group>
  );
}

export function Workstation() {
  const R = WORKSTATION_ROOM;
  const rootRef = useRef<THREE.Group>(null);
  /** aim points for the EVA shrine's two crossfire sunset washes (same
   *  pattern as the music nook's sunset lamp → album wall projection).
   *  Both live INSIDE the rotated shrine group as local-space primitives —
   *  along with their nested spotlights — so re-rotating the shrine can
   *  never desync fixture/beam/aim (the world-space-math version of this
   *  bug bit twice already). Right lamp aims across to the figure's LEFT
   *  flank, left lamp to its RIGHT: beams intersect on the EVA. */
  const [evaTargetAcrossL] = useState(() => new THREE.Object3D()); // right lamp's aim (left flank)
  const [evaTargetAcrossR] = useState(() => new THREE.Object3D()); // left lamp's aim (right flank)

  useEffect(() => {
    rootRef.current?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, []);

  // desk height toggle: clicking the control pad flips `standing`; the
  // actual animated value glides toward the target every frame (clamped-dt
  // exponential ease, same family as FollowCamera/Turntable) so it's
  // framerate-independent instead of snapping.
  const [standing, setStanding] = useState(false);
  const [padHover, setPadHover] = useState(false);
  const deskYRef = useRef(DESK_SIT_Y);
  const deskRideRef = useRef<THREE.Group>(null);
  const legInnerRefs = useRef<(THREE.Mesh | null)[]>([null, null]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = 1 - Math.exp(-DESK_LERP * dt);
    const target = standing ? DESK_STAND_Y : DESK_SIT_Y;
    deskYRef.current += (target - deskYRef.current) * t;
    const y = deskYRef.current;
    if (deskRideRef.current) deskRideRef.current.position.y = y;
    // telescope: the inner column bridges the fixed outer sleeve up to the
    // underside of the desktop, so it grows visibly as the desk rises.
    const legH = Math.max(0.02, y - DESK_TOP_THICK / 2 - LEG_OUTER_H);
    for (const leg of legInnerRefs.current) {
      if (!leg) continue;
      leg.scale.y = legH;
      leg.position.y = LEG_OUTER_H + legH / 2;
    }
  });

  // LAYOUT V2: this room's own floor/wall surfaces — same generated
  // textures the old workspace used (midnight wall, walnut floor), just
  // sized to WORKSTATION_ROOM. Unlike the old workspace's west/east walls
  // (which were interior dividers split around a doorway), this room's
  // west/east walls are solid perimeter (no door), so each is a single
  // plane — no segment-splitting needed. The south wall (the shared,
  // doored wall back to the common area) is left to House.tsx's plain-color
  // low stub (see House.tsx's workstation branch) — it already renders the
  // correct door gap from the Task-1 collider, and this wall sits mostly
  // behind the camera from this room's own dollhouse angle, so it doesn't
  // need a decorative overlay.
  const floor = usePixelTexture("/3am/tex/floor-walnut.png", R.w, R.d);
  const wallN = usePixelTexture("/3am/tex/wall-midnight.png", R.w, WALL_H);
  const wallW = usePixelTexture("/3am/tex/wall-midnight.png", R.d, WALL_H);
  const wallE = usePixelTexture("/3am/tex/wall-midnight.png", R.d, WALL_H);
  const termTex = usePixelTexture("/3am/tex/terminal.png", 1, 1);
  const corkTex = usePixelTexture("/3am/tex/cork.png", 1, 1);
  const neonShippedTex = usePixelTexture("/3am/tex/neon-shipped.png", 1, 1);
  const blueprintTex = usePixelTexture("/3am/tex/blueprint-paper.png", 1, 1);
  const pegboardTex = usePixelTexture("/3am/tex/pegboard.png", 1, 1);
  const posterRetroAdTex = usePixelTexture("/3am/tex/poster-retro-ad.png", 1, 1);
  const posterCircuitTex = usePixelTexture("/3am/tex/poster-circuit.png", 1, 1);
  const posterSynthwaveTex = usePixelTexture("/3am/tex/poster-synthwave.png", 1, 1);
  const posterStarChartTex = usePixelTexture("/3am/tex/poster-star-chart.png", 1, 1);
  const posterAkiraTex = usePixelTexture("/3am/tex/poster-akira-film.png", 1, 1);
  const rugMushroomTex = usePixelTexture("/3am/tex/rug-mushroom.png", 1, 1);
  // corkboard rework (W9c polish pass) — see WS_CORK_ITEMS below for the
  // per-item sizing this feeds.
  const corkItemTodoTex = usePixelTexture("/3am/tex/corkboard-item-todo.png", 1, 1);
  const corkItemTicketTex = usePixelTexture("/3am/tex/corkboard-item-ticket.png", 1, 1);
  const corkItemPostcardTex = usePixelTexture("/3am/tex/corkboard-item-postcard.png", 1, 1);
  const corkDocCertificateTex = usePixelTexture("/3am/tex/corkboard-doc-certificate.png", 1, 1);
  const corkDocOfferTex = usePixelTexture("/3am/tex/corkboard-doc-offer-letter.png", 1, 1);
  const corkPhotoTex = usePixelTexture("/3am/tex/corkboard-photo-polaroid.png", 1, 1);

  return (
    <group ref={rootRef}>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[R.x + R.w / 2, 0.02, R.z + R.d / 2]}>
        <planeGeometry args={[R.w, R.d]} />
        <meshStandardMaterial map={floor} />
      </mesh>
      {/* north wall — the desk/corkboard/neon wall, full width, no gap */}
      <mesh position={[R.x + R.w / 2, WALL_H / 2, R.z + 0.01]}>
        <planeGeometry args={[R.w, WALL_H]} />
        <meshStandardMaterial map={wallN} />
      </mesh>
      {/* west wall — polaroid wall face, solid (no door on this edge) */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[R.x + 0.01, WALL_H / 2, R.z + R.d / 2]}>
        <planeGeometry args={[R.d, WALL_H]} />
        <meshStandardMaterial map={wallW} />
      </mesh>
      {/* east wall — coffee-corner wall face, solid (no door on this edge) */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[R.x + R.w - 0.01, WALL_H / 2, R.z + R.d / 2]}>
        <planeGeometry args={[R.d, WALL_H]} />
        <meshStandardMaterial map={wallE} />
      </mesh>

      {/* ── ceiling pendant — W1 lighting pass, REDESIGNED (coordinator
          re-walk F1: the first version read as "a giant beige water-heater
          barrel" dominating the room from the default camera — the shade
          was too wide (0.4m dia) and its bottom sat at y2.12, BELOW the
          2.2m minimum this fix now enforces, and it sat at z-2.0, almost
          in the door's own sightline). Fixes: shade shrunk to the ask's
          own cap (~0.5m dia × ≤0.3m tall — this one is 0.5×0.22), its
          bottom raised to y2.25 (≥2.2m off the floor), and the whole
          fixture moved off the door band to z-2.6 (still well south of
          the gaming chair [z-5.0..-4.2] and clear of the EVA shrine's
          x-span [8.3-9.8]). The bulb now hangs BELOW the shade's open
          bottom rim (not tucked up inside it) so it visibly reads as the
          light source, and the point light sits just under the bulb so it
          can spill past the shade and pool on the floor unobstructed —
          intensity/distance bumped accordingly for the extra height (was
          y2.1/intensity3.2/distance4.5; now y2.05/intensity4.5/distance6).
          Real light nested inside the visible shade (rotation-aware,
          though this fixture never rotates). Now the room's shadow
          caster (owner override of the old "2 casters, both music nook"
          rule — discrete-room rendering means only this room's own
          caster is ever live while occupied).
          The old ≤5-light room cap predates discrete-room rendering (only
          this room renders while occupied) — this and the drafting lamp
          below bring the room to 7 (SE-corner fix below makes it 8); see
          the report for the measured fps. ── */}
      <group position={[12, 0, -2.6]}>
        {/* ceiling mount plate + cord, down to the shade's new (higher, smaller) top */}
        <mesh position={[0, WALL_H - 0.02, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.02, 10]} />
          <meshStandardMaterial color="#20202a" />
        </mesh>
        <mesh position={[0, (WALL_H - 0.02 + 2.47) / 2, 0]}>
          <cylinderGeometry args={[0.007, 0.007, WALL_H - 0.02 - 2.47, 6]} />
          <meshStandardMaterial color="#20202a" />
        </mesh>
        {/* small bell shade — open top+bottom truncated cone, 0.5m max
            diameter, 0.22m tall, bottom rim at y2.25 (≥2.2m off the floor) */}
        <mesh position={[0, 2.36, 0]}>
          <cylinderGeometry args={[0.05, 0.25, 0.22, 14, 1, true]} />
          <meshStandardMaterial color="#2e2a4d" side={2} />
        </mesh>
        {/* bulb, hanging visibly BELOW the shade's open bottom rim (2.25) —
            reads as the actual light source, not hidden inside the shade */}
        <mesh position={[0, 2.12, 0]}>
          <sphereGeometry args={[0.04, 10, 8]} />
          <meshStandardMaterial color="#ffe3b8" emissive="#ffe3b8" emissiveIntensity={1.6} />
        </mesh>
        <pointLight castShadow shadow-mapSize={[256, 256]} shadow-bias={-0.0015} shadow-radius={3} shadow-intensity={0.85} position={[0, 2.05, 0]} color="#ffe3b8" intensity={4.5} distance={6} decay={2} />
      </group>

      {/* ── desk — collider {10.5,-6.0,2.2,0.9} (layout.ts, north wall
          center). Group position is the collider's center (11.6,-5.55),
          same "group = collider center" convention the old workspace used
          for this rig. Motorized standing desk: the top + everything
          sitting on it lives in one "riding" group whose world y glides
          between sitting (0.75) and standing (1.15); the legs are bolted
          to the floor and telescope on the same eased height each frame
          (see deskRideRef/legInnerRefs + useFrame above).
          ADAPTATION: the desktop's own visual width (2.6m, unchanged from
          the old rig) overhangs the new 2.2m-wide collider by 0.2m on each
          side — Task 1's rect matches the Geometry Reference's binding
          value exactly; the mesh dims demand the overhang. Within the
          plan's ±0.2m tolerance, and purely visual (no new collision
          footprint), consistent with this house's existing "visual model
          extends past collision box" convention used elsewhere. ── */}
      <group position={[11.6, 0, -5.55]}>
        {/* legs — fixed outer sleeve + telescoping inner column + foot, one per side */}
        {[-1.15, 1.15].map((lx, i) => (
          <group key={lx}>
            <mesh position={[lx, 0.015, 0]}>
              <boxGeometry args={[0.16, 0.03, 0.78]} />
              <meshStandardMaterial color="#12121a" />
            </mesh>
            <mesh position={[lx, LEG_OUTER_H / 2, 0]}>
              <boxGeometry args={[0.1, LEG_OUTER_H, 0.1]} />
              <meshStandardMaterial color="#1a1a22" />
            </mesh>
            <mesh
              ref={(m) => {
                legInnerRefs.current[i] = m;
              }}
              position={[lx, LEG_OUTER_H + 0.11, 0]}
            >
              <boxGeometry args={[0.075, 1, 0.075]} />
              <meshStandardMaterial color="#1a1a22" />
            </mesh>
          </group>
        ))}

        {/* riding group — local y=0 is the desktop's top surface; every item
            on the desk is a child here so it rides the height animation */}
        <group ref={deskRideRef} position={[0, DESK_SIT_Y, 0]}>
          {/* slim modern top — light, NOT chunky wood */}
          <mesh position={[0, -DESK_TOP_THICK / 2, 0]}>
            <boxGeometry args={[2.6, DESK_TOP_THICK, 0.9]} />
            <meshStandardMaterial color="#e9e5d8" />
          </mesh>

          {/* control pad — front edge at the RIGHT end (owner ask; real
              standing desks keep it there), toggles the motor */}
          <group
            position={[1.1, -0.06, 0.454]}
            onClick={(e) => {
              e.stopPropagation();
              setStanding((s) => !s);
            }}
            onPointerOver={() => {
              setPadHover(true);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              setPadHover(false);
              document.body.style.cursor = "auto";
            }}
          >
            <mesh>
              <boxGeometry args={[0.14, 0.03, 0.05]} />
              <meshStandardMaterial color="#20202a" />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <boxGeometry args={[0.035, 0.018, 0.008]} />
              <meshStandardMaterial
                color="#7cffb2"
                emissive="#7cffb2"
                emissiveIntensity={padHover ? 1.4 : 0.8}
              />
            </mesh>
          </group>

          {/* riser (warm wood) + 32" monitor + light bar — toward the wall */}
          <group position={[0, 0, -0.15]}>
            {[[-0.34, -0.08], [-0.34, 0.08], [0.34, -0.08], [0.34, 0.08]].map(
              ([fx, fz], i) => (
                <mesh key={i} position={[fx, 0.0535, fz]}>
                  <boxGeometry args={[0.02, 0.107, 0.02]} />
                  <meshStandardMaterial color="#1a1a22" />
                </mesh>
              )
            )}
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[0.72, 0.015, 0.16]} />
              <meshStandardMaterial color="#8b5e3c" />
            </mesh>
            <mesh position={[0, 0.117, 0]}>
              <boxGeometry args={[0.8, 0.02, 0.2]} />
              <meshStandardMaterial color="#a87b4f" />
            </mesh>

            {/* hotwheels, beside the monitor's base — scaled 1.6x (wave E:
                they were invisible from the walking camera) */}
            {[
              { x: -0.3, c: "#b3475f", r: 0.2 },
              { x: -0.1, c: "#3d5a99", r: -0.15 },
              { x: 0.1, c: "#c98a2e", r: 0.25 },
              { x: 0.3, c: "#2e6e54", r: -0.1 },
            ].map((car) => (
              <group key={car.x} position={[car.x, 0.127, 0.06]} rotation={[0, car.r, 0]} scale={1.6}>
                <mesh position={[0, 0.01, 0]}>
                  <boxGeometry args={[0.06, 0.02, 0.026]} />
                  <meshStandardMaterial color={car.c} />
                </mesh>
                <mesh position={[-0.008, 0.027, 0]}>
                  <boxGeometry args={[0.03, 0.014, 0.02]} />
                  <meshStandardMaterial color="#1a1a22" />
                </mesh>
              </group>
            ))}

            {/* monitor, centered on the riser — bumped 0.72 → 0.80 wide
                (wave E), panel bottom stays at 0.1 so the riser fit holds */}
            <group position={[0, 0.127, 0]}>
              <mesh position={[0, 0.01, 0]}>
                <boxGeometry args={[0.1, 0.02, 0.1]} />
                <meshStandardMaterial color="#1c1c24" />
              </mesh>
              <mesh position={[0, 0.06, 0]}>
                <boxGeometry args={[0.05, 0.08, 0.04]} />
                <meshStandardMaterial color="#1c1c24" />
              </mesh>
              <mesh position={[0, 0.325, 0]}>
                <boxGeometry args={[0.8, 0.45, 0.035]} />
                <meshStandardMaterial color="#1c1c24" />
              </mesh>
              {/* screen sits proud of the bezel front face (z 0.0175) by
                  10.5mm — bumped from 6.5mm (perf pass, dpr 1 cap): that
                  gap was already ≥ the house's old 4mm floor but too close
                  to the new 6mm generous minimum to trust once dpr-driven
                  supersampling stopped masking the dither at grazing walk
                  angles. Confirmed via arithmetic, not the width bump
                  (0.72→0.80 wide, wave E) — that only touched x, this
                  screen offset was untouched by it. */}
              <mesh position={[0, 0.325, 0.028]}>
                <planeGeometry args={[0.76, 0.42]} />
                <meshBasicMaterial map={termTex} />
              </mesh>
              {/* light bar — the near-black body vanished against the
                  midnight wall (owner: "it's not there"), so it gets a
                  charcoal body + a visible warm LIT strip on the underside
                  that marks it as the glow's source */}
              {/* light bar, pixel-art proportions: two subtle attempts got
                  swallowed by the bezel darks + 4px blocks, so it's chunky
                  now — floats a visible gap ABOVE the panel top (0.55) on a
                  mount arm, silhouette break + bloom outline do the reading */}
              <mesh position={[0, 0.575, -0.01]}>
                <boxGeometry args={[0.03, 0.05, 0.03]} />
                <meshStandardMaterial color="#3a3a46" />
              </mesh>
              <mesh position={[0, 0.615, 0.03]}>
                <boxGeometry args={[0.76, 0.05, 0.09]} />
                <meshStandardMaterial color="#3a3a46" />
              </mesh>
              {/* perf pass (ws-center 3-room overlap, 2026-07): dropped this
                  fixture's pointLight — it was pure decorative wash on an
                  already-emissive strip right at the wall, negligible actual
                  spill vs. the monitor screen + desk lamp doing the real
                  illumination here. Emissive-only now (bumped slightly so
                  the strip still reads as lit without the point light). */}
              <mesh position={[0, 0.588, 0.04]}>
                <boxGeometry args={[0.7, 0.01, 0.05]} />
                <meshStandardMaterial
                  color="#ffdcb0"
                  emissive="#ffcf9e"
                  emissiveIntensity={2.6}
                />
              </mesh>
            </group>
          </group>

          {/* desk mat + white mechanical keyboard + mouse — front-center */}
          <mesh position={[0, 0.004, 0.15]}>
            <boxGeometry args={[1.05, 0.008, 0.55]} />
            <meshStandardMaterial color="#1c1a22" />
          </mesh>
          <mesh position={[-0.12, 0.017, 0.2]}>
            <boxGeometry args={[0.42, 0.018, 0.15]} />
            <meshStandardMaterial color="#eceae2" />
          </mesh>
          {Array.from({ length: 4 }, (_, row) =>
            Array.from({ length: 8 }, (_, col) => {
              const idx = row * 8 + col;
              const accent = [2, 6, 10, 15, 19, 23, 28].includes(idx);
              return (
                <mesh
                  key={idx}
                  position={[-0.288 + col * 0.048, 0.0315, 0.155 + row * 0.03]}
                >
                  <boxGeometry args={[0.038, 0.011, 0.024]} />
                  <meshStandardMaterial
                    color={accent ? ACCENTS[idx % ACCENTS.length] : "#d9d6cc"}
                  />
                </mesh>
              );
            })
          )}
          <mesh position={[0.22, 0.019, 0.2]}>
            <boxGeometry args={[0.045, 0.022, 0.075]} />
            <meshStandardMaterial color="#eceae2" />
          </mesh>

          {/* real pixar lamp (see PixarLampModel's attribution) — back-left
              corner, inside the riding group so it glides with the desk's
              height toggle. Fixture-attached point light nested in the
              same group at the model's head (no shadow casting — the
              soft-shadow caster budget is fixed). Own Suspense. */}
          {/* yawed toward screen-right per owner; rotation on the GROUP so
              the nested light stays at the shade mouth */}
          <group position={[-1.05, 0.076, -0.26]} rotation={[0, 0.3, 0]}>
            <Suspense fallback={null}>
              <PixarLampModel />
            </Suspense>
            {/* light hangs just below/forward of the shade's mouth (shade
                cone tops out at local y ~0.40 overhanging +z) — inside the
                shade it blasted the cone interior into a bloom blob, and
                too low it burned a hot pool into the white desktop. Wave F
                fix round: pulled further forward/up off the bulb mesh
                (Sphere_Material.004, near-white) and intensity dropped
                below the coffee dome's 0.9 — that fixture's light sits
                close to its bulb too, but a warm-tinted (not white) bulb
                material has far more headroom before clipping. */}
            <pointLight position={[0, 0.36, 0.34]} color="#ffd9a0" intensity={0.22} distance={1.3} decay={2} />
          </group>

          {/* open MacBook on a low aluminum stand — right of the monitor
              (wave E, replaces the desk plant; owner moved it right in the
              live amendment). Screen is a small pale-blue emissive plane:
              glow, not a light source. Clear of the riser edge (x 0.4)
              and the desk's right edge (x 1.3). */}
          {/* scale bump + terminal on screen (owner, 2026-07-18); footprint
              at 1.25x still clears the riser (x 0.4) and desk edge (1.3) */}
          <group position={[0.72, 0, -0.08]} rotation={[0, -0.35, 0]} scale={1.25}>
            {/* stand: two low aluminum rails + plate */}
            {[-0.14, 0.14].map((sx) => (
              <mesh key={sx} position={[sx, 0.025, 0]}>
                <boxGeometry args={[0.02, 0.05, 0.2]} />
                <meshStandardMaterial color="#b8b8c0" />
              </mesh>
            ))}
            <mesh position={[0, 0.055, 0]}>
              <boxGeometry args={[0.32, 0.012, 0.22]} />
              <meshStandardMaterial color="#b8b8c0" />
            </mesh>
            {/* macbook base — space gray (owner) */}
            <mesh position={[0, 0.067, 0.01]}>
              <boxGeometry args={[0.3, 0.012, 0.2]} />
              <meshStandardMaterial color="#6e6e73" />
            </mesh>
            {/* tilted open screen, hinged at the base's back edge */}
            <group position={[0, 0.073, -0.09]} rotation={[-0.32, 0, 0]}>
              {/* lid — space gray to match the base */}
              <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[0.3, 0.2, 0.008]} />
                <meshStandardMaterial color="#6e6e73" />
              </mesh>
              {/* screen was 1.5mm proud of the lid front face (z 0.004) —
                  well under the house's 4mm z-fighting floor, the actual
                  flicker source (perf pass, dpr 1 cap). Bumped to 8mm. */}
              <mesh position={[0, 0.1, 0.012]}>
                <planeGeometry args={[0.27, 0.17]} />
                {/* same terminal the monitor runs — reads as one workflow
                    spread across two screens (unlit map = screen glow) */}
                <meshBasicMaterial map={termTex} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* ── katana display shelf — OWNER FEEDBACK WAVE (moved here from the
          common area's own north wall, T4 review). North wall, above the
          desk: x=11.6 matches the desk group's own center above; y=2.4
          (slab surface, roughly the y2.3-2.5 band asked for) clears the
          monitor's own tallest reach in both the sitting (~1.38 panel top)
          and standing (~1.92 light-bar top) desk positions with well over
          a meter to spare. No collider (above head height, same
          convention the old common-area spot used). z=-6.05, matching the
          corkboard/neon's own depth off the wall face (z≈-6.19) — well
          past the house's 6mm-offset convention. White slab (unchanged
          from the old spot), hidden brackets, the real katana on its own
          stand (see KatanaModel's attribution above), and one
          picture-light — the workstation's 5th and last real light (this
          room's shadow/light budget: 4→5, exactly the cap). ── */}
      <group position={[11.6, 2.4, -6.05]}>
        {/* slab — sized to the desk's own collider width (10.5-12.7) */}
        <mesh position={[0, -0.025, 0]}>
          <boxGeometry args={[2.2, 0.05, 0.3]} />
          <meshStandardMaterial color="#e9e5d8" />
        </mesh>
        {/* hidden brackets — tucked under, dark to disappear against the
            midnight wall */}
        {[-0.7, 0.7].map((bx) => (
          <mesh key={bx} position={[bx, -0.1, -0.11]}>
            <boxGeometry args={[0.06, 0.15, 0.26]} />
            <meshStandardMaterial color="#20223a" />
          </mesh>
        ))}

        {/* real katana on its own stand (see KatanaModel's attribution) —
            centered display piece, stand feet on the slab top (local y 0).
            Own Suspense: the GLB streams in without holding up the shelf. */}
        <Suspense fallback={null}>
          <KatanaModel />
        </Suspense>

        {/* draping vine pots (W9b — migration regression fix: these existed
            on main's floating shelf, at local x ±1.15 on that version's
            2.8-wide slab, and were dropped when the shelf moved+narrowed
            to 2.2 wide here). Construction copied verbatim from main's
            Workspace.tsx (west/east pot groups, ~line 1723) — same pot
            geometry, same 3-strand-per-pot layout. Only the x positions
            changed, to fit THIS shelf's narrower 2.2m slab (half-width
            1.1) and clear the picture-light fixture below at x=0.85
            (shade radius 0.065): west pot at -0.92 (clear run, full 3
            strands); east pot at 1.0 (pot radius 0.055 keeps it inside
            the slab edge at 1.1, and 0.03m clear of the lamp shade's own
            edge at 0.915). */}
        <group position={[-0.92, 0, -0.02]}>
          <mesh position={[0, 0.035, 0]}>
            <cylinderGeometry args={[0.055, 0.045, 0.07, 10]} />
            <meshStandardMaterial color="#c9b088" />
          </mesh>
          <mesh position={[0, 0.09, 0]}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshStandardMaterial color="#3f8f5a" />
          </mesh>
          <group position={[0, 0.06, 0.04]}>
            <VineStrand dir={[0, 1]} segments={6} phase={0} />
          </group>
          <group position={[0.04, 0.06, 0.02]}>
            <VineStrand dir={[0.3, 1]} segments={4} segLen={0.075} phase={1} />
          </group>
          <group position={[-0.04, 0.06, 0]}>
            <VineStrand dir={[-1, 0.2]} segments={5} phase={2} />
          </group>
        </group>
        <group position={[1.0, 0, -0.02]}>
          <mesh position={[0, 0.035, 0]}>
            <cylinderGeometry args={[0.055, 0.045, 0.07, 10]} />
            <meshStandardMaterial color="#c9b088" />
          </mesh>
          <mesh position={[0, 0.09, 0]}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshStandardMaterial color="#3f8f5a" />
          </mesh>
          <group position={[0, 0.06, 0.04]}>
            <VineStrand dir={[0.15, 1]} segments={6} phase={1} />
          </group>
          <group position={[0.04, 0.06, 0]}>
            <VineStrand dir={[1, 0.25]} segments={5} phase={0} />
          </group>
          <group position={[-0.03, 0.06, 0.03]}>
            <VineStrand dir={[-0.2, 1]} segments={4} segLen={0.07} phase={2} />
          </group>
        </group>

        {/* picture-light — the warm rake that keeps the blade's silver
            + gold fittings legible against the midnight wall (moved
            verbatim from the old common-area shelf). ONE real light,
            nested inside its own fixture group so it stays correct if the
            group's own rotation ever changes (rotation-aware — this bug
            class shipped 3x per the plan's Global Constraints). No shadow
            casting (the house's shadow-caster budget is fixed at 2, both
            music nook). */}
        <group position={[0.85, 0, 0.12]}>
          <mesh position={[0, 0.012, 0]}>
            <cylinderGeometry args={[0.045, 0.05, 0.024, 10]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.09, 6]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, 0.13, 0]}>
            <cylinderGeometry args={[0.05, 0.065, 0.09, 10, 1, true]} />
            <meshStandardMaterial color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={0.8} side={2} />
          </mesh>
          <pointLight position={[0, 0.14, 0.04]} color="#ffd9a0" intensity={1.3} distance={1.9} decay={2} />
        </group>
      </group>

      {/* ── corkboard (experience station) — north wall, x 13.1→14.7 (face
          z −6.05), per the Geometry Reference. No collider (wall decor). ── */}
      <group
        position={[13.9, 1.75, -6.05]}
        onClick={(e) => {
          e.stopPropagation();
          useThreeAm.getState().setFocus("experience");
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <mesh>
          <boxGeometry args={[1.7, 1.15, 0.05]} />
          <meshStandardMaterial map={corkTex} />
        </mesh>
        {/* 3 generic pinned items + red string connecting the pins (W9c
            polish pass — see WS_CORK_ITEMS above the component). PIN/STRING
            math is UNCHANGED by this pass: only the note mesh's own
            geometry/material swapped, from company wordmark cards to
            texture-mapped generic items sized off each one's own texture's
            aspect ratio. */}
        {WS_CORK_ITEMS.map((item, i) => {
          const tex = {
            todo: corkItemTodoTex,
            ticket: corkItemTicketTex,
            postcard: corkItemPostcardTex,
          }[item.tex];
          const w = item.h * (item.texW / item.texH);
          return (
            <group key={item.tex} position={[PINS[i].x, PINS[i].y - 0.15, 0.035]}>
              <mesh rotation={[0, 0, item.rot]}>
                <planeGeometry args={[w, item.h]} />
                <meshStandardMaterial map={tex} />
              </mesh>
              <mesh position={[0, 0.15, 0.01]}>
                <sphereGeometry args={[PIN_R, 6, 5]} />
                <meshStandardMaterial color="#b3475f" />
              </mesh>
            </group>
          );
        })}
        <mesh position={[STRING.x, STRING.y, STRING.z]} rotation={[0, 0, STRING.rot]}>
          <planeGeometry args={[STRING.len, 0.012]} />
          <meshStandardMaterial color="#c9302f" />
        </mesh>
        {/* a couple of extra empty pins for mess */}
        <mesh position={[0.65, 0.42, 0.03]}>
          <sphereGeometry args={[0.018, 6, 5]} />
          <meshStandardMaterial color="#c98a2e" />
        </mesh>

        {/* ── "high designation" documents + one personal item (W9 polish
            pass) — see the WS_CORK_CERT, WS_CORK_OFFER, and WS_CORK_PHOTO
            consts above the component for the sizing/z-tier reasoning. ── */}
        <group position={[0.63, 0.34, WS_CORK_CERT_Z]} rotation={[0, 0, 0.04]}>
          <mesh>
            <planeGeometry args={[WS_CORK_CERT_W, WS_CORK_CERT_H]} />
            <meshStandardMaterial map={corkDocCertificateTex} />
          </mesh>
        </group>
        <group position={[0.05, -0.4, WS_CORK_OFFER_Z]} rotation={[0, 0, -0.06]}>
          <mesh>
            <planeGeometry args={[WS_CORK_OFFER_W, WS_CORK_OFFER_H]} />
            <meshStandardMaterial map={corkDocOfferTex} />
          </mesh>
        </group>
        <group position={[-0.05, 0.42, WS_CORK_PHOTO_Z]} rotation={[0, 0, -0.025]}>
          <mesh>
            <planeGeometry args={[WS_CORK_PHOTO_W, WS_CORK_PHOTO_H]} />
            <meshStandardMaterial map={corkPhotoTex} />
          </mesh>
          <mesh position={[0, WS_CORK_PHOTO_H / 2 + 0.02, 0.01]}>
            <sphereGeometry args={[PIN_R, 6, 5]} />
            <meshStandardMaterial color="#57b6e8" />
          </mesh>
        </group>
      </group>

      {/* ── posters (W4 polish pass) — see the WS_POSTERS const above the
          component for the placement table. Flat planes on the north wall
          face (z=-6.05, same convention as the corkboard/katana shelf/
          neon), no collider, no light. ── */}
      {WS_POSTERS.map((p) => {
        const tex = {
          retroAd: posterRetroAdTex,
          circuit: posterCircuitTex,
          synthwave: posterSynthwaveTex,
          starChart: posterStarChartTex,
        }[p.key];
        return (
          <mesh key={p.key} position={[p.cx, WS_POSTER_CY, -6.05]} rotation={[0, 0, p.rotZ]}>
            <planeGeometry args={[WS_POSTER_W, WS_POSTER_H]} />
            <meshStandardMaterial map={tex} />
          </mesh>
        );
      })}

      {/* ── project building table v2 (projects station) — W3 polish pass
          (owner: v1 "looks weird and bad and way too simple"). Collider
          UNCHANGED — {8,-6.1,1.0,2.2} (layout.ts) — this redesign only
          adds visual mass (thicker top, a real overhang beyond the leg
          frame, a lower cross-shelf, richer clutter); nothing new sits
          outside the existing floor footprint (the drafting board/clutter
          sit ON TOP of the table at y≥0.78, which was already blocked by
          the table itself), so the collider stays honest without needing
          to move. Click-to-focus (projects station), same as v1. No new
          real light in THIS group beyond the drafting lamp below (W1) —
          the PCB's LEDs and the multimeter's screen stay emissive-only. ── */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          useThreeAm.getState().setFocus("projects");
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        {/* thick top (0.08, was 0.06), full collider width (1.0×2.2) —
            OVERHANGS the inset leg frame (0.84 wide) by 0.08m each side,
            the "sturdy bench w/ overhang" read. Top surface stays at
            y=0.78 (unchanged — the drafting board/lamp/clutter below are
            all anchored to that surface height). */}
        <mesh position={[8.5, 0.74, -5.0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.08, 2.2]} />
          <meshStandardMaterial color="#8a5a3b" />
        </mesh>
        {/* robust legs — thicker (0.09, was 0.06), inset from the top's
            edges (same x/z as v1's legs, now visibly narrower than the
            top above them) */}
        {(
          [
            [8.08, -6.02],
            [8.92, -6.02],
            [8.08, -3.98],
            [8.92, -3.98],
          ] as const
        ).map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.35, lz]} castShadow>
            <boxGeometry args={[0.09, 0.7, 0.09]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
        ))}
        {/* lower cross-shelf, spanning inside the leg frame — replaces v1's
            thin single stretcher bar */}
        <mesh position={[8.5, 0.28, -5.0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.03, 1.9]} />
          <meshStandardMaterial color="#4a3a2e" />
        </mesh>
        {/* spare storage boxes on the shelf, north end (clear of the
            drafting board's tilt above and the lamp's own base) */}
        {(
          [
            { x: 8.28, z: -5.85, w: 0.22, h: 0.18, d: 0.26, c: "#c9b088" },
            { x: 8.66, z: -5.85, w: 0.2, h: 0.15, d: 0.22, c: "#d9c49c", rotY: 0.3 },
            { x: 8.42, z: -5.55, w: 0.16, h: 0.13, d: 0.18, c: "#a06b42", rotY: -0.2 },
          ] as const
        ).map((b, i) => (
          <mesh key={i} position={[b.x, 0.295 + b.h / 2, b.z]} rotation={[0, "rotY" in b ? b.rotY : 0, 0]}>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={b.c} />
          </mesh>
        ))}

        {/* angled drafting platform, ~30° up, facing up-and-east so the
            dollhouse camera (SE of the table — see stations.ts's
            "projects" pose) reads the surface. BIGGER this pass (owner
            ask): backing 0.92×0.66 (was 0.86×0.66), face 0.84×0.60 (was
            0.78×0.58) — same anchor/rotation math as v1, only the plane
            dims grew, so the derivation below still holds unchanged. Two
            NESTED groups, not one multi-axis Euler triple (fragile to
            hand-derive/verify): the outer group yaws +π/2 about Y — its
            own local +Z axis now points world +X/east (rotY(θ) maps
            local(0,0,1) to world (sinθ,0,cosθ); θ=π/2 → (1,0,0)). The
            inner group then applies the SAME "-π/2 + tilt" X-rotation
            every flat-on-a-surface mesh in this file already uses
            (baseline -π/2 alone = lying flat, normal world +Y) — an
            X-rotation only mixes a node's LOCAL y/z axes, and this
            child's local z is already the outer group's east-pointing
            axis, so tilting past flat by TILT swings the normal from
            world +Y toward world +X: final world normal =
            (sin TILT, cos TILT, 0) ≈ (0.5, 0.87, 0) at TILT=30° — up and
            east, matching the ask. (Hand-derived; no test in this repo
            covers 3D mesh orientation — verified by eye against a
            screenshot, noted in the report.) NEW blueprint texture (v2,
            see gen-variants.mjs) is the house's own v2 floor plan —
            replaces v1's placeholder sketch. Two sticky notes ride INSIDE
            the tilt group so they inherit the exact same surface
            orientation as the board (they're tacked flush to it, not
            independently oriented) — 7-19mm proud of the board's own
            faces, well past the 6mm minimum.

            W8 un-burial fix (owner: "its being buried in the table, we
            just have to pull it out"): the anchor Y above used to be 0.78
            — the table surface height — but since BOTH plane meshes are
            centered at their own local origin (py ranges ±h/2, not 0..h),
            the group's Y is the board's face CENTER, not its low edge.
            With the X-rotation tilt above, world Y at a given py is
            anchor.y + py*cosθ (θ=-π/2+TILT=-60° at TILT=30°, cosθ=0.5) —
            so the low edge (py=-0.33) landed at 0.78 - 0.33*0.5 = 0.615,
            16.5cm UNDER the table's own top surface (invisible, hidden
            beneath the tabletop box). This is a pure rigid Y-translation
            fix (x/z untouched, so the board's already-tuned footprint
            relative to the pegboard/lego/lamp doesn't move) — anchor.y
            raised by exactly that 0.165 dip plus an 8mm clearance margin
            (0.78+0.165+0.008=0.953) so the low edge now sits 8mm PROUD of
            the surface instead of 16.5cm under it. Verified against a
            live Box3 scene-graph query (not just this hand derivation) —
            see polish-w-report.md's W8 section for the actual measured
            numbers and pegboard/lego clearance check. */}
        <group position={[8.35, 0.953, -5.0]} rotation={[0, Math.PI / 2, 0]}>
          <group rotation={[-Math.PI / 2 + Math.PI / 6, 0, 0]}>
            <mesh position={[0, 0, -0.006]}>
              <planeGeometry args={[0.92, 0.66]} />
              <meshStandardMaterial color="#4a3a2e" />
            </mesh>
            <mesh position={[0, 0, 0.006]}>
              <planeGeometry args={[0.84, 0.6]} />
              <meshStandardMaterial map={blueprintTex} />
            </mesh>
            {/* sticky notes, tacked near the board's bottom edge */}
            <mesh position={[-0.28, -0.25, 0.013]} rotation={[0, 0, 0.15]}>
              <planeGeometry args={[0.09, 0.09]} />
              <meshStandardMaterial color="#ffd9a0" />
            </mesh>
            <mesh position={[0.25, -0.24, 0.013]} rotation={[0, 0, -0.12]}>
              <planeGeometry args={[0.09, 0.09]} />
              <meshStandardMaterial color="#7cffb2" />
            </mesh>
          </group>
        </group>

        {/* half-built lego house — W3 (owner ask: "half-built lego house",
            not a random scatter). Two courses toward the back-left corner,
            still open on the front/right (unfinished), bright chunky
            studs. South end of the table, clear of the board's tilt
            footprint (board occupies z≈-5.46..-4.54) and the lamp (north
            end). */}
        {(
          [
            { x: 8.7, z: -4.62, y: 0.78, c: "#b3475f", studs: 2 as const },
            { x: 8.86, z: -4.62, y: 0.78, c: "#ffb35c", studs: 1 as const },
            { x: 8.6, z: -4.5, y: 0.78, c: "#57b6e8", studs: 1 as const, rotY: Math.PI / 2 },
            { x: 8.6, z: -4.38, y: 0.78, c: "#57b6e8", studs: 1 as const, rotY: Math.PI / 2 },
            { x: 8.92, z: -4.5, y: 0.78, c: "#3f8f5a", studs: 1 as const, rotY: Math.PI / 2 },
            { x: 8.92, z: -4.38, y: 0.78, c: "#3f8f5a", studs: 1 as const, rotY: Math.PI / 2 },
            { x: 8.7, z: -4.28, y: 0.78, c: "#5b4b8a", studs: 2 as const },
            { x: 8.7, z: -4.62, y: 0.84, c: "#ffb35c", studs: 2 as const },
            { x: 8.6, z: -4.5, y: 0.84, c: "#b3475f", studs: 1 as const, rotY: Math.PI / 2 },
            { x: 8.6, z: -4.38, y: 0.84, c: "#b3475f", studs: 1 as const, rotY: Math.PI / 2 },
          ] as const
        ).map((b, i) => (
          <LegoBrick key={i} position={[b.x, b.y, b.z]} color={b.c} studs={b.studs} rotY={"rotY" in b ? b.rotY : 0} />
        ))}
        {/* loose bricks, not yet placed */}
        <LegoBrick position={[8.94, 0.78, -4.68]} color="#c98a2e" studs={2} rotY={0.4} />
        <LegoBrick position={[8.52, 0.78, -4.2]} color="#2e6e54" studs={1} rotY={-0.5} />
        {/* roof plank, leaning against the walls — not attached yet */}
        <mesh position={[8.78, 0.865, -4.48]} rotation={[0, 0.3, 0.5]}>
          <boxGeometry args={[0.22, 0.012, 0.14]} />
          <meshStandardMaterial color="#c98a2e" />
        </mesh>

        {/* small PCB slab — green board, a few dark "chip" boxes, tiny
            emissive LEDs. Emissive ONLY — no pointLight (the drafting lamp
            below is this room's W1 budget, not this group's).

            W8 un-burial fix: this box mesh had NO y offset, so its center
            sat AT the group's y (table surface, 0.78) — half its 0.008
            thickness (4mm) was buried under the surface. The chip/LED
            children below were already correctly offset assuming the
            board's TOP face sits at y=0.004 (e.g. chips at y=0.009 with
            0.01 height rest flush on a 0.004 top), so the bug was only
            this one mesh; lifting it to y=0.004 makes its own bottom flush
            with the surface and its top match what the children already
            assume. */}
        <group position={[8.7, 0.78, -3.98]} rotation={[0, -0.3, 0]}>
          <mesh position={[0, 0.004, 0]} castShadow>
            <boxGeometry args={[0.16, 0.008, 0.11]} />
            <meshStandardMaterial color="#2e6e3e" />
          </mesh>
          {(
            [
              [-0.04, -0.02],
              [0.02, 0.01],
              [0.05, -0.025],
            ] as const
          ).map(([cx, cz], i) => (
            <mesh key={i} position={[cx, 0.009, cz]}>
              <boxGeometry args={[0.025, 0.01, 0.02]} />
              <meshStandardMaterial color="#1a1a22" />
            </mesh>
          ))}
          {(
            [
              [-0.06, 0.02],
              [0.0, -0.035],
              [0.06, 0.03],
            ] as const
          ).map(([lx, lz], i) => (
            <mesh key={i} position={[lx, 0.008, lz]}>
              <cylinderGeometry args={[0.006, 0.006, 0.006, 6]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? "#3f8f5a" : "#b3475f"}
                emissive={i % 2 === 0 ? "#3f8f5a" : "#b3475f"}
                emissiveIntensity={1.6}
              />
            </mesh>
          ))}
        </group>

        {/* coiled wire — a few stacked, shrinking torus loops lying flat
            beside the PCB. W8 un-burial fix: the stacked dy offsets
            (0/0.006/0.012) get flipped to a NEGATIVE world-y offset by
            this group's lying-flat X-rotation, so the innermost loop
            (dy=0.012) plus its own 4mm tube radius landed 13mm under the
            table surface (measured via live Box3 query: minY 0.767 vs the
            table's 0.78) — raised the group y by 0.023 so that worst loop
            clears the surface by ~6mm instead of piercing it. */}
        <group position={[8.5, 0.805, -4.42]} rotation={[Math.PI / 2, 0, 0]}>
          {[0, 0.006, 0.012].map((dy, i) => (
            <mesh key={i} position={[0, 0, dy]}>
              <torusGeometry args={[0.03 - i * 0.002, 0.004, 6, 12]} />
              <meshStandardMaterial color="#3d5a99" />
            </mesh>
          ))}
        </group>

        {/* multimeter — dark body, pale LCD (emissive-only glow), amber
            dial knob */}
        <group position={[8.9, 0.78, -4.55]} rotation={[0, 0.5, 0]}>
          <mesh position={[0, 0.012, 0]}>
            <boxGeometry args={[0.06, 0.024, 0.09]} />
            <meshStandardMaterial color="#2e2a30" />
          </mesh>
          <mesh position={[0, 0.026, -0.02]}>
            <boxGeometry args={[0.04, 0.006, 0.03]} />
            <meshStandardMaterial color="#8fae8f" emissive="#8fae8f" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, 0.026, 0.035]}>
            <cylinderGeometry args={[0.014, 0.014, 0.006, 10]} />
            <meshStandardMaterial color="#c98a2e" />
          </mesh>
        </group>

        {/* pencil, tossed beside the board. W8 un-burial fix: its tumbled
            rotation dipped the cylinder body's low point to y=0.774
            (measured), 6mm under the table's 0.78 surface — raised the
            group y by 0.016 to clear it. */}
        <group position={[8.35, 0.799, -3.95]} rotation={[0, 1.1, 1.5]}>
          <mesh>
            <cylinderGeometry args={[0.006, 0.006, 0.11, 6]} />
            <meshStandardMaterial color="#ffb35c" />
          </mesh>
          <mesh position={[0, 0.062, 0]}>
            <coneGeometry args={[0.006, 0.014, 6]} />
            <meshStandardMaterial color="#c9b088" />
          </mesh>
        </group>

        {/* mug — south corner */}
        <group position={[8.88, 0.78, -4.1]}>
          <mesh position={[0, 0.026, 0]}>
            <cylinderGeometry args={[0.026, 0.024, 0.052, 8]} />
            <meshStandardMaterial color="#57b6e8" />
          </mesh>
          <mesh position={[0.03, 0.028, 0]}>
            <boxGeometry args={[0.012, 0.028, 0.01]} />
            <meshStandardMaterial color="#57b6e8" />
          </mesh>
        </group>

        {/* screwdriver, tossed at an angle beside the board. W8 un-burial
            fix: its tumbled rotation dipped the handle cylinder's low
            point to y=0.767 (measured), 13mm under the table's 0.78
            surface — raised the group y by 0.023 to clear it. */}
        <group position={[8.6, 0.813, -4.85]} rotation={[0, 0.9, 1.4]}>
          <mesh>
            <cylinderGeometry args={[0.014, 0.016, 0.09, 8]} />
            <meshStandardMaterial color="#b3475f" />
          </mesh>
          <mesh position={[0, 0.065, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.05, 6]} />
            <meshStandardMaterial color="#b8b8c0" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>

        {/* ── drafting lamp — W1 lighting pass. Small clamp lamp on the
            table's own bare north end, arm reaching south over the
            drafting board. Real light nested inside the shade
            (rotation-aware — the whole fixture is one group, so
            re-angling the arm can never strand the light). No shadow
            casting (budget fixed at 2, both music nook). Bumped
            (coordinator re-walk F3: "the maker corner clutter is dim
            too") — bulb emissive 1.2→1.6, light intensity 1.1→1.8,
            distance 1.8→2.4, so the lego house/PCB/board actually read
            instead of just the bulb itself glowing. ── */}
        <group position={[8.75, 0.78, -5.85]} rotation={[0, 0.5, 0]}>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.05, 0.04, 0.07]} />
            <meshStandardMaterial color="#20202a" />
          </mesh>
          <mesh position={[0.01, 0.12, 0.02]} rotation={[0.3, 0, -0.15]}>
            <cylinderGeometry args={[0.008, 0.008, 0.2, 6]} />
            <meshStandardMaterial color="#3a3a46" />
          </mesh>
          <mesh position={[0.06, 0.24, 0.12]} rotation={[1.0, 0, -0.1]}>
            <cylinderGeometry args={[0.007, 0.007, 0.18, 6]} />
            <meshStandardMaterial color="#3a3a46" />
          </mesh>
          <group position={[0.09, 0.32, 0.2]} rotation={[0.9, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.02, 0.045, 0.06, 10, 1, true]} />
              <meshStandardMaterial color="#3a3a46" side={2} />
            </mesh>
            <mesh position={[0, -0.02, 0]}>
              <sphereGeometry args={[0.018, 8, 6]} />
              <meshStandardMaterial color="#ffe3b8" emissive="#ffe3b8" emissiveIntensity={1.6} />
            </mesh>
            <pointLight position={[0, -0.03, 0]} color="#ffe3b8" intensity={1.8} distance={2.4} decay={2} />
          </group>
        </group>
      </group>

      {/* ── pegboard — W3 polish pass (owner ask: pegboard panel on the
          west wall behind/above the table). Mounted flush-proud on the
          west wall's interior face (x=8.03, ~20mm proud of the wall
          texture at x=8.01), above the table's own north-end bare zone
          (y1.0-2.15, above the drafting lamp's reach), z centered over the
          table (z-5.0, span -5.9..-4.1, roughly matching the table's own
          run). Rotated the SAME π/2 about Y as the west wall itself so its
          face normal points +X/east into the room (verified: this is the
          same rotation the room's own west-wall texture plane and the
          coffee counter both use — local +X maps to world -Z, i.e. a
          viewer facing the wall from inside the room reads left-to-right
          correctly, no mirroring). Generated perforated-hardboard texture
          (scripts/pixelart/gen-variants.mjs); four hand-built tool
          silhouettes (hammer, wrench, wire coil, clamp) hang in front of
          it on small peg dots. No collider (wall decor, same convention
          as every other wall-mounted piece); no light. ── */}
      <group position={[8.03, 1.575, -5.0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <planeGeometry args={[1.8, 1.1]} />
          <meshStandardMaterial map={pegboardTex} />
        </mesh>
        {/* hammer — dark head, wood handle */}
        <group position={[-0.62, 0.28, 0.02]} rotation={[0, 0, 0.15]}>
          <mesh>
            <cylinderGeometry args={[0.01, 0.012, 0.22, 6]} />
            <meshStandardMaterial color="#8a5a3b" />
          </mesh>
          <mesh position={[0, 0.115, 0]}>
            <boxGeometry args={[0.09, 0.03, 0.03]} />
            <meshStandardMaterial color="#20202a" />
          </mesh>
        </group>
        {/* wrench — flat body, rounded jaw ends */}
        <group position={[-0.2, 0.3, 0.02]} rotation={[0, 0, -0.1]}>
          <mesh>
            <boxGeometry args={[0.03, 0.2, 0.006]} />
            <meshStandardMaterial color="#b8b8c0" metalness={0.6} roughness={0.35} />
          </mesh>
          {[-0.1, 0.1].map((jy) => (
            <mesh key={jy} position={[0, jy, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.024, 0.024, 0.008, 10]} />
              <meshStandardMaterial color="#b8b8c0" metalness={0.6} roughness={0.35} />
            </mesh>
          ))}
        </group>
        {/* wire coil — hung on a single peg */}
        <mesh position={[0.2, 0.3, 0.02]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.09, 0.012, 8, 16]} />
          <meshStandardMaterial color="#c98a2e" />
        </mesh>
        {/* clamp — C-shape from two short arms + a screw bar */}
        <group position={[0.58, 0.26, 0.02]}>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.02, 0.02, 0.14]} />
            <meshStandardMaterial color="#3a3a46" />
          </mesh>
          <mesh position={[0, -0.08, 0]}>
            <boxGeometry args={[0.02, 0.02, 0.14]} />
            <meshStandardMaterial color="#3a3a46" />
          </mesh>
          <mesh position={[0, 0, -0.06]}>
            <boxGeometry args={[0.02, 0.16, 0.02]} />
            <meshStandardMaterial color="#3a3a46" />
          </mesh>
          <mesh position={[0, 0.02, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.007, 0.007, 0.1, 8]} />
            <meshStandardMaterial color="#c9b088" />
          </mesh>
        </group>
        {/* peg dots, one under each tool */}
        {[-0.62, -0.2, 0.2, 0.58].map((px) => (
          <mesh key={px} position={[px, 0.44, 0.015]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.03, 6]} />
            <meshStandardMaterial color="#12121a" />
          </mesh>
        ))}
      </group>

      {/* ── full-wall bookshelf — collider {15.46,-1.8,0.44,1.3} (layout.ts).
          T8 finale item 13 (owner feedback wave, 2nd move — item 10's west
          wall didn't stick): SE corner, EAST wall, z-1.8..-0.5, facing
          WEST into the room — the owner's exact numbers.

          Cut verbatim from CommonArea.tsx (Spine/FlatBook/TinyPlant/
          Figurine/Hourglass/VineStrand exported from there so this copy
          stays byte-identical in content). Orientation: this east wall
          (x15.9-16.1 solid, same wall the coffee bar and old common-area
          mount both used) is the SAME wall the shelf was ORIGINALLY built
          against in CommonArea.tsx — position [15.89,0,z], NO rotation,
          opening already faces -x/WEST by construction (every local
          x-offset inside is negative). No 180°-flip wrapper needed this
          time (that was only for item 10's west-wall mount); reused as-is
          except position and one new wrapper below.

          DEPTH FIT: the shelf's own footprint is ~2.06m deep (carcass
          panels at local z ±1.03); the owner's band is only 1.3m
          (z-1.8..-0.5) — rather than hand-editing ~40 individual z props,
          the whole assembly is wrapped in a z-only scale group
          (1.3/2.06 = 0.6311), compressing depth while leaving x
          (thickness/proud-ness) and y (height) untouched. group.z=-1.15
          is the band's own center; the scaled ±1.03·0.6311=±0.65 local
          span lands at world z=-1.8..-0.5 exactly. group.x=8.04→15.89:
          the carcass back panel (local x=-0.02, unscaled) lands at world
          x=15.87, ~3cm proud of the wall's 15.9 face — flush/proud, same
          convention as every other wall-mounted piece in this house. No
          light in this group (bookshelf never had one; this room is
          already at its own 5-light cap). ── */}
      <group position={[15.89, 0, -1.15]}>
        <group scale={[1, 1, 0.6311]}>
        {/* carcass */}
        <mesh position={[-0.02, 1.3, 0]}>
          <boxGeometry args={[0.04, 2.6, 2.1]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        <mesh position={[-0.2, 1.3, -1.03]}>
          <boxGeometry args={[0.4, 2.6, 0.04]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        <mesh position={[-0.2, 1.3, 1.03]}>
          <boxGeometry args={[0.4, 2.6, 0.04]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {[0.03, 0.68, 1.33, 1.98, 2.57].map((sy) => (
          <mesh key={sy} position={[-0.2, sy, 0]}>
            <boxGeometry args={[0.4, 0.04, 2.1]} />
            <meshStandardMaterial color="#6b4128" />
          </mesh>
        ))}

        {/* row 0 (floor 0.03–0.68): dense cluster north, gap, flat pile +
            upright cluster south */}
        <Spine y0={0.03} z={-0.95} w={0.05} h={0.42} d={0.16} color="#5b4b8a" />
        <Spine y0={0.03} z={-0.885} w={0.05} h={0.5} d={0.16} color="#c98a2e" tilt={0.12} />
        <Spine y0={0.03} z={-0.815} w={0.05} h={0.36} d={0.16} color="#2e6e54" />
        <Spine y0={0.03} z={-0.75} w={0.06} h={0.46} d={0.17} color="#b3475f" tilt={-0.1} />
        <Spine y0={0.03} z={-0.66} w={0.045} h={0.3} d={0.15} color="#8a5a3d" />
        <TinyPlant y0={0.03} z={-0.35} />
        <FlatBook y0={0.03} z={0.35} w={0.22} d={0.18} color="#5b4b8a" />
        <FlatBook y0={0.068} z={0.35} w={0.19} d={0.155} color="#b3475f" />
        <FlatBook y0={0.103} z={0.35} w={0.17} d={0.14} color="#c98a2e" rotY={0.2} />
        <Spine y0={0.03} z={0.65} w={0.05} h={0.4} d={0.16} color="#2e6e54" />
        <Spine y0={0.03} z={0.72} w={0.045} h={0.48} d={0.16} color="#5b4b8a" tilt={0.08} />
        <Spine y0={0.03} z={0.9} w={0.06} h={0.34} d={0.17} color="#c98a2e" />

        {/* row 1 (0.68–1.33): mostly empty north (lone figurine), dense south */}
        <Figurine y0={0.68} z={-0.85} />
        <Spine y0={0.68} z={0.1} w={0.05} h={0.44} d={0.16} color="#b3475f" />
        <Spine y0={0.68} z={0.18} w={0.045} h={0.5} d={0.16} color="#2e6e54" tilt={-0.1} />
        <Spine y0={0.68} z={0.25} w={0.05} h={0.38} d={0.16} color="#8a5a3d" />
        <Spine y0={0.68} z={0.34} w={0.06} h={0.46} d={0.17} color="#5b4b8a" tilt={0.1} />
        <Spine y0={0.68} z={0.62} w={0.05} h={0.4} d={0.16} color="#c98a2e" />
        <Spine y0={0.68} z={0.7} w={0.045} h={0.3} d={0.15} color="#b3475f" />
        <FlatBook y0={0.68} z={0.88} w={0.18} d={0.15} color="#2e6e54" />

        {/* row 2 (1.33–1.98): dense north w/ hourglass, sparse middle+south */}
        <Spine y0={1.33} z={-1.0} w={0.05} h={0.42} d={0.16} color="#5b4b8a" />
        <Spine y0={1.33} z={-0.93} w={0.045} h={0.5} d={0.16} color="#b3475f" tilt={0.1} />
        <Spine y0={1.33} z={-0.86} w={0.05} h={0.36} d={0.16} color="#c98a2e" />
        <Spine y0={1.33} z={-0.78} w={0.06} h={0.46} d={0.17} color="#2e6e54" tilt={-0.08} />
        <Hourglass y0={1.33} z={-0.55} />
        <Spine y0={1.33} z={0.35} w={0.05} h={0.4} d={0.16} color="#8a5a3d" tilt={0.15} />
        <Spine y0={1.33} z={0.43} w={0.045} h={0.3} d={0.15} color="#5b4b8a" />
        <Spine y0={1.33} z={0.75} w={0.05} h={0.44} d={0.16} color="#b3475f" />
        <Spine y0={1.33} z={0.83} w={0.06} h={0.5} d={0.17} color="#c98a2e" tilt={-0.12} />
        <Spine y0={1.33} z={0.95} w={0.045} h={0.34} d={0.15} color="#2e6e54" />

        {/* row 3 (1.98–2.57, top compartment): sparse leaning cluster, lone
            figurine, small upright cluster */}
        <Spine y0={1.98} z={-0.9} w={0.05} h={0.4} d={0.16} color="#c98a2e" tilt={0.18} />
        <Spine y0={1.98} z={-0.82} w={0.045} h={0.34} d={0.15} color="#5b4b8a" tilt={0.1} />
        <Spine y0={1.98} z={-0.7} w={0.05} h={0.44} d={0.16} color="#2e6e54" tilt={-0.06} />
        <Figurine y0={1.98} z={0.05} />
        <Spine y0={1.98} z={0.5} w={0.06} h={0.5} d={0.17} color="#b3475f" />
        <Spine y0={1.98} z={0.58} w={0.045} h={0.36} d={0.15} color="#8a5a3d" tilt={0.08} />
        <Spine y0={1.98} z={0.9} w={0.05} h={0.42} d={0.16} color="#5b4b8a" tilt={-0.1} />

        {/* small brass picture-light under the top shelf — coordinator
            re-walk F3: the SE corner was still "pitch black" (the room's
            other lights all cluster north/center; this fixture was
            emissive-only, a leftover from CommonArea's original ≤5-light
            cap). That cap is gone (discrete-room rendering, "whatever
            holds 60fps") — this fixture already sits right where the
            corner needs warmth, so it just gets a real nested pointLight
            instead of a whole new fixture. Rotation-aware (nested inside
            the same 0.4-rad-tilted group as the bulb mesh). No shadow
            casting. Room's 8th real light. */}
        <group position={[-0.32, 2.52, -0.2]} rotation={[0.4, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.05, 0.05, 0.16]} />
            <meshStandardMaterial color="#8a7a4a" />
          </mesh>
          <mesh position={[0, -0.03, 0.07]}>
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshStandardMaterial color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={2} />
          </mesh>
          <pointLight position={[0, -0.03, 0.07]} color="#ffd9a0" intensity={2.4} distance={2.6} decay={2} />
        </group>

        {/* vine plant on top — organic strands (wave E rework) of varied
            length, draping over the front edge and the south side */}
        <group position={[-0.28, 2.6, 0.75]}>
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.07, 0.055, 0.09, 10]} />
            <meshStandardMaterial color="#c9b088" />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.06, 8, 6]} />
            <meshStandardMaterial color="#3f8f5a" />
          </mesh>
          {/* front spill — the long strands over the shelf face */}
          <group position={[-0.04, 0.07, 0]}>
            <VineStrand dir={[-1, 0]} segments={10} phase={0} />
          </group>
          <group position={[-0.02, 0.07, -0.14]}>
            <VineStrand dir={[-1, -0.25]} segments={7} segLen={0.08} phase={1} />
          </group>
          <group position={[-0.03, 0.07, 0.12]}>
            <VineStrand dir={[-0.9, 0.3]} segments={8} phase={2} />
          </group>
          {/* south-side spill — over the shelf's end panel */}
          <group position={[0.02, 0.07, 0.05]}>
            <VineStrand dir={[0.1, 1]} segments={7} phase={1} />
          </group>
          <group position={[0.09, 0.07, 0.02]}>
            <VineStrand dir={[0.4, 1]} segments={5} segLen={0.075} phase={0} />
          </group>
        </group>
        </group>
      </group>

      {/* ── gaming chair — collider {11.0,-5.0,0.8,0.8}, center (11.4,-4.6)
          per layout.ts's own comment. Real Sketchfab GLB (see
          GamingChairModel's attribution). Centered on the collider; own
          Suspense so the fetch never blocks the room's first paint. ── */}
      <group position={[11.4, 0, -4.6]}>
        <Suspense fallback={null}>
          <GamingChairModel />
        </Suspense>
      </group>

      {/* ── EVA-01 shrine — collider {8.3,-1.7,1.5,1.2} (SW corner), group
          centered on the collider (9.05,-1.1). Rotation unchanged (−0.35,
          a stylistic angle for the plinth, not wall-derived). Unit-01
          stands on a tall dark plinth, showcased by a sunset wash: a small
          can on the plinth corner aimed up at the figure (visible fixture,
          spotlight attached, NO shadow casting — same family as the
          nook's sunset lamp).
          Wave F round 2: figure bumped 1.4m → 1.8m (owner wanted it
          much bigger). The spotlight's aim was raised (1.7 → 2.0) and its
          cone widened (0.65 → 0.75 rad) so the taller head still sits
          inside the beam; intensity was cut 22 → 5 — at the old value the
          torso (now much closer to the fixed low fixture) blew out to
          flat white/yellow under Bloom, which is what actually read as
          "distorted" up close (confirmed by toggling the light off: the
          purple/green/orange material colors underneath were fine all
          along). Plinth height (0.4) is unchanged; the new collider is
          considerably bigger than the old one (1.5×1.2 vs 0.65×0.7) —
          plenty of clearance around the plinth in its new SW corner.
          Round 2b: a second matching can on the plinth's front-LEFT
          corner — museum crossfire: each lamp aims across at the
          figure's opposite flank, beams intersecting on the EVA. Both
          spotlights (and their aim targets) are nested inside this
          rotated group in local space, replacing the old hand-computed
          world-space placement. Both cans sit on the plinth top, so no
          new collider. Per-lamp intensity halved 5 → 2.5 so the summed
          crossfire matches the single lamp's exposure (the emissive
          clamp + Bloom blowout fix above still holds). ── */}
      <group position={[9.05, 0, -1.1]} rotation={[0, -0.35, 0]}>
        {/* tall museum plinth — lifts the figure above the dollhouse
            south-stub cutoff (the camera can't see below y≈1.0 this deep
            into the room, so a floor-standing figure would read half-height) */}
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.52, 0.4, 0.52]} />
          <meshStandardMaterial color="#15151b" />
        </mesh>
        <mesh position={[0, 0.41, 0]}>
          <boxGeometry args={[0.46, 0.02, 0.46]} />
          <meshStandardMaterial color="#22222c" />
        </mesh>

        {/* real EVA-01 model (see EvaModel's attribution comment) —
            standing on the plinth top, facing into the room. Own Suspense:
            the GLB streams in without holding up the room. */}
        <group position={[0, 0.42, 0]}>
          <Suspense fallback={null}>
            <EvaModel />
          </Suspense>
        </group>

        {/* sunset cans — two small uplights on the plinth top's front
            corners (visible fixtures; the real spotlight is nested INSIDE
            its fixture group so it inherits the shrine rotation).
            Perf pass (ws-center 3-room overlap, 2026-07): dropped the LEFT
            can's spotLight — a single crossfire beam from the right can
            still washes the figure (it's aimed across at the left flank,
            covering most of the visible torso from the walking camera's
            usual approach), and the left can's own bulb stays emissive so
            the fixture itself still visibly glows. Kept the right can's
            beam rather than either arbitrarily: it's the one that reads in
            the room's default approach angle. */}
        <group position={[0.18, 0.42, 0.18]}>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.06, 8]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, 0.065, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.012, 8]} />
            <meshStandardMaterial color="#ff7a5c" emissive="#ff6a45" emissiveIntensity={3} />
          </mesh>
          <spotLight
            position={[0, 0.07, 0]}
            target={evaTargetAcrossL}
            angle={0.75}
            penumbra={0.55}
            intensity={2.5}
            distance={4}
            decay={1.4}
            color="#ff7a5c"
          />
        </group>
        <group position={[-0.18, 0.42, 0.18]}>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.06, 8]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, 0.065, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.012, 8]} />
            <meshStandardMaterial color="#ff7a5c" emissive="#ff6a45" emissiveIntensity={3} />
          </mesh>
        </group>
        {/* crossfire aim points — shrine-local (rotation-safe), upper
            torso height so both beams cover chest→head of the 1.8m figure */}
        <primitive object={evaTargetAcrossL} position={[-0.16, 1.85, -0.02]} />
        <primitive object={evaTargetAcrossR} position={[0.16, 1.85, -0.02]} />
      </group>

      {/* ── coffee counter — collider merges the counter + machine + paper
          lantern: {15.1,-6.15,0.85,1.8}, EAST wall. The counter's own
          internal layout is UNCHANGED from the old workspace (this whole
          group is a rigid cut-and-paste); only the group's position and a
          new +90° Y rotation move it from the old south wall to this room's
          east wall — the group's local −Z (the cabinet's door/knob face,
          i.e. its FRONT) now points to world −X (into the room, since the
          wall is at the room's high-x edge), and local +Z (its BACK) points
          to world +X (against the wall). Group position (15.65,0,-5.25) is
          chosen so the rotated footprint (width axis now along world Z,
          depth axis now along world X) clears the north wall (z≥−6.2) and
          the east wall (x≤16) with margin — see the report for the full
          arithmetic. Wave G overhaul (owner: the old hand-built counter
          "looks really weird and plain"): a real sideboard read — recessed
          drawer + door fronts with knobs on a dark plinth, a contrasting
          overhung top slab. Wave G round 2: the big Canarian-cafe machine
          v3 claims the counter's RIGHT half (owner ask; depth-limited to
          36% of the slab width — see CoffeeMachineModel's sizing note),
          machine x∈[0.162,0.700] counter-local, feet flush on the slab,
          facing north (yaw π, relative to the counter's own local frame —
          unaffected by the group's own rotation). The dome lamp STAYS on
          the left end; the dressing redistributed into the remaining
          left/center: mug rack, one loose cup on a saucer, bean jar, one
          plushie. Every stacked front layer (body → recessed reveal →
          panel face → knob) steps by ≥6mm, the dpr-1 z-fighting minimum.
          Dome lamp is the only light here (fixture-attached, NO shadow
          casting); no new lights added. ── */}
      <group position={[15.65, 0, -5.25]} rotation={[0, Math.PI / 2, 0]}>
        {/* plinth — recessed dark base (kickboard), inset from the body so
            the cabinet reads as standing on a base rather than a slab */}
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[1.3, 0.08, 0.3]} />
          <meshStandardMaterial color="#1a1a22" />
        </mesh>

        {/* body — full collider width, set back from the slab's overhang */}
        <mesh position={[0, 0.465, 0]}>
          <boxGeometry args={[1.4, 0.77, 0.36]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>

        {/* drawer band — one wide recessed panel across the top of the
            body (implies two drawers), two round knobs. Reveal (dark,
            6mm recessed from the body's front face at z −0.18) → panel
            face (8mm further back) → knobs (proud of the panel, flush
            with the body front). */}
        <mesh position={[0, 0.76, -0.174]}>
          <boxGeometry args={[1.24, 0.17, 0.02]} />
          <meshStandardMaterial color="#3a2418" />
        </mesh>
        <mesh position={[0, 0.76, -0.166]}>
          <boxGeometry args={[1.16, 0.11, 0.02]} />
          <meshStandardMaterial color="#7d4e30" />
        </mesh>
        {[-0.28, 0.28].map((kx) => (
          <mesh key={kx} position={[kx, 0.76, -0.178]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.018, 8]} />
            <meshStandardMaterial color="#c9b088" />
          </mesh>
        ))}

        {/* door panels — same reveal → face → knob stack as the drawer
            band, below it */}
        {[-0.32, 0.32].map((dx) => (
          <group key={dx}>
            <mesh position={[dx, 0.38, -0.174]}>
              <boxGeometry args={[0.64, 0.62, 0.02]} />
              <meshStandardMaterial color="#3a2418" />
            </mesh>
            <mesh position={[dx, 0.38, -0.166]}>
              <boxGeometry args={[0.58, 0.56, 0.02]} />
              <meshStandardMaterial color="#7d4e30" />
            </mesh>
            <mesh
              position={[dx + (dx < 0 ? 0.24 : -0.24), 0.38, -0.178]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.012, 0.012, 0.018, 8]} />
              <meshStandardMaterial color="#c9b088" />
            </mesh>
          </group>
        ))}

        {/* counter top slab — contrasting warm wood, overhangs the body
            (1.5 vs 1.4 wide, 0.42 vs 0.36 deep) */}
        <mesh position={[0, 0.875, 0]}>
          <boxGeometry args={[1.5, 0.05, 0.42]} />
          <meshStandardMaterial color="#a87b4f" />
        </mesh>

        {/* coffee machine v3 (see CoffeeMachineModel's attribution) —
            the big cafe machine, right-aligned on the counter (right
            edge flush with the cabinet body edge at x 0.70), facing
            north. Own Suspense; position/rotation/scale live on the
            component itself (COFFEE_POS/COFFEE_YAW/COFFEE_SCALE). */}
        <Suspense fallback={null}>
          <CoffeeMachineModel />
        </Suspense>

        {/* mug rack — kept, now center-left between the dome lamp and
            the machine (wave G round 2: the machine took the right
            half) */}
        <group position={[-0.33, 0.9, -0.06]}>
          <mesh position={[0, 0.006, 0]}>
            <boxGeometry args={[0.2, 0.012, 0.14]} />
            <meshStandardMaterial color="#8b5e3c" />
          </mesh>
          {[-0.085, 0.085].map((px) => (
            <mesh key={px} position={[px, 0.06, -0.05]}>
              <boxGeometry args={[0.016, 0.11, 0.016]} />
              <meshStandardMaterial color="#8b5e3c" />
            </mesh>
          ))}
          <mesh position={[0, 0.115, -0.05]}>
            <boxGeometry args={[0.2, 0.012, 0.09]} />
            <meshStandardMaterial color="#8b5e3c" />
          </mesh>
          {/* mugs: two on the base, one on the upper tier */}
          {[
            { x: -0.05, y: 0.012, z: 0.025, c: "#b3475f" },
            { x: 0.055, y: 0.012, z: 0.02, c: "#2e6e54" },
            { x: 0, y: 0.121, z: -0.05, c: "#c98a2e" },
          ].map((m) => (
            <group key={m.c} position={[m.x, m.y, m.z]}>
              <mesh position={[0, 0.026, 0]}>
                <cylinderGeometry args={[0.026, 0.024, 0.052, 8]} />
                <meshStandardMaterial color={m.c} />
              </mesh>
              <mesh position={[0.03, 0.028, 0]}>
                <boxGeometry args={[0.012, 0.028, 0.01]} />
                <meshStandardMaterial color={m.c} />
              </mesh>
            </group>
          ))}
        </group>

        {/* bean jar — tucked back-center, against the machine's left
            shoulder */}
        <BeanJar position={[-0.08, 0.9, -0.13]} />

        {/* one loose cup on its saucer at the machine's front-left
            corner — lived-in: fresh pour, not yet carried off. */}
        <LooseCup position={[0.04, 0.9, 0.14]} color={ACCENTS[3]} rotY={0.4} />

        {/* desk-mascot plushie — front-center, watching the room. */}
        <CoffeePlushie position={[-0.15, 0.9, 0.13]} color="#c98a2e" rotY={0.4} />

        {/* small dome lamp — the machine's LEFT (the paper-lantern floor
            lamp beside the counter already covers the right flank).
            Fixture geometry + its nested light are unchanged. */}
        <group position={[-0.56, 0.9, 0.02]}>
          <mesh position={[0, 0.014, 0]}>
            <cylinderGeometry args={[0.04, 0.048, 0.028, 10]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.09, 6]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          {/* perf pass (ws-center 3-room overlap, 2026-07): dropped this
              fixture's pointLight — the paper-lantern floor lamp a couple
              meters away already washes this end of the counter, so this
              dome's real illumination was mostly redundant. Emissive-only
              now; the old 0.55 clamp existed to stay under Bloom threshold
              alongside the point light's direct hit — with that hit gone
              there's headroom to push the glow up so the bulb still reads
              as "on" from across the room. */}
          <mesh position={[0, 0.125, 0]} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[0.055, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={0.95} side={2} />
          </mesh>
        </group>
      </group>

      {/* ── paper lantern — W2 polish pass (owner: the old floor-lamp
          placement read "awkwardly placed" — rehang it believably). Now a
          true ceiling pendant, centered directly over the coffee counter
          (collider {15.1,-6.15,0.85,1.8}, center x15.525/z-5.25) instead of
          standing on the floor beside it. Cord runs from the ceiling
          (WALL_H=2.8) down to the lantern's own cap (y≈2.255) — a sane
          ~0.52m drop that still clears the coffee machine's tallest point
          (~1.26m, CoffeeMachineModel's own sizing note) by well over half
          a meter. Lantern geometry (sphere + wooden ribs + cap) is
          UNCHANGED from the old floor-lamp version, just re-hung — no
          separate collider (never had one, merged into the coffee-bar
          rect). Keeps the same light budget/role as before: main
          east-side source, fixture-attached point light, NO shadow
          casting. ── */}
      <group position={[15.525, 0, -5.25]}>
        {/* ceiling mount plate + cord */}
        <mesh position={[0, WALL_H - 0.02, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 10]} />
          <meshStandardMaterial color="#1a1a22" />
        </mesh>
        <mesh position={[0, (WALL_H - 0.02 + 2.255) / 2, 0]}>
          <cylinderGeometry args={[0.012, 0.012, WALL_H - 0.02 - 2.255, 8]} />
          <meshStandardMaterial color="#1a1a22" />
        </mesh>
        {/* lantern — warm glowing paper sphere */}
        <group position={[0, 2.0, 0]}>
          <mesh>
            <sphereGeometry args={[0.23, 12, 10]} />
            <meshStandardMaterial color="#ffe8c4" emissive="#ffd9a0" emissiveIntensity={0.85} />
          </mesh>
          {/* wooden ribs */}
          {[-0.08, 0, 0.08].map((ry) => (
            <mesh key={ry} position={[0, ry, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[Math.sqrt(0.23 * 0.23 - ry * ry) + 0.004, 0.006, 6, 20]} />
              <meshStandardMaterial color="#8a5a3b" />
            </mesh>
          ))}
          {/* top cap — where the cord meets the lantern */}
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.03, 0.05, 0.03, 8]} />
            <meshStandardMaterial color="#1a1a22" />
          </mesh>
        </group>
        <pointLight position={[0, 2.0, 0]} color="#ffd9a0" intensity={10} distance={7} decay={1.8} />
      </group>

      {/* ── AKIRA poster — W6 polish pass (owner ask: one BIG theatrical
          one-sheet on the west wall, beside the EVA shrine). The actual
          1988 one-sheet, owner-supplied and owner-directed (raw at
          design/akira-raw/, pixelated deterministically by
          scripts/pixelart/gen-akira.mjs — NOT a gen-variants JOB, so a
          gen-variants run can't overwrite it; the "-film" filename keeps
          it distinct from the retired homage's cached URL). Mounted the
          SAME way as
          the pegboard/neon plate above (x=8.03, 20mm proud of the wall's
          interior face at x=8.01; rotation [0,Math.PI/2,0], the same
          π/2-about-Y the west wall itself uses, verified there to read
          left-to-right correctly with no mirroring). Placed in the open
          run of wall between the desk table/pegboard/neon cluster
          (z -6.1..-3.9) and the EVA shrine's own collider (z -1.7..-0.5)
          — centered z-2.65, half-width 0.6 leaves ~0.65m clear of the
          table's south edge and ~0.35m clear of the EVA collider's north
          edge. Native 2:3 texture ratio (1.2×1.8, no stretch) — bottom
          edge y0.4. No collider (flat wall dressing, same convention as
          every poster elsewhere); no light (painted art). */}
      <mesh position={[8.03, 1.3, -2.65]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.2, 1.8]} />
        <meshStandardMaterial map={posterAkiraTex} />
      </mesh>

      {/* ── sunset floor lamp below the akira poster — owner iteration on
          the "light the SW corner" ask: first cut was a wall picture-light
          above the poster; owner replaced it with "a huge sunset lamp at
          the floor which lights up the akira poster". Squat dark base +
          big glowing sunset-orange dome, sitting on the floor at the
          poster's base, washing warm orange UP the poster face (very
          neo-tokyo). Collider {8.12,-2.88,0.46,0.46} in layout.ts (real
          floor furniture, genkan precedent). Nested-light discipline: the
          pointLight lives in the SAME group as the dome meshes. Slightly
          raised light origin (y0.34, just above the dome's equator) so
          the wash climbs the poster instead of pooling only at its feet.
          No shadow casting. Still the room's 9th real light (replaced the
          picture-light 1:1) — fps re-verified 60. ── */}
      <group position={[8.35, 0, -2.65]}>
        {/* squat base */}
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.17, 0.19, 0.08, 12]} />
          <meshStandardMaterial color="#2a2a34" />
        </mesh>
        {/* big sunset dome — deeper orange at the rim via a second shell */}
        <mesh position={[0, 0.26, 0]}>
          <sphereGeometry args={[0.21, 14, 10]} />
          <meshStandardMaterial color="#ff8a50" emissive="#ff7a3c" emissiveIntensity={1.5} />
        </mesh>
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.145, 0.165, 0.1, 12]} />
          <meshStandardMaterial color="#c9502e" emissive="#c9502e" emissiveIntensity={0.7} />
        </mesh>
        <pointLight position={[0, 0.34, 0]} color="#ff8a50" intensity={3.4} distance={3.6} decay={2} />
      </group>

      {/* ── neon "shipped" — W5 polish pass, REDESIGNED (coordinator
          re-walk F2: mounted flush and parallel to the west wall, the sign
          read as a red smear at the room's raking default-camera angle —
          a plane facing due +X is nearly edge-on from a camera looking in
          from the south-east, so the lettering never resolved). Fix:
          hung off a real bracket arm that carries it OFF the wall face,
          then the sign itself is yawed 30° off the wall-flush angle
          (Math.PI/3 instead of Math.PI/2) so its face turns toward the
          south-east — like a real angled shop sign. Still positioned
          above the pegboard.

          Geometry check (so the swept panel can't clip through the solid
          wall): at yaw θ=60° the panel's local ±X (half-width 0.805, the
          1.4x-scaled 1.61m sign) maps to world offset
          ±0.805·(cosθ,0,-sinθ) = ±(0.4025,0,-0.697). Mount point x=8.5
          (0.47m off the wall, carried by the arm below) puts the
          wall-side corner at x=8.5-0.4025=8.0975 — 8.75cm clear of the
          wall's interior face (x8.01). The same offset spreads the sign's
          z-span to -5.697..-4.303, still inside the pegboard's own
          -5.9..-4.1 run. Height (y) is untouched by a Y-axis rotation:
          center y2.45 still spans 2.166-2.734, clear of both the
          pegboard's top (2.125) and the ceiling (WALL_H 2.8).

          Nested pointLight rides inside the SAME rotated sign group
          (rotation-aware — this exact bug class has shipped 3x per the
          plan's Global Constraints) at the same 0.255m proud-of-the-sign
          local-z delta as before. No shadow casting. ── */}
      <group>
        {/* wall mount plate */}
        <mesh position={[8.03, 2.45, -5.0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.05, 0.12, 0.02]} />
          <meshStandardMaterial color="#20202a" />
        </mesh>
        {/* arm, straight out from the wall to the sign's swivel mount */}
        <mesh position={[8.265, 2.45, -5.0]}>
          <boxGeometry args={[0.47, 0.03, 0.03]} />
          <meshStandardMaterial color="#20202a" />
        </mesh>
        {/* sign, angled 30° toward the camera on the arm's end */}
        <group position={[8.5, 2.45, -5.0]} rotation={[0, Math.PI / 3, 0]}>
          <mesh>
            <planeGeometry args={[1.15 * 1.4, 0.406 * 1.4]} />
            <meshBasicMaterial map={neonShippedTex} transparent side={2} />
          </mesh>
          <pointLight position={[0, 0, 0.255]} color="#ff5040" intensity={2.5} distance={2.8} decay={2} />
        </group>
      </group>

      {/* ── mushroom rug — W7 FIX ROUND (owner: the old arcade-confetti rug
          "reads cheap"; wants the classic pixel SUPER MUSHROOM rug, per a
          supplied fan-tufted photo reference — owner-directed IP homage,
          proceeding per the ask). REPLACES the old rug-arcade plane in the
          same spot: still centered under the ceiling pendant's own x (12)
          and at the pendant's own z-3.0 center (unchanged from the W7a
          pass). Shrunk from the old 3.0×2.2 rectangle to a 2.1×2.1 square
          — the mushroom art is round, drawn with alpha outside its own
          stepped-circle silhouette (scripts/pixelart/gen-variants.mjs,
          `rug-mushroom` job — see that job's own comment for the
          silhouette/cap/face derivation), so a square plane just crops to
          the circle; no collider (visual floor dressing, same convention
          as every rug in the house). y0.035, same ≥6mm-proud-of-floor
          offset Bedroom's rug uses, no z-fight. `alphaTest` (not just
          `transparent`) on the material: the alpha edge here is a hard
          silhouette cutout (not a soft fade), so alphaTest avoids the
          depth-sort shimmer a pure-transparent cutout can get against the
          floor plane beneath it at grazing camera angles. ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[12, 0.035, -3.0]}>
        <planeGeometry args={[2.1, 2.1]} />
        <meshStandardMaterial map={rugMushroomTex} transparent alphaTest={0.5} />
      </mesh>

      {/* ── beanbag + controller/comics pile — W7b polish pass, the rug's
          own SE rim, under/near the ceiling pendant's pool of light
          (pendant at (12,-2.6), 1.2m away — well inside its 6m falloff
          distance). Collider {12.7,-2.6,1.0,1.0} in layout.ts (center
          13.2,-2.1 — owner sized the bag up to ~1.0m after seeing it
          live; growth goes east/south so the collider's x-min stays at
          12.7, preserving the door-lane clearance invariant) — real
          furniture you can visibly bump gets a real collider, the genkan
          phase-through precedent layout.ts's own comment calls out.
          REDESIGNED TWICE (W7 FIX ROUND — owner: "reads as the poop
          emoji", the old two-stacked-spheres profile + rust color). First
          pass swapped in a hand-built single flattened-sphere primitive;
          the owner then asked for a real model hunt instead — see
          BeanbagModel's own attribution comment above for the CC-BY-3.0
          Poly Pizza asset, its style-gate check (low-poly, flat-shaded,
          one material, no textures), and the sizing/recolor derivation
          (~1.0m dia × ~0.48m tall after the owner's size-up), same deep
          charcoal-navy color, own Suspense so the
          GLB fetch never blocks the room's first paint. Pile (controller
          + 2 comics) is decor only, no collider, tucked just off the
          beanbag's own footprint. ── */}
      <group position={[13.2, 0, -2.1]}>
        <Suspense fallback={null}>
          <BeanbagModel />
        </Suspense>
        {/* game controller — small body + two stick nubs (pile offsets
            pushed outward with the size-up so the bigger bag doesn't
            swallow them) */}
        <group position={[-0.52, 0.02, 0.35]} rotation={[0, 0.6, 0]}>
          <mesh position={[0, 0.018, 0]}>
            <boxGeometry args={[0.11, 0.03, 0.06]} />
            <meshStandardMaterial color="#22222c" />
          </mesh>
          {[-0.03, 0.03].map((nx) => (
            <mesh key={nx} position={[nx, 0.035, -0.005]}>
              <cylinderGeometry args={[0.012, 0.012, 0.012, 8]} />
              <meshStandardMaterial color="#3a3a46" />
            </mesh>
          ))}
        </group>
        {/* 2 comics — thin flat boxes, slightly rotated, different colors */}
        <mesh position={[-0.37, 0.008, 0.51]} rotation={[0, 0.4, 0]}>
          <boxGeometry args={[0.18, 0.012, 0.26]} />
          <meshStandardMaterial color="#b3475f" />
        </mesh>
        {/* rubik's cube (owner ask) — mid-scramble, abandoned by the
            beanbag's SE rim. Black body + 3×3 sticker tiles on the two
            camera-facing faces (top + south); sticker colors are a fixed
            scrambled layout, deliberately not solved. Decor only, no
            collider (controller/comics convention). */}
        <group position={[0.42, 0.045, 0.32]} rotation={[0, 0.5, 0]}>
          <mesh>
            <boxGeometry args={[0.09, 0.09, 0.09]} />
            <meshStandardMaterial color="#17171c" />
          </mesh>
          {/* top face stickers */}
          {(
            [
              ["#c93a2e", "#f0f0f0", "#2e9e4f"],
              ["#f2d43d", "#f0f0f0", "#2e5fc9"],
              ["#e8842e", "#c93a2e", "#f2d43d"],
            ] as const
          ).map((row, ri) =>
            row.map((c, ci) => (
              <mesh key={`t${ri}${ci}`} position={[(ci - 1) * 0.028, 0.047, (ri - 1) * 0.028]}>
                <boxGeometry args={[0.024, 0.004, 0.024]} />
                <meshStandardMaterial color={c} />
              </mesh>
            ))
          )}
          {/* south face stickers (toward the camera) */}
          {(
            [
              ["#2e5fc9", "#e8842e", "#f0f0f0"],
              ["#2e9e4f", "#2e5fc9", "#c93a2e"],
              ["#f0f0f0", "#f2d43d", "#2e9e4f"],
            ] as const
          ).map((row, ri) =>
            row.map((c, ci) => (
              <mesh key={`s${ri}${ci}`} position={[(ci - 1) * 0.028, (1 - ri) * 0.028, 0.047]}>
                <boxGeometry args={[0.024, 0.024, 0.004]} />
                <meshStandardMaterial color={c} />
              </mesh>
            ))
          )}
        </group>
        <mesh position={[-0.28, 0.02, 0.56]} rotation={[0, -0.25, 0]}>
          <boxGeometry args={[0.17, 0.012, 0.24]} />
          <meshStandardMaterial color="#57b6e8" />
        </mesh>
      </group>

      {/* ── waste bin — W7 FIX ROUND (owner: the bin was swallowed under the
          desk — the desktop mesh visually overhangs its old spot; see the
          layout.ts comment above this rect for the exact overhang
          arithmetic). Moved south, clear of the desktop's own visual
          footprint (z-6.0..-5.1) entirely — now sits in the open floor
          just south-east of the desk's real east leg, still clearly
          "beside the desk" but no longer hidden under it. Collider
          {12.7,-4.9,0.3,0.3} in layout.ts (center 12.85,-4.75). 2 crumpled
          paper balls: one poking just over the rim (the classic missed
          shot resting instead inside — see the floor one below for the
          actual miss), one on the floor beside it. No light, no shadow
          casting. ── */}
      <group position={[12.85, 0, -4.75]}>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.13, 0.1, 0.28, 12]} />
          <meshStandardMaterial color="#2e2a3d" metalness={0.2} roughness={0.6} />
        </mesh>
        {/* crumpled ball resting inside, poking over the rim */}
        <mesh position={[0.02, 0.29, -0.01]}>
          <icosahedronGeometry args={[0.045, 0]} />
          <meshStandardMaterial color="#f2ecd8" roughness={0.9} flatShading />
        </mesh>
        {/* the missed shot — on the floor beside the bin */}
        <mesh position={[0.24, 0.04, 0.15]} rotation={[0.3, 0.6, 0.1]}>
          <icosahedronGeometry args={[0.04, 0]} />
          <meshStandardMaterial color="#f2ecd8" roughness={0.9} flatShading />
        </mesh>
      </group>
    </group>
  );
}
