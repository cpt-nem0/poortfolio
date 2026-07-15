"use client";

import { useEffect, useRef } from "react";

const KEY_TO_AXIS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function useKeyboard() {
  const pressed = useRef(new Set<string>());
  const interactQueued = useRef(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code in KEY_TO_AXIS) {
        pressed.current.add(e.code);
        e.preventDefault();
      }
      if (e.code === "KeyE" && !e.repeat) interactQueued.current = true;
    };
    const up = (e: KeyboardEvent) => pressed.current.delete(e.code);
    const blur = () => pressed.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return {
    /** Normalized move vector from currently held keys. */
    getMove() {
      let x = 0;
      let z = 0;
      for (const code of pressed.current) {
        const axis = KEY_TO_AXIS[code];
        if (axis) {
          x += axis[0];
          z += axis[1];
        }
      }
      const len = Math.hypot(x, z);
      return len > 0 ? { x: x / len, z: z / len } : { x: 0, z: 0 };
    },
    /** True once per E press. */
    consumeInteract() {
      const q = interactQueued.current;
      interactQueued.current = false;
      return q;
    },
  };
}
