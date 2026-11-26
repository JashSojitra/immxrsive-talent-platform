import Link from "next/link";
import type { ReactNode } from "react";
import { ScanReveal } from "@/components/motion/ScanReveal";
import { TiltSurface } from "@/components/motion/TiltSurface";
import styles from "./home.module.css";
/** Shared rail plate for homepage editorial cards. */
export function PeopleRailCard({ children }: { children: ReactNode }) {
  return <li><TiltSurface className={styles.plate}>{children}</TiltSurface></li>;
}
export function PeopleHeading() {
  return <section className={styles.people} aria-labelledby="talent-title"><ScanReveal className={styles.sectionHeading}><div><p className="ui-eyebrow">The people</p><h2 id="talent-title">Built by people.<br /><em>Discovered here.</em></h2></div><div><p>Explore published portfolios, skills,<br />and the contributions behind the work.</p><Link href="/talent">Meet the talent <span aria-hidden="true">&#8599;</span></Link></div></ScanReveal></section>;
}
