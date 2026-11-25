"use client";
/* Adapted from https://skiper-ui.com/r/skiper34.json. Original registry payload retained in docs/design/skiper-registry. Styling uses CSS Modules; Motion uses motion/react; shared Lenis is page-owned. */

import {
  motion,
  useInView,
  useMotionValueEvent,
  useMotionValue,
  useScroll,
  useTransform,
} from "motion/react";
import type { ReactNode } from "react";
import styles from "./skiper.module.css";
import { useEffect, useRef } from "react";

const StickyCard_003 = ({ imgUrl, alt, children }: { imgUrl: string; alt: string; children?: ReactNode }) => {
  const vertMargin = 10;
  const container = useRef(null);
  const maxScrollY = useMotionValue(0);

  const filter = useMotionValue(0);
  const negateFilter = useTransform(filter, (value) => -value);

  const { scrollY } = useScroll({
    target: container,
  });
  const scale = useMotionValue(1);
  const isInView = useInView(container, {
    margin: `0px 0px -${100 - vertMargin}% 0px`,
    once: true,
  });

  useMotionValueEvent(scrollY, "change", (scrollY) => {
    let animationValue = 1;
    if (scrollY > maxScrollY.get()) {
      animationValue = Math.max(0, 1 - (scrollY - maxScrollY.get()) / 10000);
    }

    scale.set(animationValue);
    filter.set((1 - animationValue) * 100);
  });

  useEffect(() => {
    if (isInView) {
      maxScrollY.set(scrollY.get());
    }
  }, [isInView, scrollY, maxScrollY]);

  return (
    <motion.figure
      ref={container}
      data-skiper="34" data-motion-static="" className={styles.stickyCard}
      style={{
        scale: scale,
        rotate: filter,
        height: `${100 - 2 * vertMargin}vh`,
        top: `${vertMargin}vh`,
      }}
    >
      <motion.img
        src={imgUrl}
        alt={alt}
        style={{
          rotate: negateFilter,
        }}
        data-motion-static="" className={styles.stickyImage}
        sizes="90vw"
      />
      <figcaption className={styles.caption}>{children}</figcaption>
    </motion.figure>
  );
};

export { StickyCard_003 };

/**
 * Skiper 34 StickyCard_003 — React + framer motion + lenis
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
