import type { SpringOptions, Transition } from "motion/react";

/**
 * Motion presets for the ImmXrsive public experience.
 * - Transitions (`springs.*`) go to `transition` props.
 * - `follow.*` are SpringOptions for `useSpring` (pointer, scroll smoothing).
 * CSS counterparts: --ease-spring, --ease-out, --motion-* in globals.css.
 */
export const springs = {
  /** UI response: buttons, indicators, toggles. */
  snappy: { type: "spring", stiffness: 520, damping: 36, mass: 0.6 },
  /** Panels and section-level reveals. */
  soft: { type: "spring", stiffness: 150, damping: 22, mass: 0.9 },
  /** Large spatial moves (camera-like). */
  scene: { type: "spring", stiffness: 60, damping: 18, mass: 1.1 },
} as const satisfies Record<string, Transition>;

export const follow = {
  /** Magnetic pull toward the pointer. */
  magnetic: { stiffness: 260, damping: 18, mass: 0.35 },
  /** 3D tilt surfaces. */
  tilt: { stiffness: 180, damping: 20, mass: 0.5 },
  /** Scroll-linked values; removes wheel jitter. */
  scroll: { stiffness: 140, damping: 30, restDelta: 0.001 },
} as const satisfies Record<string, SpringOptions>;

export const ease = {
  out: [0.32, 0.72, 0, 1],
  move: [0.77, 0, 0.175, 1],
} as const;

export const stagger = { word: 0.045, line: 0.11, item: 0.06 } as const;
