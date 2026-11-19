"use client";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { ReactNode } from "react";
import { follow } from "./tokens";

/**
 * Pulls its child toward a fine pointer with a spring and releases it on leave.
 * Purely visual: the child keeps its own semantics, focus and hit area.
 */
export function Magnetic({ children, strength = 0.28, className }: { children: ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), follow.magnetic);
  const y = useSpring(useMotionValue(0), follow.magnetic);
  return <motion.span
    className={className}
    style={{ display: "inline-flex", x, y }}
    onPointerMove={event => {
      if (reduce || event.pointerType !== "mouse") return;
      const rect = event.currentTarget.getBoundingClientRect();
      x.set((event.clientX - rect.left - rect.width / 2) * strength);
      y.set((event.clientY - rect.top - rect.height / 2) * strength);
    }}
    onPointerLeave={() => { x.set(0); y.set(0); }}
  >{children}</motion.span>;
}
