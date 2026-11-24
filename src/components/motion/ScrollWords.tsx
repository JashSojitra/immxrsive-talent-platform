"use client";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

function Word({ word, index, total, progress }: { word: string; index: number; total: number; progress: MotionValue<number> }) {
  const start = index / total;
  const end = Math.min(1, start + 1.5 / total);
  const opacity = useTransform(progress, [start, end], [0.65, 1]);
  const y = useTransform(progress, [start, end], ["0.18em", "0em"]);
  return <motion.span data-motion-static="" aria-hidden="true" style={{ opacity, y, display: "inline-block" }}>{word}&nbsp;</motion.span>;
}

/**
 * Scroll-linked reading: each word brightens as the passage crosses the viewport.
 * The sentence is exposed once as visually hidden text; reduced motion shows every word lit
 * (CSS hook `[data-motion-static]` in globals.css, so SSR and client markup stay identical).
 */
export function ScrollWords({ text, className, as: Tag = "p" }: { text: string; className?: string; as?: "p" | "h2" }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(" ");
  return <Tag ref={ref} className={className}>
    <span className="ui-visually-hidden">{text}</span>
    {words.map((word, index) => <Word key={`${word}-${index}`} word={word} index={index} total={words.length} progress={scrollYProgress} />)}
  </Tag>;
}
