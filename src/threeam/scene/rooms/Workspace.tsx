"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { usePixelTexture } from "../usePixelTexture";
import { useThreeAm } from "@/threeam/state/store";
import { site } from "@/content/site";

const WALL_H = 2.8; // must match House.tsx
export const WORKSPACE = { x: 8, z: 0, w: 8, d: 6 };

/* Battlestation desk — motorized height toggle (owner wave B). The desktop
   top surface height is the thing that animates; every item on the desk is
   authored at a local y relative to that surface (0 = surface), and the
   whole "riding" group's world y IS the animated top height. Legs live
   OUTSIDE the riding group (they're bolted to the floor) and telescope by
   scaling a second segment to bridge the fixed outer sleeve up to the
   underside of the desktop each frame — see the leg refs in Workspace(). */
const DESK_SIT_Y = 0.75; // top surface height, sitting
const DESK_STAND_Y = 1.15; // top surface height, standing
const DESK_TOP_THICK = 0.04;
const LEG_OUTER_H = 0.5; // fixed lower sleeve height
const DESK_LERP = 6; // 1/s — matches the FollowCamera/Turntable ease rate family
const ACCENTS = ["#b3475f", "#c98a2e", "#2e6e54", "#5b4b8a"]; // wine, mustard, teal, indigo — existing palette

/* Interior locked by Rohan (2026-07 style gate): midnight walls, dark
   walnut floor. Alternatives are regenerable via
   `node scripts/pixelart/gen-variants.mjs` if the room is redecorated. */
/* corkboard pin positions (board-local), one per site.experience entry.
   The red string is DERIVED from these so its endpoints land exactly on
   the pin centers — never hand-tune the string separately. */
const PINS = site.experience.map((_, i) => ({
  x: -0.45 + i * 0.9,
  y: 0.3 - (i % 2) * 0.35,
}));
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

/** One taped polaroid; the texture hook lives here so the projects loop stays
 *  hook-legal. Photo sits 5mm proud of the frame face (≥4mm convention —
 *  anything closer flickers, per the album-art z-fighting bug). */
function Polaroid({ image }: { image: string }) {
  const tex = usePixelTexture(image.replace("/projects/", "/3am/projects/"), 1, 1);
  return (
    <mesh position={[0, 0.035, 0.005]}>
      <planeGeometry args={[0.44, 0.33]} />
      <meshStandardMaterial map={tex} />
    </mesh>
  );
}

/** One organic vine strand (wave E rework — the old stacked-box drape read
 *  as "jenga blocks falling"). Short thin stem segments chained along a
 *  curved droop: the tilt starts near-horizontal (spilling over the edge)
 *  and eases quadratically toward hanging straight down — a catenary-ish
 *  bend instead of a rigid diagonal. Small leaf pairs sprout at alternating
 *  joints. `dir` is the horizontal spill direction in the parent's xz
 *  plane; `phase` offsets the leaf pattern so neighboring strands don't
 *  look cloned. Strand length = `segments` (vary it per strand). */
const VINE_LEAF_GREENS = ["#3f8f5a", "#3c8a68", "#2e6e54"];
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
                <mesh
                  position={[0.018, 0, leafSide * 0.03]}
                  rotation={[leafSide * 0.55, 0, -0.4]}
                >
                  <boxGeometry args={[0.055, 0.075, 0.012]} />
                  <meshStandardMaterial color={VINE_LEAF_GREENS[(i + phase) % 3]} />
                </mesh>
                <mesh
                  position={[-0.012, -0.02, leafSide * -0.024]}
                  rotation={[leafSide * -0.45, 0, 0.35]}
                >
                  <boxGeometry args={[0.045, 0.06, 0.012]} />
                  <meshStandardMaterial color={VINE_LEAF_GREENS[(i + phase + 1) % 3]} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** One upright/leaning book spine — bookshelf filler. `y0` is the
 *  compartment's floor y; `z` is position along the shelf's width; `tilt`
 *  rotates about the depth axis so it leans sideways against a neighbor. */
