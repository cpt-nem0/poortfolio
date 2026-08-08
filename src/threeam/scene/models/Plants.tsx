"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/* Owner-supplied plant GLB packs (prep-only module — placement into rooms
   happens elsewhere). Both are CC-BY-4.0 via Sketchfab:

   1. "Ficus Lyrata - Plants" by LadyCris (https://sketchfab.com/ladycris),
      source https://sketchfab.com/3d-models/ficus-lyrata-plants-161df9b2f7124549a2cfa4c33104046e.
      One fiddle-leaf fig: pot, legs, soil, several leaf/stem meshes.

   2. "Indoor Plants Pack" by Domenico.Pentangelo
      (https://sketchfab.com/Domenico.Pentangelo), source
      https://sketchfab.com/3d-models/indoor-plants-pack-fc04bd613c154e20800f242bf1233e1e.
      Shipped as 91 FLAT, ungrouped top-level nodes (no per-plant grouping)
      under one shared texture atlas — the author never separated the 3
      potted plants it actually contains. Split offline by clustering each
      node's WORLD-SPACE bounding box (gltf-transform's `getBounds()`,
      which already resolves the pack's Z-up->Y-up + 0.01-scale corrective
      node chain) by nearest-pot proximity: the pack's 3 pot meshes
      (Pot_Vase_1/2/3 + Pot_Soil_1/2/3) were used as cluster seeds, and every
      other node assigned to its nearest pot in the XZ plane. That cleanly
      partitioned all 91 nodes into 3 plants (51 + 13 + 27 nodes) with no
      leftover geometry — confirmed by node-name/material inspection after
      the fact (each cluster's material set is self-consistent: one pot,
      one small wood base, one leaf/stem family). The three per-plant "wood"
      pairs (Wood_1/2_Hor+Ver, Wood_Square) are each plant's own small
      planter base, not a shared shelf, so they ship inside their plant.

   3. "Ficus Bonsai" by Zgon (https://sketchfab.com/Z-gon), license
      SKETCHFAB STANDARD (not CC-BY like packs 1/2 above) — source
      https://sketchfab.com/3d-models/ficus-bonsai-f420ea9edb914e1b9b7adebbacecc7d8.
      Owner explicitly chose to use this asset under that license (Rohan,
      2026-08-06). Replaces the old hand-built chunky-pixel bonsai on the
      bedroom engawa's zen-garden kadai stand (see Bedroom.tsx's ZEN_STAND_*
      consts) — see p4-bonsai-glb-report.md for the full optimization +
      placement writeup. */

type PlantProps = {
  position?: [number, number, number];
  scale?: number;
  rotationY?: number;
};

/** Shared material pass for all four plants below: low metalness / high
 *  roughness (matte foliage + ceramic pots under the house's warm lamps),
 *  and a defensive emissive clamp — none of these materials ship an
 *  emissive map, but the scene's Bloom pass runs at threshold 0.6, so any
 *  stray hot value inherited from the source scans gets capped rather than
 *  blowing out. Runs on the CLONED scene (not the cached original), and is
 *  idempotent per material via the userData flag (traverse can re-run on
 *  HMR/remount; materials are shared across clones of the same plant, so
 *  this only needs to actually apply once). */
function tunePlantMaterials(root: THREE.Object3D, flag: string) {
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat && mat.isMeshStandardMaterial && !mat.userData[flag]) {
        mat.userData[flag] = true;
        mat.metalness = Math.min(mat.metalness, 0.1);
        mat.roughness = Math.max(mat.roughness, 0.75);
        if (mat.emissiveIntensity > 0.5) mat.emissiveIntensity = 0.5;
      }
    }
  });
}

/** Ficus Lyrata (fiddle-leaf fig) — see file-header attribution (pack 1).
 *  GLTF drill: 16 meshes / 7 materials, no skin, no animations (confirmed
 *  via gltf-transform inspect before touching it). Shipped 23.7MB — six
 *  baseColor-only textures up to 1024px plus ~405k render vertices across
 *  the leaf/stem meshes (no normal/metallicRoughness maps to strip).
 *  Optimized offline: weld -> simplify (--ratio 0.05 --error 0.025) ->
 *  prune -> resize textures to 512 -> dedup -> quantize
 *  (KHR_mesh_quantization; safe here, no skin to desync) = 23.7MB -> 0.98MB.
 *  Native scale: ~1.23m tall, 0.45x0.55m footprint, base already sits at
 *  local y=0 (pot's own origin) — this is real-world meters already, so it
 *  drops into a room 1:1 at scale=1, no rescale needed. */
export function FicusLyrata({ position = [0, 0, 0], scale = 1, rotationY = 0 }: PlantProps) {
  const { scene } = useGLTF("/3am/models/ficus-lyrata.glb");
  const clone = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    tunePlantMaterials(clone, "ficusTuned");
  }, [clone]);
  return (
    <primitive object={clone} position={position} rotation={[0, rotationY, 0]} scale={scale} />
  );
}
useGLTF.preload("/3am/models/ficus-lyrata.glb");

/** Potted tree (pack 2, pot-seed Circle.003 / Pot_Vase_3+Pot_Soil_3) — see
 *  file-header attribution. Compact potted plant with a visible bark trunk
 *  (the lone "Cube"/Bark_Texture mesh) and two leaf-material variants;
 *  closest real-world read is a money tree / small ficus. 51 source nodes.
 *  Optimized offline (same recipe as the ficus, plus stripping the pack's
 *  normal + metallicRoughness texture slots — wasted detail on background
 *  props going through the room's pixel filter; flat roughness/metalness
 *  factors substitute, applied in `tunePlantMaterials` above): 14.8MB (raw
 *  extract) -> 372KB. Native scale: ~1.16m tall, 0.66x0.66m footprint, base
 *  recentered to local (0,0) / y=0 during extraction. */
