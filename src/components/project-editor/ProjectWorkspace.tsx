import Link from "next/link";
import type { ReactNode } from "react";
import { ProjectDetailMotion } from "@/components/project-detail/ProjectDetailMotion";
import styles from "./project-editor.module.css";

export function ProjectWorkspace({ title, intro, children, audience = "student" }: { title: string; intro: string; children: ReactNode; audience?: "student" | "public" }) {
  return <ProjectDetailMotion>
    <a className={styles.skip} href="#project-workspace">Skip to project workspace</a>
    <div className={styles.workspace}>
      <nav className={styles.nav} aria-label="Breadcrumb">{audience === "public" ? <><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/projects">Projects</Link><span aria-hidden="true">/</span><span>Showcase</span></> : <><Link href="/student/dashboard">Student dashboard</Link><span aria-hidden="true">/</span><Link href="/student/projects">My Projects</Link></>}</nav>
      <section className={styles.hero}><p className={styles.eyebrow}>{audience === "public" ? "Project experiences / Showcase" : "Student workspace"}</p><h1>{title}</h1><p>{intro}</p></section>
      <div id="project-workspace" tabIndex={-1}>{children}</div>
    </div>
  </ProjectDetailMotion>;
}
