"use client";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { ReactNode } from "react";
import { follow } from "./tokens";

/**
 * A surface that tilts toward a fine pointer in 3D and carries a pointer-tracked light
 * (exposed as --light-x / --light-y for the child's CSS). Children are not transformed for touch.
 */
export function TiltSurface({ children, className, max = 9 }: { children: ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), follow.tilt);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), follow.tilt);
  const lightX = useMotionTemplate`${useTransform(px, v => v * 100)}%`;
  const lightY = useMotionTemplate`${useTransform(py, v => v * 100)}%`;
  return <motion.div
    className={className}
    style={{ rotateX, rotateY, transformPerspective: 900, "--light-x": lightX, "--light-y": lightY } as never}
    onPointerMove={event => {
      if (reduce || event.pointerType !== "mouse") return;
      const rect = event.currentTarget.getBoundingClientRect();
      px.set((event.clientX - rect.left) / rect.width);
      py.set((event.clientY - rect.top) / rect.height);
    }}
    onPointerLeave={() => { px.set(0.5); py.set(0.5); }}
  >{children}</motion.div>;
}