export function PottedTree({ position = [0, 0, 0], scale = 1, rotationY = 0 }: PlantProps) {
  const { scene } = useGLTF("/3am/models/plant-potted-tree.glb");
  const clone = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    tunePlantMaterials(clone, "pottedTreeTuned");
  }, [clone]);
  return (
    <primitive object={clone} position={position} rotation={[0, rotationY, 0]} scale={scale} />
  );
}
useGLTF.preload("/3am/models/plant-potted-tree.glb");

/** Broadleaf plant (pack 2, pot-seed Circle.002 / Pot_Vase_2+Pot_Soil_2) —
 *  see file-header attribution. Single wide-leaf material family (no
 *  separate stem material), the widest footprint of the three — reads as a
 *  Monstera/bird-of-paradise type. 13 source nodes, the smallest cluster.
 *  Optimized offline (same recipe as PottedTree): 14.8MB (raw extract) ->
 *  95KB. Native scale: ~1.16m tall, 0.94x0.84m footprint, base recentered
 *  to local (0,0) / y=0 during extraction. */
export function BroadleafPlant({ position = [0, 0, 0], scale = 1, rotationY = 0 }: PlantProps) {
  const { scene } = useGLTF("/3am/models/plant-broadleaf.glb");
  const clone = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    tunePlantMaterials(clone, "broadleafTuned");
  }, [clone]);
  return (
    <primitive object={clone} position={position} rotation={[0, rotationY, 0]} scale={scale} />
  );
}
useGLTF.preload("/3am/models/plant-broadleaf.glb");

/** Tall palm (pack 2, pot-seed Circle.001 / Pot_Vase_1+Pot_Soil_1) — see
 *  file-header attribution. Tallest and thinnest-footprint of the three:
 *  many small stem+frond segments (single "BLASPGRN150" leaf material)
 *  splaying wide near the top — reads as an areca/kentia palm. 27 source
 *  nodes. Optimized offline (same recipe as PottedTree): 14.8MB (raw
 *  extract) -> 253KB. Native scale: ~1.75m tall, 1.25x1.11m frond spread,
 *  base recentered to local (0,0) / y=0 during extraction. */
export function TallPalm({ position = [0, 0, 0], scale = 1, rotationY = 0 }: PlantProps) {
  const { scene } = useGLTF("/3am/models/plant-tall-palm.glb");
  const clone = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    tunePlantMaterials(clone, "tallPalmTuned");
  }, [clone]);
  return (
    <primitive object={clone} position={position} rotation={[0, rotationY, 0]} scale={scale} />
  );
}
useGLTF.preload("/3am/models/plant-tall-palm.glb");

/** Material pass for the bonsai — see file-header attribution (pack 3).
 *  Deliberately does NOT reuse `tunePlantMaterials` above: that helper
 *  force-floors roughness at 0.75, which would stomp the bonsai's own
 *  per-material roughness/metalness (0.55/0.88/0.7, 0/0.03/0 — pot, bark,
 *  leaves) already baked in during offline optimization (see
 *  p4-bonsai-glb-report.md). Only a defensive emissive clamp runs here,
 *  same Bloom-threshold-0.6 guard every GLB prop in this file applies.
 *  Critically, this does NOT touch `alphaMode`/`alphaTest`/`transparent` on
 *  LeafSet — the source GLB ships that material as alphaMode=MASK,
 *  doubleSided, with an alpha-cutout leaf-card texture; overwriting any of
 *  those would turn the foliage into solid rectangles. */
function tuneBonsaiMaterials(root: THREE.Object3D) {
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat && mat.isMeshStandardMaterial && !mat.userData.bonsaiTuned) {
        mat.userData.bonsaiTuned = true;
        if (mat.emissiveIntensity > 0.5) mat.emissiveIntensity = 0.5;
      }
    }
  });
}

/** Bonsai (pack 3) — see file-header attribution. Real "Ficus Bonsai" GLB
 *  replacing Bedroom.tsx's old hand-built pixel bonsai on the zen garden's
 *  kadai display stand. 3 meshes / 3 materials (pot/soil "material", "Bark"
 *  trunk, "LeafSet" foliage cards — the leaf material is alpha-cutout, see
 *  `tuneBonsaiMaterials` above). Optimized offline (see
 *  p4-bonsai-glb-report.md): weld -> simplify on the Bark/pot meshes only,
 *  ratio 0.2/error 0.01 (LeafSet's alpha-mapped leaf cards were left
 *  UNSIMPLIFIED — decimation risks warping the cutout silhouette) -> pruned
 *  the normal/metallicRoughness texture slots on all 3 materials
 *  (substituting flat roughness/metalness factors) -> per-material
 *  baseColor resize (Bark/pot to 256, LeafSet kept at 512 for crisp mask
 *  edges) -> dedup -> quantize (KHR_mesh_quantization; confirmed safe via
 *  gltf-transform inspect — 0 skins, 0 animations) = 10.5MB -> 976KB.
 *  Native scale: 0.642m tall, ~0.55x0.48m canopy footprint, base already
 *  sits at local y≈0 (real-world meters, no rescale baked in). */
export function Bonsai({ position = [0, 0, 0], scale = 1, rotationY = 0 }: PlantProps) {
  const { scene } = useGLTF("/3am/models/bonsai.glb");
  const clone = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    tuneBonsaiMaterials(clone);
  }, [clone]);
  return (
    <primitive object={clone} position={position} rotation={[0, rotationY, 0]} scale={scale} />
  );
}
useGLTF.preload("/3am/models/bonsai.glb");
