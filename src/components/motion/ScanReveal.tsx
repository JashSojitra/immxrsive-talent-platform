"use client";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { springs } from "./tokens";

/**
 * Section-entry reveal with spatial meaning: content is "scanned" into view by a clip-path wipe
 * with a light edge, instead of a generic fade-up. Content stays in the DOM and readable
 * by assistive technology; reduced motion shows it immediately via `[data-motion-static]`.
 */
export function ScanReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return <motion.div
    className={className}
    data-motion-static=""
    initial={{ clipPath: "inset(0 0 100% 0)", y: 24 }}
    whileInView={{ clipPath: "inset(0 0 0% 0)", y: 0 }}
    viewport={{ once: true, margin: "0px 0px -12% 0px" }}
    transition={{ ...springs.soft, delay }}
  >{children}</motion.div>;
}
