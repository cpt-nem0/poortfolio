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

export function Workspace() {
  const R = WORKSPACE;
  const rootRef = useRef<THREE.Group>(null);

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

            {/* hotwheels, beside the monitor's base */}
            {[
              { x: -0.3, c: "#b3475f", r: 0.2 },
              { x: -0.1, c: "#3d5a99", r: -0.15 },
              { x: 0.1, c: "#c98a2e", r: 0.25 },
              { x: 0.3, c: "#2e6e54", r: -0.1 },
            ].map((car) => (
              <group key={car.x} position={[car.x, 0.127, 0.06]} rotation={[0, car.r, 0]}>
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

            {/* 32" monitor, centered on the riser */}
            <group position={[0, 0.127, 0]}>
              <mesh position={[0, 0.01, 0]}>
                <boxGeometry args={[0.1, 0.02, 0.1]} />
                <meshStandardMaterial color="#1c1c24" />
              </mesh>
              <mesh position={[0, 0.06, 0]}>
                <boxGeometry args={[0.05, 0.08, 0.04]} />
                <meshStandardMaterial color="#1c1c24" />
              </mesh>
              <mesh position={[0, 0.3025, 0]}>
                <boxGeometry args={[0.72, 0.405, 0.035]} />
                <meshStandardMaterial color="#1c1c24" />
              </mesh>
              <mesh position={[0, 0.3025, 0.024]}>
                <planeGeometry args={[0.68, 0.375]} />
                <meshBasicMaterial map={termTex} />
              </mesh>
              {/* light bar — visible fixture, subtle downward glow, no shadow */}
              <mesh position={[0, 0.52, -0.005]}>
                <boxGeometry args={[0.66, 0.03, 0.045]} />
                <meshStandardMaterial color="#141419" />
              </mesh>
              <pointLight position={[0, 0.49, 0.06]} color="#ffcf9e" intensity={0.9} distance={1.4} decay={2} />
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

          {/* potted plant — front-right corner */}
          <group position={[1.05, 0, 0.32]}>
            <mesh position={[0, 0.035, 0]}>
              <cylinderGeometry args={[0.045, 0.035, 0.07, 10]} />
              <meshStandardMaterial color="#8a5a3d" />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <sphereGeometry args={[0.05, 8, 6]} />
              <meshStandardMaterial color="#2e6e54" />
            </mesh>
            <mesh position={[0, 0.15, 0]}>
              <sphereGeometry args={[0.035, 8, 6]} />
              <meshStandardMaterial color="#3c8a68" />
            </mesh>
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

      {/* ── gaming chair — collider {10.7,1.5,0.8,0.8}. All black w/ gray
          piping + lumbar accent; full-height backrest + headrest. ── */}
      <group position={[11.1, 0, 1.9]} rotation={[0, 0.25, 0]}>
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

      {/* ── shelf unit — collider {8.15,4.3,0.55,1.1} ── */}
      <group position={[8.425, 0, 4.85]}>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[0.55, 1.4, 1.1]} />
          <meshStandardMaterial color="#6b4128" />
        </mesh>
        {[0.35, 0.8, 1.25].map((sy, row) => (
          <group key={sy}>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} position={[0.2, sy, -0.4 + i * 0.26]} rotation={[0, 0, -0.04 + (((i + row) % 3) as number) * 0.04]}>
                <boxGeometry args={[0.05, 0.24, 0.2]} />
                <meshStandardMaterial
                  color={["#5b4b8a", "#2e6e54", "#c98a2e", "#b3475f"][(i + row) % 4]}
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* ── floor lamp — collider {8.9,5.3,0.35,0.35} ── */}
      <group position={[9.075, 0, 5.475]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.16, 0.18, 0.04, 10]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.55, 8]} />
          <meshStandardMaterial color="#2e2a4d" />
        </mesh>
        <mesh position={[0, 1.68, 0]}>
          <cylinderGeometry args={[0.14, 0.2, 0.26, 10, 1, true]} />
          <meshStandardMaterial color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={0.9} side={2} />
        </mesh>
      </group>
      <pointLight castShadow shadow-mapSize={[512, 512]} shadow-bias={-0.004} shadow-radius={5} shadow-intensity={0.4} position={[9.075, 1.75, 5.475]} color="#ffd9a0" intensity={9} distance={6.5} decay={1.8} />
    </group>
  );
}