function Spine({
  y0,
  z,
  w,
  h,
  d,
  color,
  tilt = 0,
  x = -0.22,
}: {
  y0: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  tilt?: number;
  x?: number;
}) {
  return (
    <mesh position={[x, y0 + h / 2, z]} rotation={[tilt, 0, 0]}>
      <boxGeometry args={[d, h, w]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/** A book laid flat (part of a small stacked pile). */
function FlatBook({
  y0,
  z,
  w,
  d,
  h = 0.035,
  color,
  x = -0.22,
  rotY = 0,
}: {
  y0: number;
  z: number;
  w: number;
  d: number;
  h?: number;
  color: string;
  x?: number;
  rotY?: number;
}) {
  return (
    <mesh position={[x, y0 + h / 2, z]} rotation={[0, rotY, 0]}>
      <boxGeometry args={[d, h, w]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/** Tiny decorative pieces scattered on the bookshelf — kept small and
 *  palette-consistent so they read as clutter, not focal objects. */
function TinyPlant({ y0, z, x = -0.22 }: { y0: number; z: number; x?: number }) {
  return (
    <group position={[x, y0, z]}>
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.025, 0.02, 0.05, 8]} />
        <meshStandardMaterial color="#8a5a3d" />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <sphereGeometry args={[0.032, 8, 6]} />
        <meshStandardMaterial color="#3f8f5a" />
      </mesh>
    </group>
  );
}

function Figurine({ y0, z, x = -0.2 }: { y0: number; z: number; x?: number }) {
  return (
    <group position={[x, y0, z]}>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.03, 0.04, 0.03]} />
        <meshStandardMaterial color="#c98a2e" />
      </mesh>
      <mesh position={[0, 0.065, 0]}>
        <sphereGeometry args={[0.02, 6, 5]} />
        <meshStandardMaterial color="#2e2a4d" />
      </mesh>
    </group>
  );
}

function Hourglass({ y0, z, x = -0.2 }: { y0: number; z: number; x?: number }) {
  return (
    <group position={[x, y0, z]}>
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.022, 0.05, 8]} />
        <meshStandardMaterial color="#c9b088" transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.078, 0]}>
        <coneGeometry args={[0.022, 0.05, 8]} />
        <meshStandardMaterial color="#c9b088" transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.006, 6]} />
        <meshStandardMaterial color="#6b4128" />
      </mesh>
    </group>
  );
}

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
 *  gold fittings). Textures keep their native linear filtering. */
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

/** Coffee machine model: "Coffee machine" by vervoortward
 *  (https://sketchfab.com/vervoortward) via Sketchfab — CC-BY-4.0
 *  (https://sketchfab.com/3d-models/coffee-machine-5aee9b1f39f3400f890040c710467fdf).
 *  Attribution lives in the GLB's asset.extras too. Healthy file (no rig,
 *  no animations); the shipped 18MB was pure geometry (zero textures), so
 *  it was optimized offline with gltf-transform (weld/simplify/prune +
 *  KHR_mesh_quantization — natively supported by three's GLTFLoader, no
 *  decoder needed) down to 2.3MB.
 *  Perf pass (2026-07, room-local jitter fix): that first pass only
 *  quantized bytes — the "simplify" step never actually ran, so the file
 *  still carried 143,510 triangles for a ~0.29m desk prop (inspected with
 *  `gltf-transform inspect`). Re-ran weld → simplify (--ratio 0.1 --error
 *  0.01, i.e. meshoptimizer targets 10% of vertices, constrained to ≤1% of
 *  mesh-radius deviation) → prune → quantize: 2.32MB/143,510 tris →
 *  237KB/14,347 tris (90% fewer triangles). Same 5 meshes/5 materials, same
 *  visual silhouette — verify by eye after this change since the pixel
 *  filter hides most of the difference but the error bound is a target,
 *  not a guarantee. COFFEE_SCALE sizes it to ~0.29m tall on the counter
 *  (sized by DEPTH — the model is deeper than tall and must fit the 0.44
 *  counter top). */
