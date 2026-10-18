"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/* "cat loaf" by Hiroyuki Kajiwara (hk) — https://poly.pizza/m/5qGO_C5GvAB —
   CC-BY-3.0 (https://creativecommons.org/licenses/by/3.0/). 502 tris, one
   untextured white "vertex" material, no rig. A low-poly cat loafing with
   her eyes shut — the only genuinely *sleeping* cat on poly.pizza (owner
   2026-10-18: "it should be sleeping"; the rigged standing cats tried first
   "look a lot like a dog" and were dropped).

   Modifications (CC-BY notice): geometry de-indexed and painted per face as
   an orange tabby with cream chest/belly/paws/tail-tip and darker back,
   tail and forehead stripes (see paintTabby); material swapped for a matte
   flat-shaded vertex-colour standard material; uniform rescale to house
   units. Source mesh otherwise untouched.

   Axes (measured from the mesh): body runs along local x with the FACE at
   -x and the tail trailing to +x; y up; ~1.54 long × 0.74 tall × 0.63 wide
   in source units. The loader rotates her so the face points +z (south,
   toward the dollhouse camera). */

const CAT_URL = "/3am/models/cat-loaf.glb";

/** Nose to tail tip after rescale. A real cat loaf is ~0.45m of cat plus
 *  tail; the cat bed's cushion is ~0.65m across, so she fills it and the
 *  tail tucks behind the bolster rim (owner history: "cat … too small to
 *  read"). */
export const CAT_LENGTH = 0.78;

const ORANGE = new THREE.Color("#d9893f");
const ORANGE_DARK = new THREE.Color("#9c5023");
const CREAM = new THREE.Color("#f2e7d0");

/** Per-FACE colouring (the geometry is de-indexed so each triangle owns its
 *  three vertices and no colour bleeds across facets — crisp low-poly
 *  patches, matching the model's own faceted look). Coordinates are
 *  normalised against the mesh bounds: u 0→1 face→tail-tip, v 0→1
 *  floor→top of back, w −1→1 across the body. */
function paintTabby(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const geo = src.index ? src.toNonIndexed() : src.clone();
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const size = new THREE.Vector3();
  bb.getSize(size);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const a = new THREE.Vector3();
  const centroid = new THREE.Vector3();
  const col = new THREE.Color();

  for (let i = 0; i < pos.count; i += 3) {
    centroid.set(0, 0, 0);
    for (let k = 0; k < 3; k++) centroid.add(a.fromBufferAttribute(pos, i + k));
    centroid.multiplyScalar(1 / 3);
    const u = (centroid.x - bb.min.x) / size.x;
    const v = (centroid.y - bb.min.y) / size.y;
    const w = (centroid.z - (bb.min.z + bb.max.z) / 2) / (size.z / 2);

    col.copy(ORANGE);

    // back stripes: ~6 broad bands across the loaf, wrapping down the flanks
    const onBack = v > 0.42 && u > 0.13 && u < 0.7 && Math.abs(w) < 0.95;
    if (onBack && Math.sin(u * Math.PI * 2 * 6) > 0.05) col.copy(ORANGE_DARK);
    // tail rings
    if (u > 0.7 && u < 0.94 && Math.sin(u * Math.PI * 2 * 9) > 0.2) col.copy(ORANGE_DARK);
    // the tabby forehead mark
    if (u < 0.09 && v > 0.78 && Math.abs(w) < 0.2) col.copy(ORANGE_DARK);

    // cream: belly/paws underneath, chest bib + muzzle at the face end, tail tip
    const belly = v < 0.22;
    const chest = u < 0.12 && v < 0.55;
    const muzzle = u < 0.05 && v < 0.72 && Math.abs(w) < 0.5;
    const chin = u < 0.045 && v < 0.6;
    const tailTip = u > 0.93;
    if (belly || chest || muzzle || chin || tailTip) col.copy(CREAM);

    for (let k = 0; k < 3; k++) col.toArray(colors, (i + k) * 3);
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** The sleeping cat mesh, rescaled to CAT_LENGTH, lowest point at local
 *  y=0, face toward +z. Static — no rig, no clip; "life" is the petting
 *  interaction in rooms/Cat.tsx. */
export function CatModel() {
  const { scene } = useGLTF(CAT_URL);

  const { geometry, scale, lift } = useMemo(() => {
    let source: THREE.BufferGeometry | null = null;
    scene.traverse((obj) => {
      if (!source && (obj as THREE.Mesh).isMesh) source = (obj as THREE.Mesh).geometry;
    });
    if (!source) throw new Error("cat-loaf.glb has no mesh");
    const geometry = paintTabby(source);
    const bb = geometry.boundingBox!;
    // centre her nose-to-tail span on the origin (the source origin sits
    // under the shoulders, which would hang the whole tail off the back
    // of the cushion) — then scale, then lift the belly to y=0
    geometry.translate(-(bb.min.x + bb.max.x) / 2, 0, -(bb.min.z + bb.max.z) / 2);
    geometry.computeBoundingBox();
    const scale = CAT_LENGTH / (bb.max.x - bb.min.x);
    return { geometry, scale, lift: -geometry.boundingBox!.min.y * scale };
  }, [scene]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      name="cat-loaf"
      geometry={geometry}
      scale={scale}
      position={[0, lift, 0]}
      rotation={[0, Math.PI / 2, 0]} // local −x (face) → world +z (south)
      receiveShadow
    >
      <meshStandardMaterial vertexColors roughness={1} metalness={0} flatShading />
    </mesh>
  );
}

useGLTF.preload(CAT_URL);
