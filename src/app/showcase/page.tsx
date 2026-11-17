import Link from "next/link";
import { getRuntimeDatabase } from "@/db/runtime";
import { publicShowcases } from "@/studio/service";
import { safeEvidenceUrl } from "@/projects/evidence-url";
import { ProjectWorkspace } from "@/components/project-editor/ProjectWorkspace";
import styles from "@/components/project-editor/project-editor.module.css";
export const dynamic = "force-dynamic";
export default async function Showcase() {
  const rows = await publicShowcases(getRuntimeDatabase());
  return <ProjectWorkspace title="Made to be experienced." intro="University XR showcase. Curated by staff, approved by project owners.">{rows.map(row => <article className={styles.card} key={row.projectId}><h2><Link href={`/projects/${encodeURIComponent(row.projectId)}`}>{row.title}</Link></h2><p>{row.summary}</p><div className={styles.actions}>{safeEvidenceUrl(row.mediaUrl) && <a href={row.mediaUrl} rel="noopener noreferrer" target="_blank">View media (external)</a>}{safeEvidenceUrl(row.demoUrl) && <a href={row.demoUrl} rel="noopener noreferrer" target="_blank">Launch demo (external)</a>}</div></article>)}{!rows.length && <p>No approved showcases published yet.</p>}</ProjectWorkspace>;
}