const COFFEE_SCALE = 0.28;
function CoffeeMachineModel() {
  const { scene } = useGLTF("/3am/models/coffee-machine.glb");
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
        }
      }
    });
  }, [scene]);
  return <primitive object={scene} scale={COFFEE_SCALE} />;
}
useGLTF.preload("/3am/models/coffee-machine.glb");

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
const PIXAR_LAMP_SCALE = 0.0031;
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

export function Workspace() {
  const R = WORKSPACE;
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

  const floor = usePixelTexture("/3am/tex/floor-walnut.png", R.w, R.d);
  const wallN = usePixelTexture("/3am/tex/wall-midnight.png", R.w, WALL_H);
  const wallSegW = usePixelTexture("/3am/tex/wall-midnight.png", 2.2, WALL_H);
  const wallSegE = usePixelTexture("/3am/tex/wall-midnight.png", 2.2, WALL_H);
  const wallStub = usePixelTexture("/3am/tex/wall-midnight.png", R.w, 0.2, 0, 0.5);
  const termTex = usePixelTexture("/3am/tex/terminal.png", 1, 1);
  const corkTex = usePixelTexture("/3am/tex/cork.png", 1, 1);
  const neonShippedTex = usePixelTexture("/3am/tex/neon-shipped.png", 1, 1);

  const segs: Array<{ x: number; rotY: number }> = [
    { x: R.x + 0.11, rotY: Math.PI / 2 }, // west divider, workspace face
    { x: R.x + R.w - 0.11, rotY: -Math.PI / 2 }, // east divider, workspace face
  ];

  return (
    <group ref={rootRef}>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[R.x + R.w / 2, 0.02, R.z + R.d / 2]}>
        <planeGeometry args={[R.w, R.d]} />
        <meshStandardMaterial map={floor} />
      </mesh>
      {/* north wall */}
      <mesh position={[R.x + R.w / 2, WALL_H / 2, R.z + 0.01]}>
        <planeGeometry args={[R.w, WALL_H]} />
        <meshStandardMaterial map={wallN} />
      </mesh>
      {/* divider faces, two segments each (flanking the doors) */}
      {segs.map((seg, i) => (
        <group key={i}>
          <mesh rotation={[0, seg.rotY, 0]} position={[seg.x, WALL_H / 2, 1.1]}>
            <planeGeometry args={[2.2, WALL_H]} />
            <meshStandardMaterial map={i === 0 ? wallSegW : wallSegE} />
          </mesh>
          <mesh rotation={[0, seg.rotY, 0]} position={[seg.x, WALL_H / 2, 4.9]}>
            <planeGeometry args={[2.2, WALL_H]} />
            <meshStandardMaterial map={i === 0 ? wallSegW : wallSegE} />
          </mesh>
        </group>
      ))}
      {/* south stub band */}
      <mesh rotation={[0, Math.PI, 0]} position={[R.x + R.w / 2, 0.275, R.z + R.d - 0.015]}>
        <planeGeometry args={[R.w, 0.55]} />
        <meshStandardMaterial map={wallStub} />
      </mesh>
      {/* baseboards (north + both divider faces) */}
      <mesh position={[R.x + R.w / 2, 0.09, R.z + 0.045]}>
        <boxGeometry args={[R.w, 0.18, 0.07]} />
        <meshStandardMaterial color="#4a3a2e" />
      </mesh>
      {[R.x + 0.145, R.x + R.w - 0.145].map((bx) => (
        <group key={bx}>
          <mesh position={[bx, 0.09, 1.1]}>
            <boxGeometry args={[0.07, 0.18, 2.2]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
          <mesh position={[bx, 0.09, 4.9]}>
            <boxGeometry args={[0.07, 0.18, 2.2]} />
            <meshStandardMaterial color="#4a3a2e" />
          </mesh>
        </group>
      ))}

      {/* ── desk — collider {9.7,0.3,2.6,0.9}. Motorized standing desk: the
          top + everything sitting on it lives in one "riding" group whose
          world y glides between sitting (0.75) and standing (1.15); the legs
          are bolted to the floor and telescope on the same eased height each
          frame (see deskRideRef/legInnerRefs + useFrame above). ── */}
      <group position={[11, 0, 0.75]}>
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

          {/* control pad — front edge, toggles the motor */}
          <group
            position={[0, -0.06, 0.454]}
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
              <mesh position={[0, 0.325, 0.024]}>
                <planeGeometry args={[0.76, 0.42]} />
                <meshBasicMaterial map={termTex} />
              </mesh>
              {/* light bar — visible fixture, subtle downward glow, no shadow */}
              <mesh position={[0, 0.565, -0.005]}>
                <boxGeometry args={[0.74, 0.03, 0.045]} />
                <meshStandardMaterial color="#141419" />
              </mesh>
              <pointLight position={[0, 0.535, 0.06]} color="#ffcf9e" intensity={1.1} distance={1.5} decay={2} />
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
          <group position={[-1.05, 0.076, -0.26]}>
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
          <group position={[0.72, 0, -0.08]} rotation={[0, -0.35, 0]}>
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
            {/* macbook base */}
            <mesh position={[0, 0.067, 0.01]}>
              <boxGeometry args={[0.3, 0.012, 0.2]} />
              <meshStandardMaterial color="#c9c9d1" />
            </mesh>
            {/* tilted open screen, hinged at the base's back edge */}
            <group position={[0, 0.073, -0.09]} rotation={[-0.32, 0, 0]}>
              <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[0.3, 0.2, 0.008]} />
                <meshStandardMaterial color="#c9c9d1" />
              </mesh>
              <mesh position={[0, 0.1, 0.0055]}>
                <planeGeometry args={[0.27, 0.17]} />
                <meshStandardMaterial color="#cfe8ff" emissive="#bfe0ff" emissiveIntensity={1.2} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* ── corkboard (experience station) — north wall, right of the desk ── */}
      <group
        position={[13.5, 1.75, 0.045]}
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
        {/* one pinned note per job + red string connecting the pins */}
        {site.experience.map((e2, i) => (
          <group key={e2.company} position={[PINS[i].x, PINS[i].y - 0.15, 0.035]}>
            <mesh rotation={[0, 0, i % 2 ? 0.06 : -0.05]}>
              <planeGeometry args={[0.42, 0.34]} />
              <meshStandardMaterial color="#f2ecd8" />
            </mesh>
            <mesh position={[0, 0.15, 0.01]}>
              <sphereGeometry args={[PIN_R, 6, 5]} />
              <meshStandardMaterial color="#b3475f" />
            </mesh>
            {/* scribble lines (illegible on purpose — the panel has the words) */}
            {[0, 1, 2].map((l) => (
              <mesh key={l} position={[0, 0.05 - l * 0.08, 0.005]}>
                <planeGeometry args={[0.3 - l * 0.06, 0.02]} />
                <meshStandardMaterial color="#7d729e" />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[STRING.x, STRING.y, STRING.z]} rotation={[0, 0, STRING.rot]}>
          <planeGeometry args={[STRING.len, 0.012]} />
          <meshStandardMaterial color="#c9302f" />
        </mesh>
        {/* a couple of extra empty pins for mess */}
        <mesh position={[0.65, 0.42, 0.03]}>
          <sphereGeometry args={[0.018, 6, 5]} />
          <meshStandardMaterial color="#c98a2e" />
        </mesh>
      </group>

      {/* ── project polaroids (projects station) — west divider, north segment ── */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          useThreeAm.getState().setFocus("projects");
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        {site.projects.map((p, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          return (
            <group
              key={p.title}
              position={[8.12, 2.25 - row * 0.62, 0.55 + col * 0.62 + (row % 2) * 0.3]}
              rotation={[0, Math.PI / 2, (i % 3) * 0.045 - 0.045]}
            >
              {/* white polaroid frame */}
              <mesh>
                <planeGeometry args={[0.5, 0.46]} />
                <meshStandardMaterial color="#f2ecd8" />
              </mesh>
              <Polaroid image={p.image} />
              {/* tape — 10mm proud of the frame, clear of the photo's 5mm */}
              <mesh position={[0, 0.235, 0.01]} rotation={[0, 0, 0.15]}>
                <planeGeometry args={[0.16, 0.05]} />
                <meshStandardMaterial color="#f2ecd8" opacity={0.6} transparent />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* ── gaming chair — collider {10.4,1.5,0.8,0.8}. All black w/ gray
          piping + lumbar accent; full-height backrest + headrest. Shifted
          0.3 west (wave E) so the desk front reads unobstructed from the
          walking camera. ── */}
      <group position={[10.8, 0, 1.9]} rotation={[0, 0.25, 0]}>
        {/* base + gas cylinder */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.44, 6]} />
          <meshStandardMaterial color="#15151b" />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.sin(a) * 0.2, 0.03, Math.cos(a) * 0.2]} rotation={[0, a, 0]}>
              <boxGeometry args={[0.06, 0.04, 0.24]} />
              <meshStandardMaterial color="#3a3a42" />
            </mesh>
          );
        })}
        {/* seat cushion */}
        <mesh position={[0, 0.44, 0]}>
          <boxGeometry args={[0.5, 0.07, 0.48]} />
          <meshStandardMaterial color="#17171d" />
        </mesh>
        {/* seat piping (gray edge trim) */}
        <mesh position={[0, 0.475, 0.235]}>
          <boxGeometry args={[0.5, 0.012, 0.018]} />
          <meshStandardMaterial color="#8b8b94" />
        </mesh>
        <mesh position={[0.245, 0.475, 0]}>
          <boxGeometry args={[0.018, 0.012, 0.48]} />
          <meshStandardMaterial color="#8b8b94" />
        </mesh>
        <mesh position={[-0.245, 0.475, 0]}>
          <boxGeometry args={[0.018, 0.012, 0.48]} />
          <meshStandardMaterial color="#8b8b94" />
        </mesh>
        {/* backrest — full height, with side bolsters (gaming-chair wings) */}
        <mesh position={[0, 0.97, -0.24]} rotation={[-0.08, 0, 0]}>
          <boxGeometry args={[0.48, 1.05, 0.09]} />
          <meshStandardMaterial color="#17171d" />
        </mesh>
        <mesh position={[0.21, 0.97, -0.21]} rotation={[-0.08, 0, 0]}>
          <boxGeometry args={[0.07, 1.05, 0.13]} />
          <meshStandardMaterial color="#1e1e26" />
        </mesh>
        <mesh position={[-0.21, 0.97, -0.21]} rotation={[-0.08, 0, 0]}>
          <boxGeometry args={[0.07, 1.05, 0.13]} />
          <meshStandardMaterial color="#1e1e26" />
        </mesh>
        {/* backrest piping — center racing stripe */}
        <mesh position={[0, 0.97, -0.194]} rotation={[-0.08, 0, 0]}>
          <boxGeometry args={[0.05, 0.95, 0.012]} />
          <meshStandardMaterial color="#8b8b94" />
        </mesh>
        {/* gray lumbar pad */}
        <mesh position={[0, 0.64, -0.2]} rotation={[-0.08, 0, 0]}>
          <boxGeometry args={[0.28, 0.18, 0.04]} />
          <meshStandardMaterial color="#8b8b94" />
        </mesh>
        {/* headrest */}
        <mesh position={[0, 1.53, -0.3]} rotation={[-0.15, 0, 0]}>
          <boxGeometry args={[0.32, 0.22, 0.09]} />
          <meshStandardMaterial color="#17171d" />
        </mesh>
        <mesh position={[0, 1.53, -0.255]} rotation={[-0.15, 0, 0]}>
          <boxGeometry args={[0.16, 0.14, 0.012]} />
          <meshStandardMaterial color="#8b8b94" />
        </mesh>
        {/* armrests */}
        {[-0.29, 0.29].map((ax) => (
          <group key={ax}>
            <mesh position={[ax, 0.42, 0.05]}>
              <boxGeometry args={[0.06, 0.28, 0.06]} />
              <meshStandardMaterial color="#17171d" />
            </mesh>
            <mesh position={[ax, 0.57, 0.05]}>
              <boxGeometry args={[0.09, 0.04, 0.22]} />
              <meshStandardMaterial color="#8b8b94" />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── EVA-01 shrine — collider {8.8,5.15,0.65,0.7}. Wave E built a
          blocky figurine; Wave F swapped in Rohan's downloaded Sketchfab
          model (attribution on EvaModel). Unit-01 stands on a tall dark
          plinth, showcased by a sunset wash: a small can on the plinth
          corner aimed up at the figure (visible fixture, spotlight
          attached, NO shadow casting — same family as the nook's sunset
          lamp).
          Wave F round 2: figure bumped 1.4m → 1.8m (owner wanted it
          much bigger). The spotlight's aim was raised (1.7 → 2.0) and its
          cone widened (0.65 → 0.75 rad) so the taller head still sits
          inside the beam; intensity was cut 22 → 5 — at the old value the
          torso (now much closer to the fixed low fixture) blew out to
          flat white/yellow under Bloom, which is what actually read as
          "distorted" up close (confirmed by toggling the light off: the
          purple/green/orange material colors underneath were fine all
          along). Plinth height (0.4) and collider position are unchanged;
          only the width/depth grew slightly to cover the bigger figure's
          forward-leaning footprint.
          Round 2b: a second matching can on the plinth's front-LEFT
          corner — museum crossfire: each lamp aims across at the
          figure's opposite flank, beams intersecting on the EVA. Both
          spotlights (and their aim targets) are nested inside this
          rotated group in local space, replacing the old hand-computed
          world-space placement. Both cans sit on the plinth top, so no
          new collider. Per-lamp intensity halved 5 → 2.5 so the summed
          crossfire matches the single lamp's exposure (the emissive
          clamp + Bloom blowout fix above still holds). ── */}
      <group position={[9.1, 0, 5.45]} rotation={[0, -0.35, 0]}>
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
            corners (visible fixtures; each spotlight is nested INSIDE its
            fixture group so it inherits the shrine rotation). Crossfire:
            the right can targets the left flank and vice versa. */}
        {[
          { x: 0.18, target: evaTargetAcrossL }, // right can → left flank
          { x: -0.18, target: evaTargetAcrossR }, // left can → right flank
        ].map(({ x, target }) => (
          <group key={x} position={[x, 0.42, 0.18]}>
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
              target={target}
              angle={0.75}
              penumbra={0.55}
              intensity={2.5}
              distance={4}
              decay={1.4}
              color="#ff7a5c"
            />
          </group>
        ))}
        {/* crossfire aim points — shrine-local (rotation-safe), upper
            torso height so both beams cover chest→head of the 1.8m figure */}
        <primitive object={evaTargetAcrossL} position={[-0.16, 1.85, -0.02]} />
        <primitive object={evaTargetAcrossR} position={[0.16, 1.85, -0.02]} />
      </group>

      {/* ── coffee counter — collider {11.3,5.54,1.4,0.44}. Wave F: coffee
          setup centered on the south stub wall. Sideboard-style counter
          (chunky walnut body, warm wood top), the real coffee-machine GLB
          on top FACING NORTH into the room, a mug rack + small dome lamp
          to its right (screen-right from the walking camera = +x). The
          dome lamp is the only light here (fixture-attached, NO shadow
          casting); the paper-lantern floor lamp to the east pools over
          the whole corner. ── */}
      <group position={[12, 0, 5.76]}>
        {/* feet */}
        {[-0.62, 0.62].map((lx) => (
          <mesh key={lx} position={[lx, 0.045, 0]}>
            <boxGeometry args={[0.08, 0.09, 0.34]} />
            <meshStandardMaterial color="#1a1a22" />
          </mesh>
        ))}
        {/* body */}
        <mesh position={[0, 0.5, 0.01]}>
          <boxGeometry args={[1.4, 0.82, 0.36]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {/* front door panels + handles (north face, toward the room) */}
        {[-0.34, 0.34].map((dx) => (
          <group key={dx}>
            <mesh position={[dx, 0.48, -0.175]}>
              <boxGeometry args={[0.58, 0.6, 0.02]} />
              <meshStandardMaterial color="#7d4e30" />
            </mesh>
            <mesh position={[dx + (dx < 0 ? 0.22 : -0.22), 0.52, -0.19]}>
              <boxGeometry args={[0.02, 0.1, 0.014]} />
              <meshStandardMaterial color="#c9b088" />
            </mesh>
          </group>
        ))}
        {/* counter top slab */}
        <mesh position={[0, 0.935, 0]}>
          <boxGeometry args={[1.48, 0.05, 0.44]} />
          <meshStandardMaterial color="#a87b4f" />
        </mesh>

        {/* coffee machine (see CoffeeMachineModel's attribution) — facing
            north, the reasonable way to make coffee. Own Suspense. The
            offsets compensate the model's off-center origin (measured
            in-browser): feet exactly on the slab top, footprint inside
            the slab, back edge ~8mm clear of the stub wall plane. */}
        <group position={[-0.276, 0.9112, 0.015]} rotation={[0, Math.PI, 0]}>
          <Suspense fallback={null}>
            <CoffeeMachineModel />
          </Suspense>
        </group>

        {/* mug rack — two-tier stand, mugs in the room's warm palette */}
        <group position={[0.24, 0.96, 0]}>
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

        {/* small dome lamp — right end of the counter (visible fixture,
            fixture-attached warm light, NO shadow casting) */}
        <group position={[0.58, 0.96, 0.02]}>
          <mesh position={[0, 0.014, 0]}>
            <cylinderGeometry args={[0.04, 0.048, 0.028, 10]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.09, 6]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, 0.125, 0]} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[0.055, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={0.55} side={2} />
          </mesh>
          <pointLight position={[0, 0.11, 0]} color="#ffd9a0" intensity={0.9} distance={1.8} decay={2} />
        </group>
      </group>

      {/* ── paper-lantern floor lamp — collider {13.55,5.3,0.5,0.5}. Wave F
          replaces the wave-E tripod (Rohan wanted a different design next
          to the new coffee counter): slim dark pole on a round base, a big
          warm paper lantern with wooden ribs near the top. Distinct from
          every other fixture in the house; keeps the tripod's exact light
          budget (main south-side source, fixture-attached point light, NO
          shadow casting). ── */}
      <group position={[13.8, 0, 5.55]}>
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.14, 0.17, 0.05, 12]} />
          <meshStandardMaterial color="#1a1a22" />
        </mesh>
        <mesh position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 1.2, 8]} />
          <meshStandardMaterial color="#1a1a22" />
        </mesh>
        {/* lantern — warm glowing paper sphere */}
        <group position={[0, 1.34, 0]}>
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
          {/* top cap */}
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.03, 0.05, 0.03, 8]} />
            <meshStandardMaterial color="#1a1a22" />
          </mesh>
        </group>
        <pointLight position={[0, 1.34, 0]} color="#ffd9a0" intensity={10} distance={7} decay={1.8} />
      </group>

      {/* ── neon "shipped" — north wall, west end, right next to the
          polaroid/projects wall. Red lowercase tube lettering (generated
          texture, scripts/pixelart/gen-variants.mjs) + a low red glow.
          The sign itself is the fixture — no shadow casting. ── */}
      <mesh position={[8.9, 1.83, 0.045]}>
        <planeGeometry args={[1.7, 0.6]} />
        <meshBasicMaterial map={neonShippedTex} transparent />
      </mesh>
      <pointLight position={[8.9, 1.83, 0.3]} color="#ff5040" intensity={2.5} distance={2.8} decay={2} />

      {/* ── full-wall bookshelf — collider {15.45,3.85,0.44,2.1}. Owner: "a
          big shelf which covers the whole wall there, full of books and
          some small decorative pieces, all arranged in a NON-symmetric way,
          and a vine plant on top which drapes over the shelf." Sits against
          the east divider's workspace-side face, south of the doorway;
          floor to near-ceiling, 5 shelf boards / 4 compartments. Book
          clusters are hand-placed and deliberately NOT grid-aligned. ── */}
      <group position={[15.89, 0, 4.9]}>
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

        {/* small brass picture-light under the top shelf — this corner is
            otherwise unlit (same convention as the music nook's east-wall
            sconce next to its neon sign). No shadow casting. */}
        <group position={[-0.32, 2.52, -0.2]} rotation={[0.4, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.05, 0.05, 0.16]} />
            <meshStandardMaterial color="#8a7a4a" />
          </mesh>
          <mesh position={[0, -0.03, 0.07]}>
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshStandardMaterial color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={1} />
          </mesh>
          {/* light emits from the visible bulb (fixture-attached, no shadow) */}
          <pointLight position={[0, -0.05, 0.08]} color="#ffd9a0" intensity={7.5} distance={3.8} decay={1.8} />
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
          {/* front (west) spill — the long strands over the shelf face */}
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

      {/* ── floating shelf — north wall, above the desk. No collider (above
          head height). Mounted at y=2.2 (slab underside 2.15); the standing
          desk's tallest point is the light bar atop the bigger wave-E
          monitor, ≈1.86 — clearance ~0.29m. Stays clear of the corkboard
          (x 12.65–14.35) with margin to spare. White slab, hidden brackets.
          CENTER: katana on a two-prong stand (wave E: 2.5x girth, taller
          prongs, deep-red scabbard so it pops off the midnight wall).
          SIDES: organic vine strands. ONE side (east): small warm lamp. ── */}
      <group position={[11.0, 2.2, 0.21]}>
        {/* slab */}
        <mesh position={[0, -0.025, 0]}>
          <boxGeometry args={[2.8, 0.05, 0.32]} />
          <meshStandardMaterial color="#e9e5d8" />
        </mesh>
        {/* hidden brackets — tucked under, dark to disappear against the
            midnight wall */}
        {[-0.9, 0.9].map((bx) => (
          <mesh key={bx} position={[bx, -0.1, -0.12]}>
            <boxGeometry args={[0.06, 0.15, 0.28]} />
            <meshStandardMaterial color="#20223a" />
          </mesh>
        ))}

        {/* real katana on its own stand (see KatanaModel's attribution) —
            centered display piece, stand feet on the slab top (local y 0).
            Own Suspense: the GLB streams in without holding up the shelf. */}
        <Suspense fallback={null}>
          <KatanaModel />
        </Suspense>

        {/* west end — vine pot, strands spilling front + off the end */}
        <group position={[-1.15, 0, -0.02]}>
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

        {/* east end — vine pot + a small warm lamp */}
        <group position={[1.15, 0, -0.02]}>
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
        {/* shifted 1.3 → 0.78 and brightened a step (wave F: the real
            katana's black scabbard/stand vanished against the midnight
            wall at the old reach — the closer warm rake picks out the
            silver blade + gold fittings; no new lights added) */}
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
    </group>
  );
}
