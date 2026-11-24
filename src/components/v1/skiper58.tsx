"use client";
/* Adapted from https://skiper-ui.com/r/skiper58.json. Original registry payload retained in docs/design/skiper-registry. Styling uses CSS Modules; Motion uses motion/react; shared Lenis is page-owned. */

import { motion } from "motion/react";
import React from "react";

import styles from "./skiper.module.css";

const STAGGER = 0.035;

const TextRoll: React.FC<{
  children: string;
  className?: string;
  center?: boolean;
}> = ({ children, className, center = false }) => {
  return (
    <motion.span
      initial="initial"
      whileHover="hovered"
      data-skiper="58"
      className={`${styles.textRoll} ${className ?? ""}`}
      style={{
        lineHeight: 1.3,
      }}
    >
      <span className="ui-visually-hidden">{children}</span>
      <span aria-hidden="true" className={styles.rollLine}>
        {children.split("").map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (children.length - 1) / 2)
            : STAGGER * i;

          return (
            <motion.span
              variants={{
                initial: {
                  y: 0,
                },
                hovered: {
                  y: "-100%",
                },
              }}
              transition={{
                ease: "easeInOut",
                delay,
              }}
              data-motion-static="" className={styles.character}
              key={i}
            >
              {l}
            </motion.span>
          );
        })}
      </span>
      <span aria-hidden="true" className={styles.rollDuplicate}>
        {children.split("").map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (children.length - 1) / 2)
            : STAGGER * i;

          return (
            <motion.span
              variants={{
                initial: {
                  y: "100%",
                },
                hovered: {
                  y: 0,
                },
              }}
              transition={{
                ease: "easeInOut",
                delay,
              }}
              data-motion-static="" className={styles.character}
              key={i}
            >
              {l}
            </motion.span>
          );
        })}
      </span>
    </motion.span>
  );
};

export { TextRoll };
