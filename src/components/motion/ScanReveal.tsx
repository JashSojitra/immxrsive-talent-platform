"use client";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { springs } from "./tokens";

/**
 * Section entry stays readable from its first frame. A bounded settle replaces the original
 * full clipping mask, which left empty heading-sized holes until viewport entry.
 */
export function ScanReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return <motion.div
    className={className}
    data-motion-static=""
    initial={{ clipPath: "inset(0 0 0% 0)", y: 8, opacity: 0.88 }}
    whileInView={{ clipPath: "inset(0 0 0% 0)", y: 0, opacity: 1 }}
    viewport={{ once: true, margin: "0px 0px -12% 0px" }}
    transition={{ ...springs.soft, delay }}
  >{children}</motion.div>;
}
