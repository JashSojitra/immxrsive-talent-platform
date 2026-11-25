"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ScanReveal } from "@/components/motion/ScanReveal";
import { TiltSurface } from "@/components/motion/TiltSurface";
import { springs } from "@/components/motion/tokens";
import { SpatialGlyph } from "./SpatialGlyph";
import styles from "./home.module.css";

export type HomeProject = { id: string; title: string; description: string; domain: string; status: string; managementMode: string; technologies: string[] };

const statusLabel = (status: string) => status.replaceAll("_", " ").toLowerCase();
const excerpt = (text: string, max = 190) => (text.length > max ? `${text.slice(0, max - 3)}…` : text);

/**
 * Editorial project index. Rows are the navigation; on wide screens a sticky spatial viewer
 * follows hover/focus. The viewer is decorative (aria-hidden) because every detail it shows
 * is also inside the focused row.
 */
export function WorkIndex({ projects }: { projects: HomeProject[] }) {
  const [active, setActive] = useState(0);
  const current = projects[active];
  return <section className={styles.work} aria-labelledby="work-title">
    <ScanReveal className={styles.sectionHeading}>
      <div><p className="ui-eyebrow">01 / The work</p><h2 id="work-title">From possibility<br />to <em>proof.</em></h2></div>
      <div><p>Real projects. Visible contributions.{" "}<br />A closer look at what students are building.</p><Link href="/projects">View all projects <span aria-hidden="true">&#8599;</span></Link></div>
    </ScanReveal>
    {projects.length ? <div className={styles.workGrid}>
      <ol className={styles.workList}>
        {projects.map((project, index) => <li key={project.id} className={styles.workRow} data-active={index === active || undefined}>
          <Link href={`/projects/${encodeURIComponent(project.id)}`} onPointerEnter={() => setActive(index)} onFocus={() => setActive(index)}>
            <span className={styles.workIndex}>{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.workTitle}>{project.title}</span>
            <span className={styles.workMeta}>{project.domain}<span aria-hidden="true"> · </span>{project.managementMode === "ADMIN_MANAGED" ? "Staff-curated" : "Student project"}</span>
            <span className={styles.workArrow} aria-hidden="true">&#8599;</span>
          </Link>
          <p className={styles.workDescription}>{excerpt(project.description)}</p>
          {project.technologies.length > 0 && <ul className={styles.workTags} aria-label={`${project.title} technologies`}>{project.technologies.slice(0, 4).map(tech => <li key={tech}>{tech}</li>)}</ul>}
        </li>)}
      </ol>
      <div className={styles.viewer} aria-hidden="true">
        <TiltSurface className={styles.viewerSurface}>
          <AnimatePresence mode="popLayout" initial={false}>
            {current && <motion.div
              key={current.id}
              className={styles.viewerInner}
              initial={{ opacity: 0, rotateY: -18, z: -80 }}
              animate={{ opacity: 1, rotateY: 0, z: 0 }}
              exit={{ opacity: 0, rotateY: 18, z: -80 }}
              transition={springs.soft}
            >
              <SpatialGlyph id={current.id} label={current.domain} />
              <div className={styles.viewerCaption}>
                <span className="ui-hud">{String(active + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")} · {statusLabel(current.status)}</span>
                <strong>{current.title}</strong>
                <p>{excerpt(current.description, 150)}</p>
              </div>
            </motion.div>}
          </AnimatePresence>
        </TiltSurface>
      </div>
    </div> : <div className="ui-empty">Published projects will appear here. <Link href="/talent">Meet the people behind the next idea.</Link></div>}
  </section>;
}
