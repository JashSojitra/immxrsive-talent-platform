import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ProjectDetailMotion } from "@/components/project-detail/ProjectDetailMotion";
import styles from "./project-editor.module.css";

export function ProjectWorkspace({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <ProjectDetailMotion>
    <a className={styles.skip} href="#project-workspace">Skip to project workspace</a>
    <div className={styles.workspace}>
      <header className={styles.nav} data-project-nav><BrandLogo /><nav aria-label="Student projects"><Link href="/student/dashboard">Dashboard</Link><Link href="/student/projects">My Projects</Link></nav></header>
      <section className={styles.hero}><p className={styles.eyebrow} data-project-lead>Student studio / Project evidence</p><h1 data-project-title>{title}</h1><p data-project-lead>{intro}</p><span className={styles.orbit} aria-hidden="true" /></section>
      <div id="project-workspace">{children}</div>
      <footer className={styles.footer}><span>NOT ImmXrsive / Your work, in context.</span><Link href="/talent">Explore talent</Link></footer>
    </div>
  </ProjectDetailMotion>;
}
