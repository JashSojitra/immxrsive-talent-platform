import Link from "next/link";
import { requireAuthenticatedUser } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import { staffRole, studioList } from "@/studio/service";
import { states } from "@/studio/policy";
import { ProjectWorkspace } from "@/components/project-editor/ProjectWorkspace";
import styles from "@/components/project-editor/project-editor.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "XR Studio", robots: { index: false, follow: false } };
export default async function Studio({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const user = await requireAuthenticatedUser("/studio");
  const db = getRuntimeDatabase(); const role = await staffRole(db, user.id);
  if (!role) return <ProjectWorkspace title="XR Studio" intro="Staff access required."><p>Your account has no staff permissions.</p></ProjectWorkspace>;
  const rows = await studioList(db, user.id, true); const { state } = await searchParams;
  return <ProjectWorkspace title="Shape the showcase." intro={`XR Studio / ${role.replaceAll("_", " ")}. Curate evidence while students retain ownership.`}>
    <form className={styles.section}><label htmlFor="state">Review status</label><select id="state" name="state" defaultValue={state ?? ""}><option value="">All statuses</option>{states.map(s => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select><button type="submit">Filter queue</button></form>
    {rows.filter(r => !state || r.submission.state === state).map(({ submission: s, projectTitle }) => <article className={styles.card} key={s.projectId}><p className={styles.eyebrow}>{s.state.replaceAll("_", " ")} / {s.effectivePublished ? "Showcased" : "Not showcased"}</p><h2><Link href={`/studio/${encodeURIComponent(s.projectId)}`}>{projectTitle}</Link></h2></article>)}
    {!rows.length && <p>No showcase requests yet.</p>}
  </ProjectWorkspace>;
}
