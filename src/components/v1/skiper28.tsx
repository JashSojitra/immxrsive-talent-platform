"use client";
/* Adapted from https://skiper-ui.com/r/skiper28.json. Original registry payload retained in docs/design/skiper-registry. Styling uses CSS Modules; Motion uses motion/react; shared Lenis is page-owned. */

import {
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from "motion/react";
import styles from "./skiper.module.css";
import React, { useRef } from "react";

const Skiper28 = ({ text }: { text: string }) => {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start 65%", "end 65%"],
  });

  // Keep the registry's perspective scroll mapping within its reserved reading space.
  const yMotionValue = useTransform(scrollYProgress, [0, 1], [16, 0]);
  const rotation = useTransform(scrollYProgress, [0, 1], [8, 0]);
  const transform = useMotionTemplate`rotateX(${rotation}deg) translateY(${yMotionValue}px)`;

  return (
    <section data-skiper="28" className={styles.perspective}>
      <div
        ref={targetRef}
        className={styles.perspectiveTrack}
      >
        
        <div
          className={styles.perspectiveStage}
          style={{
            transformStyle: "preserve-3d",
            perspective: "1200px",
          }}
        >
          <motion.div
            style={{
              transformStyle: "preserve-3d",
              transform,
            }}
            data-motion-static="" className={styles.perspectiveText}
          >
{text}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export { Skiper28 };

/**
 * Skiper 28 PerspectiveTextScroll — React + framer motion + lenis
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
