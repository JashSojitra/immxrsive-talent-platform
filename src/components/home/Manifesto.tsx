"use client";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { ScrollWords } from "@/components/motion/ScrollWords";
import styles from "./home.module.css";

const disciplines = ["Extended reality", "Spatial computing", "Interactive design", "Software engineering", "Artificial intelligence"];

/** Scroll-lit statement plus two discipline rows that drift in opposite directions with scroll. */
export function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const forward = useTransform(scrollYProgress, [0, 1], ["4%", "-28%"]);
  const reverse = useTransform(scrollYProgress, [0, 1], ["-30%", "2%"]);
  const row = [...disciplines, ...disciplines];
  return <section ref={ref} className={styles.manifesto} aria-labelledby="manifesto-title">
    <h2 id="manifesto-title" className="ui-visually-hidden">Why ImmXrsive</h2>
    <p className={styles.manifestoKicker} aria-hidden="true"><span>00</span> Signal from the platform</p>
    <ScrollWords className={styles.manifestoText} text="Every portfolio here is a doorway. Real projects, visible contributions and the people behind them, published by students and ready to be explored in full dimension." />
    <ul className="ui-visually-hidden" aria-label="Creative technology disciplines">{disciplines.map(item => <li key={item}>{item}</li>)}</ul>
    <div className={styles.drift} aria-hidden="true">
      <motion.div className={styles.driftRow} data-motion-static="" style={{ x: forward }}>{row.map((item, index) => <span key={index}>{item}<i>✕</i></span>)}</motion.div>
      <motion.div className={`${styles.driftRow} ${styles.driftOutline}`} data-motion-static="" style={{ x: reverse }}>{row.map((item, index) => <span key={index}>{item}<i>✕</i></span>)}</motion.div>
    </div>
  </section>;
}
