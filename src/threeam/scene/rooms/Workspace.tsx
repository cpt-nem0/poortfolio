"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
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

export function Workspace() {
  const R = WORKSPACE;
  const rootRef = useRef<THREE.Group>(null);
  /** aim point for the EVA shrine's sunset wash (same pattern as the music
   *  nook's sunset lamp → album wall projection) */
  const [evaTarget] = useState(() => new THREE.Object3D());

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

          {/* pixar-style articulated lamp — back-left corner, head angled down.
              Fixture-attached point light only (no shadow casting — the
              soft-shadow caster budget is fixed). */}
          <group position={[-1.05, 0, -0.3]}>
            <mesh position={[0, 0.015, 0]}>
              <cylinderGeometry args={[0.09, 0.1, 0.03, 12]} />
              <meshStandardMaterial color="#e6e3d9" />
            </mesh>
            <group position={[0, 0.03, 0]} rotation={[0.55, 0, 0]}>
              <mesh position={[0, 0.16, 0]}>
                <boxGeometry args={[0.03, 0.32, 0.035]} />
                <meshStandardMaterial color="#d8d6ce" />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.032, 8, 6]} />
                <meshStandardMaterial color="#b7b5ac" />
              </mesh>
              <group position={[0, 0.32, 0]} rotation={[-1.05, 0, 0]}>
                <mesh position={[0, 0.13, 0]}>
                  <boxGeometry args={[0.028, 0.26, 0.032]} />
                  <meshStandardMaterial color="#d8d6ce" />
                </mesh>
                <mesh>
                  <sphereGeometry args={[0.03, 8, 6]} />
                  <meshStandardMaterial color="#b7b5ac" />
                </mesh>
                <group position={[0, 0.26, 0]} rotation={[-0.7, 0, 0]}>
                  <mesh>
                    <boxGeometry args={[0.09, 0.05, 0.11]} />
                    <meshStandardMaterial color="#c7c5bd" />
                  </mesh>
                  <pointLight position={[0, -0.03, 0.04]} color="#ffd9a0" intensity={0.8} distance={1.3} decay={2} />
                </group>
              </group>
            </group>
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

      {/* ── EVA-01 shrine — collider {8.8,5.15,0.6,0.6}. Wave E: replaces
          the storage-shelf lamp. Big Unit-01 figurine on a low dark plinth,
          chunky blocky armor per the reference: purple body, neon-green
          accent panels, orange chest V, silver shoulder pods w/ red dots,
          single horn, green eyes. Showcased by a sunset wash: a small floor
          can aimed up at the figure (visible fixture, spotlight attached,
          NO shadow casting — same family as the nook's sunset lamp). ── */}
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

        {/* figure (~1.5 tall at scale 1.2 ≈ 1.8 total), standing, facing
            the room — scaled so it still reads BIG through the dollhouse
            camera's heavy vertical foreshortening */}
        <group position={[0, 0.42, 0]} scale={1.2}>
          {/* feet */}
          {[-0.09, 0.09].map((fx) => (
            <mesh key={fx} position={[fx, 0.03, 0.02]}>
              <boxGeometry args={[0.11, 0.06, 0.17]} />
              <meshStandardMaterial color="#55429c" />
            </mesh>
          ))}
          {/* shins + neon green shin panels */}
          {[-0.09, 0.09].map((fx) => (
            <group key={fx} position={[fx, 0.27, 0]}>
              <mesh>
                <boxGeometry args={[0.09, 0.42, 0.11]} />
                <meshStandardMaterial color="#6a55b0" />
              </mesh>
              <mesh position={[0, 0.02, 0.058]}>
                <boxGeometry args={[0.05, 0.22, 0.012]} />
                <meshStandardMaterial color="#7cffb2" emissive="#7cffb2" emissiveIntensity={0.9} />
              </mesh>
            </group>
          ))}
          {/* thighs */}
          {[-0.09, 0.09].map((fx) => (
            <mesh key={fx} position={[fx, 0.63, 0]}>
              <boxGeometry args={[0.1, 0.32, 0.12]} />
              <meshStandardMaterial color="#55429c" />
            </mesh>
          ))}
          {/* waist + green V */}
          <mesh position={[0, 0.85, 0]}>
            <boxGeometry args={[0.25, 0.14, 0.15]} />
            <meshStandardMaterial color="#5b4b8a" />
          </mesh>
          <mesh position={[-0.05, 0.85, 0.078]} rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.1, 0.03, 0.012]} />
            <meshStandardMaterial color="#7cffb2" emissive="#7cffb2" emissiveIntensity={0.9} />
          </mesh>
          <mesh position={[0.05, 0.85, 0.078]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.1, 0.03, 0.012]} />
            <meshStandardMaterial color="#7cffb2" emissive="#7cffb2" emissiveIntensity={0.9} />
          </mesh>
          {/* torso */}
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[0.3, 0.36, 0.18]} />
            <meshStandardMaterial color="#5b4b8a" />
          </mesh>
          {/* orange/yellow chest V */}
          <mesh position={[-0.055, 1.16, 0.094]} rotation={[0, 0, 0.65]}>
            <boxGeometry args={[0.16, 0.045, 0.012]} />
            <meshStandardMaterial color="#c98a2e" />
          </mesh>
          <mesh position={[0.055, 1.16, 0.094]} rotation={[0, 0, -0.65]}>
            <boxGeometry args={[0.16, 0.045, 0.012]} />
            <meshStandardMaterial color="#ffcf6e" />
          </mesh>
          {/* green sternum strip */}
          <mesh position={[0, 1.02, 0.094]}>
            <boxGeometry args={[0.04, 0.14, 0.012]} />
            <meshStandardMaterial color="#7cffb2" emissive="#7cffb2" emissiveIntensity={0.9} />
          </mesh>
          {/* silver shoulder pods + red dots */}
          {[-0.225, 0.225].map((px) => (
            <group key={px} position={[px, 1.26, 0]}>
              <mesh>
                <boxGeometry args={[0.13, 0.19, 0.17]} />
                <meshStandardMaterial color="#b7b5ac" />
              </mesh>
              <mesh position={[px < 0 ? -0.068 : 0.068, 0.04, 0]}>
                <boxGeometry args={[0.012, 0.035, 0.035]} />
                <meshStandardMaterial color="#c9302f" />
              </mesh>
            </group>
          ))}
          {/* arms — upper + forearm w/ green panel, hanging slightly out */}
          {[-0.21, 0.21].map((ax) => (
            <group key={ax}>
              <mesh position={[ax, 1.05, 0]}>
                <boxGeometry args={[0.07, 0.24, 0.09]} />
                <meshStandardMaterial color="#55429c" />
              </mesh>
              <group position={[ax, 0.8, 0.02]}>
                <mesh>
                  <boxGeometry args={[0.08, 0.26, 0.09]} />
                  <meshStandardMaterial color="#5b4b8a" />
                </mesh>
                <mesh position={[ax < 0 ? -0.044 : 0.044, 0.02, 0]}>
                  <boxGeometry args={[0.012, 0.14, 0.05]} />
                  <meshStandardMaterial color="#7cffb2" emissive="#7cffb2" emissiveIntensity={0.9} />
                </mesh>
              </group>
            </group>
          ))}
          {/* head: helmet, green eyes, single horn */}
          <group position={[0, 1.42, 0]}>
            <mesh>
              <boxGeometry args={[0.13, 0.14, 0.14]} />
              <meshStandardMaterial color="#5b4b8a" />
            </mesh>
            {/* jaw plate */}
            <mesh position={[0, -0.045, 0.055]}>
              <boxGeometry args={[0.09, 0.05, 0.04]} />
              <meshStandardMaterial color="#55429c" />
            </mesh>
            {[-0.032, 0.032].map((ex) => (
              <mesh key={ex} position={[ex, 0.015, 0.072]}>
                <boxGeometry args={[0.026, 0.018, 0.01]} />
                <meshStandardMaterial color="#7cffb2" emissive="#7cffb2" emissiveIntensity={1.6} />
              </mesh>
            ))}
            {/* horn, sweeping up-forward off the forehead */}
            <mesh position={[0, 0.1, 0.05]} rotation={[0.5, 0, 0]}>
              <boxGeometry args={[0.022, 0.2, 0.022]} />
              <meshStandardMaterial color="#d8d6ce" />
            </mesh>
          </group>
        </group>

        {/* sunset can — small uplight on the plinth top's front corner (the
            visible fixture the spotlight is attached to) */}
        <group position={[0.18, 0.42, 0.18]}>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.06, 8]} />
            <meshStandardMaterial color="#2e2a4d" />
          </mesh>
          <mesh position={[0, 0.065, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.012, 8]} />
            <meshStandardMaterial color="#ff7a5c" emissive="#ff6a45" emissiveIntensity={3} />
          </mesh>
        </group>
      </group>
      <spotLight
        position={[9.21, 0.49, 5.66]}
        target={evaTarget}
        angle={0.5}
        penumbra={0.55}
        intensity={13}
        distance={4}
        decay={1.4}
        color="#ff7a5c"
      />
      <primitive object={evaTarget} position={[9.05, 1.7, 5.4]} />

      {/* ── tripod floor lamp — collider {13.55,5.3,0.5,0.5}. Wave E: the
          relocated "lamp with a shelf in it" ask — three wooden legs, a
          small triangular shelf nested mid-height between them (with a
          trinket), round warm shade. Main south-side light source
          (fixture-attached point light, NO shadow casting). ── */}
      <group position={[13.8, 0, 5.55]} rotation={[0, 0.4, 0]}>
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[0, (i / 3) * Math.PI * 2, 0]}>
            <mesh position={[0, 0.62, 0.13]} rotation={[0.22, 0, 0]}>
              <cylinderGeometry args={[0.018, 0.022, 1.3, 7]} />
              <meshStandardMaterial color="#8a5a3b" />
            </mesh>
          </group>
        ))}
        {/* hub where the legs meet */}
        <mesh position={[0, 1.27, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.07, 8]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {/* triangular mid-shelf nested between the legs */}
        <mesh position={[0, 0.6, 0]} rotation={[0, Math.PI / 3, 0]}>
          <cylinderGeometry args={[0.21, 0.21, 0.025, 3]} />
          <meshStandardMaterial color="#8b5e3c" />
        </mesh>
        {/* trinket on the shelf — tiny teal bottle */}
        <mesh position={[0.04, 0.66, 0.02]}>
          <cylinderGeometry args={[0.025, 0.03, 0.09, 7]} />
          <meshStandardMaterial color="#2e6e54" />
        </mesh>
        {/* round warm shade */}
        <mesh position={[0, 1.44, 0]}>
          <cylinderGeometry args={[0.17, 0.23, 0.3, 12, 1, true]} />
          <meshStandardMaterial color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={0.9} side={2} />
        </mesh>
        <pointLight position={[0, 1.44, 0]} color="#ffd9a0" intensity={10} distance={7} decay={1.8} />
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

        {/* katana on a two-prong dark stand — taller prongs so the sword
            sits proud of the shelf */}
        {[-0.3, 0.3].map((sx) => (
          <group key={sx} position={[sx, 0, 0]}>
            <mesh position={[0, 0.008, 0]}>
              <boxGeometry args={[0.07, 0.016, 0.09]} />
              <meshStandardMaterial color="#1a1a22" />
            </mesh>
            <mesh position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.016, 0.02, 0.1, 6]} />
              <meshStandardMaterial color="#1a1a22" />
            </mesh>
            <mesh position={[0.035, 0.13, 0]} rotation={[0, 0, -0.5]}>
              <boxGeometry args={[0.026, 0.09, 0.026]} />
              <meshStandardMaterial color="#1a1a22" />
            </mesh>
            <mesh position={[-0.035, 0.13, 0]} rotation={[0, 0, 0.5]}>
              <boxGeometry args={[0.026, 0.09, 0.026]} />
              <meshStandardMaterial color="#1a1a22" />
            </mesh>
          </group>
        ))}
        <group position={[0, 0.175, 0]}>
          {/* scabbard — deep red, 4 segments with per-segment lift = curve */}
          {[-0.42, -0.14, 0.14, 0.42].map((sx, i) => (
            <mesh key={sx} position={[sx, i * 0.014 - 0.021, 0]}>
              <boxGeometry args={[0.3, 0.085, 0.085]} />
              <meshStandardMaterial color="#b3475f" emissive="#b3475f" emissiveIntensity={0.45} />
            </mesh>
          ))}
          {/* darker bands */}
          {[-0.55, -0.05, 0.45].map((sx, i) => (
            <mesh key={sx} position={[sx, i * 0.014 - 0.028, 0]}>
              <boxGeometry args={[0.045, 0.095, 0.095]} />
              <meshStandardMaterial color="#26141c" />
            </mesh>
          ))}
          {/* handle (pale bone wrap) + gold guard */}
          <mesh position={[-0.73, -0.028, 0]}>
            <boxGeometry args={[0.17, 0.07, 0.07]} />
            <meshStandardMaterial color="#e8ddc4" emissive="#e8ddc4" emissiveIntensity={0.18} />
          </mesh>
          <mesh position={[-0.63, -0.026, 0]}>
            <boxGeometry args={[0.025, 0.11, 0.11]} />
            <meshStandardMaterial color="#8a7a4a" />
          </mesh>
        </group>

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
        <group position={[1.3, 0, 0.08]}>
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
          <pointLight position={[0, 0.12, 0]} color="#ffd9a0" intensity={0.8} distance={1.2} decay={2} />
        </group>
      </group>
    </group>
  );
}
