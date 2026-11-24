"use client";
/* Adapted from https://skiper-ui.com/r/skiper31.json. Original registry payload retained in docs/design/skiper-registry. Styling uses CSS Modules; Motion uses motion/react; shared Lenis is page-owned. */

import { motion, useScroll, useTransform } from "motion/react";

import React, { useRef } from "react";

import styles from "./skiper.module.css";
import type { MotionValue } from "motion/react";

type CharacterProps = {
  char: string;
  index: number;
  centerIndex: number;
  scrollYProgress: MotionValue<number>;
};

const CharacterV1 = ({
  char,
  index,
  centerIndex,
  scrollYProgress,
}: CharacterProps) => {
  const isSpace = char === " ";

  const distanceFromCenter = index - centerIndex;

  const x = useTransform(
    scrollYProgress,
    [0, 0.5],
    [distanceFromCenter * 0.15, 0],
  );
  const rotateX = useTransform(
    scrollYProgress,
    [0, 0.5],
    [Math.max(-6, Math.min(6, distanceFromCenter * 1.5)), 0],
  );

  return (
    <motion.span
      data-motion-static="" className={isSpace ? styles.space : styles.character}
      style={{
        x,
        rotateX,
      }}
    >
      {char}
    </motion.span>
  );
};

export function Skiper31({ text }: { text: string }) {
      const targetRef = useRef<HTMLDivElement>(null);
      const { scrollYProgress } = useScroll({ target: targetRef, offset: ["start 65%", "end 65%"] });
      return <section ref={targetRef} data-skiper="31" className={styles.textStory} aria-label={text}>
        <p className="ui-eyebrow">From atmosphere to evidence</p>
        <div className={styles.textStage} aria-hidden="true">{text.split(" ").map((word, wi) => <span className={styles.word} key={wi}>{word.split("").map((char, index) => <CharacterV1 key={index} char={char} index={index} centerIndex={Math.floor(word.length / 2)} scrollYProgress={scrollYProgress} />)} </span>)}</div>
      </section>;
    }
export { CharacterV1 };
/**
 * Skiper 31 ScrollAnimation_002 — React + framer motion + lenis
 *
 * License & Usage:
 * - Free to use and modify in both personal and commercial projects.
 * - Attribution to Skiper UI is required when using the free version.
 * - No attribution required with Skiper UI Pro.
 *
 * Feedback and contributions are welcome.
 *
 * Author: @gurvinder-singh02
 * Website: https://gxuri.me
 * Twitter: https://x.com/Gur__vi
 */
