"use client";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { springs } from "./tokens";

/**
 * Wrap a Motion-driven page tree. `reducedMotion="user"` makes Motion skip transform/layout
 * animation when the OS asks for reduced motion (opacity changes still apply).
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={springs.soft}>{children}</MotionConfig>;
}
