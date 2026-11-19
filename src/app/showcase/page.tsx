import { publicAdminShowcases } from "@/admin/public";
import { AdminDiscovery } from "@/admin/Discovery";
import Link from "next/link";
import { getRuntimeDatabase } from "@/db/runtime";
import { publicShowcases } from "@/studio/service";
import { safeEvidenceUrl } from "@/projects/evidence-url";
import { ProjectWorkspace } from "@/components/project-editor/ProjectWorkspace";
import styles from "@/components/project-editor/project-editor.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "XR showcase", description: "Explore published XR experiences, project walkthroughs, and interactive student work." };
export default async function Showcase() {
  const [rows, adminRows] = await Promise.all([publicShowcases(getRuntimeDatabase()), publicAdminShowcases(getRuntimeDatabase())]);
  return <ProjectWorkspace audience="public" title="Made to be experienced." intro="Step inside published XR work. Explore interactive experiences, video walkthroughs, and project stories. Each project explains how to launch it and which devices it needs.">
    <div className={styles.identity}><span>Choose your way in</span><p>Browser demos launch only when you choose. Native VR and headset projects may need a compatible device; alternate evidence stays available.</p><Link href="/projects">Browse all projects</Link></div>
    <AdminDiscovery rows={adminRows} />
    <section className={styles.section} aria-labelledby="student-showcase-title"><h2 id="student-showcase-title">Student-owned XR Studio</h2><p>Student-led experiences with their existing owner approval and publication workflow.</p>
      {rows.map(row => <article className={styles.card} key={row.projectId}><p className={styles.eyebrow}>Student-owned experience</p><h3><Link href={`/projects/${encodeURIComponent(row.projectId)}`}>{row.title}</Link></h3><p>{row.summary}</p><div className={styles.actions}><Link href={`/projects/${encodeURIComponent(row.projectId)}`}>Explore experience <span aria-hidden="true">&#8599;</span></Link>{safeEvidenceUrl(row.mediaUrl) && <a href={row.mediaUrl} rel="noopener noreferrer" target="_blank">View media (external)</a>}{safeEvidenceUrl(row.demoUrl) && <a href={row.demoUrl} rel="noopener noreferrer" target="_blank">Launch demo (external)</a>}</div></article>)}
      {!rows.length && <div className={styles.identity}><h3>More experiences are on the way.</h3><p>No approved student showcases are published yet. Explore the project collection to see other published work.</p><Link href="/projects">Explore projects</Link></div>}
    </section>
  </ProjectWorkspace>;
}
