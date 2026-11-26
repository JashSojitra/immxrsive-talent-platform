"use client";
import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type CSSProperties } from "react";
import { CountUp } from "@/components/motion/CountUp";
import { KineticText } from "@/components/motion/KineticText";
import { Magnetic } from "@/components/motion/Magnetic";
import { follow } from "@/components/motion/tokens";
import { SpatialStage } from "@/components/spatial/SpatialStage";
import styles from "./home.module.css";

export type HeroStats = { projects: number; portfolios: number; partners: number };

export function HomeHero({ stats }: { stats: HeroStats }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  // Scroll-linked exit: the copy recedes as the camera dollies through the gate (shader reads the same scroll).
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const progress = useSpring(scrollYProgress, follow.scroll);
  const copyY = useTransform(progress, [0, 1], ["0%", "-18%"]);
  const copyOpacity = useTransform(progress, [0, 0.7], [1, 0]);
  const copyBlur = useTransform(progress, [0, 0.7], ["blur(0px)", "blur(6px)"]);
  // Depth layering: copy and portal drift in opposite directions with the pointer.
  const pointerX = useSpring(useMotionValue(0), follow.tilt);
  const pointerY = useSpring(useMotionValue(0), follow.tilt);
  const nearX = useTransform(pointerX, v => v * -10);
  const nearY = useTransform(pointerY, v => v * -6);
  const farX = useTransform(pointerX, v => v * 16);
  const farY = useTransform(pointerY, v => v * 10);

  return <section
    ref={ref}
    className={styles.hero}
    aria-labelledby="home-title"
    data-kinetic-field=""
    onPointerMove={event => {
      if (reduce || event.pointerType !== "mouse") return;
      pointerX.set(event.clientX / window.innerWidth - 0.5);
      pointerY.set(event.clientY / window.innerHeight - 0.5);
    }}
  >
    <SpatialStage />
    <div className={styles.heroHud} aria-hidden="true">
      <span>ImmXrsive / Scene 01</span>
      <span className={styles.hudCenter}>The crossing</span>
      <span>Physical ⟷ Digital</span>
    </div>
    <motion.div className={styles.heroCopy} data-motion-static="" style={{ y: copyY, opacity: copyOpacity, filter: copyBlur }}>
      <motion.div style={{ x: nearX, y: nearY }}>
        <p className={`ui-eyebrow ${styles.heroEyebrow}`}><span className={styles.liveDot} />Student talent. New dimensions.</p>
        <h1 id="home-title" className={styles.heroTitle}>
          <span className={styles.line} style={{ "--line": 0 } as CSSProperties}><span className={styles.lineInner}><KineticText text="The people." /></span></span>
          <span className={styles.line} style={{ "--line": 1 } as CSSProperties}><span className={styles.lineInner}><KineticText text="The ideas." /></span></span>
          <span className={styles.line} style={{ "--line": 2 } as CSSProperties}><span className={`${styles.lineInner} ${styles.serifLine}`}><em>The possibilities.</em></span></span>
        </h1>
        <p className={styles.heroIntro}>Discover student talent and the work moving immersive technology forward. From first experiments to experiences you can explore.</p>
        <div className={styles.actions}>
          <Magnetic><Link href="/talent" className="ui-button ui-button-primary">Discover talent <span aria-hidden="true">&#8599;</span></Link></Magnetic>
          <Magnetic strength={0.18}><Link href="/projects" className="ui-button">Explore the work <span aria-hidden="true">&#8599;</span></Link></Magnetic>
        </div>
        <ul className={styles.heroNote} aria-label="Focus areas"><li>XR &amp; spatial computing</li><li>Software &amp; creative technology</li></ul>
      </motion.div>
    </motion.div>
    <motion.div className={styles.portalWrap} style={{ x: farX, y: farY }}>
      <Link href="/world" className={`${styles.portal} ui-glass`} aria-label="Step into the ImmXrsive World">
        <span className={styles.portalKicker}>Beyond the screen</span>
        <strong>Step into the ImmXrsive World</strong>
        <span className={styles.portalNote}>Meet Spark. Explore stories and projects.</span>
        <span className={styles.portalArrow} aria-hidden="true">&#8599;</span>
      </Link>
    </motion.div>
    <dl className={styles.telemetry}>
      <div><dt>Published projects</dt><dd><CountUp value={stats.projects} /></dd></div>
      <div><dt>Public portfolios</dt><dd><CountUp value={stats.portfolios} /></dd></div>
      <div><dt>Industry partners</dt><dd><CountUp value={stats.partners} /></dd></div>
      <div className={styles.scrollCue} aria-hidden="true"><span>Scroll to enter</span><i /></div>
    </dl>
  </section>;
}
