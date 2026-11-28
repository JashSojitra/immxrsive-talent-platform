import { publicAdminShowcases } from "@/admin/public";
import { AdminDiscovery } from "@/admin/Discovery";
import Link from "next/link";
import { getRuntimeDatabase } from "@/db/runtime";
import { publicShowcases } from "@/studio/service";
import { safeEvidenceUrl } from "@/projects/evidence-url";
import { ProjectWorkspace } from "@/components/project-editor/ProjectWorkspace";
import { listPublicProjects } from "@/projects/public-directory";
import { ProjectExhibition } from "@/components/home/ProjectExhibition";
import { Skiper31 } from "@/components/v1/skiper31";
import styles from "@/components/project-editor/project-editor.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "XR showcase", description: "Explore published XR experiences, project walkthroughs, and interactive student work." };
export default async function Showcase() {
  const [rows, adminRows, projects] = await Promise.all([publicShowcases(getRuntimeDatabase()), publicAdminShowcases(getRuntimeDatabase()), listPublicProjects(getRuntimeDatabase())]);
  return <ProjectWorkspace audience="public" title="Made to be" accent="experienced." intro="Step inside published XR work. Explore interactive experiences, video walkthroughs, and project stories. Each project explains how to launch it and which devices it needs.">
    {(rows.length > 0 || adminRows.length > 0) && <div className={styles.identity}><span>Choose your way in</span><p>Browser demos launch only when you choose. Native VR and headset projects may need a compatible device; alternate evidence stays available.</p><Link href="/projects">Browse all projects</Link></div>}
    {(rows.length > 0 || adminRows.length > 0) && <Skiper31 text="Made to be experienced." />}
    <ProjectExhibition projects={projects.filter(project => adminRows.some(row => row.projectId === project.id) || rows.some(row => row.projectId === project.id))} />
    <AdminDiscovery rows={adminRows} />
    {!rows.length && !adminRows.length && <p>No approved student showcases are published yet.</p>}
    {(rows.length > 0 || adminRows.length > 0) && <section className={styles.section} aria-labelledby="student-showcase-title"><h2 id="student-showcase-title">Student-owned XR Studio</h2><p>Student-led experiences with their existing owner approval and publication workflow.</p>
      {rows.map(row => <article className={styles.card} key={row.projectId}><p className={`ui-eyebrow ${styles.eyebrow}`}>Student-owned experience</p><h3 className="ui-card-title"><Link href={`/projects/${encodeURIComponent(row.projectId)}`}>{row.title}</Link></h3><p>{row.summary}</p><div className={styles.actions}><Link href={`/projects/${encodeURIComponent(row.projectId)}`}>Explore experience <span aria-hidden="true">&#8599;</span></Link>{safeEvidenceUrl(row.mediaUrl) && <a href={row.mediaUrl} rel="noopener noreferrer" target="_blank">View media (external)</a>}{safeEvidenceUrl(row.demoUrl) && <a href={row.demoUrl} rel="noopener noreferrer" target="_blank">Launch demo (external)</a>}</div></article>)}
      {!rows.length && <div className={styles.identity}><h3>More experiences are on the way.</h3><p>No approved student showcases are published yet. Explore the project collection to see other published work.</p><Link href="/projects">Explore projects</Link></div>}
    </section>}
  </ProjectWorkspace>;
}
