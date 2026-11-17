import { publicAdminShowcases } from "@/admin/public";
import { AdminDiscovery } from "@/admin/Discovery";
import Link from "next/link";
import { getRuntimeDatabase } from "@/db/runtime";
import { publicShowcases } from "@/studio/service";
import { safeEvidenceUrl } from "@/projects/evidence-url";
import { ProjectWorkspace } from "@/components/project-editor/ProjectWorkspace";
import styles from "@/components/project-editor/project-editor.module.css";
export const dynamic = "force-dynamic";
export default async function Showcase() {
  const [rows, adminRows] = await Promise.all([publicShowcases(getRuntimeDatabase()), publicAdminShowcases(getRuntimeDatabase())]);
  return <ProjectWorkspace audience="public" title="Made to be experienced." intro="Explore administrator showcases and student-owned XR projects. Student-owned Studio showcases retain their owner approval workflow."><AdminDiscovery rows={adminRows} /><h2>Student-owned XR Studio</h2>{rows.map(row => <article className={styles.card} key={row.projectId}><h2><Link href={`/projects/${encodeURIComponent(row.projectId)}`}>{row.title}</Link></h2><p>{row.summary}</p><div className={styles.actions}>{safeEvidenceUrl(row.mediaUrl) && <a href={row.mediaUrl} rel="noopener noreferrer" target="_blank">View media (external)</a>}{safeEvidenceUrl(row.demoUrl) && <a href={row.demoUrl} rel="noopener noreferrer" target="_blank">Launch demo (external)</a>}</div></article>)}{!rows.length && <p>No approved showcases published yet.</p>}</ProjectWorkspace>;
}
