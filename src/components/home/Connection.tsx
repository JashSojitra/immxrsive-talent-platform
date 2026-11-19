"use client";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Magnetic } from "@/components/motion/Magnetic";
import { ScanReveal } from "@/components/motion/ScanReveal";
import styles from "./home.module.css";

export type HomePartner = { id: string; name: string };

/** Industry connection: scroll-linked partner names (real published partners) and inquiry actions. */
export function Connection({ partners }: { partners: HomePartner[] }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["6%", "-36%"]);
  const names = partners.length ? partners.map(partner => partner.name) : ["Collaborate", "Mentor", "Hire", "Partner"];
  const band = Array.from({ length: Math.max(2, Math.ceil(8 / names.length)) }, () => names).flat();
  return <section ref={ref} className={styles.connect} aria-labelledby="collaborate-title">
    <div className={styles.connectBand} aria-hidden="true">
      <motion.div data-motion-static="" style={{ x }}>{band.map((name, index) => <span key={index}>{name}<i>✕</i></span>)}</motion.div>
    </div>
    <div className={styles.connectBody}>
      <ScanReveal><p className="ui-eyebrow">03 / The connection</p><h2 id="collaborate-title">Fresh thinking.<br /><em>Shared ambition.</em></h2></ScanReveal>
      <div>
        <p>Great work opens doors. Explore industry partners and their published collaborations, or start a conversation about a student or project that caught your attention.</p>
        {partners.length > 0 && <ul className={styles.partnerList} aria-label="Published industry partners">{partners.slice(0, 6).map(partner => <li key={partner.id}><Link href={`/partners/${encodeURIComponent(partner.id)}`}>{partner.name}</Link></li>)}</ul>}
        <div className={styles.actions}>
          <Magnetic><Link href="/partners" className="ui-button ui-button-primary">Meet industry partners <span aria-hidden="true">&#8599;</span></Link></Magnetic>
          <Magnetic strength={0.18}><Link href="/contact" className="ui-button">Start an inquiry <span aria-hidden="true">&#8599;</span></Link></Magnetic>
        </div>
      </div>
    </div>
  </section>;
}
