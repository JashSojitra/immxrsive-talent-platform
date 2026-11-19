"use client";
import Link from "next/link";
import { motion, useScroll, useSpring } from "motion/react";
import { useRef, type CSSProperties } from "react";
import { ScanReveal } from "@/components/motion/ScanReveal";
import { TiltSurface } from "@/components/motion/TiltSurface";
import { follow } from "@/components/motion/tokens";
import { seeded } from "./SpatialGlyph";
import styles from "./home.module.css";

export type HomePerson = { id: string; name: string; headline: string; status: "current" | "alumni"; skills: string[]; projectEvidenceCount: number };

const initials = (name: string) => name.split(" ").map(part => part[0]).slice(0, 2).join("");

/** Horizontally scrolling portfolio plates (native scroll + snap) with 3D tilt and a progress line. */
export function PeopleRail({ people }: { people: HomePerson[] }) {
  const rail = useRef<HTMLUListElement>(null);
  const { scrollXProgress } = useScroll({ container: rail });
  const progress = useSpring(scrollXProgress, follow.scroll);
  return <section className={styles.people} aria-labelledby="talent-title">
    <ScanReveal className={styles.sectionHeading}>
      <div><p className="ui-eyebrow">02 / The people</p><h2 id="talent-title">Built by people.<br /><em>Discovered here.</em></h2></div>
      <div><p>Explore published portfolios, skills,{" "}<br />and the contributions behind the work.</p><Link href="/talent">Meet the talent <span aria-hidden="true">&#8599;</span></Link></div>
    </ScanReveal>
    {people.length ? <>
      <ul ref={rail} className={styles.rail}>
        {people.map((person, index) => {
          const [hue, angle] = seeded(person.id, 2);
          return <li key={person.id}>
            <TiltSurface className={styles.plate}>
              <Link href={`/students/${encodeURIComponent(person.id)}`} className={styles.plateLink} style={{ "--aura-mix": `${Math.round(hue * 100)}%`, "--aura-angle": `${Math.round(angle * 360)}deg` } as CSSProperties}>
                <span className={styles.plateAura} aria-hidden="true" />
                <span className={styles.plateTop} aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span><span>{person.status === "alumni" ? "Alumni" : "Current student"}</span></span>
                <span className={styles.plateInitials} aria-hidden="true">{initials(person.name)}</span>
                <span className={styles.plateBody}>
                  <h3>{person.name}</h3>
                  <span className={styles.plateHeadline}>{person.headline}</span>
                  <span className={styles.plateSkills}>{person.skills.slice(0, 3).join(" · ")}</span>
                </span>
                <span className={styles.plateArrow} aria-hidden="true">&#8599;</span>
              </Link>
            </TiltSurface>
          </li>;
        })}
      </ul>
      <div className={styles.railTrack} aria-hidden="true"><motion.span data-motion-static="" style={{ scaleX: progress }} /></div>
    </> : <div className="ui-empty">The talent directory will grow as students choose to publish their portfolios.</div>}
  </section>;
}
